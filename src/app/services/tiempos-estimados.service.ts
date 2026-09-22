import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TiempoEstimado {
  id: number;
  origen: string;
  tipo_producto: string;
  via_transporte: string;
  dias_hasta_booking: number;
  dias_booking_a_puerto: number;
  dias_puerto_a_destino: number;
  dias_destino_a_almacen: number;
  created_at?: string;
  updated_at?: string;
}

export type TiempoEstimadoPayload = Omit<TiempoEstimado, 'id' | 'created_at' | 'updated_at'>;

@Injectable({ providedIn: 'root' })
export class TiemposEstimadosService {
  private base = `${environment.apiUrl}/importaciones/tiempos-estimados`;

  constructor(private http: HttpClient) {}

  listar(): Observable<TiempoEstimado[]> {
    return this.http.get<TiempoEstimado[]>(this.base);
  }

  crear(data: TiempoEstimadoPayload): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(this.base, data);
  }

  actualizar(id: number, data: TiempoEstimadoPayload): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
