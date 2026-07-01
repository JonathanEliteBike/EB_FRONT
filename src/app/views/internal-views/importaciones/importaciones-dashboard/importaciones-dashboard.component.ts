import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { ImportacionesService } from '../../../../services/importaciones.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Kpis {
  total: number; activos: number; cerrados: number; cancelados: number;
  flete_total_usd: number; flete_promedio_usd: number;
  transito_maritimo_promedio_dias: number; pct_avance_promedio: number;
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
  flete_por_via: { maritimo_avg: number; maritimo_count: number; aereo_avg: number; aereo_count: number };
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
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, DatePipe],
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
  desgloseOrigen = false;
  activeTab: 'resumen' | 'latencias' | 'costos' | 'embarques' = 'resumen';

  filtros = { via: '', estado: '', origen: '', anio: '' };
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
    if (tab && ['resumen','latencias','costos','embarques'].includes(tab)) this.activeTab = tab;
    this.cargar();
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
    this.filtros = { via: '', estado: '', origen: '', anio: '' };
    this.aplicarFiltros();
  }

  hayFiltros(): boolean {
    return !!(this.filtros.via || this.filtros.estado || this.filtros.origen || this.filtros.anio);
  }

  switchTab(tab: 'resumen' | 'latencias' | 'costos' | 'embarques'): void {
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
          labels: d.map(o => o.origen),
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
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días · ${d[ctx.dataIndex].log_origen}` } },
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
          labels: d.map(o => `${o.origen} (n=${o.n})`),
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
    const q = this.textoBuscador.trim().toLowerCase();
    const filtrados = q
      ? this.data.embarques.filter((e: any) =>
          (e.referencia || '').toLowerCase().includes(q) ||
          (e.nombre || '').toLowerCase().includes(q) ||
          (e.log_origen || '').toLowerCase().includes(q) ||
          (e.log_tipo_productos || '').toLowerCase().includes(q) ||
          (e.estado || '').toLowerCase().includes(q) ||
          (e.notas || '').toLowerCase().includes(q)
        )
      : this.data.embarques;
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

  llegadaRelativa(fecha: string): string {
    const diff = Math.round((Date.now() - new Date(fecha).getTime()) / 86400000);
    if (diff < 0)  return `en ${-diff}d`;
    if (diff === 0) return 'hoy';
    if (diff <= 60) return `hace ${diff}d`;
    return `hace ${Math.round(diff / 30)}m`;
  }

  irDetalle(id: number): void { this.router.navigate(['/importaciones', id], { queryParams: { from: 'dashboard', tab: this.activeTab } }); }

  abrirNotasEdit(e: any, event: Event): void {
    event.stopPropagation();
    this.notasEditId = e.id;
    this.notasEditVal = e.notas ?? '';
  }

  confirmarNotas(e: any): void {
    const val = this.notasEditVal.trim();
    this.notasEditId = null;
    if (val === (e.notas ?? '').trim()) return;
    e.notas = val || null;
    this.svc.actualizar(e.id, { notas: val || null } as any).subscribe();
  }

  cancelarNotas(): void { this.notasEditId = null; }

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

  abrirModalResumen(tipo: 'total' | 'activos' | 'cerrados' | 'transito' | 'avance'): void {
    if (!this.data) return;
    const emb = this.data.embarques;
    type Cfg = { titulo: string; subtitulo: string; filter: (e: any) => boolean; sort: (a: any, b: any) => number };
    const cfgBase: Record<string, Cfg> = {
      total:    { titulo: 'Todos los Embarques',   subtitulo: `${emb.length} embarques registrados`,          filter: () => true,                           sort: (a, b) => (b.pct_avance ?? 0) - (a.pct_avance ?? 0) },
      activos:  { titulo: 'Embarques en Proceso',  subtitulo: 'Estado activo · ordenado por avance',          filter: e => e.estado === 'activo',           sort: (a, b) => (b.pct_avance ?? 0) - (a.pct_avance ?? 0) },
      cerrados: { titulo: 'Embarques Cerrados',    subtitulo: 'Estado cerrado · más recientes primero',       filter: e => e.estado === 'cerrado',          sort: (a, b) => { const da = a.des_llegada_almacen ? +new Date(a.des_llegada_almacen) : 0; const db = b.des_llegada_almacen ? +new Date(b.des_llegada_almacen) : 0; return db - da; } },
      transito: { titulo: 'Embarques Marítimos',   subtitulo: 'Vía marítima · ordenado por avance',          filter: e => e.via_transporte === 'MARITIMO', sort: (a, b) => (b.pct_avance ?? 0) - (a.pct_avance ?? 0) },
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
}
