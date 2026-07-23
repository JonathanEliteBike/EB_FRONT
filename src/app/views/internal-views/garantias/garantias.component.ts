import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { TemporadaSelectorComponent, TEMPORADA_HISTORICO } from '../../../components/temporada-selector/temporada-selector.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { GarantiasService, GarantiasDashboard, GarantiaFormulario, LatenciaTicket, CuadroDetalle } from '../../../services/garantias.service';

interface Temporada { etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string; }

Chart.register(...registerables);

const ORANGE     = '#EB5E28';
const ORANGE_DIM = 'rgba(235,94,40,0.65)';
const BG_CARD    = '#1e1e1e';
const GRID       = 'rgba(255,255,255,0.06)';
const TEXT_2     = '#CCC5B9';
const TEXT_3     = '#8a8077';

const PALETA = [
  '#EB5E28','#5c9bd6','#4caf50','#9b59b6','#f0ad4e',
  '#e53935','#26c6da','#ff7043','#66bb6a','#ab47bc',
  '#ef5350','#42a5f5','#ffa726','#26a69a','#ec407a',
];

const COLORES_ESTATUS: Record<string, string> = {
  'enviado':      '#f0ad4e',
  'en revisión':  '#5c9bd6',
  'en revision':  '#5c9bd6',
  'aprobado':     '#4caf50',
  'rechazado':    '#e53935',
  'cerrado':      '#9b59b6',
};

export interface RankItem { key: string; value: number; pct: number; color: string; }
export type ModalKey = 'garantias_cliente' | 'latencia_cliente' | 'piezas_reemplazo' | 'ubicacion_dano';

export interface ClienteResumen {
  cliente: string;
  total: number;
  porEstatus: Record<string, number>;
  latAtencionProm: number | null;
  latCierreProm: number | null;
}

type ColKardex = 'folio' | 'marca' | 'estatus' | 'fecha_creacion' | 'lat_atencion' | 'lat_cierre';
export type SortMode = 'valor_desc' | 'valor_asc' | 'alfa_asc' | 'alfa_desc';

const MODAL_META: Record<ModalKey, { titulo: string; icono: string; label: string; sublabel: string }> = {
  garantias_cliente: { titulo: 'Garantías por Cliente',    icono: 'fa-store',         label: 'Garantías',    sublabel: 'Número de garantías registradas' },
  latencia_cliente:  { titulo: 'Latencia por Cliente',     icono: 'fa-stopwatch',      label: 'Días prom.',   sublabel: 'Promedio de días de atención' },
  piezas_reemplazo:  { titulo: 'Piezas de Reemplazo',      icono: 'fa-wrench',         label: 'Cantidad',     sublabel: 'Piezas asignadas en garantías' },
  ubicacion_dano:    { titulo: 'Ubicación del Daño',       icono: 'fa-map-marker-alt', label: 'Cantidad',     sublabel: 'Frecuencia por ubicación' },
};

