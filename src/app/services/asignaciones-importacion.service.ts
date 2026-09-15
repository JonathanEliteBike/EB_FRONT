import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AsignacionesProducto {
  id: number;
  importacion_id: number;
  periodo: string;
  sku: string;
  sku_norm: string;
  descripcion: string | null;
  cantidad_embarcada: number;
  cantidad_asignada: number;        // alias de reservado_total (compat)
  cantidad_reservada: number;
  reservado_inicial: number;
  reservado_reasignacion_pendiente: number;
  reservado_confirmado: number;
  reservado_total: number;
  cantidad_vendida: number;
  cantidad_sobrante: number;
  cantidad_disponible: number;
  created_at: string;
  updated_at: string;
}

export interface AsignacionesKpis {
  unidades_embarcadas: number;
  unidades_reservadas: number;
  unidades_asignadas: number;       // alias de unidades_reservadas (compat)
  reservado_inicial: number;
  reservado_reasignacion_pendiente: number;
  reservado_confirmado: number;
  unidades_sobrantes: number;
  unidades_vendidas: number;
  unidades_disponibles: number;
}

export interface AsignacionesResumen {
  embarque: { id: number; referencia: string; nombre: string; estado: string };
  kpis: AsignacionesKpis;
  productos: AsignacionesProducto[];
}

export type OrigenReserva = 'INICIAL' | 'REASIGNACION';
export type EstadoReserva =
  | 'RESERVADA' | 'PENDIENTE_CONFIRMACION' | 'CONFIRMADA' | 'RECHAZADA' | 'CANCELADA';

export interface PropuestaMes {
  mes: string;            // 'YYYY-MM'
  proyectado: number;
  vigente: number;
  sugerido: number;
}

export interface PropuestaClienteMensual {
  clave_cliente: string;
  nombre_cliente: string;
  prioridad: number;
  meses: PropuestaMes[];
  proyectado_total: number;
  sugerido_total: number;
  faltante_total: number;
}

export interface PropuestaProducto {
  producto_id: number;
  sku: string;
  descripcion: string | null;
  periodo: string;
  cantidad_embarcada: number;
  disponible: number;
  proyecciones_disponibles: boolean;
  origen: OrigenReserva;
  ventana: { desde: string; hasta: string };
  propuesta: PropuestaClienteMensual[];
  sobrante_estimado: number;
}

export interface ReservaRow {
  id: number;
  importacion_producto_id: number;
  clave_cliente: string;
  mes_objetivo: string | null;      // 'YYYY-MM'
  origen: OrigenReserva;
  estado: EstadoReserva;
  cantidad_proyectada: number;
  cantidad_asignada: number;
  prioridad: number;
  proyectado: number;
  reservado: number;
  faltante: number;
  confirmada_at?: string | null;
  confirmada_por?: number | null;
}

export interface VentaSobrante {
  id: number;
  importacion_producto_id: number;
  clave_cliente: string;
  cantidad: number;
  numero_pedido_odoo: string | null;
  estado: 'PENDIENTE_VALIDACION' | 'VALIDADO' | 'CANCELADO';
  created_at: string;
}

export interface DetalleProducto {
  producto: AsignacionesProducto;
  proyecciones: never[];            // la propuesta se pide aparte con recalcular()
  asignaciones: ReservaRow[];       // alias de reservas (compat)
  reservas: ReservaRow[];
  sobrantes_ventas: VentaSobrante[];
}

export interface Movimiento {
  id: number;
  importacion_producto_id: number;
  tipo_movimiento: string;
  cantidad: number;
  clave_cliente: string | null;
  referencia_externa: string | null;
  created_at: string;
}

export interface ClientePrioridad {
  clave: string;
  nombre: string;
  prioridad: number;
}

export interface ImportacionErrorFila {
  fila: number | null;
  sku: string | null;
  motivo: string;
}

export interface ImportacionResultado {
  insertados: number;
  actualizados: number;
  total_filas: number;
  errores: ImportacionErrorFila[];
}

export interface AsignacionesGlobalKpis {
  embarcadas: number;
  asignadas: number;
  pendientes: number;
  sobrantes: number;
  vendidas: number;
  disponibles: number;
}

export interface AsignacionesEmbarqueFila {
  id: number;
  referencia: string;
  nombre: string;
  estado: string;
  n_productos: number;
  n_periodos: number;
  kpis: AsignacionesGlobalKpis;
  ultima_actividad: string | null;
}

export interface AsignacionesGlobalResumen {
  embarques: AsignacionesEmbarqueFila[];
  totales: AsignacionesGlobalKpis & { n_embarques: number };
}

