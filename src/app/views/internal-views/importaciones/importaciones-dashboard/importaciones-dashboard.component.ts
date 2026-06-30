import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
interface LatSingle  { dias_promedio: number | null; n: number; }
interface LatOrigen  { origen: string; dias_promedio: number; n: number; }
interface LatEmbarq  { id: number; referencia: string; nombre: string; log_origen: string; dias: number; }
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
  @ViewChild('chartLatOrigen')  chartLatOrigenRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('chartLatEmbarque')chartLatEmbarqueRef!:ElementRef<HTMLCanvasElement>;
  @ViewChild('chartLatImp')     chartLatImpRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCostoPaq')   chartCostoPaqRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPrecioBici') chartPrecioBiciRef!: ElementRef<HTMLCanvasElement>;

  data:     DashData | null = null;
  cargando  = true;
  error     = '';
  ordenTabla:    'llegada' | 'costo' | 'bici' = 'llegada';
  desgloseOrigen = false;
  activeTab: 'resumen' | 'latencias' | 'costos' | 'embarques' = 'resumen';

  filtros = { via: '', estado: '', origen: '', anio: '' };

  private charts: Chart[] = [];

  constructor(
    private svc: ImportacionesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit():        void { this.cargar(); }
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
            barThickness: 14,
          }],
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} días · ${d[ctx.dataIndex].log_origen}` } },
          },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor }, border: { color: gridColor } },
            y: { ticks: { color: '#e2e8f0', font: { size: 10 } }, grid: { display: false } },
          },
        },
      }));
    }

    // 7. Latencia tránsito x importador
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
    return [...this.data.embarques].sort((a, b) => {
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

  irDetalle(id: number): void { this.router.navigate(['/importaciones', id], { queryParams: { from: 'dashboard' } }); }

  get costoPaqConDatos(): CostoPaq[] {
    return this.data?.costo_paqueteria?.filter(e => e.total_usd > 0) ?? [];
  }

  // ── Etiquetado helpers ───────────────────────────────────────────────────────

  get etiqMaxReal(): number {
    const rows = this.data?.latencias?.etiquetado?.x_embarque;
    if (!rows?.length) return 1;
    return Math.max(...rows.flatMap(e => [e.real ?? 0, e.proyectado ?? 0]), 1);
  }

  etiqPct(val: number | null, max: number): number {
    if (val === null || !max) return 0;
    return Math.min(Math.round((val / max) * 100), 100);
  }

  etiqBaseWidth(proy: number | null, real: number | null): number {
    if (proy === null && real === null) return 0;
    if (proy === null) return real!;
    if (real === null) return proy;
    return Math.min(proy, real);
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
