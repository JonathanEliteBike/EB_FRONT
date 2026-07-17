import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

export type EstadoAsignacion =
  | 'Activa'
  | 'Finalizada'
  | 'Cancelada';

export interface ColaboradorCatalogo {
  id: number;
  numeroEmpleado: string;
  nombreCompleto: string;
  empresa: string;
  departamento: string;
  puesto: string;
  correo: string;
  equiposAsignados: number;
}

export interface EquipoCatalogo {
  id: number;
  inventario: string;
  empresa: string;
  categoria: string;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  funcionamiento: string;
  estado: string;
  ubicacion: string;
  extras: string;
}

export interface CatalogosAsignacion {
  colaboradores: ColaboradorCatalogo[];
  equipos: EquipoCatalogo[];
}

export interface EquipoAsignacion {
  id: number;
  inventario: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  funcionamiento: string;
  estado: string;
  ubicacion: string;
  empresa: string;
}

export interface ColaboradorAsignacion {
  id: number;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  empresa: string;
  departamento: string;
  puesto: string;
  correo: string;
  estado: string;
}

export interface Asignacion {
  id: number;
  equipoId: number;
  colaboradorId: number;
  fechaAsignacion: string;
  fechaDevolucion: string;
  estado: EstadoAsignacion;
  observacionesEntrega: string;
  observacionesDevolucion: string;
  usuarioRegistro: string;
  equipo: EquipoAsignacion;
  colaborador: ColaboradorAsignacion;
}

export interface NuevaAsignacion {
  equipoId: number | null;
  colaboradorId: number | null;
  fechaAsignacion: string;
  observacionesEntrega: string;
  usuarioRegistro: string;
}

export interface FinalizarAsignacion {
  fechaDevolucion: string;
  observacionesDevolucion: string;
  usuarioRegistro: string;
}

export interface EstadisticasAsignaciones {
  total: number;
  activas: number;
  finalizadas: number;
  canceladas: number;
  equiposDisponibles: number;
  colaboradoresConEquipo: number;
}

export interface RespuestaAsignacion {
  message: string;
  id: number;
  equipoId: number;
  colaboradorId?: number;
  estado?: EstadoAsignacion;
}

export interface FiltrosAsignaciones {
  busqueda?: string;
  estado?: string;
  departamento?: string;
  empresa?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsignacionesService {
  private readonly apiUrl =
    'http://localhost:5000/api/inventario/asignaciones';

  constructor(
    private http: HttpClient
  ) {}

  obtenerAsignaciones(
    filtros?: FiltrosAsignaciones
  ): Observable<Asignacion[]> {
    let params = new HttpParams();

    if (filtros?.busqueda) {
      params = params.set(
        'busqueda',
        filtros.busqueda
      );
    }

    if (
      filtros?.estado &&
      filtros.estado !== 'Todas'
    ) {
      params = params.set(
        'estado',
        filtros.estado
      );
    }

    if (
      filtros?.departamento &&
      filtros.departamento !== 'Todos'
    ) {
      params = params.set(
        'departamento',
        filtros.departamento
      );
    }

    if (
      filtros?.empresa &&
      filtros.empresa !== 'Todas'
    ) {
      params = params.set(
        'empresa',
        filtros.empresa
      );
    }

    return this.http.get<Asignacion[]>(
      this.apiUrl,
      { params }
    );
  }

  obtenerAsignacion(
    id: number
  ): Observable<Asignacion> {
    return this.http.get<Asignacion>(
      `${this.apiUrl}/${id}`
    );
  }

  obtenerCatalogos():
    Observable<CatalogosAsignacion> {
    return this.http.get<CatalogosAsignacion>(
      `${this.apiUrl}/catalogos`
    );
  }

  obtenerEstadisticas():
    Observable<EstadisticasAsignaciones> {
    return this.http.get<EstadisticasAsignaciones>(
      `${this.apiUrl}/estadisticas`
    );
  }

  crearAsignacion(
    asignacion: NuevaAsignacion
  ): Observable<RespuestaAsignacion> {
    return this.http.post<RespuestaAsignacion>(
      this.apiUrl,
      asignacion
    );
  }

  finalizarAsignacion(
    id: number,
    datos: FinalizarAsignacion
  ): Observable<RespuestaAsignacion> {
    return this.http.put<RespuestaAsignacion>(
      `${this.apiUrl}/${id}/finalizar`,
      datos
    );
  }
}