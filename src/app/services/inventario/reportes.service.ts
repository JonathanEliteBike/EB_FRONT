import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type TipoReporte =
  | 'equipos'
  | 'asignaciones'
  | 'responsivas'
  | 'auditorias'
  | 'movimientos';

export interface ReportesFiltros {
  empresa?: string;
  departamento?: string;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  busqueda?: string;
}

export interface ReportesCatalogos {
  empresas: string[];
  departamentos: string[];
  estadosEquipo: string[];
  tiposReporte: TipoReporte[];
}

export interface DistribucionReporte {
  etiqueta: string;
  total: number;
}

export interface TendenciaReporte {
  periodo: string;
  total: number;
}

export interface MovimientoRecienteReporte {
  id: number | null;
  tipo_movimiento: string;
  descripcion: string;
  responsable_anterior: string;
  responsable_nuevo: string;
  usuario_registro: string;
  fecha: string;
  numero_inventario: string;
  equipo: string;
}

export interface ReportesDashboard {
  resumen: {
    equipos: {
      total: number;
      asignados: number;
      disponibles: number;
      bajas: number;
      responsivasPendientes: number;
      responsivasFirmadas: number;
    };
    asignaciones: {
      total: number;
      activas: number;
      finalizadas: number;
      canceladas: number;
    };
    responsivas: {
      total: number;
      pendientes: number;
      firmadas: number;
      anuladas: number;
    };
    auditorias: {
      total: number;
      planeadas: number;
      enProceso: number;
      finalizadas: number;
      canceladas: number;
    };
    hallazgos: {
      totalRevisiones: number;
      diferencias: number;
      noLocalizados: number;
      correccionesPendientes: number;
    };
  };
  distribuciones: {
    porEstado: DistribucionReporte[];
    porCategoria: DistribucionReporte[];
    porEmpresa: DistribucionReporte[];
    porDepartamento: DistribucionReporte[];
    porFuncionamiento: DistribucionReporte[];
    porResponsiva: DistribucionReporte[];
  };
  tendencias: {
    asignacionesPorMes: TendenciaReporte[];
    devolucionesPorMes: TendenciaReporte[];
  };
  movimientosRecientes: MovimientoRecienteReporte[];
}

export interface ReporteFila {
  [key: string]: string | number | boolean | null | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly apiUrl =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/reportes`;

  constructor(private http: HttpClient) {}

  obtenerCatalogos(): Observable<ReportesCatalogos> {
    return this.http.get<ReportesCatalogos>(`${this.apiUrl}/catalogos`);
  }

  obtenerDashboard(filtros: ReportesFiltros = {}): Observable<ReportesDashboard> {
    return this.http.get<ReportesDashboard>(`${this.apiUrl}/dashboard`, {
      params: this.crearParametros(filtros)
    });
  }

  obtenerDetalle(
    tipo: TipoReporte,
    filtros: ReportesFiltros = {}
  ): Observable<ReporteFila[]> {
    return this.http.get<ReporteFila[]>(`${this.apiUrl}/detalle/${tipo}`, {
      params: this.crearParametros(filtros)
    });
  }

  exportarReporte(
    tipo: TipoReporte,
    filtros: ReportesFiltros = {}
  ): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar/${tipo}`, {
      params: this.crearParametros(filtros),
      responseType: 'blob'
    });
  }

  private crearParametros(filtros: ReportesFiltros): HttpParams {
    let params = new HttpParams();

    if (filtros.empresa && filtros.empresa !== 'Todas') {
      params = params.set('empresa', filtros.empresa);
    }

    if (filtros.departamento && filtros.departamento !== 'Todos') {
      params = params.set('departamento', filtros.departamento);
    }

    if (filtros.estado && filtros.estado !== 'Todos') {
      params = params.set('estado', filtros.estado);
    }

    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
    }

    if (filtros.busqueda?.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
    }

    return params;
  }
}