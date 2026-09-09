import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AsignacionesImportacionService,
  AsignacionesProducto,
  DetalleProducto,
  PropuestaProducto,
  Movimiento,
  VentaSobrante,
} from '../../../../../services/asignaciones-importacion.service';

type Tab = 'proyecciones' | 'asignaciones' | 'sobrantes' | 'movimientos';

@Component({
  selector: 'app-asignaciones-detalle-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-detalle-producto.component.html',
  styleUrl: './asignaciones-detalle-producto.component.css',
})
export class AsignacionesDetalleProductoComponent implements OnChanges {
  @Input() importacionId!: number;
  @Input() producto!: AsignacionesProducto;
  @Output() cerrar = new EventEmitter<void>();
  @Output() cambio = new EventEmitter<void>();

  tab: Tab = 'proyecciones';
  cargando = true;
  detalle: DetalleProducto | null = null;
  errorDetalle = '';

  propuesta: PropuestaProducto | null = null;
  recalculando = false;
  formAsignacion: { clave_cliente: string; cantidad: number }[] = [];
  guardandoAsignacion = false;
  errorAsignacion = '';

  nuevaVenta = { clave_cliente: '', cantidad: null as number | null, numero_pedido_odoo: '' };
  guardandoVenta = false;
  errorVenta = '';
  validandoVentaId: number | null = null;
  folioParaValidar = '';

  movimientos: Movimiento[] = [];
  cargandoMovimientos = false;
  errorMovimientos = '';

  constructor(private svc: AsignacionesImportacionService) {}

  ngOnChanges(): void {
    this.tab = 'proyecciones';
    this.propuesta = null;
    this.formAsignacion = [];
    this.guardandoAsignacion = false;
    this.errorAsignacion = '';
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

  recalcular(): void {
    this.recalculando = true;
    this.errorAsignacion = '';
    this.svc.recalcular(this.importacionId, this.producto.periodo).subscribe({
      next: (propuestas) => {
        this.recalculando = false;
        this.propuesta = propuestas.find((p) => p.producto_id === this.producto.id) || null;
        this.formAsignacion = (this.propuesta?.propuesta || []).map((c) => ({
          clave_cliente: c.clave_cliente,
          cantidad: c.cantidad_sugerida,
        }));
      },
      error: (err) => {
        this.recalculando = false;
        this.errorAsignacion = err?.error?.error?.message || 'No se pudo recalcular la propuesta';
      },
    });
  }

  agregarFilaManual(): void {
    this.formAsignacion.push({ clave_cliente: '', cantidad: 0 });
  }

  quitarFila(i: number): void {
    this.formAsignacion.splice(i, 1);
  }

  confirmarAsignacion(): void {
    const asignaciones = this.formAsignacion.filter((f) => f.clave_cliente.trim() && f.cantidad > 0);
    if (!asignaciones.length) {
      this.errorAsignacion = 'Agrega al menos una asignación con cantidad > 0';
      return;
    }
    this.guardandoAsignacion = true;
    this.errorAsignacion = '';
    this.svc.asignar(this.importacionId, this.producto.id, asignaciones).subscribe({
      next: () => {
        this.guardandoAsignacion = false;
        this.formAsignacion = [];
        this.propuesta = null;
        this.cargarDetalle();
        this.cambio.emit();
      },
      error: (err) => {
        this.guardandoAsignacion = false;
        this.errorAsignacion = err?.error?.error?.message || 'No se pudo confirmar la asignación';
      },
    });
  }

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
