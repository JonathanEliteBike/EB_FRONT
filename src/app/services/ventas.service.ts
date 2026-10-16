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

export interface VentaCategoria {
  categoria: string;
  unidades: number;
  venta?: number;
  participacion: number;
}

export interface DashboardCategorias {
  total_venta?: number;
  total_unidades: number;
  categorias: VentaCategoria[];
}

export type DimensionDashboard =
  | 'marca' | 'producto' | 'categoria' | 'subcategoria'
  | 'modelo' | 'submodelo' | 'talla' | 'color' | 'estado' | 'cliente' | 'integral';

export type FiltrosDashboard = Partial<Record<DimensionDashboard, string[]>>;

export interface OpcionFiltroDashboard {
  id: string;
  label: string;
  extra?: Record<string, string>;
}

export interface RespuestaFiltrosDashboard {
  dimension: DimensionDashboard;
  buscar: string;
  opciones: OpcionFiltroDashboard[];
  total: number;
  limit: number;
  selecciones_validas?: string[];
}

export interface ConsultaDashboard {
  fecha_inicio: string;
  fecha_fin: string;
  vista: 'facturas' | 'cobranza';
  filtros: FiltrosDashboard;
  desgloses: DimensionDashboard[];
  /** Compatibilidad temporal con respuestas o clientes del contrato anterior. */
  desglose?: DimensionDashboard | null;
  orden: { campo: 'pzas' | 'existencia' | 'venta' | 'participacion'; direccion: 'asc' | 'desc' };
}

export interface RespuestaConsultaDashboard {
  consulta: ConsultaDashboard;
  columnas: { key: string; label: string; tipo: 'dimension' | 'informativa' | 'metrica' }[];
  filas: Array<Record<string, unknown>>;
  totales: { pzas: number; venta?: number };
  permisos: { ocultar_montos: boolean };
}

export interface TendenciaDashboardPeriodo {
  periodo: string;
  label: string;
  pzas: number;
  venta?: number;
}

export interface RespuestaTendenciaDashboard {
  periodos: TendenciaDashboardPeriodo[];
  permisos: { ocultar_montos: boolean };
}

export interface ProductoSinVentaDashboard {
  product_id: number;
  etiqueta: string;
  ultima_venta: string | null;
  dias_sin_venta: number | null;
  existencia: number;
  con_existencia: boolean;
}

export interface RespuestaSinVentaDashboard {
  fecha_corte: string;
  productos: ProductoSinVentaDashboard[];
  top: ProductoSinVentaDashboard[];
  total: number;
  nunca_vendidos: number;
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

  getDashboardCategorias(fechaInicio: string, fechaFin: string, vista: 'facturas' | 'cobranza', categoria?: string): Observable<DashboardCategorias> {
    const categoriaParam = categoria ? `&categoria=${encodeURIComponent(categoria)}` : '';
    return this.http.get<DashboardCategorias>(
      `${this.apiUrl}/ventas/dashboard/categorias?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&vista=${vista}${categoriaParam}`
    );
  }

  obtenerFiltrosDashboard(payload: {
    fecha_inicio: string;
    fecha_fin: string;
    vista: 'facturas' | 'cobranza';
    dimension: DimensionDashboard;
    buscar?: string;
    filtros?: FiltrosDashboard;
    limite?: number;
  }): Observable<RespuestaFiltrosDashboard> {
    return this.http.post<RespuestaFiltrosDashboard>(`${this.apiUrl}/ventas/dashboard/filtros`, payload);
  }

  consultarDashboard(payload: ConsultaDashboard): Observable<RespuestaConsultaDashboard> {
    return this.http.post<RespuestaConsultaDashboard>(`${this.apiUrl}/ventas/dashboard/consulta`, payload);
  }

  consultarSinVentaDashboard(payload: ConsultaDashboard): Observable<RespuestaSinVentaDashboard> {
    return this.http.post<RespuestaSinVentaDashboard>(`${this.apiUrl}/ventas/dashboard/sin-venta`, payload);
  }

  consultarTendenciaDashboard(payload: Pick<ConsultaDashboard, 'fecha_inicio' | 'fecha_fin' | 'vista' | 'filtros'>): Observable<RespuestaTendenciaDashboard> {
    return this.http.post<RespuestaTendenciaDashboard>(`${this.apiUrl}/ventas/dashboard/tendencia`, payload);
  }
}
