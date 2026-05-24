import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { ImportacionesService, Importacion } from '../../../services/importaciones.service';

@Component({
  selector: 'app-importaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './importaciones.component.html',
  styleUrl: './importaciones.component.css',
})
export class ImportacionesComponent implements OnInit {
  embarques: Importacion[] = [];
  embarquesFiltrados: Importacion[] = [];
  cargando = true;
  error = '';
  busqueda = '';
  filtroOrigen = '';
  filtroVia = '';
  mostrarNuevo = false;
  guardandoNuevo = false;

  nuevoEmbarque: Partial<Importacion> = {
    referencia: '',
    nombre: '',
    via_transporte: 'MARITIMO',
    log_origen: '',
    log_tipo_productos: '',
  };

  readonly secciones = [
    { key: 'logistica',   label: 'Logística',    icon: 'fa-ship',          color: '#3b82f6' },
    { key: 'importacion', label: 'Importación',  icon: 'fa-file-alt',      color: '#f59e0b' },
    { key: 'despacho',    label: 'Despacho',     icon: 'fa-truck',         color: '#8b5cf6' },
    { key: 'odoo',        label: 'Odoo',         icon: 'fa-database',      color: '#10b981' },
    { key: 'almacen',     label: 'Almacén',      icon: 'fa-warehouse',     color: '#ec4899' },
    { key: 'recepcion',   label: 'Recepción',    icon: 'fa-box-open',      color: '#06b6d4' },
    { key: 'cierre',      label: 'Cierre',       icon: 'fa-check-circle',  color: '#84cc16' },
  ];

  constructor(private svc: ImportacionesService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar().subscribe({
      next: (data) => {
        this.embarques = data;
        this.filtrar();
        this.cargando = false;
      },
      error: (e) => {
        this.error = 'Error al cargar importaciones';
        this.cargando = false;
      },
    });
  }

  filtrar(): void {
    const q = this.busqueda.toLowerCase();
    const o = this.filtroOrigen.toLowerCase();
    const v = this.filtroVia;
    this.embarquesFiltrados = this.embarques.filter((e) => {
      const matchQ = !q || e.referencia.toLowerCase().includes(q) || (e.nombre || '').toLowerCase().includes(q);
      const matchO = !o || (e.log_origen || '').toLowerCase().includes(o);
      const matchV = !v || (e.via_transporte || 'MARITIMO') === v;
      return matchQ && matchO && matchV;
    });
  }

  progresoPct(imp: Importacion): number {
    return this.svc.progresoPct(imp);
  }

  pctSeccion(imp: Importacion, key: string): number {
    return imp.progreso ? (imp.progreso as any)[key]?.pct ?? 0 : 0;
  }

  colorPct(pct: number): string {
    if (pct === 100) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    if (pct > 0)   return '#3b82f6';
    return '#374151';
  }

  abrirDetalle(id: number): void {
    this.router.navigate(['/importaciones', id]);
  }

  get origenes(): string[] {
    return [...new Set(this.embarques.map((e) => e.log_origen || '').filter(Boolean))].sort();
  }

  get stats() {
    const total = this.embarques.length;
    const completados = this.embarques.filter((e) => this.progresoPct(e) === 100).length;
    const enProceso = this.embarques.filter((e) => {
      const p = this.progresoPct(e);
      return p > 0 && p < 100;
    }).length;
    const maritimo = this.embarques.filter((e) => (e.via_transporte || 'MARITIMO') === 'MARITIMO').length;
    const aereo = this.embarques.filter((e) => e.via_transporte === 'AEREO').length;
    return { total, completados, enProceso, pendientes: total - completados - enProceso, maritimo, aereo };
  }

  crearNuevo(): void {
    if (!this.nuevoEmbarque.referencia?.trim()) return;
    this.guardandoNuevo = true;
    this.svc.crear(this.nuevoEmbarque).subscribe({
      next: (res) => {
        this.guardandoNuevo = false;
        this.mostrarNuevo = false;
        this.nuevoEmbarque = { referencia: '', nombre: '', via_transporte: 'MARITIMO', log_origen: '', log_tipo_productos: '' };
        this.router.navigate(['/importaciones', res.id]);
      },
      error: () => {
        this.guardandoNuevo = false;
      },
    });
  }
}
