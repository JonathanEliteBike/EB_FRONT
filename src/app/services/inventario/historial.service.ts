import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';


export interface HistorialEquipo {
  id: number | null;
  inventario: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serie: string;
  empresa: string;
  estadoActual: string;
  funcionamiento: string;
  ubicacion: string;
  departamentoActual: string;
  responsableActual: string;
}


export interface MovimientoHistorial {
  id: number;
  folio: string;
  equipoId: number | null;
  tipoMovimiento: string;
  descripcion: string;
  responsableAnterior: string;
  responsableNuevo: string;
  usuarioRegistro: string;
  fechaMovimiento: string;
  equipo: HistorialEquipo;
}


export interface HistorialEstadisticas {
  total: number;
  asignaciones: number;
  devoluciones: number;
  otros: number;
}


export interface HistorialCatalogos {
  tipos: string[];
  empresas: string[];
}


export interface HistorialFiltros {
  busqueda?: string;
  tipo?: string;
  empresa?: string;
  fechaInicio?: string;
  fechaFin?: string;
}


@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '');

  private readonly apiUrl =
    `${this.baseUrl}${this.baseUrl.endsWith('/api') ? '' : '/api'}/inventario/historial`;

  constructor(private http: HttpClient) {}


  obtenerMovimientos(filtros: HistorialFiltros = {}): Observable<MovimientoHistorial[]> {
    const params = this.crearParametros(filtros);

    return this.http.get<MovimientoHistorial[]>(this.apiUrl, { params });
  }


  obtenerEstadisticas(filtros: HistorialFiltros = {}): Observable<HistorialEstadisticas> {
    const params = this.crearParametros(filtros);

    return this.http.get<HistorialEstadisticas>(
      `${this.apiUrl}/estadisticas`,
      { params }
    );
  }


  obtenerCatalogos(): Observable<HistorialCatalogos> {
    return this.http.get<HistorialCatalogos>(
      `${this.apiUrl}/catalogos`
    );
  }


  obtenerMovimiento(id: number): Observable<MovimientoHistorial> {
    return this.http.get<MovimientoHistorial>(
      `${this.apiUrl}/${id}`
    );
  }


  exportarHistorial(filtros: HistorialFiltros = {}): Observable<Blob> {
    const params = this.crearParametros(filtros);

    return this.http.get(
      `${this.apiUrl}/exportar`,
      {
        params,
        responseType: 'blob'
      }
    );
  }


  private crearParametros(filtros: HistorialFiltros): HttpParams {
    let params = new HttpParams();

    if (filtros.busqueda?.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
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