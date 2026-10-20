import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoRevisionCambio = 'Pendiente' | 'Validado' | 'Observado';
export type FiltroEstadoCambio = EstadoRevisionCambio | 'Todos';

export interface ResumenControlCambios {
  total: number;
  pendientes: number;
  validados: number;
  observados: number;
}

export interface CambioCampo {
  campo: string;
  antes: string | number | boolean | null;
  despues: string | number | boolean | null;
}

export interface EventoControlCambios {
  id: number;
  usuarioId: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  fecha: string;
  estadoRevision: EstadoRevisionCambio;
  observacion: string;
  revisorId: number | null;
  revisorNombre: string;
  revisadoEn: string;
  cambios: CambioCampo[];
  detalleDisponible: boolean;
  camposEnviados: string[];
}

export interface FiltrosControlCambios {
  desde: string;
  hasta: string;
  estado?: FiltroEstadoCambio;
  tipo?: string;
  buscar?: string;
  orden?: string;
  usuario?: string;
  limite?: number;
  offset?: number;
}

export interface ControlCambiosRespuesta {
  desde: string;
  hasta: string;
  estado: string;
  usuario: string;
  resumen: ResumenControlCambios;
  totalFiltrado: number;
  eventos: EventoControlCambios[];
  limite: number;
  offset: number;
  tipo?: string;
  buscar?: string;
  orden?: string;
}

export type EstadoComprobacion = 'ok' | 'advertencia' | 'pendiente' | 'no_aplica';

export interface ComprobacionExpediente {
  clave: string;
  nombre: string;
  estado: EstadoComprobacion;
  mensaje: string;
}

export interface ExpedienteMovimiento {
  disponible: boolean;
  motivo: string;
  equipo: Record<string, string | number | null> | null;
  creacion: { usuario: string; fecha: string } | null;
  asignacion: {
    id: number;
    estado: string;
    colaborador: string;
    numeroEmpleado: string;
    origen: string;
    fecha_asignacion: string;
    fecha_devolucion: string;
    observaciones_entrega: string;
    observaciones_devolucion: string;
  } | null;
  responsiva: {
    id: number;
    folio: string;
    estado: string;
    responsable: string;
    archivo_pdf: string;
    fecha_firma: string;
    fecha_generacion: string;
  } | null;
  comprobaciones: ComprobacionExpediente[];
  notaHistorica: string;
}

export interface RevisionHistorialCambio {
  anterior: string;
  nuevo: string;
  observacionAnterior: string;
  observacionNueva: string;
  revisor: string;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class ControlCambiosService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly url =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/control-cambios`;

  constructor(private readonly http: HttpClient) {}

  private parametros(filtros: FiltrosControlCambios): HttpParams {
    let p = new HttpParams().set('desde', filtros.desde).set('hasta', filtros.hasta);
    if (filtros.estado && filtros.estado !== 'Todos') p = p.set('estado', filtros.estado);
    if (filtros.tipo && filtros.tipo !== 'Todos') p = p.set('tipo', filtros.tipo);
    if (filtros.buscar?.trim()) p = p.set('buscar', filtros.buscar.trim());
    if (filtros.orden) p = p.set('orden', filtros.orden);
    if (filtros.usuario?.trim()) p = p.set('usuario', filtros.usuario.trim());
    if (filtros.limite) p = p.set('limite', String(filtros.limite));
    if (filtros.offset) p = p.set('offset', String(filtros.offset));
    return p;
  }

  listar(filtros: FiltrosControlCambios): Observable<ControlCambiosRespuesta> {
    return this.http.get<ControlCambiosRespuesta>(this.url, { params: this.parametros(filtros) });
  }

  resumen(desde: string, hasta: string): Observable<{resumen: ResumenControlCambios}> {
    return this.http.get<{resumen: ResumenControlCambios}>(`${this.url}/resumen`,
      { params: new HttpParams().set('desde', desde).set('hasta', hasta) });
  }

  guardarRevision(id: number, estado: EstadoRevisionCambio, observacion: string): Observable<unknown> {
    return this.http.put(`${this.url}/${id}/revision`, {estado, observacion});
  }

  expediente(id: number): Observable<ExpedienteMovimiento> {
    return this.http.get<ExpedienteMovimiento>(`${this.url}/${id}/expediente`);
  }

  historialRevision(id: number): Observable<RevisionHistorialCambio[]> {
    return this.http.get<RevisionHistorialCambio[]>(`${this.url}/${id}/historial`);
  }

  exportar(filtros: FiltrosControlCambios): Observable<Blob> {
    return this.http.get(`${this.url}/exportar`, {
      params: this.parametros(filtros), responseType: 'blob'
    });
  }
}
