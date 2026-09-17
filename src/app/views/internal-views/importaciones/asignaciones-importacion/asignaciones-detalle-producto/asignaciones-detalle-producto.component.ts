import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AsignacionesImportacionService,
  AsignacionesProducto,
  DetalleProducto,
  PropuestaProducto,
  ReservaRow,
  Movimiento,
  VentaSobrante,
} from '../../../../../services/asignaciones-importacion.service';

/** Fila editable de la propuesta: una por (cliente, mes). */
interface FilaPropuesta {
  clave_cliente: string;
  nombre_cliente: string;
  prioridad: number;
  mes: string;              // 'YYYY-MM'
  proyectado: number;
  vigente: number;
  sugerido: number;
  cantidad: number;         // lo que el usuario decide reservar
}

type Tab = 'proyecciones' | 'reservas' | 'sobrantes' | 'movimientos';
type Modo = 'inicial' | 'reasignacion';

const MESES: { valor: string; label: string }[] = [
  { valor: 'mayo', label: 'Mayo' }, { valor: 'junio', label: 'Junio' },
  { valor: 'julio', label: 'Julio' }, { valor: 'agosto', label: 'Agosto' },
  { valor: 'septiembre', label: 'Septiembre' }, { valor: 'octubre', label: 'Octubre' },
  { valor: 'noviembre', label: 'Noviembre' }, { valor: 'diciembre', label: 'Diciembre' },
  { valor: 'enero', label: 'Enero' }, { valor: 'febrero', label: 'Febrero' },
  { valor: 'marzo', label: 'Marzo' }, { valor: 'abril', label: 'Abril' },
];

@Component({
  selector: 'app-asignaciones-detalle-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-detalle-producto.component.html',
  styleUrl: './asignaciones-detalle-producto.component.css',
})
export class AsignacionesDetalleProductoComponent implements OnChanges, OnInit {
  @Input() importacionId!: number;
  @Input() producto!: AsignacionesProducto;
  @Output() cerrar = new EventEmitter<void>();
  @Output() cambio = new EventEmitter<void>();

  readonly meses = MESES;

  tab: Tab = 'proyecciones';
  cargando = true;
  detalle: DetalleProducto | null = null;
  errorDetalle = '';

  // ── Propuesta (reserva inicial / reasignación) ──
  modo: Modo = 'inicial';
  mesDesde = 'octubre';
  mesHasta = 'diciembre';
  propuesta: PropuestaProducto | null = null;
  filas: FilaPropuesta[] = [];
  calculando = false;
  guardando = false;
  errorPropuesta = '';
  errorGuardar = '';

  // ── Reservas ──
  resolviendoId: number | null = null;
  errorReservas = '';

  // ── Sobrantes / ventas ──
  nuevaVenta = { clave_cliente: '', cantidad: null as number | null, numero_pedido_odoo: '' };
  guardandoVenta = false;
  errorVenta = '';
  validandoVentaId: number | null = null;
  folioParaValidar = '';

  // ── Movimientos ──
  movimientos: Movimiento[] = [];
  cargandoMovimientos = false;
  errorMovimientos = '';

  /** clave -> nombre, para mostrar el cliente identificable en la pestaña de reservas. */
  private nombresPorClave = new Map<string, string>();

  constructor(private svc: AsignacionesImportacionService) {}

  ngOnInit(): void {
    this.svc.prioridadClientes().subscribe({
      next: (data) => { this.nombresPorClave = new Map(data.map((c) => [c.clave, c.nombre])); },
      error: () => { /* si falla, se sigue mostrando solo la clave */ },
    });
  }

  nombreCliente(clave: string): string {
    return this.nombresPorClave.get(clave) || '';
  }

  ngOnChanges(): void {
    this.tab = 'proyecciones';
    this.modo = 'inicial';
    this.propuesta = null;
    this.filas = [];
    this.calculando = false;
    this.guardando = false;
    this.errorPropuesta = '';
    this.errorGuardar = '';
    this.resolviendoId = null;
    this.errorReservas = '';
    this.nuevaVenta = { clave_cliente: '', cantidad: null, numero_pedido_odoo: '' };
    this.guardandoVenta = false;
    this.errorVenta = '';
    this.validandoVentaId = null;
    this.folioParaValidar = '';
    this.movimientos = [];
    this.errorDetalle = '';
    this.errorMovimientos = '';
    this.cargarDetalle();
  }

  get prod(): AsignacionesProducto {
    return this.detalle?.producto ?? this.producto;
  }

