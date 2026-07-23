import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface DashboardFiltros {
  empresa?: string;
  departamento?: string;
  estado?: string;
}

export interface DashboardCatalogos {
  empresas: string[];
  departamentos: string[];
  estadosEquipo: string[];
  tiposReporte: string[];
}

export interface DistribucionDashboard {
  etiqueta: string;
  total: number;
}

export interface TendenciaDashboard {
  periodo: string;
  total: number;
}

export interface MovimientoDashboard {
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

export interface DashboardInventarioData {
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
    porEstado: DistribucionDashboard[];
    porCategoria: DistribucionDashboard[];
    porEmpresa: DistribucionDashboard[];
    porDepartamento: DistribucionDashboard[];
    porFuncionamiento: DistribucionDashboard[];
    porResponsiva: DistribucionDashboard[];
  };
  tendencias: {
    asignacionesPorMes: TendenciaDashboard[];
    devolucionesPorMes: TendenciaDashboard[];
  };
  movimientosRecientes: MovimientoDashboard[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardInventarioService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly apiUrl =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/reportes`;

  constructor(private http: HttpClient) {}

  obtenerCatalogos(): Observable<DashboardCatalogos> {
    return this.http.get<DashboardCatalogos>(`${this.apiUrl}/catalogos`);
  }

  obtenerDashboard(filtros: DashboardFiltros = {}): Observable<DashboardInventarioData> {
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

    return this.http.get<DashboardInventarioData>(`${this.apiUrl}/dashboard`, {
      params
    });
  }
}