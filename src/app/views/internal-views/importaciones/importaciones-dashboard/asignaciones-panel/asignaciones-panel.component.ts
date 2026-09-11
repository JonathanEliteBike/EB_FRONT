import { Component, Input, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  AsignacionesImportacionService,
  AsignacionesGlobalResumen,
  AsignacionesProductosGlobal,
  AsignacionesProductoGlobal,
  AsignacionesGlobalFiltros,
  AsignacionesProducto,
} from '../../../../../services/asignaciones-importacion.service';
import { AsignacionesDetalleProductoComponent } from '../../asignaciones-importacion/asignaciones-detalle-producto/asignaciones-detalle-producto.component';

type Vista = 'embarques' | 'productos';

@Component({
  selector: 'app-asignaciones-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AsignacionesDetalleProductoComponent],
  templateUrl: './asignaciones-panel.component.html',
  styleUrl: './asignaciones-panel.component.css',
})
export class AsignacionesPanelComponent implements OnInit, OnChanges, OnDestroy {
  /** Filtros heredados de la barra superior del dashboard. */
  @Input() estado = '';
  @Input() origen = '';
  @Input() anio = '';

  vista: Vista = 'embarques';

  // Filtros locales del panel
  busqueda = '';
  soloDisponible = false;
  periodo = '';
  sku = '';

  cargando = false;
  error = '';
  resumen: AsignacionesGlobalResumen | null = null;
  productos: AsignacionesProductosGlobal | null = null;

  /** Detalle de reserva abierto en el propio panel (sin navegar al embarque). */
  detalleImportacionId = 0;
  detalleProducto: AsignacionesProducto | null = null;

  private recargar$ = new Subject<void>();
  private sub?: Subscription;

  constructor(
    private svc: AsignacionesImportacionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sub = this.recargar$.pipe(debounceTime(300)).subscribe(() => this.cargar());
    this.cargar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['estado'] && !changes['origen'] && !changes['anio']) return;
    if (changes['estado']?.firstChange && changes['origen']?.firstChange && changes['anio']?.firstChange) return;
    this.recargar$.next();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cambiarVista(v: Vista): void {
    if (v === this.vista) return;
    this.vista = v;
    this.cargar();
  }

  /** Los inputs de texto disparan recarga con debounce; selects/checkbox recargan al momento. */
  pedirRecarga(inmediata = false): void {
    if (inmediata) this.cargar();
    else this.recargar$.next();
  }

  private filtros(): AsignacionesGlobalFiltros {
    const base: AsignacionesGlobalFiltros = {
      estado: this.estado || undefined,
      origen: this.origen || undefined,
      anio: this.anio || undefined,
      q: this.busqueda.trim() || undefined,
    };
    if (this.vista === 'embarques') {
      return { ...base, solo_con_disponible: this.soloDisponible || undefined };
    }
    return {
      ...base,
      solo_disponible: this.soloDisponible || undefined,
      periodo: this.periodo.trim() || undefined,
      sku: this.sku.trim() || undefined,
      limite: 500,
    };
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const done = () => (this.cargando = false);
    if (this.vista === 'embarques') {
      this.svc.resumenGlobal(this.filtros()).subscribe({
        next: (d) => { this.resumen = d; done(); },
        error: (e) => { this.error = e?.error?.error?.message || 'No se pudo cargar el panel'; done(); },
      });
    } else {
      this.svc.productosGlobal(this.filtros()).subscribe({
        next: (d) => { this.productos = d; done(); },
        error: (e) => { this.error = e?.error?.error?.message || 'No se pudo cargar el panel'; done(); },
      });
    }
  }

  irAEmbarque(id: number): void {
    this.router.navigate(['/importaciones', id, 'asignaciones'], {
      queryParams: { from: 'dashboard', tab: 'asignaciones' },
    });
  }

  /** Abre el panel de reserva del producto sin salir del dashboard. */
  abrirDetalle(p: AsignacionesProductoGlobal): void {
    this.detalleImportacionId = p.importacion_id;
    this.detalleProducto = this._productoParaDetalle(p);
  }

  cerrarDetalle(): void {
    this.detalleProducto = null;
  }

  onCambioEnDetalle(): void {
    this.cargar();
  }

  /** El panel de detalle recarga su propio estado al abrir; estos valores
   *  solo se ven un instante mientras eso ocurre. */
  private _productoParaDetalle(p: AsignacionesProductoGlobal): AsignacionesProducto {
    const reservado = p.cantidad_asignada;
    return {
      id: p.producto_id,
      importacion_id: p.importacion_id,
      periodo: p.periodo,
      sku: p.sku,
      sku_norm: '',
      descripcion: p.descripcion,
      cantidad_embarcada: p.cantidad_embarcada,
      cantidad_asignada: reservado,
      cantidad_reservada: reservado,
      reservado_inicial: Math.max(0, reservado - p.cantidad_pendiente),
      reservado_reasignacion_pendiente: p.cantidad_pendiente,
      reservado_confirmado: 0,
      reservado_total: reservado,
      cantidad_vendida: p.cantidad_vendida,
      cantidad_sobrante: p.cantidad_sobrante,
      cantidad_disponible: p.cantidad_disponible,
      created_at: '',
      updated_at: '',
    };
  }
}