  cargarDetalle(): void {
    this.cargando = true;
    this.errorDetalle = '';
    this.svc.detalleProducto(this.importacionId, this.producto.id).subscribe({
      next: (data) => { this.detalle = data; this.cargando = false; },
      error: (err) => {
        this.cargando = false;
        this.errorDetalle = err?.error?.error?.message || 'No se pudo cargar el detalle del producto';
      },
    });
  }

  cambiarTab(tab: Tab): void {
    this.tab = tab;
    if (tab === 'movimientos' && this.movimientos.length === 0) {
      this.cargarMovimientos();
    }
  }

  // ── Propuesta ────────────────────────────────────────────────────────────

  private _cargarPropuesta(obs: ReturnType<AsignacionesImportacionService['recalcular']>, modo: Modo): void {
    this.calculando = true;
    this.modo = modo;
    this.errorPropuesta = '';
    this.errorGuardar = '';
    obs.subscribe({
      next: (props) => {
        this.calculando = false;
        this.propuesta = props.find((p) => p.producto_id === this.producto.id) || null;
        this.filas = [];
        for (const c of this.propuesta?.propuesta || []) {
          for (const m of c.meses) {
            this.filas.push({
              clave_cliente: c.clave_cliente,
              nombre_cliente: c.nombre_cliente,
              prioridad: c.prioridad,
              mes: m.mes,
              proyectado: m.proyectado,
              vigente: m.vigente,
              sugerido: m.sugerido,
              cantidad: m.sugerido,
            });
          }
        }
      },
      error: (err) => {
        this.calculando = false;
        this.errorPropuesta = err?.error?.error?.message || 'No se pudo calcular la propuesta';
      },
    });
  }

  recalcular(): void {
    this._cargarPropuesta(
      this.svc.recalcular(this.importacionId, this.mesDesde, this.mesHasta, this.producto.periodo),
      'inicial',
    );
  }

  reasignar(): void {
    // meses anteriores a la ventana ya trabajada (mesDesde)
    this._cargarPropuesta(
      this.svc.proponerReasignacion(this.importacionId, this.mesDesde, this.producto.periodo),
      'reasignacion',
    );
  }

  totalAReservar(): number {
    return this.filas.reduce((s, f) => s + (f.cantidad > 0 ? f.cantidad : 0), 0);
  }

  guardar(): void {
    const reservas = this.filas
      .filter((f) => f.clave_cliente && f.cantidad > 0)
      .map((f) => ({
        clave_cliente: f.clave_cliente,
        mes_objetivo: f.mes,
        cantidad: f.cantidad,
        proyectado: f.proyectado,
      }));
    if (!reservas.length) {
      this.errorGuardar = 'No hay ninguna fila con cantidad mayor a 0';
      return;
    }
    if (this.totalAReservar() > (this.propuesta?.disponible ?? 0)) {
      this.errorGuardar =
        `Estás intentando reservar ${this.totalAReservar()} y solo hay ${this.propuesta?.disponible ?? 0} disponibles`;
      return;
    }
    this.guardando = true;
    this.errorGuardar = '';
    const req = this.modo === 'inicial'
      ? this.svc.reservar(this.importacionId, this.producto.id, reservas)
      : this.svc.confirmarReasignacion(this.importacionId, this.producto.id, reservas);
    req.subscribe({
      next: () => {
        this.guardando = false;
        this.propuesta = null;
        this.filas = [];
        this.tab = 'reservas';
        this.cargarDetalle();
        this.cambio.emit();
      },
      error: (err) => {
        this.guardando = false;
        this.errorGuardar = err?.error?.error?.message
          || (this.modo === 'inicial' ? 'No se pudo reservar' : 'No se pudo confirmar la reasignación');
      },
    });
  }

  // ── Reservas ─────────────────────────────────────────────────────────────

  resolver(reserva: ReservaRow, decision: 'ACEPTADA' | 'RECHAZADA'): void {
    const txt = decision === 'ACEPTADA'
      ? `Confirmar que ${reserva.clave_cliente} SÍ quiere las ${reserva.cantidad_asignada} unidades de ${reserva.mes_objetivo}`
      : `Marcar que ${reserva.clave_cliente} NO quiere las ${reserva.cantidad_asignada} unidades de ${reserva.mes_objetivo} (pasan a sobrante)`;
    if (!confirm(txt + '?')) { return; }
    this.resolviendoId = reserva.id;
    this.errorReservas = '';
    this.svc.resolverReserva(this.importacionId, reserva.id, decision).subscribe({
      next: () => { this.resolviendoId = null; this.cargarDetalle(); this.cambio.emit(); },
      error: (err) => {
        this.resolviendoId = null;
        this.errorReservas = err?.error?.error?.message || 'No se pudo resolver la reserva';
      },
    });
  }

