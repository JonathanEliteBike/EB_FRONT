import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MonitorOdooService {
  private apiUrl = `${environment.apiUrl}`;

  // CACHÉ
  private facturasCache = new BehaviorSubject<any>(null);

  private fechaCache$: Observable<any> | null = null;

  constructor(private http: HttpClient) { }

  // Método nuevo para cargar datos sin esperar respuesta en el componente
  precargarDatos() {
    if (this.facturasCache.value) return; // Si ya hay datos, no hacer nada
    this.getFacturas().subscribe(); // Dispara la petición y se guarda en caché gracias al tap
  }

  getFacturas(): Observable<any> {
    // Si tenemos caché, devolvemos eso
    if (this.facturasCache.value) {
      return of(this.facturasCache.value);
    }

    // Si no, vamos a la red y guardamos el resultado
    return this.http.get<any>(`${this.apiUrl}/monitor_odoo`).pipe(
      tap(data => this.facturasCache.next(data))
    );
  }

  /** Facturas acotadas al rango de una temporada (sin caché -- usado por
   * Monitor de Facturas para poder ver también la temporada pasada). */
  getFacturasPorTemporada(temporada: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/monitor_odoo`, { params: { temporada } });
  }

  getTemporadas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/temporadas`);
  }

  getTemporadasDisponibles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/temporadas_disponibles`);
  }

  importarFacturas(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/importar_facturas`, formData).pipe(
      tap(() => this.facturasCache.next(null)) // Limpiamos caché para obligar recarga
    );
  }

  getUltimaActualizacion(): Observable<any> {
    if (this.fechaCache$) {
      return this.fechaCache$;
    }

    this.fechaCache$ = this.http.get<any>(`${this.apiUrl}/ultima_actualizacion`).pipe(
      shareReplay(1)
    );

    return this.fechaCache$;
  }
}