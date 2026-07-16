import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { ImportacionesService, Importacion } from '../../../services/importaciones.service';

@Component({
  selector: 'app-importaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, DatePickerComponent],
  templateUrl: './importaciones.component.html',
  styleUrl: './importaciones.component.css',
})
export class ImportacionesComponent implements OnInit, AfterViewInit, OnDestroy {
  embarques: Importacion[] = [];
  embarquesFiltrados: Importacion[] = [];
  cargando = true;
  error = '';
  busqueda = '';
  filtroOrigen = '';
  filtroVia = '';
  filtroEstado = '';
  filtroEtapa = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  readonly ETAPAS = [
    { key: 'Booking',           bg: 'rgba(59,130,246,.18)',  color: '#60a5fa' },
    { key: 'Tránsito Mar/Aér',  bg: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
    { key: 'En Aduana',         bg: 'rgba(245,158,11,.18)',  color: '#fbbf24' },
    { key: 'Tránsito Destino',  bg: 'rgba(139,92,246,.18)',  color: '#a78bfa' },
    { key: 'En Almacén',        bg: 'rgba(20,184,166,.18)',  color: '#2dd4bf' },
    { key: 'Verificación',      bg: 'rgba(99,102,241,.18)',  color: '#818cf8' },
    { key: 'Liberado',          bg: 'rgba(34,197,94,.18)',   color: '#22c55e' },
    { key: 'Pendiente',         bg: 'rgba(71,85,105,.18)',   color: '#94a3b8' },
  ];
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
    { key: 'costos',      label: 'Costos',       icon: 'fa-dollar-sign',   color: '#f97316' },
    { key: 'cierre',      label: 'Cierre',       icon: 'fa-check-circle',  color: '#84cc16' },
  ];

  private rowObserver?: IntersectionObserver;

