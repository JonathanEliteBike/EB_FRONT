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

export interface CuentaAuditoriaActual {
  id: number;
  nombre: string;
}

export interface GuardarAuditoriaPayload {
  nombre: string;
  tipo?: TipoAuditoria;
  empresa?: string;
  departamento?: string;
  ubicacion?: string;
  incluirBajas?: boolean;
  fechaProgramada: string;
  observaciones?: string;
  equipoIds?: number[];
}

export interface RevisionEquipoPayload {
  encontrado?: boolean;
  verificaciones?: Record<string, '' | 'Coincide' | 'Diferente' | 'No verificable' | 'Sin dato'>;
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
}

export interface ParticipacionInventarioUsuario {
  usuarioId: number;
  usuario: string;
  cantidad: number;
  porcentaje: number;
}

export interface EventoInventarioUsuario {
  id: number;
  usuarioId: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  fecha: string;
}

export interface CambioInventario {
  campo: string;
  antes: string | number | boolean | null;
  despues: string | number | boolean | null;
}

export interface EventoInventarioDetallado extends EventoInventarioUsuario {
  cambios: CambioInventario[];
  camposEnviados: string[];
  detalleDisponible: boolean;
}

export interface HistorialInventarioUsuarioRespuesta {
  usuarioId: number;
  usuario: string;
  total: number;
  limite: number;
  offset: number;
  eventos: EventoInventarioDetallado[];
}

export interface ActividadInventarioRespuesta {
  total: number;
  modo: 'ediciones' | 'todas';
  desde: string;
  hasta: string;
  usuarios: ParticipacionInventarioUsuario[];
  eventos: EventoInventarioUsuario[];
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriasService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly apiUrl =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/auditorias`;

  constructor(private http: HttpClient) {}

  obtenerActividad(
    modo: 'ediciones' | 'todas' = 'ediciones',
    desde = '',
    hasta = ''
  ): Observable<ActividadInventarioRespuesta> {
    let params = new HttpParams().set('modo', modo);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ActividadInventarioRespuesta>(`${this.apiUrl}/actividad`, {params});
  }

  obtenerHistorialUsuario(
    usuarioId: number,
    modo: 'ediciones' | 'todas' = 'todas',
    desde = '',
    hasta = '',
    offset = 0,
    limite = 25
  ): Observable<HistorialInventarioUsuarioRespuesta> {
    let params = new HttpParams()
      .set('modo', modo)
      .set('offset', offset.toString())
      .set('limite', limite.toString());
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<HistorialInventarioUsuarioRespuesta>(
      `${this.apiUrl}/actividad/usuarios/${usuarioId}`, { params }
    );
  }

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

  obtenerMiUsuario(): Observable<CuentaAuditoriaActual> {
    return this.http.get<CuentaAuditoriaActual>(`${this.apiUrl}/mi-usuario`);
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
      'nombre' | 'fechaProgramada' | 'observaciones'
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