@Component({
  selector: 'app-garantias',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent, FormsModule, TemporadaSelectorComponent, DatePickerComponent],
  templateUrl: './garantias.component.html',
  styleUrl: './garantias.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarantiasComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartEstatus') chartEstatusRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartModal')   chartModalRef?:   ElementRef<HTMLCanvasElement>;

  dashboard: GarantiasDashboard | null = null;
  cargando  = true;
  error     = '';

  vista: 'dashboard' | 'lista' = 'dashboard';
  todos: GarantiaFormulario[] = [];
  ordenDesc     = true;
  filtroMes     = '';
  filtroKpi:    'total' | 'cerradas' | 'en_proceso' | 'enviado' | 'en_revision' | 'aprobado' | 'rechazado' | null = null;
  cargandoLista = false;
  readonly kpiPanels: { key: string; label: string; kpi: 'total' | 'cerradas' | 'en_proceso' | 'enviado' | 'en_revision' | 'aprobado' | 'rechazado' }[] = [
    { key: 'Enviado',     label: 'Enviados',    kpi: 'enviado' },
    { key: 'En revisión', label: 'En revisión', kpi: 'en_revision' },
    { key: 'Aprobado',    label: 'Aprobados',   kpi: 'aprobado' },
    { key: 'Rechazado',   label: 'Rechazados',  kpi: 'rechazado' },
  ];
  latencias:       LatenciaTicket[] = [];
  sortColLat:   'folio' | 'distribuidor' | 'estatus' | 'lat_atencion' | 'lat_cierre' = 'lat_atencion';
  sortDirLat:   'asc' | 'desc' = 'asc';

  // Modal latencias
  modalLatAbierto  = false;
  busquedaLat      = '';
  filtroEstatusLat = '';
  sortColLatMod:   'folio' | 'distribuidor' | 'estatus' | 'lat_atencion' | 'lat_cierre' = 'folio';
  sortDirLatMod:   'asc' | 'desc' = 'asc';

  sortModeRank: Record<ModalKey, SortMode> = {
    garantias_cliente: 'alfa_asc',
    latencia_cliente:  'valor_desc',
    piezas_reemplazo:  'valor_desc',
    ubicacion_dano:    'valor_desc',
  };
  readonly sortModeOpciones: { value: SortMode; label: string }[] = [
    { value: 'valor_desc', label: 'Mayor → Menor' },
    { value: 'valor_asc',  label: 'Menor → Mayor' },
    { value: 'alfa_asc',   label: 'A → Z' },
    { value: 'alfa_desc',  label: 'Z → A' },
  ];

  // Rankings pre-calculados — evita llamar métodos en *ngFor (causa de crashes)
  topLatencia:    RankItem[] = [];
  topPiezas:      RankItem[] = [];
  topUbicaciones: RankItem[] = [];

  modalAbierto = false;
  modalKey: ModalKey | null = null;
  readonly modalMeta = MODAL_META;

  // ── Temporadas / rango de fechas ───────────────────────────────────────────
  temporadas: Temporada[] = [];
  temporadaActual: Temporada | null = null;
  temporadaSeleccionada = ''; // '' = temporada actual (abierta); etiqueta = temporada cerrada
  rangoDesde = '';
  rangoHasta = '';

  get temporadasCerradas(): string[] {
    return this.temporadas.filter(t => t.estado === 'cerrada').map(t => t.etiqueta);
  }

  // ── Resumen por cliente (Garantías por Cliente + Kardex) ──────────────────
  clientesResumen: ClienteResumen[] = [];
  filtroEstatusCliente = '';

  // ── Kardex (compartido entre Garantías por Cliente y Latencia por Cliente) ─
  modalKardexAbierto = false;
  kardexCliente: string | null = null;
  sortColKardex: ColKardex = 'fecha_creacion';
  sortDirKardex: 'asc' | 'desc' = 'desc';

  // ── Cuadros por tipo de marco (desde Piezas de Reemplazo) ─────────────────
  modalCuadrosAbierto = false;
  cuadroTipoSeleccionado: string | null = null;

  private charts: Chart[] = [];
  private modalChart?: Chart;
  private autoRefreshSub?: Subscription;

  constructor(private svc: GarantiasService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarTemporadas();
    this.autoRefreshSub = interval(300_000)
      .pipe(switchMap(() => this.svc.getDashboard(this.rangoDesde, this.rangoHasta)))
      .subscribe({
        next: (d) => {
          this.dashboard = d;
          this.procesarRankings();
          this.cdr.detectChanges();
          setTimeout(() => this.renderMainCharts(), 150);
        },
        error: () => {},
      });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyMainCharts();
    this.modalChart?.destroy();
    this.autoRefreshSub?.unsubscribe();
  }

  // ── Temporadas / rango de fechas ───────────────────────────────────────────
  private cargarTemporadas(): void {
    this.svc.getTemporadas().subscribe({
      next: (temporadas) => {
        this.temporadas = temporadas;
        this.temporadaActual = temporadas.find(t => t.estado === 'abierta') ?? null;
        if (this.temporadaActual) {
          this.rangoDesde = this.temporadaActual.fecha_inicio;
          this.rangoHasta = this.temporadaActual.fecha_fin;
        }
        this.cargar();
      },
      error: () => this.cargar(), // sin temporadas disponibles -> histórico completo
    });
  }

  onTemporadaCambio(etiqueta: string): void {
    this.temporadaSeleccionada = etiqueta;
    if (etiqueta === TEMPORADA_HISTORICO) {
      // Histórico completo: sin rango -> getDashboard/latenciasFiltradas ya
      // caen a "sin filtro" cuando rangoDesde/rangoHasta vienen vacíos.
      this.rangoDesde = '';
      this.rangoHasta = '';
      this.cargar();
      return;
    }
    const t = etiqueta ? this.temporadas.find(x => x.etiqueta === etiqueta) : this.temporadaActual;
    if (t) {
      this.rangoDesde = t.fecha_inicio;
      this.rangoHasta = t.fecha_fin;
    }
    this.cargar();
  }

  onRangoManual(r: { desde: string; hasta: string }): void {
    if (!r.desde || !r.hasta) return;
    this.rangoDesde = r.desde;
    this.rangoHasta = r.hasta;
    this.cargar();
  }

  private parseFechaISO(fechaDDMMYYYY: string): string | null {
    const m = fechaDDMMYYYY?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  get latenciasFiltradas(): LatenciaTicket[] {
    if (!this.rangoDesde || !this.rangoHasta) return this.latencias;
    return this.latencias.filter(t => {
      const iso = this.parseFechaISO(t.fecha_creacion);
      return iso !== null && iso >= this.rangoDesde && iso <= this.rangoHasta;
    });
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();
    this.svc.getDashboard(this.rangoDesde, this.rangoHasta).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.cargando  = false;
        this.procesarRankings();
        this.cdr.detectChanges();
        setTimeout(() => { this.renderMainCharts(); window.scrollTo(0, 0); }, 150);
      },
      error: (err) => {
        this.error    = 'Error al cargar datos de garantías.';
        this.cargando = false;
        this.cdr.markForCheck();
        console.error(err);
      },
    });
    this.svc.getLatencias().subscribe({
      next: (l) => { this.latencias = l; this.procesarClientesResumen(); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  refrescarManual(): void { this.svc.refrescar().subscribe(() => this.cargar()); }
  exportar(): void        { window.open(this.svc.getExportUrl(undefined, this.rangoDesde, this.rangoHasta), '_blank'); }

  // ── Vista lista ──────────────────────────────────────────────────────────
  verPorKpi(kpi: 'total' | 'cerradas' | 'en_proceso' | 'enviado' | 'en_revision' | 'aprobado' | 'rechazado' | null): void {
    this.filtroKpi = kpi;
    this.filtroMes = '';
    this.vista = 'lista';
    this.cargarTodos();
    this.cdr.markForCheck();
  }

  verTodos(): void { this.verPorKpi(null); }

  cargarTodos(): void {
    this.cargandoLista = true;
    this.cdr.markForCheck();
    this.svc.listarFormularios().subscribe({
      next: ts => { this.todos = ts; this.cargandoLista = false; this.cdr.markForCheck(); },
      error: ()  => { this.cargandoLista = false; this.cdr.markForCheck(); },
    });
  }

  volverAlDashboard(): void {
    this.filtroKpi = null;
    this.vista = 'dashboard';
    this.cdr.detectChanges();
    setTimeout(() => this.renderMainCharts(), 150);
  }

  get etiquetaVista(): string {
    const labels: Record<string, string> = {
      total:       'Todas las Garantías',
      cerradas:    'Garantías Cerradas',
      en_proceso:  'Garantías en Proceso',
      enviado:     'Garantías Enviadas',
      en_revision: 'Garantías en Revisión',
      aprobado:    'Garantías Aprobadas',
      rechazado:   'Garantías Rechazadas',
    };
    return labels[this.filtroKpi ?? ''] ?? 'Todas las Garantías';
  }

  get mensajeVacio(): string {
    const msgs: Record<string, string> = {
      cerradas:    'Aún no hay garantías cerradas.',
      en_proceso:  'No hay garantías en proceso (Enviado, En revisión o Aprobado).',
      total:       'No hay garantías registradas.',
      enviado:     'No hay garantías con estatus Enviado.',
      en_revision: 'No hay garantías en revisión actualmente.',
      aprobado:    'No hay garantías aprobadas.',
      rechazado:   'No hay garantías rechazadas.',
    };
    return msgs[this.filtroKpi ?? ''] ?? 'No hay garantías para los filtros seleccionados.';
  }

  get mesesDisponibles(): string[] {
    const set = new Set<string>();
    this.todosKpiFiltrados.forEach(t => {
      const iso = this.parseFechaISO(t.fecha_creacion ?? '');
      if (iso) set.add(iso.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }

  private get todosEnRango(): GarantiaFormulario[] {
    if (!this.rangoDesde || !this.rangoHasta) return this.todos;
    return this.todos.filter(t => {
      const iso = this.parseFechaISO(t.fecha_creacion ?? '');
      return iso !== null && iso >= this.rangoDesde && iso <= this.rangoHasta;
    });
  }

  private get todosKpiFiltrados(): GarantiaFormulario[] {
    const base = this.todosEnRango;
    const f = this.filtroKpi;
    if (!f || f === 'total')    return base;
    if (f === 'cerradas')       return base.filter(t => t.estatus === 'Cerrado');
    if (f === 'en_proceso')     return base.filter(t => ['Enviado','En revisión','Aprobado'].includes(t.estatus));
    if (f === 'enviado')        return base.filter(t => t.estatus === 'Enviado');
    if (f === 'en_revision')    return base.filter(t => t.estatus === 'En revisión');
    if (f === 'aprobado')       return base.filter(t => t.estatus === 'Aprobado');
    if (f === 'rechazado')      return base.filter(t => t.estatus === 'Rechazado');
    return base;
  }

  get ticketsFiltradosList(): GarantiaFormulario[] {
    let list = this.filtroMes
      ? this.todosKpiFiltrados.filter(t => (this.parseFechaISO(t.fecha_creacion ?? '') ?? '').startsWith(this.filtroMes))
      : [...this.todosKpiFiltrados];
    list.sort((a, b) => {
      const da = this.parseFechaISO(a.fecha_creacion ?? '') ?? '';
      const db = this.parseFechaISO(b.fecha_creacion ?? '') ?? '';
      return this.ordenDesc ? db.localeCompare(da) : da.localeCompare(db);
    });
    return list;
  }

  colorEstatus(e: string): string {
    return COLORES_ESTATUS[e?.toLowerCase()] ?? '#8a8077';
  }

  get latenciasAtencion(): LatenciaTicket[] {
    return this.latencias.filter(l => l.lat_atencion !== null && l.lat_atencion !== undefined);
  }

  get latenciasCierre(): LatenciaTicket[] {
    return this.latencias.filter(l => l.lat_cierre !== null && l.lat_cierre !== undefined);
  }

  colorLatencia(dias: number | null): string {
    if (dias === null || dias === undefined) return '#555';
    if (dias <= 3)  return '#4caf50';
    if (dias <= 7)  return '#f0ad4e';
    return '#e53935';
  }

  toggleSortLat(col: 'folio' | 'distribuidor' | 'estatus' | 'lat_atencion' | 'lat_cierre'): void {
    if (this.sortColLat === col) {
      this.sortDirLat = this.sortDirLat === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColLat = col;
      this.sortDirLat = 'asc';
    }
    this.cdr.markForCheck();
  }

  sortIconLat(col: string): string {
    if (this.sortColLat !== col) return 'fa-sort';
    return this.sortDirLat === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get latenciasOrdenadas(): LatenciaTicket[] {
    const col = this.sortColLat;
    const dir = this.sortDirLat === 'asc' ? 1 : -1;
    return [...this.latencias].sort((a, b) => {
      const av = a[col] as any;
      const bv = b[col] as any;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  get latenciasVisibles(): LatenciaTicket[] {
    return this.latenciasOrdenadas.slice(0, 5);
  }

  // ── Modal latencias ──────────────────────────────────────────────────────
  abrirModalLat(): void {
    this.modalLatAbierto = true;
    this.busquedaLat     = '';
    this.filtroEstatusLat = '';
    this.cdr.markForCheck();
  }

  cerrarModalLat(): void {
    this.modalLatAbierto = false;
    this.cdr.markForCheck();
  }

  toggleSortLatMod(col: 'folio' | 'distribuidor' | 'estatus' | 'lat_atencion' | 'lat_cierre'): void {
    if (this.sortColLatMod === col) {
      this.sortDirLatMod = this.sortDirLatMod === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColLatMod = col;
      this.sortDirLatMod = 'asc';
    }
    this.cdr.markForCheck();
  }

  sortIconLatMod(col: string): string {
    if (this.sortColLatMod !== col) return 'fa-sort';
    return this.sortDirLatMod === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get latenciasModal(): LatenciaTicket[] {
    const q   = this.busquedaLat.toLowerCase().trim();
    const est = this.filtroEstatusLat;
    const col = this.sortColLatMod;
    const dir = this.sortDirLatMod === 'asc' ? 1 : -1;

    return [...this.latencias]
      .filter(l => {
        if (est && l.estatus !== est) return false;
        if (q && !(`${l.folio} ${l.distribuidor}`).toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const av = a[col] as any;
        const bv = b[col] as any;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
  }

  readonly estatusLatOpciones = ['Enviado', 'En revisión', 'Aprobado', 'Rechazado', 'Cerrado'];

  setSortMode(key: ModalKey, modo: SortMode): void {
    this.sortModeRank[key] = modo;
    this.cdr.markForCheck();
  }

  rankOrdenado(items: RankItem[], key: ModalKey): RankItem[] {
    const arr = [...items];
    switch (this.sortModeRank[key]) {
      case 'valor_asc': return arr.sort((a, b) => a.value - b.value);
      case 'alfa_asc':  return arr.sort((a, b) => a.key.localeCompare(b.key));
      case 'alfa_desc': return arr.sort((a, b) => b.key.localeCompare(a.key));
      default:          return arr.sort((a, b) => b.value - a.value); // valor_desc
    }
  }

  verTicketEnAdmin(id: number): void {
    window.open(`/garantias/tickets`, '_blank');
  }

  formatMes(ym: string): string {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${meses[parseInt(m, 10) - 1] ?? m} ${y}`;
  }

  private procesarRankings(): void {
    if (!this.dashboard) return;
    // Latencia por Cliente ya no se limita a 10 — la tarjeta se desplaza (scroll).
    this.topLatencia    = this.buildRank(this.dashboard.latencia_por_cliente,  999);
    this.topPiezas      = this.buildRank(this.dashboard.piezas_reemplazo,       5);
    this.topUbicaciones = this.buildRank(this.dashboard.ubicacion_dano,         5);
  }

  buildRank(data: Record<string, number>, n = 5): RankItem[] {
    if (!data) return [];
    const entries = Object.entries(data).slice(0, n);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([key, value], i) => ({
      key, value,
      pct:   Math.round((value / max) * 100),
      color: PALETA[i % PALETA.length],
    }));
  }

  // ── Resumen por cliente (Garantías por Cliente + Kardex) ──────────────────
  private procesarClientesResumen(): void {
    const grupos = new Map<string, LatenciaTicket[]>();
    for (const t of this.latenciasFiltradas) {
      if (!t.distribuidor) continue;
      if (!grupos.has(t.distribuidor)) grupos.set(t.distribuidor, []);
      grupos.get(t.distribuidor)!.push(t);
    }
    const promedio = (vals: number[]): number | null =>
      vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;

    const resumen: ClienteResumen[] = [];
    grupos.forEach((tickets, cliente) => {
      const porEstatus: Record<string, number> = {};
      for (const t of tickets) porEstatus[t.estatus] = (porEstatus[t.estatus] ?? 0) + 1;
      resumen.push({
        cliente,
        total: tickets.length,
        porEstatus,
        latAtencionProm: promedio(tickets.map(t => t.lat_atencion).filter((v): v is number => v !== null && v !== undefined)),
        latCierreProm:   promedio(tickets.map(t => t.lat_cierre).filter((v): v is number => v !== null && v !== undefined)),
      });
    });
    this.clientesResumen = resumen;
  }

  get clientesGarantiaItems(): RankItem[] {
    const est = this.filtroEstatusCliente;
    const filtrados = this.clientesResumen
      .map(c => ({ cliente: c.cliente, total: est ? (c.porEstatus[est] ?? 0) : c.total }))
      .filter(c => c.total > 0);
    const max = Math.max(...filtrados.map(c => c.total), 1);
    return filtrados.map((c, i) => ({
      key: c.cliente, value: c.total,
      pct:   Math.round((c.total / max) * 100),
      color: PALETA[i % PALETA.length],
    }));
  }

  get totalClientesFiltrado(): number {
    return this.clientesGarantiaItems.reduce((sum, c) => sum + c.value, 0);
  }

  // ── Kardex ───────────────────────────────────────────────────────────────
  abrirKardex(cliente: string): void {
    this.kardexCliente     = cliente;
    this.modalKardexAbierto = true;
    this.sortColKardex     = 'fecha_creacion';
    this.sortDirKardex     = 'desc';
    this.cdr.markForCheck();
  }

  cerrarKardex(): void {
    this.modalKardexAbierto = false;
    this.kardexCliente      = null;
    this.cdr.markForCheck();
  }

  get kardexResumen(): ClienteResumen | null {
    return this.clientesResumen.find(c => c.cliente === this.kardexCliente) ?? null;
  }

  toggleSortKardex(col: ColKardex): void {
    if (this.sortColKardex === col) {
      this.sortDirKardex = this.sortDirKardex === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColKardex = col;
      this.sortDirKardex = 'asc';
    }
    this.cdr.markForCheck();
  }

  sortIconKardex(col: string): string {
    if (this.sortColKardex !== col) return 'fa-sort';
    return this.sortDirKardex === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get kardexTickets(): LatenciaTicket[] {
    const col = this.sortColKardex;
    const dir = this.sortDirKardex === 'asc' ? 1 : -1;
    return this.latenciasFiltradas
      .filter(t => t.distribuidor === this.kardexCliente)
      .sort((a, b) => {
        const av = a[col] as any;
        const bv = b[col] as any;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
  }

  exportarKardexActual(): void {
    if (!this.kardexCliente) return;
    window.open(this.svc.getExportUrl(this.kardexCliente, this.rangoDesde, this.rangoHasta), '_blank');
  }

  // ── Cuadros por tipo de marco (desde Piezas de Reemplazo) ─────────────────
  abrirCuadros(): void {
    this.modalCuadrosAbierto   = true;
    this.cuadroTipoSeleccionado = null;
    this.cdr.markForCheck();
  }

  cerrarCuadros(): void {
    this.modalCuadrosAbierto   = false;
    this.cuadroTipoSeleccionado = null;
    this.cdr.markForCheck();
  }

  verDetalleCuadro(tipo: string): void {
    this.cuadroTipoSeleccionado = tipo;
    this.cdr.markForCheck();
  }

  volverAConteoCuadros(): void {
    this.cuadroTipoSeleccionado = null;
    this.cdr.markForCheck();
  }

  get cuadrosConteo(): RankItem[] {
    if (!this.dashboard) return [];
    return this.buildRank(this.dashboard.cuadros_por_tipo_marco, 999);
  }

  get cuadrosDetalleFiltrado(): CuadroDetalle[] {
    if (!this.dashboard || !this.cuadroTipoSeleccionado) return [];
    return this.dashboard.cuadros_detalle.filter(c => c.tipo_marco === this.cuadroTipoSeleccionado);
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  abrirModal(key: ModalKey): void {
    this.modalKey    = key;
    this.modalAbierto = true;
    this.cdr.detectChanges();
    setTimeout(() => this.renderModalChart(), 80);
  }

  cerrarModal(): void {
    this.modalChart?.destroy();
    this.modalChart   = undefined;
    this.modalAbierto = false;
    this.modalKey     = null;
    this.cdr.markForCheck();
  }

  get modalItemCount(): number { return Object.keys(this.modalData).length; }

  get modalData(): Record<string, number> {
    if (!this.dashboard || !this.modalKey) return {};
    const map: Record<ModalKey, Record<string, number>> = {
      garantias_cliente: this.dashboard.garantias_por_cliente,
      latencia_cliente:  this.dashboard.latencia_por_cliente,
      piezas_reemplazo:  this.dashboard.piezas_reemplazo,
      ubicacion_dano:    this.dashboard.ubicacion_dano,
    };
    return map[this.modalKey];
  }

  // ── Chart lifecycle ──────────────────────────────────────────────────────
  private destroyMainCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderMainCharts(): void {
    if (!this.dashboard) return;
    if (!this.chartEstatusRef?.nativeElement) return;
    this.destroyMainCharts();
    this.charts.push(this.buildDonut(this.chartEstatusRef, this.dashboard.por_estatus));
  }

  private renderModalChart(): void {
    if (!this.chartModalRef?.nativeElement || !this.modalKey) return;
    this.modalChart?.destroy();
    const data  = this.modalData;
    const meta  = MODAL_META[this.modalKey];
    const items = Object.keys(data).length;
    const h = Math.max(380, items * 36 + 60);
    this.chartModalRef.nativeElement.style.height = `${h}px`;
    this.modalChart = this.buildBarH(this.chartModalRef, data, meta.label);
  }

  // ── Chart builders ───────────────────────────────────────────────────────
  private buildDonut(ref: ElementRef<HTMLCanvasElement>, data: Record<string, number>): Chart {
    const labels = Object.keys(data);
    const values = Object.values(data);
    const total  = values.reduce((a, b) => a + b, 0);
    const colors = labels.map((l, i) =>
      COLORES_ESTATUS[l.toLowerCase()] ?? PALETA[i % PALETA.length]
    );
    return new Chart(ref.nativeElement, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: BG_CARD }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { color: TEXT_2, boxWidth: 12, padding: 12, font: { size: 11 } } },
          tooltip: { ...this.tooltipStyle(), callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}  (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
          }},
        },
      },
    });
  }

  private buildBarV(ref: ElementRef<HTMLCanvasElement>, data: Record<string, number>): Chart {
    return new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Días promedio',
          data: Object.values(data),
          backgroundColor: ORANGE_DIM, borderColor: ORANGE, borderWidth: 1,
          borderRadius: 5, hoverBackgroundColor: ORANGE,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: { x: this.axisStyle(), y: { ...this.axisStyle(), beginAtZero: true } },
      },
    });
  }

  private buildBarH(ref: ElementRef<HTMLCanvasElement>, data: Record<string, number>, label: string): Chart {
    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = values.map((_, i) => {
      const alpha = Math.max(0.40, 1 - (i / Math.max(labels.length - 1, 1)) * 0.60);
      return `rgba(235,94,40,${alpha.toFixed(2)})`;
    });
    return new Chart(ref.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false, hoverBackgroundColor: ORANGE }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { ...this.axisStyle(), beginAtZero: true },
          y: { ...this.axisStyle(), grid: { display: false }, ticks: { color: TEXT_2, font: { size: 11 } } },
        },
      },
    });
  }

  private tooltipStyle() {
    return { backgroundColor: '#2a2a2a', borderColor: '#444' as string, borderWidth: 1, titleColor: '#FFFCF2' as string, bodyColor: TEXT_2, padding: 10 };
  }

  private axisStyle() {
    return {
      grid: { color: GRID },
      ticks: { color: TEXT_3, font: { size: 11, family: "'Segoe UI',sans-serif" } as any },
      border: { color: 'rgba(255,255,255,0.08)' },
    };
  }
}
