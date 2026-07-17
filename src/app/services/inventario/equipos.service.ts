import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EstadoEquipo =
  | 'Asignado'
  | 'Disponible'
  | 'Baja';

export type EstadoResponsiva =
  | 'Pendiente'
  | 'Firmada'
  | 'No aplica';

export interface Equipo {
  id: number;
  inventario: string;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  categoria: string;
  estado: EstadoEquipo;
  responsable: string;
  cargo?: string;
  departamento: string;
  ubicacion: string;
  funcionamiento: string;
  responsiva: EstadoResponsiva;
  empresa?: string;
  fechaRegistro?: string;
  imagenUrl?: string;
  comentariosSistemas?: string;
  extras?: string;
}

export interface NuevoEquipo {
  inventario: string;
  fechaRegistro?: string;
  empresa?: string;
  departamento?: string;
  responsable?: string;
  cargo?: string;
  categoria: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  funcionamiento?: string;
  estado?: EstadoEquipo;
  ubicacion?: string;
  imagenUrl?: string;
  comentariosSistemas?: string;
  extras?: string;
  responsiva?: EstadoResponsiva;
}

export interface RespuestaEquipo {
  message: string;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposService {
  private readonly apiUrl =
    'http://localhost:5000/api/inventario/equipos';

  constructor(private http: HttpClient) {}

  obtenerEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.apiUrl);
  }

  obtenerEquipo(id: number): Observable<Equipo> {
    return this.http.get<Equipo>(
      `${this.apiUrl}/${id}`
    );
  }

  crearEquipo(
    equipo: NuevoEquipo
  ): Observable<RespuestaEquipo> {
    return this.http.post<RespuestaEquipo>(
      this.apiUrl,
      equipo
    );
  }

  actualizarEquipo(
    id: number,
    equipo: NuevoEquipo
  ): Observable<RespuestaEquipo> {
    return this.http.put<RespuestaEquipo>(
      `${this.apiUrl}/${id}`,
      equipo
    );
  }

  eliminarEquipo(
    id: number
  ): Observable<RespuestaEquipo> {
    return this.http.delete<RespuestaEquipo>(
      `${this.apiUrl}/${id}`
    );
  }
}