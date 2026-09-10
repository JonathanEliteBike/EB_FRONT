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
  AsignacionesGlobalFiltros,
} from '../../../../../services/asignaciones-importacion.service';

type Vista = 'embarques' | 'productos';

@Component({
  selector: 'app-asignaciones-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    this.router.navigate(['/importaciones', id, 'asignaciones']);
  }
}
