import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

export type EstadoColaborador =
  | 'Activo'
  | 'Inactivo';

export interface EquipoAsignadoColaborador {
  asignacionId: number;
  equipoId: number;
  inventario: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  estado: string;
  funcionamiento: string;
  ubicacion: string;
  fechaAsignacion: string;
}

export interface Colaborador {
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
  fechaIngreso: string;
  estado: EstadoColaborador;
  comentarios: string;
  equiposAsignados: number;
  equipos?: EquipoAsignadoColaborador[];
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface NuevoColaborador {
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  empresa: string;
  departamento: string;
  puesto: string;
  correo?: string;
  fechaIngreso?: string;
  estado: EstadoColaborador;
  comentarios?: string;
}

export interface EstadisticasColaboradores {
  total: number;
  activos: number;
  inactivos: number;
  conEquipos: number;
  sinEquipos: number;
}

export interface RespuestaColaborador {
  message: string;
  id: number;
  estado?: EstadoColaborador;
}

export interface FiltrosColaboradores {
  busqueda?: string;
  estado?: string;
  departamento?: string;
  empresa?: string;
  asignacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ColaboradoresService {
  private readonly apiUrl =
    'http://localhost:5000/api/inventario/colaboradores';

  constructor(
    private http: HttpClient
  ) {}

  obtenerColaboradores(
    filtros?: FiltrosColaboradores
  ): Observable<Colaborador[]> {
    let params = new HttpParams();

    if (filtros?.busqueda) {
      params = params.set(
        'busqueda',
        filtros.busqueda
      );
    }

    if (
      filtros?.estado &&
      filtros.estado !== 'Todos'
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

    if (
      filtros?.asignacion &&
      filtros.asignacion !== 'Todos'
    ) {
      params = params.set(
        'asignacion',
        filtros.asignacion
      );
    }

    return this.http.get<Colaborador[]>(
      this.apiUrl,
      { params }
    );
  }

  obtenerColaborador(
    id: number
  ): Observable<Colaborador> {
    return this.http.get<Colaborador>(
      `${this.apiUrl}/${id}`
    );
  }

  obtenerEstadisticas():
    Observable<EstadisticasColaboradores> {
    return this.http.get<EstadisticasColaboradores>(
      `${this.apiUrl}/estadisticas`
    );
  }

  crearColaborador(
    colaborador: NuevoColaborador
  ): Observable<RespuestaColaborador> {
    return this.http.post<RespuestaColaborador>(
      this.apiUrl,
      colaborador
    );
  }

  actualizarColaborador(
    id: number,
    colaborador: NuevoColaborador
  ): Observable<RespuestaColaborador> {
    return this.http.put<RespuestaColaborador>(
      `${this.apiUrl}/${id}`,
      colaborador
    );
  }

  cambiarEstado(
    id: number,
    estado: EstadoColaborador
  ): Observable<RespuestaColaborador> {
    return this.http.patch<RespuestaColaborador>(
      `${this.apiUrl}/${id}/estado`,
      { estado }
    );
  }

  desactivarColaborador(
    id: number
  ): Observable<RespuestaColaborador> {
    return this.http.delete<RespuestaColaborador>(
      `${this.apiUrl}/${id}`
    );
  }
}