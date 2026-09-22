import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { DatePickerComponent } from '../../../../components/date-picker/date-picker.component';
import { TemporadaSelectorComponent, TEMPORADA_HISTORICO } from '../../../../components/temporada-selector/temporada-selector.component';
import { ImportacionesService } from '../../../../services/importaciones.service';
import { AsignacionesPanelComponent } from './asignaciones-panel/asignaciones-panel.component';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Kpis {
  total: number; activos: number; cerrados: number; cancelados: number;
  flete_total_usd: number; flete_total_maritimo_usd: number; flete_total_aereo_usd: number;
  flete_promedio_usd: number;
  transito_maritimo_promedio_dias: number | null; transito_maritimo_n: number;
  pct_avance_promedio: number;
  transito_aereo_promedio_dias: number | null; transito_aereo_n: number;
}
interface LatEmbarqDet { id: number; referencia: string; nombre: string; log_origen: string; fecha_ini: string; fecha_fin: string; dias: number; }
interface LatSingle  { dias_promedio: number | null; n: number; x_embarque?: LatEmbarqDet[]; }
interface LatOrigen  { origen: string; dias_promedio: number; n: number; }
interface LatEmbarq  { id: number; referencia: string; nombre: string; log_origen: string; fecha_ini: string; fecha_fin: string; dias: number; }
interface LatImp     { importador: string; dias_promedio: number; n: number; }
interface CostoPaq   { id: number; referencia: string; nombre: string; log_origen: string; total_usd: number; }
interface PrecioBici { label: string; vol: string; promedio: number; n: number; }

interface DashData {
  kpis: Kpis;
  por_via:     { via: string; count: number }[];
  por_origen:  { origen: string; count: number }[];
  por_mes:     { mes: string; label: string; maritimo: number; aereo: number }[];
  flete_por_via: { maritimo_avg: number; maritimo_count: number; maritimo_contenedores: number; aereo_avg: number; aereo_count: number; aereo_contenedores: number };
  por_estado:  { estado: string; count: number }[];
  embarques:   any[];
  latencias: {
    total_dias:             number | null;
    x_origen:               LatOrigen[];
    x_embarque:             LatEmbarq[];
    almacen:                LatSingle;
    contabilidad:           LatSingle;
    transito:               LatSingle;
    transito_x_importador:  LatImp[];
    etiquetado: {
      proyectado_promedio: number | null;
      real_promedio:       number | null;
      n_proyectado:        number;
      n_real:              number;
      x_embarque:          { id: number; referencia: string; nombre: string; proyectado: number | null; real: number | null; diferencia: number | null }[];
    };
  };
  costo_paqueteria:           CostoPaq[];
  precio_bici_x_caja:         PrecioBici[];
  precio_bici_total_promedio: number | null;
  filtros:     { origenes: string[]; anios: string[] };
}

