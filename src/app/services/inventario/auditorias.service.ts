import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type TipoAuditoria = 'General' | 'Empresa' | 'Departamento' | 'Ubicación' | 'Muestra';
export type EstadoAuditoria = 'Planeada' | 'En proceso' | 'Finalizada' | 'Cancelada';
export type ResultadoAuditoria = 'Pendiente' | 'Conforme' | 'Con diferencia' | 'No localizado' | 'No aplica';
export type EstadoCorreccion = 'No aplica' | 'Pendiente' | 'En proceso' | 'Corregida';

export interface AuditoriaResumen {
  totalEquipos: number;
  revisados: number;
  pendientes: number;
  conformes: number;
  conDiferencia: number;
  noLocalizados: number;
  noAplica: number;
  correccionesPendientes: number;
  porcentaje: number;
}

export interface Auditoria {
  id: number;
  folio: string;
  nombre: string;
  tipo: TipoAuditoria;
  empresa: string;
  departamento: string;
  ubicacion: string;
  incluirBajas: boolean;
  fechaProgramada: string;
  fechaInicio: string;
  fechaFinalizacion: string;
  estado: EstadoAuditoria;
  auditorResponsable: string;
  observaciones: string;
  conclusiones: string;
  usuarioRegistro: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  resumen: AuditoriaResumen;
  detalles?: AuditoriaDetalle[];
}

export interface AuditoriaDetalleEsperado {
  inventario: string;
  codigoBarras: string;
  descripcion: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  empresa: string;
  departamento: string;
  responsable: string;
  estado: string;
  ubicacion: string;
  funcionamiento: string;
  extras: string;
}

export interface AuditoriaDetalleEncontrado {
  codigoBarras: string;
  serie: string;
  empresa: string;
  departamento: string;
  responsable: string;
  estado: string;
  ubicacion: string;
  funcionamiento: string;
  extras: string;
}

export interface AuditoriaDetalle {
  id: number;
  auditoriaId: number;
  equipoId: number | null;
  esperado: AuditoriaDetalleEsperado;
  encontrado: boolean | null;
  encontradoDatos: AuditoriaDetalleEncontrado;
  resultado: ResultadoAuditoria;
  tipoDiferencia: string;
  observaciones: string;
  evidenciaUrl: string;
  accionRequerida: string;
  estadoCorreccion: EstadoCorreccion;
  fechaRevision: string;
  revisadoPor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface AuditoriasEstadisticas {
  total: number;
  planeadas: number;
  enProceso: number;
  finalizadas: number;
  canceladas: number;
}

export interface AuditoriaEquipoCatalogo {
  id: number;
  inventario: string;
  nombre: string;
  marca: string;
  modelo: string;
  empresa: string;
  departamento: string;
  ubicacion: string;
  estado: string;
}

export interface AuditoriasCatalogos {
  tipos: TipoAuditoria[];
  estados: string[];
  empresas: string[];
  departamentos: string[];
  ubicaciones: string[];
  equipos: AuditoriaEquipoCatalogo[];
}

export interface AuditoriasFiltros {
  busqueda?: string;
  estado?: string;
  tipo?: string;
  empresa?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface GuardarAuditoriaPayload {
  nombre: string;
  tipo?: TipoAuditoria;
  empresa?: string;
  departamento?: string;
  ubicacion?: string;
  incluirBajas?: boolean;
  fechaProgramada: string;
  auditorResponsable: string;
  observaciones?: string;
  usuarioRegistro?: string;
  equipoIds?: number[];
}

export interface RevisionEquipoPayload {
  encontrado?: boolean;
  resultado?: ResultadoAuditoria;
  codigoBarrasEncontrado?: string;
  numeroSerieEncontrado?: string;
  empresaEncontrada?: string;
  departamentoEncontrado?: string;
  responsableEncontrado?: string;
  estadoEncontrado?: string;
  ubicacionEncontrada?: string;
  funcionamientoEncontrado?: string;
  extrasEncontrados?: string;
  tipoDiferencia?: string;
  observaciones?: string;
  evidenciaUrl?: string;
  accionRequerida?: string;
  estadoCorreccion?: EstadoCorreccion;
  revisadoPor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriasService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly apiUrl =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/auditorias`;

  constructor(private http: HttpClient) {}

  obtenerAuditorias(filtros: AuditoriasFiltros = {}): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(this.apiUrl, {
      params: this.crearParametros(filtros)
    });
  }

  obtenerEstadisticas(filtros: AuditoriasFiltros = {}): Observable<AuditoriasEstadisticas> {
    return this.http.get<AuditoriasEstadisticas>(`${this.apiUrl}/estadisticas`, {
      params: this.crearParametros(filtros)
    });
  }

  obtenerCatalogos(): Observable<AuditoriasCatalogos> {
    return this.http.get<AuditoriasCatalogos>(`${this.apiUrl}/catalogos`);
  }

  obtenerAuditoria(
    auditoriaId: number,
    busquedaDetalle = '',
    resultado = 'Todos'
  ): Observable<Auditoria> {
    let params = new HttpParams();

    if (busquedaDetalle.trim()) {
      params = params.set('busquedaDetalle', busquedaDetalle.trim());
    }

    if (resultado && resultado !== 'Todos') {
      params = params.set('resultado', resultado);
    }

    return this.http.get<Auditoria>(`${this.apiUrl}/${auditoriaId}`, { params });
  }

  crearAuditoria(datos: GuardarAuditoriaPayload): Observable<unknown> {
    return this.http.post(this.apiUrl, datos);
  }

  actualizarAuditoria(
    auditoriaId: number,
    datos: Pick<
      GuardarAuditoriaPayload,
      'nombre' | 'fechaProgramada' | 'auditorResponsable' | 'observaciones'
    >
  ): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${auditoriaId}`, datos);
  }

  iniciarAuditoria(auditoriaId: number): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${auditoriaId}/iniciar`, {});
  }

  revisarEquipo(
    auditoriaId: number,
    detalleId: number,
    datos: RevisionEquipoPayload
  ): Observable<{ message: string; detalle: AuditoriaDetalle }> {
    return this.http.put<{ message: string; detalle: AuditoriaDetalle }>(
      `${this.apiUrl}/${auditoriaId}/detalles/${detalleId}/revisar`,
      datos
    );
  }

  actualizarCorreccion(
    auditoriaId: number,
    detalleId: number,
    datos: {
      accionRequerida: string;
      estadoCorreccion: EstadoCorreccion;
    }
  ): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/${auditoriaId}/detalles/${detalleId}/correccion`,
      datos
    );
  }

  finalizarAuditoria(auditoriaId: number, conclusiones: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${auditoriaId}/finalizar`, {
      conclusiones
    });
  }

  cancelarAuditoria(auditoriaId: number, motivo: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${auditoriaId}/cancelar`, {
      motivo
    });
  }

  eliminarAuditoria(auditoriaId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${auditoriaId}`);
  }

  exportarAuditoria(auditoriaId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${auditoriaId}/exportar`, {
      responseType: 'blob'
    });
  }

  private crearParametros(filtros: AuditoriasFiltros): HttpParams {
    let params = new HttpParams();

    if (filtros.busqueda?.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
    }

    if (filtros.estado && filtros.estado !== 'Todos') {
      params = params.set('estado', filtros.estado);
    }

    if (filtros.tipo && filtros.tipo !== 'Todos') {
      params = params.set('tipo', filtros.tipo);
    }

    if (filtros.empresa && filtros.empresa !== 'Todas') {
      params = params.set('empresa', filtros.empresa);
    }

    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
    }

    return params;
  }
}