export interface AsignacionesProductoGlobal {
  importacion_id: number;
  referencia: string;
  embarque_nombre: string;
  embarque_estado: string;
  producto_id: number;
  sku: string;
  descripcion: string | null;
  periodo: string;
  cantidad_embarcada: number;
  cantidad_asignada: number;
  cantidad_pendiente: number;
  cantidad_sobrante: number;
  cantidad_vendida: number;
  cantidad_disponible: number;
}

export interface AsignacionesProductosGlobal {
  productos: AsignacionesProductoGlobal[];
  totales: AsignacionesGlobalKpis;
  total_filas: number;
  limite: number;
  offset: number;
}

export interface AsignacionesGlobalFiltros {
  estado?: string;
  origen?: string;
  anio?: string;
  q?: string;
  importacion_id?: number | string;
  periodo?: string;
  sku?: string;
  solo_con_disponible?: boolean;
  solo_disponible?: boolean;
  limite?: number;
  offset?: number;
}

interface ApiOk<T> { ok: true; data: T; }

@Injectable({ providedIn: 'root' })
export class AsignacionesImportacionService {
  private base = `${environment.apiUrl}/importaciones`;

  constructor(private http: HttpClient) {}

  resumen(importacionId: number): Observable<AsignacionesResumen> {
    return this.http.get<ApiOk<AsignacionesResumen>>(`${this.base}/${importacionId}/asignaciones`)
      .pipe(map(r => r.data));
  }

