import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  cantidad_asignada: number;
  cantidad_vendida: number;
  cantidad_sobrante: number;
  cantidad_disponible: number;
  created_at: string;
  updated_at: string;
}

export interface AsignacionesKpis {
  unidades_embarcadas: number;
  unidades_asignadas: number;
  unidades_sobrantes: number;
  unidades_vendidas: number;
  unidades_disponibles: number;
}

export interface AsignacionesResumen {
  embarque: { id: number; referencia: string; nombre: string; estado: string };
  kpis: AsignacionesKpis;
  productos: AsignacionesProducto[];
}

export interface PropuestaCliente {
  clave_cliente: string;
  prioridad: number;
  cantidad_proyectada: number;
  cantidad_sugerida: number;
}

export interface PropuestaProducto {
  producto_id: number;
  sku: string;
  periodo: string;
  cantidad_embarcada: number;
  disponible: number;
  proyecciones_disponibles: boolean;
  propuesta: PropuestaCliente[];
  sobrante_estimado: number;
}

export interface AsignacionRow {
  id: number;
  importacion_producto_id: number;
  clave_cliente: string;
  cantidad_proyectada: number;
  cantidad_asignada: number;
  prioridad: number;
  estado: 'ACTIVA' | 'CANCELADA';
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
  proyecciones: PropuestaCliente[];
  asignaciones: AsignacionRow[];
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

interface ApiOk<T> { ok: true; data: T; }

@Injectable({ providedIn: 'root' })
export class AsignacionesImportacionService {
  private base = `${environment.apiUrl}/importaciones`;

  constructor(private http: HttpClient) {}

  resumen(importacionId: number): Observable<AsignacionesResumen> {
    return this.http.get<ApiOk<AsignacionesResumen>>(`${this.base}/${importacionId}/asignaciones`)
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

  recalcular(importacionId: number, periodo?: string): Observable<PropuestaProducto[]> {
    return this.http
      .post<ApiOk<PropuestaProducto[]>>(`${this.base}/${importacionId}/asignaciones/recalcular`, { periodo })
      .pipe(map(r => r.data));
  }

  asignar(
    importacionId: number,
    productoId: number,
    asignaciones: { clave_cliente: string; cantidad: number; cantidad_proyectada?: number }[]
  ): Observable<{ producto_id: number; disponible_restante: number }> {
    return this.http
      .post<ApiOk<{ producto_id: number; disponible_restante: number }>>(
        `${this.base}/${importacionId}/asignaciones/productos/${productoId}/asignar`, { asignaciones }
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

  cancelarAsignacion(importacionId: number, productoId: number, asignacionId: number): Observable<AsignacionRow> {
    return this.http
      .post<ApiOk<AsignacionRow>>(
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
}
