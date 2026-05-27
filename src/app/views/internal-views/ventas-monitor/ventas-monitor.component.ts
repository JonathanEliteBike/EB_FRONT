import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { FacturasClienteComponent } from '../../../components/facturas-cliente/facturas-cliente.component';
import {
  VentasService,
  ResumenVentas,
  ComparacionAnual,
  MesComparado,
  TopCliente,
  TopProducto,
  PorEstado,
  DesglosePorEstado,
} from '../../../services/ventas.service';

type Modo = 'anual' | 'comparar' | 'comparar-anual' | 'comparar-integrales' | 'cliente';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10)  / 10;

const MESES = [
  { num: 1,  nombre: 'Enero'      },
  { num: 2,  nombre: 'Febrero'    },
  { num: 3,  nombre: 'Marzo'      },
  { num: 4,  nombre: 'Abril'      },
  { num: 5,  nombre: 'Mayo'       },
  { num: 6,  nombre: 'Junio'      },
  { num: 7,  nombre: 'Julio'      },
  { num: 8,  nombre: 'Agosto'     },
  { num: 9,  nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre'    },
  { num: 11, nombre: 'Noviembre'  },
  { num: 12, nombre: 'Diciembre'  },
];

@Component({
  selector: 'app-ventas-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, FacturasClienteComponent],
  templateUrl: './ventas-monitor.component.html',
  styleUrl: './ventas-monitor.component.css',
})
export class VentasMonitorComponent implements OnInit, OnDestroy {
  private ventasService = inject(VentasService);
  private busquedaSubject = new Subject<string>();

  // ── Estado general ──────────────────────────────────────────────────────────
  modo: Modo = 'anual';
  aniosDisponibles: number[] = [];
  grupos: { id: number; nombre_grupo: string }[] = [];
  grupoSeleccionado: number | null = null;
  meses = MESES;
  cargando = false;
  error: string | null = null;

  // ── Modo Por Período (date range) ───────────────────────────────────────────
  readonly hoy: string = new Date().toISOString().split('T')[0];
  fechaInicioStr: string = `${new Date().getFullYear()}-01-01`;
  fechaFinStr: string    = new Date().toISOString().split('T')[0];
  resumen: ResumenVentas | null = null;

  // ── Modo comparar meses ─────────────────────────────────────────────────────
  cmpAnio1: number = new Date().getFullYear() - 1;
  cmpMes1: number  = 1;
  cmpAnio2: number = new Date().getFullYear();
  cmpMes2: number  = 1;
  resumen1: ResumenVentas | null = null;
  resumen2: ResumenVentas | null = null;

  // ── Modo comparar años ──────────────────────────────────────────────────────
  cmpAAnio1: number = new Date().getFullYear() - 1;
  cmpAAnio2: number = new Date().getFullYear();
  comparacionAnual: ComparacionAnual | null = null;

  // ── Modo comparar integrales ─────────────────────────────────────────────────
  cmpIntGrupo1: number | null = null;
  cmpIntGrupo2: number | null = null;
  cmpIntAnio: number = new Date().getFullYear();
  cmpIntMes: number = new Date().getMonth() + 1;
  cmpIntTipo: 'anual' | 'mensual' = 'anual';

  // ── Vista facturas / cobranza ───────────────────────────────────────────────
  vista: 'facturas' | 'cobranza' = 'cobranza';

  // ── Buscar cliente ──────────────────────────────────────────────────────────
  clienteBusqueda: string = '';
  clientesSugeridos: { id: number; nombre: string }[] = [];
  clientesBuscando = false;
  mostrarSugerencias = false;
  modalClienteAbierto = false;
  modalClienteClave: string | null = null;

  // ── Modal desglose por estado ───────────────────────────────────────────────
  estadoDesglose: DesglosePorEstado | null = null;
  estadoDesgloseAbierto = false;
  estadoDesglosesCargando = false;
  estadoDesglosError: string | null = null;

  // ── Máximo de barras / ordenamiento ────────────────────────────────────────
  sortProductos: 'total' | 'unidades' = 'total';
  sortClientes:  'total' | 'facturas' = 'total';

  get maxMesTotal(): number {
    if (!this.resumen?.por_mes.length) return 1;
    return Math.max(...this.resumen.por_mes.map(m => m.total));
  }

  get maxCmpTotal(): number {
    if (!this.comparacionAnual?.meses.length) return 1;
    return Math.max(
      ...this.comparacionAnual.meses.map(m => Math.max(m.total1, m.total2))
    );
  }

  get maxCmpIntTotal(): number {
    const meses1 = this.resumen1?.por_mes ?? [];
    const meses2 = this.resumen2?.por_mes ?? [];
    const all = [...meses1, ...meses2].map(m => m.total);
    return Math.max(...all, 1);
  }

  get nombreGrupo1(): string {
    return this.grupos.find(g => g.id === this.cmpIntGrupo1)?.nombre_grupo ?? 'Integral 1';
  }

  get nombreGrupo2(): string {
    return this.grupos.find(g => g.id === this.cmpIntGrupo2)?.nombre_grupo ?? 'Integral 2';
  }

  get cmpIntMesesComparados(): MesComparado[] {
    if (!this.resumen1 && !this.resumen2) return [];
    return MESES.map(({ num, nombre }) => {
      const t1 = this.resumen1?.por_mes.find(x => x.mes === num)?.total ?? 0;
      const t2 = this.resumen2?.por_mes.find(x => x.mes === num)?.total ?? 0;
      const delta = round2(t2 - t1);
      const delta_pct = t1 > 0 ? round1((delta / t1) * 100) : (t2 > 0 ? 100 : 0);
      return {
        mes: num, mes_nombre: nombre,
        total1: t1, cantidad1: this.resumen1?.por_mes.find(x => x.mes === num)?.cantidad_facturas ?? 0,
        total2: t2, cantidad2: this.resumen2?.por_mes.find(x => x.mes === num)?.cantidad_facturas ?? 0,
        delta, delta_pct,
      };
    });
  }

  get etiquetaIntegralPeriodo(): string {
    if (this.cmpIntTipo === 'anual') return String(this.cmpIntAnio);
    return `${this.nombreMes(this.cmpIntMes)} ${this.cmpIntAnio}`;
  }

  get maxEstadoTotal(): number {
    if (!this.resumen?.por_estado?.length) return 1;
    return Math.max(...this.resumen.por_estado.map(e => e.total));
  }

  get topClientesOrdenados(): TopCliente[] {
    const pool = this.resumen?.todos_clientes?.length
      ? this.resumen.todos_clientes
      : (this.resumen?.top_clientes ?? []);
    if (!pool.length) return [];
    const arr = [...pool];
    if (this.sortClientes === 'facturas') arr.sort((a, b) => b.facturas - a.facturas);
    else arr.sort((a, b) => b.total - a.total);
    return arr.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));
  }

  get topProductosOrdenados(): TopProducto[] {
    const pool = this.resumen?.todos_productos?.length
      ? this.resumen.todos_productos
      : (this.resumen?.top_productos ?? []);
    if (!pool.length) return [];
    const arr = [...pool];
    if (this.sortProductos === 'unidades') arr.sort((a, b) => b.cantidad - a.cantidad);
    else arr.sort((a, b) => b.total - a.total);
    return arr.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));
  }

  get nombreGrupoSeleccionado(): string {
    if (!this.grupoSeleccionado) return '';
    return this.grupos.find(g => g.id === this.grupoSeleccionado)?.nombre_grupo ?? '';
  }

  barWidth(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }

  ngOnInit(): void {
    forkJoin({
      anios:  this.ventasService.getAniosDisponibles(),
      grupos: this.ventasService.getGrupos(),
    }).subscribe({
      next: ({ anios, grupos }) => {
        this.aniosDisponibles = anios.anios;
        this.grupos = grupos;
        if (anios.anios.length > 0) {
          const ultimo = anios.anios[anios.anios.length - 1];
          this.cmpAnio2  = ultimo;
          this.cmpAAnio2 = ultimo;
          if (anios.anios.length > 1) {
            const penultimo = anios.anios[anios.anios.length - 2];
            this.cmpAnio1  = penultimo;
            this.cmpAAnio1 = penultimo;
          }
        }
      },
      error: () => { this.error = 'No se pudieron cargar los datos iniciales.'; },
    });

    this.busquedaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) {
          this.clientesSugeridos = [];
          this.mostrarSugerencias = false;
          this.clientesBuscando = false;
          return of({ clientes: [] });
        }
        this.clientesBuscando = true;
        return this.ventasService.listarClientes(q).pipe(
          catchError(() => {
            this.clientesBuscando = false;
            return of({ clientes: [] });
          })
        );
      })
    ).subscribe(res => {
      this.clientesSugeridos = res.clientes;
      this.mostrarSugerencias = this.clientesSugeridos.length > 0;
      this.clientesBuscando = false;
    });
  }

  ngOnDestroy(): void {
    this.busquedaSubject.complete();
  }

  // ── Navegación ──────────────────────────────────────────────────────────────
  cambiarModo(nuevo: Modo): void {
    this.modo = nuevo;
    this.resumen = null; this.resumen1 = null; this.resumen2 = null;
    this.comparacionAnual = null; this.modalClienteAbierto = false; this.error = null;
  }

  cambiarVista(v: 'facturas' | 'cobranza'): void {
    if (this.vista === v) return;
    this.vista = v;
    if (this.resumen || this.comparacionAnual || this.resumen1 || this.resumen2) {
      this.consultar();
    }
  }

  get etiquetaVista(): string {
    return this.vista === 'facturas' ? 'Ventas Totales (Facturadas)' : 'Cobranza (Pagado / Parcial)';
  }

  seleccionarGrupo(id: number | null): void {
    this.grupoSeleccionado = id;
    this.resumen = null; this.resumen1 = null; this.resumen2 = null;
    this.comparacionAnual = null;
  }

  // ── Búsqueda de cliente en tiempo real ─────────────────────────────────────
  onClienteInput(): void {
    this.mostrarSugerencias = false;
    this.busquedaSubject.next(this.clienteBusqueda);
  }

  seleccionarCliente(c: { id: number; nombre: string }): void {
    this.clienteBusqueda = c.nombre;
    this.mostrarSugerencias = false;
    this.clientesSugeridos = [];
    this.modalClienteClave = c.nombre;
    this.modalClienteAbierto = true;
  }

  ocultarSugerencias(): void {
    setTimeout(() => { this.mostrarSugerencias = false; }, 200);
  }

  // ── Consultar datos ─────────────────────────────────────────────────────────
  consultar(): void {
    this.error = null; this.cargando = true;
    if (this.modo === 'cliente') {
      this._buscarCliente();
    } else if (this.modo === 'comparar-integrales') {
      this._consultarComparacionIntegrales();
    } else {
      this.grupoSeleccionado ? this._consultarIntegral() : this._consultarOdoo();
    }
  }

  private _buscarCliente(): void {
    if (!this.clienteBusqueda.trim()) {
      this.error = 'Escribe el nombre del cliente para buscar.';
      this.cargando = false;
      return;
    }
    this.modalClienteClave = this.clienteBusqueda.trim();
    this.modalClienteAbierto = true;
    this.cargando = false;
  }

  private _consultarComparacionIntegrales(): void {
    if (!this.cmpIntGrupo1 || !this.cmpIntGrupo2) {
      this.error = 'Selecciona dos integrales para comparar.';
      this.cargando = false;
      return;
    }
    this.resumen1 = null; this.resumen2 = null;

    const rango = this.cmpIntTipo === 'anual'
      ? { inicio: `${this.cmpIntAnio}-01-01`, fin: `${this.cmpIntAnio}-12-31` }
      : this.rangoMes(this.cmpIntAnio, this.cmpIntMes);

    forkJoin({
      r1: this.ventasService.getResumenIntegral(rango.inicio, rango.fin, this.cmpIntGrupo1, this.vista),
      r2: this.ventasService.getResumenIntegral(rango.inicio, rango.fin, this.cmpIntGrupo2, this.vista),
    }).subscribe({
      next: ({ r1, r2 }) => {
        this.resumen1 = r1;
        this.resumen2 = r2;
        this.cargando = false;
      },
      error: (e) => {
        this.error = e?.error?.error || 'Error al comparar integrales.';
        this.cargando = false;
      },
    });
  }

  private _consultarOdoo(): void {
    if (this.modo === 'anual') {
      this.ventasService.getResumen(this.fechaInicioStr, this.fechaFinStr, this.vista).subscribe({
        next: (d) => { this.resumen = d; this.cargando = false; },
        error: (e) => { this.error = e?.error?.error || 'Error al cargar datos.'; this.cargando = false; },
      });
    } else if (this.modo === 'comparar') {
      const r1 = this.rangoMes(this.cmpAnio1, this.cmpMes1);
      const r2 = this.rangoMes(this.cmpAnio2, this.cmpMes2);
      this.resumen1 = null; this.resumen2 = null;
      let pendientes = 2;
      const check = () => { if (--pendientes === 0) this.cargando = false; };
      this.ventasService.getResumen(r1.inicio, r1.fin, this.vista).subscribe({
        next: (d) => { this.resumen1 = d; check(); },
        error: (e) => { this.error = e?.error?.error || 'Error periodo 1.'; check(); },
      });
      this.ventasService.getResumen(r2.inicio, r2.fin, this.vista).subscribe({
        next: (d) => { this.resumen2 = d; check(); },
        error: (e) => { this.error = e?.error?.error || 'Error periodo 2.'; check(); },
      });
    } else {
      this.ventasService.compararAnual(this.cmpAAnio1, this.cmpAAnio2).subscribe({
        next: (d) => { this.comparacionAnual = d; this.cargando = false; },
        error: (e) => { this.error = e?.error?.error || 'Error comparación anual.'; this.cargando = false; },
      });
    }
  }

  private _consultarIntegral(): void {
    const gid = this.grupoSeleccionado;
    if (this.modo === 'anual') {
      this.ventasService.getResumenIntegral(this.fechaInicioStr, this.fechaFinStr, gid, this.vista).subscribe({
        next: (d) => { this.resumen = d; this.cargando = false; },
        error: (e) => { this.error = e?.error?.error || 'Error al cargar datos.'; this.cargando = false; },
      });
    } else if (this.modo === 'comparar') {
      const r1 = this.rangoMes(this.cmpAnio1, this.cmpMes1);
      const r2 = this.rangoMes(this.cmpAnio2, this.cmpMes2);
      this.resumen1 = null; this.resumen2 = null;
      let pendientes = 2;
      const check = () => { if (--pendientes === 0) this.cargando = false; };
      this.ventasService.getResumenIntegral(r1.inicio, r1.fin, gid, this.vista).subscribe({
        next: (d) => { this.resumen1 = d; check(); },
        error: (e) => { this.error = e?.error?.error || 'Error periodo 1.'; check(); },
      });
      this.ventasService.getResumenIntegral(r2.inicio, r2.fin, gid, this.vista).subscribe({
        next: (d) => { this.resumen2 = d; check(); },
        error: (e) => { this.error = e?.error?.error || 'Error periodo 2.'; check(); },
      });
    } else {
      forkJoin({
        r1: this.ventasService.getResumenIntegral(`${this.cmpAAnio1}-01-01`, `${this.cmpAAnio1}-12-31`, gid, this.vista),
        r2: this.ventasService.getResumenIntegral(`${this.cmpAAnio2}-01-01`, `${this.cmpAAnio2}-12-31`, gid, this.vista),
      }).subscribe({
        next: ({ r1, r2 }) => {
          this.comparacionAnual = this._buildComparacion(r1, r2, this.cmpAAnio1, this.cmpAAnio2);
          this.cargando = false;
        },
        error: (e) => { this.error = e?.error?.error || 'Error comparación anual.'; this.cargando = false; },
      });
    }
  }

  private _buildComparacion(r1: ResumenVentas, r2: ResumenVentas, a1: number, a2: number): ComparacionAnual {
    const meses: MesComparado[] = [];
    for (let m = 1; m <= 12; m++) {
      const mes1 = r1.por_mes.find(x => x.mes === m);
      const mes2 = r2.por_mes.find(x => x.mes === m);
      const t1 = mes1?.total ?? 0, t2 = mes2?.total ?? 0;
      const delta = round2(t2 - t1);
      const delta_pct = t1 > 0 ? round1((delta / t1) * 100) : (t2 > 0 ? 100 : 0);
      meses.push({
        mes: m, mes_nombre: MESES.find(x => x.num === m)?.nombre ?? '',
        total1: t1, cantidad1: mes1?.cantidad_facturas ?? 0,
        total2: t2, cantidad2: mes2?.cantidad_facturas ?? 0, delta, delta_pct,
      });
    }
    const total1 = round2(r1.total), total2 = round2(r2.total);
    const delta = round2(total2 - total1);
    const delta_pct = total1 > 0 ? round1((delta / total1) * 100) : (total2 > 0 ? 100 : 0);
    return { anio1: a1, anio2: a2, total1, total2, delta, delta_pct, meses };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  rangoMes(anio: number, mes: number): { inicio: string; fin: string } {
    const mm   = mes.toString().padStart(2, '0');
    const dias = new Date(anio, mes, 0).getDate();
    return {
      inicio: `${anio}-${mm}-01`,
      fin:    `${anio}-${mm}-${dias.toString().padStart(2, '0')}`,
    };
  }

  nombreMes(num: number): string {
    return MESES.find(m => m.num === num)?.nombre ?? '';
  }

  formatCurrency(val: number): string {
    return val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  get etiquetaPeriodo1(): string {
    return `${this.nombreMes(this.cmpMes1)} ${this.cmpAnio1}`;
  }
  get etiquetaPeriodo2(): string {
    return `${this.nombreMes(this.cmpMes2)} ${this.cmpAnio2}`;
  }

  get totalAnual(): number {
    return this.resumen?.por_mes.reduce((s, m) => s + m.total, 0) ?? 0;
  }

  exportarClientes(): void {
    const data = this.resumen?.todos_clientes ?? this.resumen?.top_clientes ?? [];
    const sorted = this.sortClientes === 'facturas'
      ? [...data].sort((a, b) => b.facturas - a.facturas)
      : [...data].sort((a, b) => b.total - a.total);
    const rows = sorted.map((c, i) => [i + 1, c.nombre, c.facturas, c.total, c.participacion_pct ?? 0]);
    const label = this.vista === 'facturas' ? 'facturado' : 'cobrado';
    this._descargarExcel(['#', 'Cliente', 'Facturas', `Total ${label} (con IVA)`, '% Part.'], rows,
      `clientes_${label}_${this._labelPeriodo()}.xlsx`);
  }

  exportarProductos(): void {
    const data = this.resumen?.todos_productos ?? this.resumen?.top_productos ?? [];
    const sorted = this.sortProductos === 'unidades'
      ? [...data].sort((a, b) => b.cantidad - a.cantidad)
      : [...data].sort((a, b) => b.total - a.total);
    const rows = sorted.map((p, i) => [i + 1, p.nombre, p.cantidad, p.total, p.participacion_pct ?? 0]);
    const label = this.vista === 'facturas' ? 'facturado' : 'cobrado';
    this._descargarExcel(['#', 'Producto', 'Unidades', `Total ${label} (sin IVA)`, '% Part.'], rows,
      `productos_${label}_${this._labelPeriodo()}.xlsx`);
  }

  private _descargarExcel(headers: string[], rows: (string | number)[][], filename: string): void {
    const aoa = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = aoa[0].map((_, colIndex) => {
      const maxLength = Math.max(...aoa.map(row => String(row[colIndex] ?? '').length));
      return { wch: Math.min(maxLength + 2, 55) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    XLSX.writeFile(workbook, filename);
  }

  private _labelPeriodo(): string {
    if (this.modo === 'anual') return `${this.fechaInicioStr}_al_${this.fechaFinStr}`;
    return 'periodo';
  }

  // ── Modal desglose por estado ───────────────────────────────────────────────
  verDesglosePorEstado(e: PorEstado): void {
    this.estadoDesglose = null;
    this.estadoDesglosError = null;
    this.estadoDesglosesCargando = true;
    this.estadoDesgloseAbierto = true;

    this.ventasService.getProductosPorEstado(
      this.fechaInicioStr, this.fechaFinStr, e.estado, this.vista
    ).subscribe({
      next: (d) => { this.estadoDesglose = d; this.estadoDesglosesCargando = false; },
      error: () => { this.estadoDesglosError = 'Error al cargar los productos.'; this.estadoDesglosesCargando = false; },
    });
  }

  cerrarModalEstado(): void {
    this.estadoDesgloseAbierto = false;
    this.estadoDesglose = null;
    this.estadoDesglosError = null;
  }

  get maxProdEstadoTotal(): number {
    if (!this.estadoDesglose?.productos?.length) return 1;
    return Math.max(...this.estadoDesglose.productos.map(p => p.total));
  }
}
