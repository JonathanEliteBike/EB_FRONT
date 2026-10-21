import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ResponsivaEquipo {
  id: number;
  inventario: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  funcionamiento: string;
  extras: string;
  empresa: string;
  responsivaEstado: string;
}

export interface ResponsivaColaborador {
  id: number | null;
  numeroEmpleado: string;
  nombreCompleto: string;
  puesto: string;
  empresa: string;
  departamento: string;
}

export interface ResponsivaAsignacion {
  id: number | null;
  estado: string;
  fechaAsignacion: string;
  fechaDevolucion: string;
}

export interface Responsiva {
  id: number;
  asignacionId: number | null;
  equipoId: number;
  colaboradorId: number | null;

  folio: string;
  estado: 'Pendiente' | 'Firmada' | 'Anulada';

  fechaGeneracion: string;
  fechaFirma: string;
  fechaAnulacion: string;

  motivoAnulacion: string;
  observaciones: string;
  archivoPdf: string;

  responsable: string;
  departamento: string;

  equipo: ResponsivaEquipo;
  colaborador: ResponsivaColaborador;
  asignacion: ResponsivaAsignacion;
}

export interface ResponsivasEstadisticas {
  total: number;
  pendientes: number;
  firmadas: number;
  anuladas: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsivasService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

private readonly apiUrl =
  `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/responsivas`;

  constructor(
    private http: HttpClient
  ) {}

  obtenerResponsivas(
    busqueda = '',
    estado = 'Todos'
  ): Observable<Responsiva[]> {
    let params = new HttpParams();

    if (busqueda.trim()) {
      params = params.set(
        'busqueda',
        busqueda.trim()
      );
    }

    if (
      estado &&
      estado !== 'Todos'
    ) {
      params = params.set(
        'estado',
        estado
      );
    }

    return this.http.get<Responsiva[]>(
      this.apiUrl,
      { params }
    );
  }

  obtenerEstadisticas():
    Observable<ResponsivasEstadisticas> {
    return this.http.get<ResponsivasEstadisticas>(
      `${this.apiUrl}/estadisticas`
    );
  }

  obtenerResponsiva(
    id: number
  ): Observable<Responsiva> {
    return this.http.get<Responsiva>(
      `${this.apiUrl}/${id}`
    );
  }

  actualizarResponsiva(
    id: number,
    datos: {
      observaciones: string;
      archivoPdf: string;
    }
  ): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      datos
    );
  }

  firmarResponsiva(
    id: number,
    datos: {
      archivoPdf: string;
      observaciones: string;
    }
  ): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/${id}/firmar`,
      datos
    );
  }

  anularResponsiva(
    id: number,
    motivoAnulacion: string
  ): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/${id}/anular`,
      {
        motivoAnulacion
      }
    );
  }

  descargarPdf(
    id: number
  ): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${id}/pdf`,
      {
        responseType: 'blob'
      }
    );
  }
}