  constructor(private svc: ImportacionesService, private router: Router, private el: ElementRef) {}

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
    const q     = this.busqueda.toLowerCase();
    const o     = this.filtroOrigen.toLowerCase();
    const v     = this.filtroVia;
    const est   = this.filtroEstado;
    const etapa = this.filtroEtapa;
    const desde = this.filtroFechaDesde;
    const hasta = this.filtroFechaHasta;
    this.embarquesFiltrados = [...this.embarques].filter((e) => {
      const matchQ = !q || e.referencia.toLowerCase().includes(q) || (e.nombre || '').toLowerCase().includes(q);
      const matchO = !o || this._normOrigen(e.log_origen || '').toLowerCase().includes(o);
      const matchV = !v || (e.via_transporte || 'MARITIMO') === v;
      const matchE = !est
        || (est === 'cerrado'   && (e as any).estado === 'cerrado')
        || (est === 'activo'    && (e as any).estado !== 'cerrado')
        || (est === 'pendiente' && this.progresoPct(e) === 0);
      const matchEtapa = !etapa || this.estadoActual(e) === etapa;
      const eta    = e.log_eta_puerto || '';
      const matchF = (!desde && !hasta) || ((!desde || eta >= desde) && (!hasta || eta <= hasta));
      return matchQ && matchO && matchV && matchE && matchEtapa && matchF;
    });
    // Dar un tick para que Angular renderice los nuevos <tr> antes de observar
    setTimeout(() => this.observeRows(), 0);
  }

  toggleFiltroEstado(val: string): void {
    this.filtroEstado = this.filtroEstado === val ? '' : val;
    this.filtroVia    = '';
    this.filtrar();
  }

  toggleEtapa(key: string): void {
    this.filtroEtapa = this.filtroEtapa === key ? '' : key;
    this.filtrar();
  }

  countEtapa(key: string): number {
    return this.embarques.filter(e => this.estadoActual(e) === key).length;
  }

  toggleFiltroVia(val: string): void {
    this.filtroVia    = this.filtroVia === val ? '' : val;
    this.filtroEstado = '';   // limpiar filtro de estado al activar filtro de vía
    this.filtrar();
  }

  onRangoFecha(rango: { desde: string; hasta: string }): void {
    this.filtroFechaDesde = rango.desde;
    this.filtroFechaHasta = rango.hasta;
    this.filtrar();
  }

  progresoPct(imp: Importacion): number {
    return this.svc.progresoPct(imp);
  }

  pctSeccion(imp: Importacion, key: string): number {
    return imp.progreso ? (imp.progreso as any)[key]?.pct ?? 0 : 0;
  }

  colorPct(pct: number): string {
    if (pct === 100) return '#22c55e';
    if (pct >= 60)   return '#f59e0b';
    if (pct > 0)     return '#ef4444';
    return '#374151';
  }

  abrirDetalle(id: number): void {
    this.router.navigate(['/importaciones', id]);
  }

  estadoActual(e: Importacion): string {
    if (e.rec_liberacion_final)  return 'Liberado';
    if (e.alm_envio_info_uva)    return 'Verificación';
    if (e.des_llegada_almacen)   return 'En Almacén';
    if (e.des_fecha_cruce_real)  return 'Tránsito Destino';
    if (e.log_eta_puerto)        return 'En Aduana';
    if (e.log_fecha_booking)     return 'Tránsito Mar/Aér';
    if (e.log_fecha_entrega)     return 'Booking';
    return 'Pendiente';
  }

  private static readonly _ESTADO_CFG: Record<string, { bg: string; color: string }> = {
    'Liberado':          { bg: 'rgba(34,197,94,.18)',  color: '#22c55e' },
    'Verificación':      { bg: 'rgba(99,102,241,.18)', color: '#818cf8' },
    'En Almacén':        { bg: 'rgba(20,184,166,.18)', color: '#2dd4bf' },
    'Tránsito Destino':  { bg: 'rgba(139,92,246,.18)', color: '#a78bfa' },
    'En Aduana':         { bg: 'rgba(245,158,11,.18)', color: '#fbbf24' },
    'Tránsito Mar/Aér':  { bg: 'rgba(6,182,212,.18)',  color: '#22d3ee' },
    'Booking':           { bg: 'rgba(59,130,246,.18)', color: '#60a5fa' },
    'Pendiente':         { bg: 'rgba(71,85,105,.18)',  color: '#94a3b8' },
  };

  estadoStyle(e: Importacion): { background: string; color: string } {
    const cfg = ImportacionesComponent._ESTADO_CFG[this.estadoActual(e)]
              ?? { bg: 'rgba(71,85,105,.18)', color: '#94a3b8' };
    return { background: cfg.bg, color: cfg.color };
  }

  private _normOrigen(s: string): string {
    if (!s) return '';
    const key = s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
    const canon: Record<string, string> = { 'ESPANA': 'ESPAÑA', 'BELGICA': 'BÉLGICA' };
    return canon[key] ?? key;
  }

  get origenes(): string[] {
    return [...new Set(this.embarques.map((e) => this._normOrigen(e.log_origen || '')).filter(Boolean))].sort();
  }

  get stats() {
    const total      = this.embarques.length;
    const cerrados   = this.embarques.filter((e) => (e as any).estado === 'cerrado').length;
    const pendientes = this.embarques.filter((e) => this.progresoPct(e) === 0).length;
    const enProceso  = total - cerrados - pendientes;
    const maritimo   = this.embarques.filter((e) => (e.via_transporte || 'MARITIMO') === 'MARITIMO').length;
    const aereo      = this.embarques.filter((e) => e.via_transporte === 'AEREO').length;
    return { total, completados: cerrados, enProceso, pendientes, maritimo, aereo };
  }

  eliminando: number | null = null;

  eliminar(e: Importacion, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el embarque "${e.referencia} - ${e.nombre || ''}"?\nEsta acción no se puede deshacer.`)) return;
    this.eliminando = e.id;
    this.svc.eliminar(e.id).subscribe({
      next: () => {
        this.embarques = this.embarques.filter((x) => x.id !== e.id);
        this.filtrar();
        this.eliminando = null;
      },
      error: () => { this.eliminando = null; },
    });
  }

  ngAfterViewInit(): void {
    this.rowObserver = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('row-visible');
          this.rowObserver!.unobserve(entry.target);
        }
      }),
      { threshold: 0.05 }
    );
  }

  ngOnDestroy(): void {
    this.rowObserver?.disconnect();
  }

  private observeRows(): void {
    if (!this.rowObserver) return;
    const rows = this.el.nativeElement.querySelectorAll('.macro-row:not(.row-observed)');
    rows.forEach((row: Element) => {
      row.classList.add('row-observed');
      this.rowObserver!.observe(row);
    });
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