  cancelarReserva(reserva: ReservaRow): void {
    if (!confirm(`¿Cancelar la reserva de ${reserva.cantidad_asignada} unidades a ${reserva.clave_cliente}?`)) {
      return;
    }
    this.errorReservas = '';
    this.svc.cancelarAsignacion(this.importacionId, this.producto.id, reserva.id).subscribe({
      next: () => { this.cargarDetalle(); this.cambio.emit(); },
      error: (err) => {
        this.errorReservas = err?.error?.error?.message || 'No se pudo cancelar la reserva';
      },
    });
  }

  origenLabel(o: string): string {
    return o === 'REASIGNACION' ? 'Reasignación' : 'Inicial';
  }

  estadoLabel(e: string): string {
    return ({
      RESERVADA: 'Reservada',
      PENDIENTE_CONFIRMACION: 'Pendiente conf.',
      CONFIRMADA: 'Confirmada',
      RECHAZADA: 'Rechazada',
      CANCELADA: 'Cancelada',
    } as Record<string, string>)[e] || e;
  }

  // ── Sobrantes / ventas ───────────────────────────────────────────────────

  registrarVenta(): void {
    if (!this.nuevaVenta.clave_cliente.trim() || !this.nuevaVenta.cantidad || this.nuevaVenta.cantidad <= 0) {
      this.errorVenta = 'Cliente y cantidad (> 0) son obligatorios';
      return;
    }
    this.guardandoVenta = true;
    this.errorVenta = '';
    this.svc.ventaSobrante(this.importacionId, this.producto.id, {
      clave_cliente: this.nuevaVenta.clave_cliente.trim(),
      cantidad: this.nuevaVenta.cantidad,
      numero_pedido_odoo: this.nuevaVenta.numero_pedido_odoo.trim() || undefined,
    }).subscribe({
      next: () => {
        this.guardandoVenta = false;
        this.nuevaVenta = { clave_cliente: '', cantidad: null, numero_pedido_odoo: '' };
        this.cargarDetalle();
        this.cambio.emit();
      },
      error: (err) => {
        this.guardandoVenta = false;
        this.errorVenta = err?.error?.error?.message || 'No se pudo registrar la venta';
      },
    });
  }

  iniciarValidacion(venta: VentaSobrante): void {
    this.validandoVentaId = venta.id;
    this.folioParaValidar = venta.numero_pedido_odoo || '';
  }

  cancelarValidacion(): void {
    this.validandoVentaId = null;
    this.folioParaValidar = '';
  }

  confirmarValidacionOdoo(venta: VentaSobrante): void {
    if (!this.folioParaValidar.trim()) {
      this.errorVenta = 'Ingresa el número de pedido de Odoo';
      return;
    }
    this.errorVenta = '';
    this.svc.validarOdoo(this.importacionId, venta.id, this.folioParaValidar.trim()).subscribe({
      next: () => {
        this.validandoVentaId = null;
        this.cargarDetalle();
        this.cambio.emit();
      },
      error: (err) => {
        this.errorVenta = err?.error?.error?.message || 'No se pudo validar el pedido en Odoo';
      },
    });
  }

  cancelarVentaSobrante(venta: VentaSobrante): void {
    if (!confirm(`¿Cancelar la venta de ${venta.cantidad} unidades a ${venta.clave_cliente}?`)) {
      return;
    }
    this.errorVenta = '';
    this.svc.cancelarVenta(this.importacionId, venta.id).subscribe({
      next: () => { this.cargarDetalle(); this.cambio.emit(); },
      error: (err) => {
        this.errorVenta = err?.error?.error?.message || 'No se pudo cancelar la venta';
      },
    });
  }

  // ── Movimientos ──────────────────────────────────────────────────────────

  cargarMovimientos(): void {
    this.cargandoMovimientos = true;
    this.errorMovimientos = '';
    this.svc.movimientos(this.importacionId).subscribe({
      next: (data) => {
        this.movimientos = data.filter((m) => m.importacion_producto_id === this.producto.id);
        this.cargandoMovimientos = false;
      },
      error: (err) => {
        this.cargandoMovimientos = false;
        this.errorMovimientos = err?.error?.error?.message || 'No se pudo cargar el historial de movimientos';
      },
    });
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}
