import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PorMes {
  anio: number;
  mes: number;
  mes_nombre: string;
  total: number;
  cantidad_facturas: number;
}

export interface TopCliente {
  rank: number;
  nombre: string;
  facturas: number;
  total: number;
  participacion_pct?: number;
}

export interface TopProducto {
  rank: number;
  nombre: string;
  cantidad: number;
  total: number;
  participacion_pct?: number;
}

export interface PorEstado {
  estado: string;
  total: number;
  facturas: number;
}

export interface DesglosePorEstado {
  estado: string;
  total: number;
  facturas: number;
  productos: TopProducto[];
}

export interface ResumenVentas {
  total: number;
  cantidad_facturas: number;
  participacion_total_pct?: number;
  global_total?: number;
  por_mes: PorMes[];
  top_clientes: TopCliente[];
  top_productos: TopProducto[];
  por_estado: PorEstado[];
  todos_clientes?: TopCliente[];
  todos_productos?: TopProducto[];
}

export interface MesComparado {
  mes: number;
  mes_nombre: string;
  total1: number;
  cantidad1: number;
  total2: number;
  cantidad2: number;
  delta: number;
  delta_pct: number;
}

export interface ClienteResumen {
  nombre_display: string;
  total: number;
  cantidad_facturas: number;
  por_mes: PorMes[];
  top_productos: TopProducto[];
  todos_productos: TopProducto[];
}

export interface ComparacionAnual {
  anio1: number;
  anio2: number;
  total1: number;
  total2: number;
  delta: number;
  delta_pct: number;
  meses: MesComparado[];
}

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private apiUrl = environment.apiUrl;

  // Message Broker: observable compartido para los años disponibles.
  // shareReplay(1) retiene el último valor emitido y lo reenvía a cualquier
  // nuevo suscriptor sin volver a hacer la petición HTTP.
  private aniosDisponibles$: Observable<{ anios: number[] }> | null = null;
  private grupos$: Observable<{ id: number; nombre_grupo: string }[]> | null = null;

  constructor(private http: HttpClient) {}

  getAniosDisponibles(): Observable<{ anios: number[] }> {
    if (!this.aniosDisponibles$) {
      this.aniosDisponibles$ = this.http
        .get<{ anios: number[] }>(`${this.apiUrl}/ventas/anios-disponibles`)
        .pipe(shareReplay(1));
    }
    return this.aniosDisponibles$;
  }

  getGrupos(): Observable<{ id: number; nombre_grupo: string }[]> {
    if (!this.grupos$) {
      this.grupos$ = this.http
        .get<{ id: number; nombre_grupo: string }[]>(`${this.apiUrl}/integrales/grupos`)
        .pipe(shareReplay(1));
    }
    return this.grupos$;
  }

  getResumen(fechaInicio: string, fechaFin: string, vista: 'facturas' | 'cobranza' = 'cobranza'): Observable<ResumenVentas> {
    return this.http.get<ResumenVentas>(
      `${this.apiUrl}/ventas/resumen?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&vista=${vista}`
    );
  }

  getResumenIntegral(fechaInicio: string, fechaFin: string, grupoId?: number | null, vista: 'facturas' | 'cobranza' = 'cobranza'): Observable<ResumenVentas> {
    const gParam = grupoId ? `&grupo_id=${grupoId}` : '';
    return this.http.get<ResumenVentas>(
      `${this.apiUrl}/ventas/resumen-integral?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}${gParam}&vista=${vista}`
    );
  }

  compararAnual(anio1: number, anio2: number): Observable<ComparacionAnual> {
    return this.http.get<ComparacionAnual>(
      `${this.apiUrl}/ventas/comparar-anual?anio1=${anio1}&anio2=${anio2}`
    );
  }

  listarClientes(q: string): Observable<{ clientes: { id: number; nombre: string }[] }> {
    return this.http.get<{ clientes: { id: number; nombre: string }[] }>(
      `${this.apiUrl}/ventas/listar-clientes?q=${encodeURIComponent(q)}`
    );
  }

  buscarCliente(nombre: string, fechaInicio: string, fechaFin: string, vista: 'facturas' | 'cobranza' = 'cobranza'): Observable<ClienteResumen> {
    const n = encodeURIComponent(nombre);
    return this.http.get<ClienteResumen>(
      `${this.apiUrl}/ventas/buscar-cliente?nombre=${n}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&vista=${vista}`
    );
  }

  getProductosPorEstado(fechaInicio: string, fechaFin: string, estado: string, vista: 'facturas' | 'cobranza' = 'cobranza'): Observable<DesglosePorEstado> {
    const e = encodeURIComponent(estado);
    return this.http.get<DesglosePorEstado>(
      `${this.apiUrl}/ventas/productos-por-estado?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&estado=${e}&vista=${vista}`
    );
  }
}