  private _params(filtros: AsignacionesGlobalFiltros = {}): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(filtros)) {
      if (v === undefined || v === null || v === '' || v === false) continue;
      p = p.set(k, v === true ? '1' : String(v));
    }
    return p;
  }

  /** Un renglón por embarque con productos, con KPIs de asignación agregados. */
  resumenGlobal(filtros: AsignacionesGlobalFiltros = {}): Observable<AsignacionesGlobalResumen> {
    return this.http
      .get<ApiOk<AsignacionesGlobalResumen>>(`${this.base}/asignaciones/embarques`, { params: this._params(filtros) })
      .pipe(map(r => r.data));
  }

  /** Lista plana de productos cruzando todos los embarques (vista por SKU). */
  productosGlobal(filtros: AsignacionesGlobalFiltros = {}): Observable<AsignacionesProductosGlobal> {
    return this.http
      .get<ApiOk<AsignacionesProductosGlobal>>(`${this.base}/asignaciones/productos`, { params: this._params(filtros) })
      .pipe(map(r => r.data));
  }

  listarProductos(importacionId: number): Observable<AsignacionesProducto[]> {
    return this.http.get<ApiOk<AsignacionesProducto[]>>(`${this.base}/${importacionId}/asignaciones/productos`)
      .pipe(map(r => r.data));
  }

  crearProducto(
    importacionId: number,
    body: { sku: string; cantidad_embarcada: number; periodo: string; descripcion?: string }
  ): Observable<AsignacionesProducto> {
    return this.http
      .post<ApiOk<AsignacionesProducto>>(`${this.base}/${importacionId}/asignaciones/productos`, body)
      .pipe(map(r => r.data));
  }

  actualizarProducto(
    importacionId: number,
    productoId: number,
    body: { cantidad_embarcada?: number; descripcion?: string }
  ): Observable<AsignacionesProducto> {
    return this.http
      .put<ApiOk<AsignacionesProducto>>(`${this.base}/${importacionId}/asignaciones/productos/${productoId}`, body)
      .pipe(map(r => r.data));
  }

  importarProductos(
    importacionId: number,
    file: File,
    periodo: string
  ): Observable<ImportacionResultado> {
    const form = new FormData();
    form.append('file', file);
    form.append('periodo', periodo);
    return this.http
      .post<ApiOk<ImportacionResultado>>(
        `${this.base}/${importacionId}/asignaciones/productos/importar`, form
      )
      .pipe(map(r => r.data));
  }

  detalleProducto(importacionId: number, productoId: number): Observable<DetalleProducto> {
    return this.http
      .get<ApiOk<DetalleProducto>>(`${this.base}/${importacionId}/asignaciones/productos/${productoId}/detalle`)
      .pipe(map(r => r.data));
  }

  /** Propuesta de reserva inicial para la ventana [mesDesde .. mesHasta] (YYYY-MM o nombre de mes). */
  recalcular(
    importacionId: number, mesDesde: string, mesHasta: string, periodo?: string
  ): Observable<PropuestaProducto[]> {
    return this.http
      .post<ApiOk<PropuestaProducto[]>>(
        `${this.base}/${importacionId}/asignaciones/recalcular`,
        { mes_desde: mesDesde, mes_hasta: mesHasta, periodo }
      )
      .pipe(map(r => r.data));
  }

  /** Propuesta de reasignación del sobrante a meses anteriores a `ventanaDesde`. */
  proponerReasignacion(
    importacionId: number, ventanaDesde: string, periodo?: string
  ): Observable<PropuestaProducto[]> {
    return this.http
      .post<ApiOk<PropuestaProducto[]>>(
        `${this.base}/${importacionId}/asignaciones/reasignar`,
        { ventana_desde: ventanaDesde, periodo }
      )
      .pipe(map(r => r.data));
  }

  private _reservarBody(
    reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[]
  ) {
    return { reservas };
  }

  /** Confirma las reservas iniciales (origen INICIAL). */
  reservar(
    importacionId: number,
    productoId: number,
    reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[]
  ): Observable<{ producto_id: number; disponible_restante: number }> {
    return this.http
      .post<ApiOk<{ producto_id: number; disponible_restante: number }>>(
        `${this.base}/${importacionId}/asignaciones/productos/${productoId}/reservar`,
        this._reservarBody(reservas)
      )
      .pipe(map(r => r.data));
  }

  /** Confirma las reservas de reasignación (origen REASIGNACION, quedan PENDIENTE_CONFIRMACION). */
  confirmarReasignacion(
    importacionId: number,
    productoId: number,
    reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[]
  ): Observable<{ producto_id: number; disponible_restante: number }> {
    return this.http
      .post<ApiOk<{ producto_id: number; disponible_restante: number }>>(
        `${this.base}/${importacionId}/asignaciones/productos/${productoId}/reasignar`,
        this._reservarBody(reservas)
      )
      .pipe(map(r => r.data));
  }

  /** Resuelve una reserva PENDIENTE_CONFIRMACION tras hablar con el cliente. */
  resolverReserva(
    importacionId: number, reservaId: number, decision: 'ACEPTADA' | 'RECHAZADA'
  ): Observable<ReservaRow> {
    return this.http
      .post<ApiOk<ReservaRow>>(
        `${this.base}/${importacionId}/asignaciones/reservas/${reservaId}/resolver`, { decision }
      )
      .pipe(map(r => r.data));
  }

  ventaSobrante(
    importacionId: number,
    productoId: number,
    body: { clave_cliente: string; cantidad: number; numero_pedido_odoo?: string }
  ): Observable<VentaSobrante> {
    return this.http
      .post<ApiOk<VentaSobrante>>(
        `${this.base}/${importacionId}/asignaciones/productos/${productoId}/venta-sobrante`, body
      )
      .pipe(map(r => r.data));
  }

  validarOdoo(importacionId: number, ventaId: number, numeroPedidoOdoo?: string): Observable<VentaSobrante> {
    return this.http
      .post<ApiOk<VentaSobrante>>(
        `${this.base}/${importacionId}/asignaciones/ventas/${ventaId}/validar-odoo`,
        { numero_pedido_odoo: numeroPedidoOdoo }
      )
      .pipe(map(r => r.data));
  }

  cancelarVenta(importacionId: number, ventaId: number): Observable<VentaSobrante> {
    return this.http
      .post<ApiOk<VentaSobrante>>(`${this.base}/${importacionId}/asignaciones/ventas/${ventaId}/cancelar`, {})
      .pipe(map(r => r.data));
  }

  cancelarAsignacion(importacionId: number, productoId: number, asignacionId: number): Observable<ReservaRow> {
    return this.http
      .post<ApiOk<ReservaRow>>(
        `${this.base}/${importacionId}/asignaciones/productos/${productoId}/asignaciones/${asignacionId}/cancelar`, {}
      )
      .pipe(map(r => r.data));
  }

  movimientos(importacionId: number): Observable<Movimiento[]> {
    return this.http
      .get<ApiOk<Movimiento[]>>(`${this.base}/${importacionId}/asignaciones/movimientos`)
      .pipe(map(r => r.data));
  }

  prioridadClientes(): Observable<ClientePrioridad[]> {
    return this.http.get<ClientePrioridad[]>(`${environment.apiUrl}/clientes/prioridad`);
  }

  /** Periodos disponibles para elegir al dar de alta/importar productos. Lista
   *  explícita (no un rango calculado): crece solo cuando alguien decide abrir
   *  el siguiente periodo con crearSiguientePeriodoActivo(). */
  periodosActivos(): Observable<string[]> {
    return this.http
      .get<ApiOk<string[]>>(`${this.base}/asignaciones/periodos`)
      .pipe(map(r => r.data));
  }

  crearSiguientePeriodoActivo(): Observable<string[]> {
    return this.http
      .post<ApiOk<string[]>>(`${this.base}/asignaciones/periodos/siguiente`, {})
      .pipe(map(r => r.data));
  }
}