@Component({
  selector: 'app-importaciones-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, DatePipe, DatePickerComponent, TemporadaSelectorComponent, AsignacionesPanelComponent],
  templateUrl: './importaciones-dashboard.component.html',
  styleUrl: './importaciones-dashboard.component.css',
})
export class ImportacionesDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartVia')        chartViaRef!:        ElementRef<HTMLCanvasElement>;
  @ViewChild('chartOrigen')     chartOrigenRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMes')        chartMesRef!:        ElementRef<HTMLCanvasElement>;
  @ViewChild('chartFlete')      chartFleteRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('chartLatOrigen')     chartLatOrigenRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEtiquetado')    chartEtiquetadoRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('chartLatEmbarque')chartLatEmbarqueRef!:ElementRef<HTMLCanvasElement>;
  @ViewChild('chartLatImp')     chartLatImpRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCostoPaq')   chartCostoPaqRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPrecioBici') chartPrecioBiciRef!: ElementRef<HTMLCanvasElement>;

  data:     DashData | null = null;
  cargando  = true;
  error     = '';
  ordenTabla:    'llegada' | 'costo' | 'bici' = 'llegada';
  textoBuscador = '';
  filtroEtapa   = '';
  desgloseOrigen = false;
  activeTab: 'resumen' | 'latencias' | 'costos' | 'embarques' | 'asignaciones' = 'resumen';

  filtros = { via: '', estado: '', origen: '', anio: '', fecha_desde: '', fecha_hasta: '' };

  // Filtro de rango de fechas de la tabla de embarques. El campo contra el
  // que compara depende de la etapa activa (misma fecha real que determina
  // esa etapa) -- si no hay etapa seleccionada, filtra por la fecha en que
  // se dio de alta el embarque (Aviso de Entrega).
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  onRangoFechaEmbarques(rango: { desde: string; hasta: string }): void {
    this.filtroFechaDesde = rango.desde;
    this.filtroFechaHasta = rango.hasta;
  }

  // Etapa (badge) -> key del pipeline cuyo campo "real" define esa etapa.
  // Mismo nombre y mismo campo que su columna correspondiente de PIPELINE_STAGES.
  private readonly ETAPA_PIPELINE_KEY: Record<string, string> = {
    'Entrega':      'entrega',
    'Booking':      'booking',
    'Lleg. Puerto': 'transito',
    'Destino':      'trans_dest',
    'Almacén':      'en_almacen',
    'Verif.':       'verif',
    'Etiq.':        'etiquetado',
    'Liberado':     'liberado',
  };

  /** Fecha real que se usa para el filtro de rango en el embarque `e`, según la etapa activa. */
  private _fechaFiltroDe(e: any): string | null {
    if (this.filtroEtapa) {
      const key = this.ETAPA_PIPELINE_KEY[this.filtroEtapa];
      return key ? (e?.pipeline?.[key]?.real ?? null) : null;
    }
    return e?.log_fecha_notificacion ?? null;
  }

  private readonly ETAPA_FECHA_LABEL: Record<string, string> = {
    'Entrega':      'Fecha de Entrega',
    'Booking':      'Fecha de Booking',
    'Lleg. Puerto': 'Llegada a Puerto',
    'Destino':      'Fecha de Cruce',
    'Almacén':      'Llegada a Almacén',
    'Verif.':       'Verificación',
    'Etiq.':        'Etiquetado',
    'Liberado':     'Liberado',
  };

  get fechaFiltroLabel(): string {
    if (this.filtroEtapa) return this.ETAPA_FECHA_LABEL[this.filtroEtapa] || 'Aviso de Entrega';
    return 'Aviso de Entrega';
  }

  get fechaFiltroDeshabilitado(): boolean {
    return this.filtroEtapa === 'Pendiente';
  }

  // El title de cada etapa explica el requisito exacto (mismo orden que
  // _estado_actual() en el backend: se evalúa de la más avanzada a la menos
  // avanzada, y el embarque cae en la primera que cumple).
  readonly ETAPAS = [
    { key: 'Entrega',      bg: 'rgba(236,72,153,.18)',  color: '#f472b6',
      title: 'Tiene Fecha de Entrega capturada, pero todavía no Fecha de Booking (Logística).' },
    { key: 'Booking',      bg: 'rgba(59,130,246,.18)',  color: '#60a5fa',
      title: 'Tiene Fecha de Booking capturada, pero todavía no Llegada de Contenedor a Puerto (Importación).' },
    { key: 'Lleg. Puerto', bg: 'rgba(6,182,212,.18)',   color: '#22d3ee',
      title: 'Tiene Llegada de Contenedor a Puerto capturada, pero todavía no Fecha de Cruce (Despacho).' },
    { key: 'Destino',      bg: 'rgba(245,158,11,.18)',  color: '#fbbf24',
      title: 'Tiene Fecha de Cruce capturada, pero todavía no Llegada a Almacén (Despacho).' },
    { key: 'Almacén',      bg: 'rgba(139,92,246,.18)',  color: '#a78bfa',
      title: 'Tiene Llegada a Almacén capturada, pero todavía no Liberación de Etiquetado por la UVA (Almacén).' },
    { key: 'Verif.',       bg: 'rgba(99,102,241,.18)',  color: '#818cf8',
      title: 'Tiene Liberación de Etiquetado por la UVA capturada, pero todavía no Terminación de Etiquetado.' },
    { key: 'Etiq.',        bg: 'rgba(168,85,247,.18)',  color: '#c084fc',
      title: 'Tiene Terminación de Etiquetado capturada, pero todavía no Liberación Final (Recepción).' },
    { key: 'Liberado',     bg: 'rgba(34,197,94,.18)',   color: '#22c55e',
      title: 'Tiene Liberación Final capturada -- proceso completo.' },
    { key: 'Pendiente',    bg: 'rgba(71,85,105,.18)',   color: '#94a3b8',
      title: 'Todavía no tiene ni la Fecha de Entrega (Logística) capturada.' },
  ];

  // ── Temporadas (reales, desde la tabla `temporadas` -- fecha_inicio/fecha_fin) ──
  // El filtro ya se aplica en el backend (fecha_desde/fecha_hasta sobre
  // COALESCE(log_fecha_booking, created_at)), así que afecta TODO el
  // dashboard (KPIs, latencias, costos, embarques), no solo la tabla.
  temporadas: { etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string }[] = [];
  temporadaSelValor = ''; // '' = actual (abierta), etiqueta = temporada cerrada, TEMPORADA_HISTORICO = todas

  get temporadasCerradas(): string[] {
    return this.temporadas.filter(t => t.estado === 'cerrada').map(t => t.etiqueta);
  }
  get temporadaActual(): { etiqueta: string; fecha_inicio: string; fecha_fin: string } | undefined {
    return this.temporadas.find(t => t.estado === 'abierta');
  }
  get labelTemporadaActual(): string {
    const et = this.temporadaActual?.etiqueta;
    if (!et) return 'Actual';
    const my = et.split('-')[1]?.slice(-2);
    return my ? `MY${my} · actual` : `${et} · actual`;
  }

  private cargarTemporadas(): void {
    this.svc.listarTemporadas().subscribe({
      next: (temporadas) => {
        this.temporadas = temporadas;
        const actual = this.temporadaActual;
        if (actual) {
          this.filtros.fecha_desde = actual.fecha_inicio;
          this.filtros.fecha_hasta = actual.fecha_fin;
        }
        this.cargar();
      },
      error: () => this.cargar(), // sin temporadas disponibles -- cargar sin filtro de fecha
    });
  }

  onTemporadaCambio(v: string): void {
    this.temporadaSelValor = v;
    if (v === TEMPORADA_HISTORICO) {
      this.filtros.fecha_desde = '';
      this.filtros.fecha_hasta = '';
    } else if (v === '') {
      const actual = this.temporadaActual;
      this.filtros.fecha_desde = actual?.fecha_inicio ?? '';
      this.filtros.fecha_hasta = actual?.fecha_fin ?? '';
    } else {
      const t = this.temporadas.find(x => x.etiqueta === v);
      this.filtros.fecha_desde = t?.fecha_inicio ?? '';
      this.filtros.fecha_hasta = t?.fecha_fin ?? '';
    }
    this.aplicarFiltros();
  }

  /** Rango de fechas manual del filtro global (independiente de la temporada). */
  onRangoFechaGlobal(rango: { desde: string; hasta: string }): void {
    this.filtros.fecha_desde = rango.desde;
    this.filtros.fecha_hasta = rango.hasta;
    this.aplicarFiltros();
  }

  /** Embarques ya filtrados por el backend (temporada / rango / vía / etc.). */
  get embarquesTemporada(): any[] {
    return this.data?.embarques ?? [];
  }

  countEtapa(key: string): number {
    return this.embarquesTemporada.filter((e: any) => e.estado_actual === key).length;
  }

  /** Oculta los embarques ya liberados (todo lo que sigue en proceso). */
  soloPendientes = false;

  get countPendientes(): number {
    return this.embarquesTemporada.filter((e: any) => e.estado_actual !== 'Liberado').length;
  }

  /** Selección mutuamente excluyente: "Todas", una etapa, o "Sin liberar". */
  seleccionarTodas(): void {
    this.filtroEtapa = '';
    this.soloPendientes = false;
  }
  seleccionarEtapa(key: string): void {
    this.filtroEtapa = this.filtroEtapa === key ? '' : key;
    this.soloPendientes = false;
  }
  toggleSinLiberar(): void {
    this.soloPendientes = !this.soloPendientes;
    this.filtroEtapa = '';
  }

  // Etapas del pipeline para la vista de tarjetas (tira horizontal)
  // Cada key coincide 1:1 con el campo que usa el badge de estado (backend
  // _estado_actual) para avanzar de etapa — así el pipeline y el badge
  // siempre muestran lo mismo.
  readonly PIPELINE_STAGES: { key: string; label: string; pLabel?: string; pTitle?: string }[] = [
    { key: 'entrega',          label: 'Entrega'   },
    { key: 'booking',          label: 'Booking'   },
    { key: 'transito',         label: 'Lleg. Puerto' },
    { key: 'trans_dest',       label: 'Destino'   },
    { key: 'en_almacen',       label: 'Almacén'   },
    { key: 'recepcion_odoo',   label: 'Rec. Odoo' },
    { key: 'verif',            label: 'Verif.'    },
    { key: 'etiquetado',       label: 'Etiq.'     },
    { key: 'liberado',         label: 'Liberado'  },
  ];
  // "Rec. Odoo" está arriba en la fila de fechas a propósito, pero NO tiene
  // entrada en ETAPAS/ETAPA_PIPELINE_KEY/_ESTADO_CFG ni en el backend
  // (_estado_actual()): es puramente informativo, no cuenta para la etapa.

  stage(e: any, key: string): { proy: string | null; real: string | null; delta: number | null } | undefined {
    return e?.pipeline?.[key] ?? undefined;
  }

  // Campo real (de la BD) que respalda cada etapa del pipeline -- usado para
  // llevar al usuario al detalle con ese campo resaltado al hacer click.
  private readonly STAGE_CAMPO: Record<string, string> = {
    entrega:           'log_fecha_entrega',
    booking:            'log_fecha_booking',
    transito:            'imp_llegada_contenedor_puerto',
    trans_dest:         'des_fecha_cruce_real',
    en_almacen:         'des_llegada_almacen',
    recepcion_odoo:      'rec_recepcion_odoo',
    verif:              'alm_liberacion_uva',
    etiquetado:          'alm_terminacion_etiquetado',
    liberado:           'rec_liberacion_final',
  };

  irEtapa(e: any, key: string, event: Event): void {
    event.stopPropagation();
    const campo = this.STAGE_CAMPO[key];
    if (!campo) { this.irDetalle(e.id); return; }
    this.router.navigate(['/importaciones', e.id], { queryParams: { from: 'dashboard', tab: this.activeTab, highlight: campo } });
  }

  notasEditId: number | null = null;
  notasEditVal = '';

  modalLat: { titulo: string; subtitulo: string; items: LatEmbarqDet[]; n: number; promedio: number | null; min_dias: number | null; max_dias: number | null; } | null = null;
  modalEtiq = false;
  modalEmbarquesDet: {
    titulo: string; subtitulo: string; items: any[];
    n: number; mode: 'resumen' | 'costos'; total_usd?: number | null;
  } | null = null;
  readonly Math = Math;

  private charts: Chart[] = [];

  constructor(
    private svc: ImportacionesService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as typeof this.activeTab | null;
    if (tab && ['resumen','latencias','costos','embarques','asignaciones'].includes(tab)) this.activeTab = tab;
    this.cargarTemporadas();
  }
  ngAfterViewInit(): void {}
  ngOnDestroy():     void { this.destroyCharts(); }

  cargar(): void {
    this.cargando = true;
    this.error    = '';
    this.svc.dashboard(this.filtros).subscribe({
      next: (d) => {
        this.data     = d;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initChartsForTab(), 80);
      },
      error: () => {
        this.error    = 'Error al cargar el dashboard';
        this.cargando = false;
      },
    });
  }

  aplicarFiltros(): void { this.destroyCharts(); this.cargar(); }

  limpiarFiltros(): void {
    const actual = this.temporadaActual;
    this.filtros = {
      via: '', estado: '', origen: '', anio: '',
      fecha_desde: actual?.fecha_inicio ?? '',
      fecha_hasta: actual?.fecha_fin ?? '',
    };
    this.temporadaSelValor = '';
    this.aplicarFiltros();
  }

  hayFiltros(): boolean {
    return !!(this.filtros.via || this.filtros.estado || this.filtros.origen || this.filtros.anio || this.temporadaSelValor);
  }

  switchTab(tab: 'resumen' | 'latencias' | 'costos' | 'embarques' | 'asignaciones'): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
    this.destroyCharts();
    this.desgloseOrigen = false;
    this.cdr.detectChanges();
    setTimeout(() => this.initChartsForTab(), 50);
  }

  // ── Charts ─────────────────────────────────────────────────────────────────

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private initChartsForTab(): void {
    if (!this.data) return;
    switch (this.activeTab) {
      case 'resumen':   this.initChartsResumen();   break;
      case 'latencias': this.initChartsLatencias(); break;
      case 'costos':    this.initChartosCostos();   break;
    }
  }

  private initChartsResumen(): void {
    if (!this.data) return;
    this.destroyCharts();

    const textColor = '#94a3b8';
    const gridColor = '#1e2535';

    // 1. Donut — vía de transporte
    if (this.chartViaRef?.nativeElement) {
      const d = this.data.por_via;
      this.charts.push(new Chart(this.chartViaRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: d.map(v => v.via === 'MARITIMO' ? 'Marítimo' : 'Aéreo'),
          datasets: [{
            data: d.map(v => v.count),
            backgroundColor: d.map(v => v.via === 'MARITIMO' ? '#3b82f6' : '#8b5cf6'),
            borderWidth: 0,
            hoverOffset: 8,
          }],
        },
        options: {
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} embarques` } },
          },
        },
      }));
    }

    // 2. Horizontal bar — por origen
    if (this.chartOrigenRef?.nativeElement) {
      const d = this.data.por_origen.slice(0, 8);
      this.charts.push(new Chart(this.chartOrigenRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(o => this.origenBonito(o.origen)),
          datasets: [{
            data: d.map(o => o.count),
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            barThickness: 16,
          }],
        },
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, border: { color: gridColor } },
            y: { ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { display: false } },
          },
        },
      }));
    }

    // 3. Stacked bar — embarques por mes
    if (this.chartMesRef?.nativeElement) {
      const d = this.data.por_mes.slice(-14);
      this.charts.push(new Chart(this.chartMesRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(m => m.label),
          datasets: [
            { label: 'Marítimo', data: d.map(m => m.maritimo), backgroundColor: '#3b82f6', borderRadius: 3, stack: 'stack' },
            { label: 'Aéreo',    data: d.map(m => m.aereo),    backgroundColor: '#8b5cf6', borderRadius: 3, stack: 'stack' },
          ],
        },
        options: {
          plugins: { legend: { labels: { color: textColor, font: { size: 11 }, boxWidth: 12 } } },
          scales: {
            x: { stacked: true, ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
            y: { stacked: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, border: { color: gridColor } },
          },
        },
      }));
    }

  }

  private initChartsLatencias(): void {
    if (!this.data) return;
    this.destroyCharts();

    const textColor = '#94a3b8';
    const gridColor = '#1e2535';

    // 5. Latencia x origen (general o desglose según toggle)
    this.initChartLatOrigen();

    // 6. Latencia x embarque (horizontal bar)
    if (this.chartLatEmbarqueRef?.nativeElement) {
      const d = this.data.latencias.x_embarque.slice(0, 15);
      this.charts.push(new Chart(this.chartLatEmbarqueRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(e => e.referencia),
          datasets: [{
            data: d.map(e => e.dias),
            backgroundColor: d.map(e => e.dias > 60 ? '#ef4444' : e.dias > 40 ? '#f59e0b' : '#3b82f6'),
            borderRadius: 4,
            barPercentage: 0.6,
          }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días · ${this.origenBonito(d[ctx.dataIndex].log_origen)}` } },
          },
          scales: {
            x: { ticks: { color: '#e2e8f0', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: textColor, callback: v => `${v}d` }, grid: { color: gridColor }, border: { color: gridColor } },
          },
        },
      }));
    }

    // 7. Etiquetado: estimado vs real (grouped bar)
    if (this.chartEtiquetadoRef?.nativeElement && this.data.latencias.etiquetado) {
      const rows = this.data.latencias.etiquetado.x_embarque
        .filter(e => e.proyectado !== null || e.real !== null)
        .slice(0, 5);
      if (rows.length > 0) {
        const barH = Math.max(16, Math.min(28, Math.floor(280 / rows.length)));
        this.charts.push(new Chart(this.chartEtiquetadoRef.nativeElement, {
          type: 'bar',
          data: {
            labels: rows.map(e => e.nombre ? `${e.referencia} · ${e.nombre}` : e.referencia),
            datasets: [
              {
                label: 'Estimado',
                data: rows.map(e => e.proyectado),
                backgroundColor: '#334155',
                borderRadius: 3,
                barThickness: barH,
              },
              {
                label: 'Real',
                data: rows.map(e => e.real),
                backgroundColor: rows.map(e =>
                  e.diferencia === null ? '#64748b' :
                  e.diferencia > 0     ? '#ef4444' :
                  e.diferencia < 0     ? '#22c55e' : '#3b82f6'
                ),
                borderRadius: 3,
                barThickness: barH,
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: { color: textColor, font: { size: 11 }, boxWidth: 10, padding: 16 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const val = ctx.raw as number;
                    if (ctx.datasetIndex === 1 && rows[ctx.dataIndex].diferencia !== null) {
                      const diff = rows[ctx.dataIndex].diferencia!;
                      return ` ${val}d real (${diff > 0 ? '+' : ''}${diff}d vs estimado)`;
                    }
                    return ` ${val}d estimado`;
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: { color: '#e2e8f0', font: { size: 10 } },
                grid: { display: false },
              },
              y: {
                ticks: { color: textColor, callback: v => `${v}d` },
                grid: { color: gridColor }, border: { color: gridColor },
              },
            },
          },
        }));
      }
    }

    // 8. Latencia tránsito x importador
    if (this.chartLatImpRef?.nativeElement) {
      const d = this.data.latencias.transito_x_importador;
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
      this.charts.push(new Chart(this.chartLatImpRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(i => `${i.importador}\n(n=${i.n})`),
          datasets: [{
            data: d.map(i => i.dias_promedio),
            backgroundColor: d.map((_, idx) => colors[idx % colors.length]),
            borderRadius: 6,
            barThickness: 50,
          }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días promedio` } },
          },
          scales: {
            x: { ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: textColor }, grid: { color: gridColor }, border: { color: gridColor } },
          },
        },
      }));
    }
  }

  private initChartosCostos(): void {
    if (!this.data) return;
    this.destroyCharts();

    const textColor = '#94a3b8';
    const gridColor = '#1e2535';

    // 4. Bar — flete promedio por vía
    if (this.chartFleteRef?.nativeElement) {
      const fv = this.data.flete_por_via;
      this.charts.push(new Chart(this.chartFleteRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Marítimo', 'Aéreo'],
          datasets: [{
            data: [fv.maritimo_avg, fv.aereo_avg],
            backgroundColor: ['#3b82f6', '#8b5cf6'],
            borderRadius: 6,
            barThickness: 44,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#e2e8f0' }, grid: { display: false } },
            y: {
              ticks: { color: textColor, callback: v => `$${Number(v).toLocaleString('es-MX')}` },
              grid: { color: gridColor }, border: { color: gridColor },
            },
          },
        },
      }));
    }

    // 9. Precio por bicicleta x tipo de caja (horizontal bar)
    if (this.chartPrecioBiciRef?.nativeElement) {
      const d = this.data.precio_bici_x_caja;
      this.charts.push(new Chart(this.chartPrecioBiciRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(c => `${c.label} (${c.vol})`),
          datasets: [{
            data: d.map(c => c.promedio),
            backgroundColor: '#6366f1',
            borderRadius: 4,
            barThickness: 18,
          }],
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` $${Number(ctx.raw).toFixed(2)} USD/bici · n=${d[ctx.dataIndex].n}` } },
          },
          scales: {
            x: {
              ticks: { color: textColor, callback: v => `$${Number(v).toFixed(0)}` },
              grid: { color: gridColor }, border: { color: gridColor },
            },
            y: { ticks: { color: '#e2e8f0', font: { size: 10 } }, grid: { display: false } },
          },
        },
      }));
    }

    // 8. Costo paquetería x importación
    if (this.chartCostoPaqRef?.nativeElement) {
      const d = this.costoPaqConDatos.slice(0, 15);
      this.charts.push(new Chart(this.chartCostoPaqRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(e => e.referencia),
          datasets: [{
            data: d.map(e => e.total_usd),
            backgroundColor: '#10b981',
            borderRadius: 4,
            barThickness: 14,
          }],
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` $${Number(ctx.raw).toLocaleString('es-MX', {maximumFractionDigits:0})} USD` } },
          },
          scales: {
            x: {
              ticks: { color: textColor, callback: v => `$${Number(v).toLocaleString('es-MX', {maximumFractionDigits:0})}` },
              grid: { color: gridColor }, border: { color: gridColor },
            },
            y: { ticks: { color: '#e2e8f0', font: { size: 10 } }, grid: { display: false } },
          },
        },
      }));
    }
  }

  private initChartLatOrigen(): void {
    if (!this.data || !this.chartLatOrigenRef?.nativeElement) return;
    const textColor = '#94a3b8';
    const gridColor = '#1e2535';
    const lat = this.data.latencias;

    if (this.desgloseOrigen) {
      const d = lat.x_origen;
      this.charts.push(new Chart(this.chartLatOrigenRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map(o => `${this.origenBonito(o.origen)} (n=${o.n})`),
          datasets: [{
            data: d.map(o => o.dias_promedio),
            backgroundColor: d.map(o => o.dias_promedio > 60 ? '#ef4444' : o.dias_promedio > 40 ? '#f59e0b' : '#3b82f6'),
            borderRadius: 4,
            barThickness: 22,
          }],
        },
        options: {
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días promedio` } },
          },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor }, border: { color: gridColor } },
            y: { ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { display: false } },
          },
        },
      }));
    } else {
      this.charts.push(new Chart(this.chartLatOrigenRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Promedio General'],
          datasets: [{
            data: [lat.total_dias],
            backgroundColor: ['#3b82f6'],
            borderRadius: 8,
            barThickness: 70,
          }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días promedio` } },
          },
          scales: {
            x: { ticks: { color: '#e2e8f0' }, grid: { display: false } },
            y: { ticks: { color: textColor, callback: v => `${v} d` }, grid: { color: gridColor }, border: { color: gridColor } },
          },
        },
      }));
    }
  }

  toggleDesglose(): void {
    this.desgloseOrigen = !this.desgloseOrigen;
    const canvas = this.chartLatOrigenRef?.nativeElement;
    const idx = canvas ? this.charts.findIndex(c => c.canvas === canvas) : -1;
    if (idx !== -1) { this.charts[idx].destroy(); this.charts.splice(idx, 1); }
    setTimeout(() => this.initChartLatOrigen(), 0);
  }

  // ── Tabla ───────────────────────────────────────────────────────────────────

  get embarquesOrdenados(): any[] {
    if (!this.data) return [];
    const base = this.embarquesTemporada;
    const q = this.textoBuscador.trim().toLowerCase();
    let filtrados: any[] = q
      ? base.filter((e: any) =>
          (e.referencia || '').toLowerCase().includes(q) ||
          (e.nombre || '').toLowerCase().includes(q) ||
          (e.log_origen || '').toLowerCase().includes(q) ||
          (e.log_tipo_productos || '').toLowerCase().includes(q) ||
          (e.estado || '').toLowerCase().includes(q) ||
          (e.notas || '').toLowerCase().includes(q)
        )
      : base;
    if (this.filtroEtapa) {
      filtrados = filtrados.filter((e: any) => e.estado_actual === this.filtroEtapa);
    }
    if (this.soloPendientes) {
      filtrados = filtrados.filter((e: any) => e.estado_actual !== 'Liberado');
    }
    if ((this.filtroFechaDesde || this.filtroFechaHasta) && !this.fechaFiltroDeshabilitado) {
      filtrados = filtrados.filter((e: any) => {
        const f = this._fechaFiltroDe(e);
        if (!f) return false;
        return (!this.filtroFechaDesde || f >= this.filtroFechaDesde)
            && (!this.filtroFechaHasta || f <= this.filtroFechaHasta);
      });
    }
    return [...filtrados].sort((a, b) => {
      if (this.ordenTabla === 'llegada') {
        const da = a.des_llegada_almacen ? new Date(a.des_llegada_almacen).getTime() : 0;
        const db = b.des_llegada_almacen ? new Date(b.des_llegada_almacen).getTime() : 0;
        return db - da;
      }
      if (this.ordenTabla === 'bici') return (b.costo_por_bicicleta || 0) - (a.costo_por_bicicleta || 0);
      return (b.costo_total_pesos || 0) - (a.costo_total_pesos || 0);
    });
  }

  abrevContenido(s: string): string {
    if (!s) return '—';
    const first = s.split('/')[0].split(',')[0].trim();
    return first.length > 18 ? first.slice(0, 18) + '…' : first;
  }

  /** Origen normalizado para mostrar (arregla ñ/é dañadas en la BD). */
  origenBonito(s: string | null | undefined): string {
    if (!s) return '—';
    const key = s.normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[�?]/g, '')
      .trim().toUpperCase();
    const canon: Record<string, string> = {
      'ESPANA': 'ESPAÑA', 'ESPAA': 'ESPAÑA',
      'BELGICA': 'BÉLGICA', 'BLGICA': 'BÉLGICA',
    };
    return canon[key] ?? key;
  }

  llegadaRelativa(fecha: string): string {
    const diff = Math.round((Date.now() - new Date(fecha).getTime()) / 86400000);
    if (diff < 0)  return `en ${-diff}d`;
    if (diff === 0) return 'hoy';
    if (diff <= 60) return `hace ${diff}d`;
    return `hace ${Math.round(diff / 30)}m`;
  }

  irDetalle(id: number): void { this.router.navigate(['/importaciones', id], { queryParams: { from: 'dashboard', tab: this.activeTab } }); }

  /** Lleva directo a los productos/asignaciones de este embarque, sin pasar
   *  por el detalle general -- pedido explícito para acceder más rápido
   *  desde la tarjeta del dashboard. Mismos query params que irDetalle() para
   *  que el botón "volver" de Asignaciones regrese aquí (dashboard/embarques)
   *  en vez de al detalle del embarque. */
  verProductos(id: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/importaciones', id, 'asignaciones'], { queryParams: { from: 'dashboard', tab: this.activeTab } });
  }

  abrirNotasEdit(e: any, event: Event): void {
    event.stopPropagation();
    this.notasEditId = e.id;
    this.notasEditVal = e.notas ?? '';
    setTimeout(() => {
      const el = document.querySelector('.notas-input') as HTMLTextAreaElement;
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    }, 20);
  }

  confirmarNotas(e: any): void {
    const val = this.notasEditVal.replace(/\n+$/, '').replace(/^\n+/, '');
    this.notasEditId = null;
    if (val === (e.notas ?? '')) return;
    e.notas = val || null;
    this.svc.actualizar(e.id, { notas: val || null } as any).subscribe();
  }

  cancelarNotas(): void { this.notasEditId = null; }

  /** Divide una nota tipo bitácora ("Al 25.07 ... // Al 20.07 ...") en líneas
   *  separadas para lectura clara — el dato guardado no cambia, solo la vista. */
  notasLineas(notas: string | null | undefined): string[] {
    if (!notas) return [];
    return notas.split(/\s*\/\/\s*/).map(s => s.trim()).filter(Boolean);
  }

  abrirModalLat(tipo: 'almacen' | 'contabilidad' | 'transito' | 'total'): void {
    if (!this.data) return;
    const lat = this.data.latencias;
    const cfgBase: Record<string, { titulo: string; subtitulo: string; rawItems: LatEmbarqDet[] }> = {
      almacen:      { titulo: 'Latencia Almacén',      subtitulo: 'Llegada al almacén → Recepción Odoo',  rawItems: (lat.almacen?.x_embarque      ?? []) as LatEmbarqDet[] },
      contabilidad: { titulo: 'Latencia Contabilidad', subtitulo: 'Fecha cruce real → Recepción docs',    rawItems: (lat.contabilidad?.x_embarque ?? []) as LatEmbarqDet[] },
      transito:     { titulo: 'Latencia Tránsito',     subtitulo: 'Fecha entrega → Llegada almacén',      rawItems: (lat.transito?.x_embarque     ?? []) as LatEmbarqDet[] },
      total:        { titulo: 'Latencia Total',         subtitulo: 'Fecha entrega → Liberación final',     rawItems: (lat.x_embarque               ?? []) as LatEmbarqDet[] },
    };
    const { titulo, subtitulo, rawItems } = cfgBase[tipo];
    const items = [...rawItems].sort((a, b) => b.dias - a.dias);
    const diasVals = items.map(i => i.dias).filter(d => d != null);
    const promedio = diasVals.length ? Math.round(diasVals.reduce((a, b) => a + b, 0) / diasVals.length) : null;
    const min_dias = diasVals.length ? Math.min(...diasVals) : null;
    const max_dias = diasVals.length ? Math.max(...diasVals) : null;
    this.modalLat = { titulo, subtitulo, items, n: items.length, promedio, min_dias, max_dias };
  }

  cerrarModalLat():  void { this.modalLat  = null; }
  cerrarModalEtiq(): void { this.modalEtiq = false; }

  /** Mismo criterio que usa el backend para el promedio "Tránsito" del
   *  Resumen: proceso completo, entrega del proveedor → liberación final
   *  (mismo tramo que "lat_total" por embarque). Si un embarque aún no
   *  está liberado, no cuenta en el promedio y tampoco debe listarse aquí. */
  private _transitoValido(e: any, via: 'MARITIMO' | 'AEREO'): boolean {
    const viaEmb = e.via_transporte || 'MARITIMO';
    return viaEmb === via && e.lat_total != null && e.lat_total >= 0;
  }

  abrirModalResumen(tipo: 'total' | 'activos' | 'cerrados' | 'transito' | 'transito_aereo' | 'avance'): void {
    if (!this.data) return;
    const emb = this.data.embarques;
    const sortPorLlegada = (a: any, b: any) => {
      const da = a.des_llegada_almacen ? +new Date(a.des_llegada_almacen) : 0;
      const db = b.des_llegada_almacen ? +new Date(b.des_llegada_almacen) : 0;
      return db - da;
    };
    const sortPorLiberacion = (a: any, b: any) => {
      const da = a.pipeline?.liberado?.real ? +new Date(a.pipeline.liberado.real) : 0;
      const db = b.pipeline?.liberado?.real ? +new Date(b.pipeline.liberado.real) : 0;
      return db - da;
    };
    type Cfg = { titulo: string; subtitulo: string; filter: (e: any) => boolean; sort: (a: any, b: any) => number };
    const cfgBase: Record<string, Cfg> = {
      total:    { titulo: 'Todos los Embarques',   subtitulo: `${emb.length} embarques registrados`,          filter: () => true,                           sort: (a, b) => (b.pct_avance ?? 0) - (a.pct_avance ?? 0) },
      activos:  { titulo: 'Embarques en Proceso',  subtitulo: 'Estado activo · ordenado por avance',          filter: e => e.estado === 'activo',           sort: (a, b) => (b.pct_avance ?? 0) - (a.pct_avance ?? 0) },
      cerrados: { titulo: 'Embarques Cerrados',    subtitulo: 'Estado cerrado · más recientes primero',       filter: e => e.estado === 'cerrado',          sort: sortPorLlegada },
      transito:       { titulo: 'Embarques Marítimos', subtitulo: 'Vía marítima · entrega → liberación final', filter: e => this._transitoValido(e, 'MARITIMO'), sort: sortPorLiberacion },
      transito_aereo: { titulo: 'Embarques Aéreos',    subtitulo: 'Vía aérea · entrega → liberación final',    filter: e => this._transitoValido(e, 'AEREO'),    sort: sortPorLiberacion },
      avance:   { titulo: 'Avance por Embarque',   subtitulo: 'Menor avance primero · todos los embarques',  filter: () => true,                           sort: (a, b) => (a.pct_avance ?? 101) - (b.pct_avance ?? 101) },
    };
    const { titulo, subtitulo, filter, sort } = cfgBase[tipo];
    const items = emb.filter(filter).sort(sort);
    this.modalEmbarquesDet = { titulo, subtitulo, items, n: items.length, mode: 'resumen' };
  }

  abrirModalCostosDetalle(tipo: 'flete' | 'bici'): void {
    if (!this.data) return;
    const emb = this.data.embarques;
    if (tipo === 'flete') {
      const items = [...emb].filter(e => e.cos_flete_internacional_usd).sort((a, b) => (b.cos_flete_internacional_usd ?? 0) - (a.cos_flete_internacional_usd ?? 0));
      const total_usd = items.reduce((acc: number, e: any) => acc + (e.cos_flete_internacional_usd ?? 0), 0);
      this.modalEmbarquesDet = { titulo: 'Detalle de Fletes', subtitulo: 'Flete internacional USD · mayor a menor', items, n: items.length, mode: 'costos', total_usd };
    } else {
      const items = [...emb].filter(e => e.costo_por_bicicleta).sort((a, b) => (b.costo_por_bicicleta ?? 0) - (a.costo_por_bicicleta ?? 0));
      this.modalEmbarquesDet = { titulo: 'Costo Logístico por Bicicleta', subtitulo: 'Embarques con datos de bikecount · mayor a menor', items, n: items.length, mode: 'costos' };
    }
  }

  cerrarModalEmbarquesDet(): void { this.modalEmbarquesDet = null; }

  get costoPaqConDatos(): CostoPaq[] {
    return this.data?.costo_paqueteria?.filter(e => e.total_usd > 0) ?? [];
  }

  get etiqRatio(): number | null {
    const e = this.data?.latencias?.etiquetado;
    if (!e?.real_promedio || !e?.proyectado_promedio) return null;
    return Math.round((e.real_promedio / e.proyectado_promedio) * 10) / 10;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  colorPct(p: number): string {
    if (p === 100) return '#22c55e';
    if (p >= 60)   return '#f59e0b';
    if (p > 0)     return '#3b82f6';
    return '#374151';
  }

  colorVia(v: string): string { return v === 'AEREO' ? '#8b5cf6' : '#3b82f6'; }

  colorEstado(e: string): string {
    if (e === 'cerrado')   return '#22c55e';
    if (e === 'cancelado') return '#ef4444';
    return '#f59e0b';
  }

  formatUsd(n: number | null | undefined): string {
    if (!n) return '—';
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' USD';
  }

  abreviarUsd(n: number | null | undefined): string {
    if (!n && n !== 0) return '—';
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return '$' + n.toFixed(0);
  }

  formatPesos(n: number | null | undefined): string {
    if (!n) return '—';
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  pctVia(count: number): number {
    return this.data ? Math.round((count / this.data.kpis.total) * 100) : 0;
  }

  // ── Pipeline helpers ─────────────────────────────────────────────────────────

  fmtD(s: string | null | undefined): string {
    if (!s) return '—';
    try {
      const d = new Date(s + 'T12:00:00');
      return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    } catch { return s.slice(5); }
  }

  deltaClass(delta: number | null | undefined): string {
    if (delta == null) return '';
    return delta <= 0 ? 'delta-ok' : 'delta-late';
  }

  absDelta(delta: number): number { return Math.abs(delta); }

  private static readonly _ESTADO_CFG: Record<string, { bg: string; color: string }> = {
    'Liberado':     { bg: 'rgba(34,197,94,.18)',   color: '#22c55e' },
    'Etiq.':        { bg: 'rgba(168,85,247,.18)',  color: '#c084fc' },
    'Verif.':       { bg: 'rgba(99,102,241,.18)',  color: '#818cf8' },
    'Almacén':      { bg: 'rgba(139,92,246,.18)',  color: '#a78bfa' },
    'Destino':      { bg: 'rgba(245,158,11,.18)',  color: '#fbbf24' },
    'Lleg. Puerto': { bg: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
    'Booking':      { bg: 'rgba(59,130,246,.18)',  color: '#60a5fa' },
    'Entrega':      { bg: 'rgba(236,72,153,.18)',  color: '#f472b6' },
    'Pendiente':    { bg: 'rgba(71,85,105,.18)',   color: '#94a3b8' },
  };

  estadoStyle(estado: string): { background: string; color: string } {
    const cfg = ImportacionesDashboardComponent._ESTADO_CFG[estado]
              ?? { bg: 'rgba(71,85,105,.18)', color: '#94a3b8' };
    return { background: cfg.bg, color: cfg.color };
  }

  stageCls(stage: { proy?: string | null; real?: string | null; delta?: number | null } | undefined): string {
    // Solo se resalta (verde) cuando la etapa tiene fecha REAL registrada.
    return stage?.real ? 'stage-real' : '';
  }

  latTotalColor(dias: number | null | undefined): string {
    if (dias == null) return '#64748b';
    if (dias > 120) return '#ef4444';
    if (dias > 75)  return '#f59e0b';
    return '#22c55e';
  }
}
