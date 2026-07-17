import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RetroactivosService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getRetroactivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/retroactivos`);
  }

  getTodasLasClaves(): Observable<{ CLAVE: string; CLIENTE: string }[]> {
    return this.http.get<{ CLAVE: string; CLIENTE: string }[]>(`${this.apiUrl}/retroactivos/claves`);
  }

  sincronizarNotasOdoo(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sincronizar_notas`, {});
  }

  getRetroactivoCliente(identificador: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/retroactivo_cliente/${encodeURIComponent(identificador)}`);
  }

  syncMonitorOdooConPrevio() {
    return this.http.post<any>(`${this.apiUrl}/sync-monitor-odoo`, {
      recalcular_previo: true
    });
  }

  cerrarTemporada(clave: string, fechaCierre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cerrar-temporada`, {
      clave,
      fecha_cierre: fechaCierre
    });
  }

  getTemporadasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/retroactivos_temporadas_disponibles`);
  }

  getRetroactivosHistorico(temporada: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/retroactivos_historico`, { params: { temporada } });
  }
}