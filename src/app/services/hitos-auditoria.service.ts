import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HitoAuditoria {
  id: number;
  seccion: string;
  orden_hito: number;
  etiqueta: string;
  campo_dato: string;
  campo_ancla: string | null;
  dias_esperados: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type HitoAuditoriaPayload = Omit<HitoAuditoria, 'id' | 'created_at' | 'updated_at' | 'activo'> & { activo?: boolean };

@Injectable({ providedIn: 'root' })
export class HitosAuditoriaService {
  private base = `${environment.apiUrl}/importaciones/hitos-auditoria`;

  constructor(private http: HttpClient) {}

  listar(): Observable<HitoAuditoria[]> {
    return this.http.get<HitoAuditoria[]>(this.base);
  }

  crear(data: HitoAuditoriaPayload): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(this.base, data);
  }

  actualizar(id: number, data: HitoAuditoriaPayload): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
