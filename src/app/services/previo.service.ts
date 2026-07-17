import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrevioService {
  private apiUrl = `${environment.apiUrl}`;

  // CACHÉS
  private previoCache = new BehaviorSubject<any[] | null>(null);
  private facturasCalculadasCache = new BehaviorSubject<any[] | null>(null);

  constructor(private http: HttpClient) { }

  precargarDatos() {
    if (!this.previoCache.value) this.obtenerPrevio().subscribe();
    if (!this.facturasCalculadasCache.value) this.getFacturasCalculadas().subscribe();
  }

  getFacturasCalculadas(): Observable<any[]> {
    if (this.facturasCalculadasCache.value) return of(this.facturasCalculadasCache.value);

    return this.http.get<any[]>(`${this.apiUrl}/monitor_odoo`).pipe(
      tap(data => this.facturasCalculadasCache.next(data))
    );
  }

  obtenerPrevio(forceRefresh: boolean = false): Observable<any[]> {
    if (!forceRefresh && this.previoCache.value) {
      return of(this.previoCache.value);
    }

    return this.http.get<any[]>(`${this.apiUrl}/obtener_previo`).pipe(
      tap(data => this.previoCache.next(data))
    );
  }

  actualizarPrevio(todosLosDatos: any[]) {
    return this.http.post(`${this.apiUrl}/actualizar_previo`, { datos: todosLosDatos }).pipe(
      tap(() => this.previoCache.next(todosLosDatos)) // Actualizamos caché localmente
    );
  }

  obtenerPrevioSinIntegrales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/obtener_previo_int`);
  }

  recalcularPrevio(): Observable<any> {
    return this.http.post(`${this.apiUrl}/recalcular_previo`, {});
  }

  limpiarCachePrevio(): void {
    this.previoCache.next(null);
  }

  getTemporadasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/temporadas_disponibles`);
  }

  getDatosPrevioHistorico(temporada: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/datos_previo_historico`, { params: { temporada } });
  }
}