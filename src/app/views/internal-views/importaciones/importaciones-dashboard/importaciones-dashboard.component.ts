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
interface DashData {
  kpis: Kpis;
  por_via:     { via: string; count: number }[];
  por_origen:  { origen: string; count: number }[];
  por_mes:     { mes: string; label: string; maritimo: number; aereo: number }[];
  flete_por_via: { maritimo_avg: number; maritimo_count: number; aereo_avg: number; aereo_count: number };
  por_estado:  { estado: string; count: number }[];
  embarques:   any[];
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

  @ViewChild('chartVia')    chartViaRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('chartOrigen') chartOrigenRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMes')    chartMesRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('chartFlete')  chartFleteRef!:  ElementRef<HTMLCanvasElement>;

  data:     DashData | null = null;
  cargando  = true;
  error     = '';
  ordenTabla: 'pct' | 'flete' | 'costo' = 'pct';

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
        setTimeout(() => this.initCharts(), 80);
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

  // ── Charts ─────────────────────────────────────────────────────────────────

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private initCharts(): void {
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
            backgroundColor: ['#3b82f6', '#8b5cf6'],
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
  }

  // ── Tabla ───────────────────────────────────────────────────────────────────

  get embarquesOrdenados(): any[] {
    if (!this.data) return [];
    return [...this.data.embarques].sort((a, b) => {
      if (this.ordenTabla === 'flete') return (b.cos_flete_internacional_usd || 0) - (a.cos_flete_internacional_usd || 0);
      if (this.ordenTabla === 'costo') return (b.costo_total_pesos || 0) - (a.costo_total_pesos || 0);
      return b.pct_global - a.pct_global;
    });
  }

  irDetalle(id: number): void { this.router.navigate(['/importaciones', id]); }

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

  formatPesos(n: number | null | undefined): string {
    if (!n) return '—';
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  pctVia(count: number): number {
    return this.data ? Math.round((count / this.data.kpis.total) * 100) : 0;
  }
}
