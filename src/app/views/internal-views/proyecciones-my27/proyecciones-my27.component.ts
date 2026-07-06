import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import {
  ProyeccionesMY27Service,
  ProyeccionesMY27Response,
  ArticuloMY27,
  DesgloseDist,
} from '../../../services/proyecciones-my27.service';

@Component({
  selector: 'app-proyecciones-my27',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './proyecciones-my27.component.html',
  styleUrl: './proyecciones-my27.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyeccionesMY27Component implements OnInit {

  datos: ProyeccionesMY27Response | null = null;
  cargando = true;
  error = '';

  // Filtro de búsqueda
  busqueda = '';

  // Expansión de desglose por SKU
  expandidos = new Set<string>();

  // SKU seleccionado para modal de desglose
  articuloModal: ArticuloMY27 | null = null;
  modalAbierto = false;

  readonly mesesLabels = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'];
  readonly mesesKeys   = ['mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'enero', 'febrero', 'marzo', 'abril'];

  constructor(
    private svc: ProyeccionesMY27Service,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(refresh = false): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();
    this.svc.getDatos('2026-2027', refresh).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar proyecciones MY27.';
        this.cargando = false;
        this.cdr.markForCheck();
        console.error(err);
      },
    });
  }

  exportar(): void {
    window.open(this.svc.getExportUrl(), '_blank');
  }

  exportarMegamo(): void {
    window.open(this.svc.getExportUrl(this.datos?.periodo ?? '2026-2027', 'MEGAMO'), '_blank');
  }

  get articulosFiltrados(): ArticuloMY27[] {
    if (!this.datos) return [];
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.datos.articulos;
    return this.datos.articulos.filter(
      (a) =>
        a.sku.toLowerCase().includes(q) ||
        a.producto.toLowerCase().includes(q) ||
        a.marca.toLowerCase().includes(q) ||
        a.modelo.toLowerCase().includes(q),
    );
  }

  getCantidad(art: ArticuloMY27, mes: string): number {
    return art.meses[mes]?.cantidad ?? 0;
  }

  isDisponible(art: ArticuloMY27, mes: string): boolean {
    return art.meses[mes]?.disponible ?? true;
  }

  getCelClass(art: ArticuloMY27, mes: string): string {
    if (!this.isDisponible(art, mes)) return 'cel-bloqueado';
    const v = this.getCantidad(art, mes);
    return v > 0 ? 'cel-con-valor' : 'cel-vacio';
  }

  toggleExpandir(sku: string): void {
    if (this.expandidos.has(sku)) {
      this.expandidos.delete(sku);
    } else {
      this.expandidos.add(sku);
    }
    this.cdr.markForCheck();
  }

  estaExpandido(sku: string): boolean {
    return this.expandidos.has(sku);
  }

  abrirModal(art: ArticuloMY27): void {
    this.articuloModal = art;
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.articuloModal = null;
    this.cdr.markForCheck();
  }

  trackBySku(_: number, art: ArticuloMY27): string {
    return art.sku;
  }

  trackByCliente(_: number, d: DesgloseDist): string {
    return d.clave_cliente;
  }

  getTotalMes(mes: string): number {
    return this.datos?.totales_mes[mes] ?? 0;
  }

  getTotalCostoMes(mes: string): number {
    return this.datos?.total_costo_mes?.[mes] ?? 0;
  }

  formatPrecio(v: number): string {
    return v > 0 ? '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 0 }) : '—';
  }

  formatCosto(v: number): string {
    if (!v || v === 0) return '—';
    return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

}
