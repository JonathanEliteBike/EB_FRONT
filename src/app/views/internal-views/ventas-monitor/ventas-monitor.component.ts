import { AfterViewInit, Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import type ExcelJS from 'exceljs';
import { Chart, registerables } from 'chart.js';
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
  DimensionDashboard,
  FiltrosDashboard,
  OpcionFiltroDashboard,
  RespuestaConsultaDashboard,
  RespuestaTendenciaDashboard,
  RespuestaSinVentaDashboard,
  ProductoSinVentaDashboard,
} from '../../../services/ventas.service';
import { AuthService } from '../../../services/auth.service';

type Modo = 'anual' | 'comparar' | 'comparar-anual' | 'comparar-integrales' | 'cliente';
type VistaPrincipal = 'resumen' | 'dashboard';
type CampoOrdenDashboard = 'pzas' | 'existencia' | 'venta' | 'participacion';
type MetricaGraficaDashboard = 'pzas' | 'venta';
type GraficaDashboard = 'barras' | 'tendencia' | 'participacion' | 'pzas-venta' | 'top-10' | 'baja-rotacion';
type DatoParticipacionDashboard = { etiqueta: string; participacion: number };
type DatoPzasVentaDashboard = { etiqueta: string; pzas: number; venta: number };
type DatoRankingDashboard = { etiqueta: string; valor: number };
type EstadoSesionDashboardVentas = {
  version: 1;
  vistaPrincipal: VistaPrincipal;
  fechaInicio: string;
  fechaFin: string;
  vista: 'facturas' | 'cobranza';
  filtros: FiltrosDashboard;
  desgloses: DimensionDashboard[];
  orden: { campo: CampoOrdenDashboard; direccion: 'asc' | 'desc' };
  graficaActiva: GraficaDashboard;
  verTodas: boolean;
  metricaGrafica: MetricaGraficaDashboard;
  mostrarExistencias: boolean;
  consultaAplicada?: {
    fechaInicio: string;
    fechaFin: string;
    vista: 'facturas' | 'cobranza';
    filtros: FiltrosDashboard;
    desgloses: DimensionDashboard[];
  };
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10)  / 10;

Chart.register(...registerables);

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
export class VentasMonitorComponent implements OnInit, OnDestroy, AfterViewInit {
  private static readonly DASHBOARD_SESION_KEY = 'eb.ventas-monitor.dashboard.v1';
  private ventasService = inject(VentasService);
  private authService = inject(AuthService);
  private busquedaSubject = new Subject<string>();

  // ── Estado general ──────────────────────────────────────────────────────────
  modo: Modo = 'anual';
  vistaPrincipal: VistaPrincipal = 'resumen';
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

  // ── Selector de periodo del dashboard ────────────────────────────────────
  readonly dashboardNombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly dashboardDiasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  dashboardMostrarCalendario = false;
  dashboardMesCalendario = new Date().getMonth();
  dashboardAnioCalendario = new Date().getFullYear();
  dashboardVistaCalendario: 'dias' | 'meses' | 'anios' = 'dias';
  dashboardDecadaCalendario = Math.floor(new Date().getFullYear() / 12) * 12;
  dashboardSeleccionandoFecha: 'inicio' | 'fin' = 'inicio';
  @ViewChild('dashboardFechaWrap') private dashboardFechaWrap?: ElementRef<HTMLElement>;

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

  // ── Dashboard de ventas (Bloque 3: filtros dinámicos) ─────────────────────
  dashboardDesgloses: DimensionDashboard[] = [];
  dashboardFiltrosAplicados = false;
  private dashboardFiltrosConsulta: FiltrosDashboard = {};
  private dashboardEtiquetasFiltrosConsulta: Partial<Record<DimensionDashboard, Record<string, string>>> = {};
  private dashboardDesglosesConsulta: DimensionDashboard[] = [];
  private dashboardFechaInicioConsulta = '';
  private dashboardFechaFinConsulta = '';
  private dashboardVistaConsulta: 'facturas' | 'cobranza' = 'cobranza';
  dashboardConsulta: RespuestaConsultaDashboard | null = null;
  dashboardCargandoConsulta = false;
  dashboardErrorConsulta: string | null = null;
  private dashboardConsultaSolicitud = 0;
  private dashboardScrollPendiente: number | null = null;
  private dashboardScrollHorizontalPendiente: number | null = null;
  dashboardMetricaGrafica: MetricaGraficaDashboard = 'pzas';
  dashboardGraficaActiva: GraficaDashboard = 'barras';
  dashboardVerTodas = false;
  dashboardExportando = false;
  dashboardErrorExportacion: string | null = null;
  dashboardTendencia: RespuestaTendenciaDashboard | null = null;
  dashboardCargandoTendencia = false;
  dashboardErrorTendencia: string | null = null;
  private dashboardTendenciaClave: string | null = null;
  private dashboardTendenciaSolicitud = 0;
  dashboardSinVenta: RespuestaSinVentaDashboard | null = null;
  dashboardCargandoSinVenta = false;
  dashboardErrorSinVenta: string | null = null;
  dashboardMostrarTodosSinVenta = false;
  private dashboardSinVentaClave: string | null = null;
  private dashboardSinVentaSolicitud = 0;
  @ViewChild('dashboardBarras') private dashboardBarrasCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardBarrasChart?: Chart;
  @ViewChild('dashboardTendencia') private dashboardTendenciaCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardTendenciaChart?: Chart;
  @ViewChild('dashboardParticipacion') private dashboardParticipacionCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardParticipacionChart?: Chart;
  @ViewChild('dashboardPzasVenta') private dashboardPzasVentaCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardPzasVentaChart?: Chart;
  @ViewChild('dashboardTop10') private dashboardTop10Canvas?: ElementRef<HTMLCanvasElement>;
  private dashboardTop10Chart?: Chart;
  @ViewChild('dashboardBajaRotacion') private dashboardBajaRotacionCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardBajaRotacionChart?: Chart;
  @ViewChild('dashboardTableWrap') private dashboardTableWrap?: ElementRef<HTMLElement>;
  @ViewChild('dashboardTableTopWrap') private dashboardTableTopWrap?: ElementRef<HTMLElement>;
  dashboardAnchoScrollSuperior = 0;
  private dashboardSincronizandoScrollHorizontal = false;
  private dashboardAjusteScrollSuperiorPendiente: number | null = null;
  dashboardOrden: { campo: CampoOrdenDashboard; direccion: 'asc' | 'desc' } = {
    campo: 'venta', direccion: 'desc',
  };
  dashboardMostrarExistencias = true;
  dashboardFiltros: FiltrosDashboard = {};
  dashboardOpciones: Partial<Record<DimensionDashboard, OpcionFiltroDashboard[]>> = {};
  dashboardBusquedas: Partial<Record<DimensionDashboard, string>> = {};
  dashboardCargandoFiltro: Partial<Record<DimensionDashboard, boolean>> = {};
  dashboardErrorFiltro: Partial<Record<DimensionDashboard, string>> = {};
  dashboardFiltroAbierto: DimensionDashboard | null = null;
  private dashboardFiltroSolicitudes: Partial<Record<DimensionDashboard, number>> = {};
  private dashboardFiltroClaveEnCurso: Partial<Record<DimensionDashboard, string>> = {};
  private dashboardBusquedaTimers: Partial<Record<DimensionDashboard, ReturnType<typeof setTimeout>>> = {};
  readonly dashboardDimensiones: { valor: DimensionDashboard; etiqueta: string; icono: string }[] = [
    { valor: 'marca', etiqueta: 'Marca', icono: 'fa-certificate' },
    { valor: 'producto', etiqueta: 'Producto', icono: 'fa-bicycle' },
    { valor: 'categoria', etiqueta: 'Categoría', icono: 'fa-tags' },
    { valor: 'subcategoria', etiqueta: 'Subcategoría', icono: 'fa-folder-tree' },
    { valor: 'modelo', etiqueta: 'Modelo', icono: 'fa-cubes' },
    { valor: 'submodelo', etiqueta: 'Submodelo', icono: 'fa-cube' },
    { valor: 'talla', etiqueta: 'Talla', icono: 'fa-ruler-combined' },
    { valor: 'color', etiqueta: 'Color', icono: 'fa-palette' },
    { valor: 'estado', etiqueta: 'Estado', icono: 'fa-map-marker-alt' },
    { valor: 'cliente', etiqueta: 'Cliente', icono: 'fa-user-tag' },
    { valor: 'integral', etiqueta: 'Integral', icono: 'fa-layer-group' },
  ];

  get dashboardMontoTotal(): string {
    if (this.debeOcultarMontosDashboard()) return '-';
    return this.dashboardConsulta?.totales.venta == null ? '—' : this.formatCurrency(this.dashboardConsulta.totales.venta);
  }

  debeOcultarMontosDashboard(): boolean {
    return this.dashboardConsulta?.permisos.ocultar_montos
      ?? this.authService.debeOcultarMontos('ventas_monitor');
  }

  get dashboardPzasTotal(): number | null {
    return this.dashboardConsulta?.totales.pzas ?? null;
  }

  get dashboardColumnasDimension(): { key: string; label: string; tipo: 'dimension' | 'informativa' | 'metrica' }[] {
    return this.dashboardConsulta?.columnas.filter(columna => columna.tipo === 'dimension') ?? [];
  }

  get dashboardColumnasVisibles(): { key: string; label: string; tipo: 'dimension' | 'informativa' | 'metrica' }[] {
    return this.dashboardConsulta?.columnas.filter(
      columna => columna.key !== 'referencia_comercial'
        && (columna.key !== 'existencia' || this.dashboardMostrarExistencias),
    ) ?? [];
  }

  get dashboardMostrarTotales(): boolean {
    return (this.dashboardConsulta?.filas.length ?? 0) > 1;
  }

  get dashboardDesglosesGrafica(): DimensionDashboard[] {
    return this.dashboardConsulta?.consulta.desgloses ?? this.dashboardDesglosesConsulta;
  }

  get dashboardTieneDesgloseGrafica(): boolean {
    return this.dashboardDesglosesGrafica.length > 0;
  }

  get dashboardDatosGrafica(): { etiqueta: string; valor: number }[] {
    if (!this.dashboardConsulta || !this.dashboardTieneDesgloseGrafica) return [];
    const metrica = this.metricaGraficaEfectiva();
    return this.dashboardConsulta.filas
      .map(fila => ({
        etiqueta: this.dashboardDesglosesGrafica
          .map(dimension => this.etiquetaDimensionDashboard(fila, dimension))
          .join(' · '),
        valor: this.metricaDashboard(fila, metrica) ?? 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15);
  }

  get dashboardDatosParticipacion(): DatoParticipacionDashboard[] {
    if (!this.dashboardConsulta || !this.dashboardTieneDesgloseGrafica) return [];
    return this.dashboardConsulta.filas
      .map(fila => ({
        etiqueta: this.etiquetaFilaDashboard(fila),
        participacion: this.metricaDashboard(fila, 'participacion'),
      }))
      .filter((fila): fila is DatoParticipacionDashboard => fila.participacion != null)
      .sort((a, b) => b.participacion - a.participacion)
      .slice(0, 15);
  }

  get dashboardDatosPzasVenta(): DatoPzasVentaDashboard[] {
    if (!this.dashboardConsulta || !this.dashboardTieneDesgloseGrafica || this.debeOcultarMontosDashboard()) return [];
    return this.dashboardConsulta.filas
      .map(fila => ({
        etiqueta: this.etiquetaFilaDashboard(fila),
        pzas: this.metricaDashboard(fila, 'pzas'),
        venta: this.metricaDashboard(fila, 'venta'),
      }))
      .filter((fila): fila is DatoPzasVentaDashboard => fila.pzas != null && fila.venta != null);
  }

  get dashboardDatosTop10(): DatoRankingDashboard[] {
    return this.datosRankingDashboard('desc');
  }

  get dashboardDatosSinVenta(): ProductoSinVentaDashboard[] {
    return this.dashboardSinVenta?.top ?? [];
  }

  get dashboardTituloGrafica(): string {
    const dimensiones = this.dashboardDesglosesGrafica
      .map(dimension => this.dashboardDimensiones.find(item => item.valor === dimension)?.etiqueta ?? dimension);
    const metrica = this.metricaGraficaEfectiva() === 'venta' ? 'Venta' : 'Piezas vendidas';
    return dimensiones.length ? `${metrica} por ${dimensiones.join(' y ')}` : 'Análisis de ventas';
  }

  get dashboardAlturaGrafica(): number {
    return Math.max(300, this.dashboardDatosGrafica.length * 38 + 86);
  }

  get dashboardAlturaParticipacion(): number {
    return Math.max(300, this.dashboardDatosParticipacion.length * 38 + 86);
  }

  get dashboardAlturaTop10(): number {
    return Math.max(300, this.dashboardDatosTop10.length * 38 + 86);
  }

  get dashboardAlturaSinVenta(): number {
    return Math.max(300, this.dashboardDatosSinVenta.length * 42 + 86);
  }

  get dashboardDatosTendencia() {
    return this.dashboardTendencia?.periodos ?? [];
  }

  get dashboardTieneDatosTendencia(): boolean {
    return this.dashboardDatosTendencia.some(periodo => periodo.pzas !== 0 || (periodo.venta ?? 0) !== 0);
  }

  get dashboardFiltrosActivos(): number {
    return Object.values(this.dashboardFiltros).filter(valores => valores?.length).length;
  }

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
    this.restaurarEstadoSesionDashboard();
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
    if (this.dashboardAjusteScrollSuperiorPendiente != null) {
      cancelAnimationFrame(this.dashboardAjusteScrollSuperiorPendiente);
    }
    this.guardarEstadoSesionDashboard();
    this.destruirGraficasDashboard();
    this.busquedaSubject.complete();
    Object.values(this.dashboardBusquedaTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
  }

  ngAfterViewInit(): void {
    this.programarGraficaDashboard();
    this.programarScrollHorizontalSuperiorDashboard();
  }

  private guardarEstadoSesionDashboard(): void {
    try {
      const consultaAplicada = this.dashboardFiltrosAplicados
        && this.dashboardFechaInicioConsulta
        && this.dashboardFechaFinConsulta
        ? {
            fechaInicio: this.dashboardFechaInicioConsulta,
            fechaFin: this.dashboardFechaFinConsulta,
            vista: this.dashboardVistaConsulta,
            filtros: this.copiarFiltrosDashboard(this.dashboardFiltrosConsulta),
            desgloses: [...this.dashboardDesglosesConsulta],
          }
        : undefined;
      const estado: EstadoSesionDashboardVentas = {
        version: 1,
        vistaPrincipal: this.vistaPrincipal,
        fechaInicio: this.fechaInicioStr,
        fechaFin: this.fechaFinStr,
        vista: this.vista,
        filtros: this.copiarFiltrosDashboard(this.dashboardFiltros),
        desgloses: [...this.dashboardDesgloses],
        orden: { ...this.dashboardOrden },
        graficaActiva: this.dashboardGraficaActiva,
        verTodas: this.dashboardVerTodas,
        metricaGrafica: this.dashboardMetricaGrafica,
        mostrarExistencias: this.dashboardMostrarExistencias,
        consultaAplicada,
      };
      sessionStorage.setItem(VentasMonitorComponent.DASHBOARD_SESION_KEY, JSON.stringify(estado));
    } catch {
      // La disponibilidad de sessionStorage no debe impedir usar el dashboard.
    }
  }

  private restaurarEstadoSesionDashboard(): void {
    try {
      const texto = sessionStorage.getItem(VentasMonitorComponent.DASHBOARD_SESION_KEY);
      if (!texto) return;
      const estado = JSON.parse(texto) as Partial<EstadoSesionDashboardVentas>;
      if (estado.version !== 1
        || !this.fechaSesionDashboardValida(estado.fechaInicio)
        || (estado.fechaFin !== '' && !this.rangoSesionDashboardValido(estado.fechaInicio, estado.fechaFin))) {
        this.eliminarEstadoSesionDashboard();
        return;
      }

      const dimensiones = new Set(this.dashboardDimensiones.map(({ valor }) => valor));
      const graficas = new Set<GraficaDashboard>(['barras', 'tendencia', 'participacion', 'pzas-venta', 'top-10', 'baja-rotacion']);
      const campos = new Set<CampoOrdenDashboard>(['pzas', 'existencia', 'venta', 'participacion']);
      const normalizarFiltros = (filtros: unknown): FiltrosDashboard => {
        const resultado: FiltrosDashboard = {};
        if (!filtros || typeof filtros !== 'object') return resultado;
        Object.entries(filtros as Record<string, unknown>).forEach(([dimension, valores]) => {
          if (!dimensiones.has(dimension as DimensionDashboard) || !Array.isArray(valores)) return;
          resultado[dimension as DimensionDashboard] = [...new Set(
            valores.filter((valor): valor is string => typeof valor === 'string' && valor.trim().length > 0),
          )];
        });
        return resultado;
      };
      const normalizarDesgloses = (desgloses: unknown): DimensionDashboard[] => Array.isArray(desgloses)
        ? [...new Set(desgloses.filter((dimension): dimension is DimensionDashboard => dimensiones.has(dimension as DimensionDashboard)))]
        : [];

      this.vistaPrincipal = estado.vistaPrincipal === 'dashboard' ? 'dashboard' : 'resumen';
      this.fechaInicioStr = estado.fechaInicio;
      this.fechaFinStr = estado.fechaFin ?? '';
      this.vista = estado.vista === 'facturas' ? 'facturas' : 'cobranza';
      this.dashboardFiltros = normalizarFiltros(estado.filtros);
      this.dashboardDesgloses = normalizarDesgloses(estado.desgloses);
      this.dashboardOrden = campos.has(estado.orden?.campo as CampoOrdenDashboard)
        ? {
            campo: estado.orden!.campo,
            direccion: estado.orden!.direccion === 'asc' ? 'asc' : 'desc',
          }
        : { campo: 'venta', direccion: 'desc' };
      this.dashboardGraficaActiva = graficas.has(estado.graficaActiva as GraficaDashboard)
        ? estado.graficaActiva as GraficaDashboard
        : 'barras';
      this.dashboardVerTodas = estado.verTodas === true;
      this.dashboardMetricaGrafica = estado.metricaGrafica === 'venta' ? 'venta' : 'pzas';
      this.dashboardMostrarExistencias = estado.mostrarExistencias !== false;

      const consulta = estado.consultaAplicada;
      if (!consulta || !this.rangoSesionDashboardValido(consulta.fechaInicio, consulta.fechaFin)) return;

      this.dashboardFiltrosConsulta = normalizarFiltros(consulta.filtros);
      this.dashboardEtiquetasFiltrosConsulta = {};
      this.dashboardDesglosesConsulta = normalizarDesgloses(consulta.desgloses);
      this.dashboardFechaInicioConsulta = consulta.fechaInicio;
      this.dashboardFechaFinConsulta = consulta.fechaFin;
      this.dashboardVistaConsulta = consulta.vista === 'facturas' ? 'facturas' : 'cobranza';
      this.dashboardFiltrosAplicados = true;
      this.ejecutarConsultaDashboard();
    } catch {
      this.eliminarEstadoSesionDashboard();
    }
  }

  private rangoSesionDashboardValido(inicio: unknown, fin: unknown): inicio is string {
    return this.fechaSesionDashboardValida(inicio)
      && this.fechaSesionDashboardValida(fin)
      && inicio <= fin;
  }

  private fechaSesionDashboardValida(fecha: unknown): fecha is string {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > this.hoy) return false;
    const fechaParseada = new Date(`${fecha}T00:00:00`);
    return !Number.isNaN(fechaParseada.getTime()) && fechaParseada.toISOString().slice(0, 10) === fecha;
  }

  private eliminarEstadoSesionDashboard(): void {
    try {
      sessionStorage.removeItem(VentasMonitorComponent.DASHBOARD_SESION_KEY);
    } catch {
      // sessionStorage puede estar bloqueado por el navegador.
    }
  }

  private restaurarScrollTablaDashboard(): void {
    const posicion = this.dashboardScrollPendiente;
    const posicionHorizontal = this.dashboardScrollHorizontalPendiente;
    if (posicion == null && posicionHorizontal == null) return;
    this.dashboardScrollPendiente = null;
    this.dashboardScrollHorizontalPendiente = null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (posicion != null) window.scrollTo({ top: posicion, left: window.scrollX, behavior: 'auto' });
      if (posicionHorizontal != null) {
        this.dashboardTableWrap?.nativeElement.scrollTo({ left: posicionHorizontal, behavior: 'auto' });
        this.dashboardTableTopWrap?.nativeElement.scrollTo({ left: posicionHorizontal, behavior: 'auto' });
      }
    }));
  }

  @HostListener('window:resize')
  actualizarScrollHorizontalSuperiorDashboard(): void {
    this.programarScrollHorizontalSuperiorDashboard();
  }

  sincronizarScrollHorizontalDashboard(origen: 'superior' | 'inferior'): void {
    if (this.dashboardSincronizandoScrollHorizontal) return;
    const fuente = origen === 'superior'
      ? this.dashboardTableTopWrap?.nativeElement
      : this.dashboardTableWrap?.nativeElement;
    const destino = origen === 'superior'
      ? this.dashboardTableWrap?.nativeElement
      : this.dashboardTableTopWrap?.nativeElement;
    if (!fuente || !destino || destino.scrollLeft === fuente.scrollLeft) return;

    this.dashboardSincronizandoScrollHorizontal = true;
    destino.scrollLeft = fuente.scrollLeft;
    this.dashboardSincronizandoScrollHorizontal = false;
  }

  private programarScrollHorizontalSuperiorDashboard(): void {
    if (this.dashboardAjusteScrollSuperiorPendiente != null) {
      cancelAnimationFrame(this.dashboardAjusteScrollSuperiorPendiente);
    }
    this.dashboardAjusteScrollSuperiorPendiente = requestAnimationFrame(() => {
      this.dashboardAjusteScrollSuperiorPendiente = null;
      const inferior = this.dashboardTableWrap?.nativeElement;
      const superior = this.dashboardTableTopWrap?.nativeElement;
      if (!inferior || !superior) return;
      this.dashboardAnchoScrollSuperior = inferior.scrollWidth;
      superior.scrollLeft = inferior.scrollLeft;
    });
  }

  @HostListener('document:click', ['$event'])
  cerrarElementosDashboardAlClickFuera(evento: MouseEvent): void {
    const objetivo = evento.target as HTMLElement | null;

    if (this.dashboardMostrarCalendario && !this.dashboardFechaWrap?.nativeElement.contains(objetivo as Node)) {
      this.dashboardMostrarCalendario = false;
    }

    if (this.dashboardFiltroAbierto && !objetivo?.closest('.vm-dashboard-filter-search')) {
      this.dashboardFiltroAbierto = null;
    }
  }

  toggleCalendarioDashboard(evento: MouseEvent): void {
    evento.stopPropagation();
    if (!this.dashboardMostrarCalendario) {
      const fechaBase = this.fechaInicioStr || this.hoy;
      const [anio, mes] = fechaBase.split('-').map(Number);
      this.dashboardAnioCalendario = anio;
      this.dashboardMesCalendario = mes - 1;
      this.dashboardVistaCalendario = 'dias';
      this.dashboardSeleccionandoFecha = this.fechaInicioStr && !this.fechaFinStr ? 'fin' : 'inicio';
    }
    this.dashboardMostrarCalendario = !this.dashboardMostrarCalendario;
  }

  diasCalendarioDashboard(): (number | null)[] {
    const primerDia = new Date(this.dashboardAnioCalendario, this.dashboardMesCalendario, 1).getDay();
    const totalDias = new Date(this.dashboardAnioCalendario, this.dashboardMesCalendario + 1, 0).getDate();
    return [...Array<null>(primerDia).fill(null), ...Array.from({ length: totalDias }, (_, indice) => indice + 1)];
  }

  seleccionarDiaDashboard(dia: number): void {
    const fecha = this.fechaCalendarioDashboard(dia);
    if (this.dashboardSeleccionandoFecha === 'inicio') {
      this.fechaInicioStr = fecha;
      this.fechaFinStr = '';
      this.dashboardSeleccionandoFecha = 'fin';
      this.guardarEstadoSesionDashboard();
      return;
    }

    if (fecha < this.fechaInicioStr) {
      this.fechaFinStr = this.fechaInicioStr;
      this.fechaInicioStr = fecha;
    } else {
      this.fechaFinStr = fecha;
    }
    this.dashboardSeleccionandoFecha = 'inicio';
    this.dashboardMostrarCalendario = false;
    this.guardarEstadoSesionDashboard();
  }

  esDiaInicioDashboard(dia: number | null): boolean {
    return !!dia && this.fechaCalendarioDashboard(dia) === this.fechaInicioStr;
  }

  esDiaFinDashboard(dia: number | null): boolean {
    return !!dia && this.fechaCalendarioDashboard(dia) === this.fechaFinStr;
  }

  esDiaEnRangoDashboard(dia: number | null): boolean {
    if (!dia || !this.fechaInicioStr || !this.fechaFinStr) return false;
    const fecha = this.fechaCalendarioDashboard(dia);
    return fecha > this.fechaInicioStr && fecha < this.fechaFinStr;
  }

  esHoyDashboard(dia: number | null): boolean {
    return !!dia && this.fechaCalendarioDashboard(dia) === this.hoy;
  }

  diaDeshabilitadoDashboard(dia: number | null): boolean {
    return !dia || this.fechaCalendarioDashboard(dia) > this.hoy;
  }

  mesAnteriorDashboard(): void {
    if (this.dashboardVistaCalendario === 'anios') {
      this.dashboardDecadaCalendario -= 12;
    } else if (this.dashboardVistaCalendario === 'meses') {
      this.dashboardAnioCalendario--;
    } else if (this.dashboardMesCalendario === 0) {
      this.dashboardMesCalendario = 11;
      this.dashboardAnioCalendario--;
    } else {
      this.dashboardMesCalendario--;
    }
  }

  mesSiguienteDashboard(): void {
    if (this.dashboardVistaCalendario === 'anios') {
      this.dashboardDecadaCalendario += 12;
    } else if (this.dashboardVistaCalendario === 'meses') {
      this.dashboardAnioCalendario++;
    } else if (this.dashboardMesCalendario === 11) {
      this.dashboardMesCalendario = 0;
      this.dashboardAnioCalendario++;
    } else {
      this.dashboardMesCalendario++;
    }
  }

  abrirMesesDashboard(): void {
    this.dashboardVistaCalendario = 'meses';
  }

  abrirAniosDashboard(): void {
    this.dashboardDecadaCalendario = Math.floor(this.dashboardAnioCalendario / 12) * 12;
    this.dashboardVistaCalendario = 'anios';
  }

  seleccionarMesDashboard(mes: number): void {
    this.dashboardMesCalendario = mes;
    this.dashboardVistaCalendario = 'dias';
  }

  seleccionarAnioDashboard(anio: number): void {
    this.dashboardAnioCalendario = anio;
    this.dashboardVistaCalendario = 'meses';
  }

  aniosCalendarioDashboard(): number[] {
    return Array.from({ length: 12 }, (_, indice) => this.dashboardDecadaCalendario + indice);
  }

  esMesActualDashboard(mes: number): boolean {
    const hoy = new Date();
    return this.dashboardAnioCalendario === hoy.getFullYear() && mes === hoy.getMonth();
  }

  esAnioActualDashboard(anio: number): boolean {
    return anio === new Date().getFullYear();
  }

  limpiarFechasDashboard(): void {
    this.fechaInicioStr = '';
    this.fechaFinStr = '';
    this.dashboardSeleccionandoFecha = 'inicio';
    this.dashboardMostrarCalendario = false;
    this.guardarEstadoSesionDashboard();
  }

  formatoFechaDashboard(fecha: string): string {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${Number(dia)} ${meses[Number(mes) - 1]} ${anio}`;
  }

  cerrarFiltroDashboardPorPerdidaDeFoco(evento: FocusEvent, dimension: DimensionDashboard): void {
    const contenedor = evento.currentTarget as HTMLElement | null;
    if (!contenedor) return;

    setTimeout(() => {
      if (this.dashboardFiltroAbierto !== dimension || contenedor.contains(document.activeElement)) return;
      this.dashboardFiltroAbierto = null;
    });
  }

  private fechaCalendarioDashboard(dia: number): string {
    return `${this.dashboardAnioCalendario}-${String(this.dashboardMesCalendario + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  // ── Navegación ──────────────────────────────────────────────────────────────
  cambiarModo(nuevo: Modo): void {
    this.modo = nuevo;
    this.resumen = null; this.resumen1 = null; this.resumen2 = null;
    this.comparacionAnual = null; this.modalClienteAbierto = false; this.error = null;
  }

  cambiarVistaPrincipal(vista: VistaPrincipal): void {
    this.vistaPrincipal = vista;
    this.guardarEstadoSesionDashboard();
    if (vista === 'dashboard') {
      this.cerrarModalEstado();
      this.programarGraficaDashboard();
    }
  }

  aplicarFiltrosDashboard(): void {
    this.dashboardFiltrosConsulta = this.copiarFiltrosDashboard(this.dashboardFiltros);
    this.dashboardEtiquetasFiltrosConsulta = this.crearEtiquetasFiltrosConsulta(this.dashboardFiltrosConsulta);
    this.dashboardDesglosesConsulta = [...this.dashboardDesgloses];
    this.dashboardFechaInicioConsulta = this.fechaInicioStr;
    this.dashboardFechaFinConsulta = this.fechaFinStr;
    this.dashboardVistaConsulta = this.vista;
    this.guardarEstadoSesionDashboard();
    this.ejecutarConsultaDashboard();
  }

  private ejecutarConsultaDashboard(): void {
    const solicitud = ++this.dashboardConsultaSolicitud;
    this.dashboardCargandoConsulta = true;
    this.dashboardErrorConsulta = null;
    this.dashboardFiltrosAplicados = true;
    if (this.dashboardTendenciaClave && this.dashboardTendenciaClave !== this.claveTendenciaDashboard()) {
      this.invalidarTendenciaDashboard();
    }
    if (this.dashboardSinVentaClave && this.dashboardSinVentaClave !== this.claveSinVentaDashboard()) {
      this.invalidarSinVentaDashboard();
    }
    this.destruirGraficasDashboard();
    this.ventasService.consultarDashboard({
      fecha_inicio: this.dashboardFechaInicioConsulta,
      fecha_fin: this.dashboardFechaFinConsulta,
      vista: this.dashboardVistaConsulta,
      filtros: this.dashboardFiltrosConsulta,
      desgloses: this.dashboardDesglosesConsulta,
      orden: this.ordenDashboardParaConsulta(),
    }).subscribe({
      next: datos => {
        if (this.dashboardConsultaSolicitud !== solicitud) return;
        this.dashboardConsulta = datos;
        if (datos.permisos.ocultar_montos && this.dashboardOrden.campo === 'venta') {
          this.dashboardOrden = { campo: 'pzas', direccion: 'desc' };
        }
        if (datos.permisos.ocultar_montos) this.dashboardMetricaGrafica = 'pzas';
        this.dashboardCargandoConsulta = false;
        this.guardarEstadoSesionDashboard();
        this.programarGraficaDashboard();
        this.programarScrollHorizontalSuperiorDashboard();
        if (this.dashboardGraficaActiva === 'tendencia' || this.dashboardVerTodas) {
          this.cargarTendenciaDashboard();
        }
        if (this.dashboardGraficaActiva === 'baja-rotacion' || this.dashboardVerTodas) {
          this.cargarSinVentaDashboard();
        }
        this.restaurarScrollTablaDashboard();
      },
      error: (e) => {
        if (this.dashboardConsultaSolicitud !== solicitud) return;
        this.dashboardConsulta = null;
        this.dashboardErrorConsulta = e?.error?.error || 'No se pudo cargar la consulta del dashboard.';
        this.dashboardCargandoConsulta = false;
        this.destruirGraficasDashboard();
        this.restaurarScrollTablaDashboard();
      },
    });
  }

  limpiarFiltrosDashboard(): void {
    Object.values(this.dashboardBusquedaTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this.dashboardBusquedaTimers = {};
    this.dashboardFiltrosAplicados = false;
    this.dashboardDesgloses = [];
    this.dashboardFiltrosConsulta = {};
    this.dashboardEtiquetasFiltrosConsulta = {};
    this.dashboardDesglosesConsulta = [];
    this.dashboardFechaInicioConsulta = '';
    this.dashboardFechaFinConsulta = '';
    this.dashboardVistaConsulta = 'cobranza';
    this.dashboardFiltros = {};
    this.dashboardOpciones = {};
    this.dashboardBusquedas = {};
    this.dashboardCargandoFiltro = {};
    this.dashboardErrorFiltro = {};
    this.dashboardFiltroAbierto = null;
    this.dashboardConsulta = null;
    this.dashboardErrorConsulta = null;
    this.invalidarTendenciaDashboard();
    this.destruirGraficasDashboard();
    this.eliminarEstadoSesionDashboard();
  }

  abrirFiltroDashboard(dimension: DimensionDashboard): void {
    if (!this.puedeConsultarFiltroDashboard(dimension)) return;
    this.dashboardFiltroAbierto = this.dashboardFiltroAbierto === dimension ? null : dimension;
    if (this.dashboardFiltroAbierto === dimension) this.cargarOpcionesDashboard(dimension);
  }

  buscarFiltroDashboard(dimension: DimensionDashboard, texto: string): void {
    this.dashboardBusquedas[dimension] = texto;
    const timer = this.dashboardBusquedaTimers[dimension];
    if (timer) clearTimeout(timer);
    this.dashboardBusquedaTimers[dimension] = setTimeout(
      () => this.cargarOpcionesDashboard(dimension), 300
    );
  }

  cargarOpcionesDashboard(dimension: DimensionDashboard): void {
    const filtrosContexto = this.filtrosContextoDashboard(dimension);
    const claveSolicitud = JSON.stringify({
      fechaInicio: this.fechaInicioStr,
      fechaFin: this.fechaFinStr,
      vista: this.vista,
      dimension,
      buscar: this.dashboardBusquedas[dimension] ?? '',
      filtros: filtrosContexto,
    });
    if (this.dashboardFiltroClaveEnCurso[dimension] === claveSolicitud) return;
    const solicitud = (this.dashboardFiltroSolicitudes[dimension] ?? 0) + 1;
    this.dashboardFiltroSolicitudes[dimension] = solicitud;
    this.dashboardFiltroClaveEnCurso[dimension] = claveSolicitud;
    this.dashboardCargandoFiltro[dimension] = true;
    this.dashboardErrorFiltro[dimension] = '';
    this.ventasService.obtenerFiltrosDashboard({
      fecha_inicio: this.fechaInicioStr,
      fecha_fin: this.fechaFinStr,
      vista: this.vista,
      dimension,
      buscar: this.dashboardBusquedas[dimension] ?? '',
      filtros: filtrosContexto,
      limite: 50,
    }).subscribe({
      next: respuesta => {
        if (this.dashboardFiltroSolicitudes[dimension] !== solicitud) return;
        if (dimension === 'producto' && respuesta.selecciones_validas) {
          const productosValidos = new Set(respuesta.selecciones_validas);
          const productosSeleccionados = this.dashboardFiltros.producto ?? [];
          const productosCompatibles = productosSeleccionados.filter(
            producto => productosValidos.has(producto)
          );
          if (productosCompatibles.length !== productosSeleccionados.length) {
            this.dashboardFiltros = {
              ...this.dashboardFiltros,
              producto: productosCompatibles,
            };
          }
        }
        this.dashboardOpciones[dimension] = this.conservarOpcionesSeleccionadasDashboard(
          dimension, respuesta.opciones
        );
        this.dashboardCargandoFiltro[dimension] = false;
        this.dashboardFiltroClaveEnCurso[dimension] = '';
      },
      error: (e) => {
        if (this.dashboardFiltroSolicitudes[dimension] !== solicitud) return;
        this.dashboardOpciones[dimension] = [];
        this.dashboardErrorFiltro[dimension] = e?.error?.error || 'No se pudieron cargar las opciones.';
        this.dashboardCargandoFiltro[dimension] = false;
        this.dashboardFiltroClaveEnCurso[dimension] = '';
      },
    });
  }

  alternarOpcionDashboard(dimension: DimensionDashboard, opcion: OpcionFiltroDashboard): void {
    const actuales = this.dashboardFiltros[dimension] ?? [];
    this.dashboardFiltros = {
      ...this.dashboardFiltros,
      [dimension]: actuales.includes(opcion.id)
        ? actuales.filter(id => id !== opcion.id)
        : [...actuales, opcion.id],
    };
    this.guardarEstadoSesionDashboard();
    if (dimension === 'marca') this.cargarOpcionesDashboard('producto');
  }

  quitarOpcionDashboard(dimension: DimensionDashboard, id: string): void {
    this.dashboardFiltros = {
      ...this.dashboardFiltros,
      [dimension]: (this.dashboardFiltros[dimension] ?? []).filter(valor => valor !== id),
    };
    this.guardarEstadoSesionDashboard();
  }

  limpiarFiltroDashboard(dimension: DimensionDashboard): void {
    this.dashboardFiltros = { ...this.dashboardFiltros, [dimension]: [] };
    this.dashboardBusquedas[dimension] = '';
    this.guardarEstadoSesionDashboard();
  }

  opcionDashboardSeleccionada(dimension: DimensionDashboard, id: string): boolean {
    return (this.dashboardFiltros[dimension] ?? []).includes(id);
  }

  puedeConsultarFiltroDashboard(dimension: DimensionDashboard): boolean {
    return dimension !== 'subcategoria'
      || Boolean((this.dashboardFiltros.producto ?? []).length && (this.dashboardFiltros.categoria ?? []).length);
  }

  etiquetaOpcionDashboard(dimension: DimensionDashboard, id: string): string {
    return this.dashboardOpciones[dimension]?.find(opcion => opcion.id === id)?.label ?? id;
  }

  private crearEtiquetasFiltrosConsulta(filtros: FiltrosDashboard): Partial<Record<DimensionDashboard, Record<string, string>>> {
    const etiquetas: Partial<Record<DimensionDashboard, Record<string, string>>> = {};
    this.dashboardDimensiones.forEach(({ valor }) => {
      const ids = filtros[valor] ?? [];
      if (!ids.length) return;
      etiquetas[valor] = Object.fromEntries(ids.map(id => [id, this.etiquetaOpcionDashboard(valor, id)]));
    });
    return etiquetas;
  }

  private etiquetasFiltroConsultaDashboard(dimension: DimensionDashboard, ids: string[]): string[] {
    const etiquetas = this.dashboardEtiquetasFiltrosConsulta[dimension] ?? {};
    return ids.map(id => etiquetas[id] ?? id);
  }

  private filtrosContextoDashboard(dimension: DimensionDashboard): FiltrosDashboard {
    const filtros: FiltrosDashboard = {};
    this.dashboardDimensiones.forEach(({ valor }) => {
      filtros[valor] = valor === dimension ? [] : [...(this.dashboardFiltros[valor] ?? [])];
    });
    return filtros;
  }

  private conservarOpcionesSeleccionadasDashboard(
    dimension: DimensionDashboard,
    opciones: OpcionFiltroDashboard[]
  ): OpcionFiltroDashboard[] {
    const opcionesPrevias = this.dashboardOpciones[dimension] ?? [];
    const presentes = new Set(opciones.map(opcion => opcion.id));
    const seleccionadasFaltantes = (this.dashboardFiltros[dimension] ?? [])
      .filter(id => !presentes.has(id))
      .map(id => opcionesPrevias.find(opcion => opcion.id === id) ?? { id, label: id });
    return [...seleccionadasFaltantes, ...opciones];
  }

  quitarDesgloseDashboard(): void {
    this.dashboardDesgloses = [];
    this.guardarEstadoSesionDashboard();
    if (!this.dashboardFiltrosAplicados || this.dashboardCargandoConsulta) return;
    this.dashboardDesglosesConsulta = [];
    this.ejecutarConsultaDashboard();
  }

  seleccionarDesgloseDashboard(dimension: DimensionDashboard): void {
    this.dashboardDesgloses = this.dashboardDesgloses.includes(dimension)
      ? this.dashboardDesgloses.filter(valor => valor !== dimension)
      : [...this.dashboardDesgloses, dimension];
    this.guardarEstadoSesionDashboard();
    if (!this.dashboardFiltrosAplicados || this.dashboardCargandoConsulta) return;
    this.dashboardDesglosesConsulta = [...this.dashboardDesgloses];
    this.ejecutarConsultaDashboard();
  }

  ordenarDashboard(campo: string): void {
    if (this.dashboardCargandoConsulta || !this.dashboardConsulta) return;
    if (campo !== 'pzas' && campo !== 'existencia' && campo !== 'venta' && campo !== 'participacion') return;
    this.dashboardOrden = this.dashboardOrden.campo === campo
      ? { campo, direccion: this.dashboardOrden.direccion === 'desc' ? 'asc' : 'desc' }
      : { campo, direccion: 'desc' };
    this.dashboardScrollPendiente = window.scrollY;
    this.dashboardScrollHorizontalPendiente = this.dashboardTableWrap?.nativeElement.scrollLeft ?? null;
    this.guardarEstadoSesionDashboard();
    this.ejecutarConsultaDashboard();
  }

  alternarMostrarExistenciasDashboard(): void {
    this.dashboardMostrarExistencias = !this.dashboardMostrarExistencias;
    if (!this.dashboardMostrarExistencias && this.dashboardOrden.campo === 'existencia') {
      this.dashboardOrden = { campo: 'pzas', direccion: 'desc' };
      this.ordenarFilasDashboardLocal('pzas', 'desc');
    }
    this.guardarEstadoSesionDashboard();
    this.programarScrollHorizontalSuperiorDashboard();
  }

  private ordenarFilasDashboardLocal(campo: CampoOrdenDashboard, direccion: 'asc' | 'desc'): void {
    if (!this.dashboardConsulta) return;
    const filas = [...this.dashboardConsulta.filas].sort((izquierda, derecha) => {
      const valorIzquierdo = this.metricaDashboard(izquierda, campo) ?? Number.NEGATIVE_INFINITY;
      const valorDerecho = this.metricaDashboard(derecha, campo) ?? Number.NEGATIVE_INFINITY;
      return direccion === 'desc' ? valorDerecho - valorIzquierdo : valorIzquierdo - valorDerecho;
    });
    this.dashboardConsulta = { ...this.dashboardConsulta, filas };
  }

  esOrdenActivoDashboard(campo: string): boolean {
    return this.dashboardOrden.campo === campo;
  }

  indicadorOrdenDashboard(campo: string): string {
    if (!this.esOrdenActivoDashboard(campo)) return '';
    return this.dashboardOrden.direccion === 'desc' ? '▼' : '▲';
  }

  etiquetaDimensionDashboard(fila: Record<string, unknown>, clave: string): string {
    const dimensiones = fila['dimensiones'] as Record<string, { label?: unknown }> | undefined;
    const etiqueta = dimensiones?.[clave]?.label;
    return etiqueta == null || String(etiqueta).trim() === '' ? '-' : String(etiqueta);
  }

  referenciasComercialesDashboard(fila: Record<string, unknown>): string[] {
    const referencia = fila['referencia_comercial'];
    const valores = Array.isArray(referencia) ? referencia : referencia == null ? [] : [referencia];
    return valores
      .map(valor => String(valor).trim())
      .filter((valor, indice, todos) => Boolean(valor) && todos.indexOf(valor) === indice);
  }

  referenciasComercialesVisiblesDashboard(fila: Record<string, unknown>): string[] {
    return this.referenciasComercialesDashboard(fila).slice(0, 3);
  }

  referenciasComercialesRestantesDashboard(fila: Record<string, unknown>): number {
    return Math.max(0, this.referenciasComercialesDashboard(fila).length - 3);
  }

  metricaDashboard(fila: Record<string, unknown>, clave: CampoOrdenDashboard): number | null {
    const valor = fila[clave];
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
  }

  formatearPzasDashboard(valor: number | null): string {
    if (valor == null) return '-';
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor);
  }

  formatearParticipacionDashboard(valor: number | null): string {
    return valor == null ? '-' : `${valor.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`;
  }

  anchoParticipacionDashboard(valor: number | null): number {
    return Math.min(100, Math.max(0, valor ?? 0));
  }

  seleccionarMetricaGrafica(metrica: MetricaGraficaDashboard): void {
    if (metrica === 'venta' && this.debeOcultarMontosDashboard()) return;
    this.dashboardMetricaGrafica = metrica;
    this.guardarEstadoSesionDashboard();
    this.programarGraficaDashboard();
  }

  seleccionarGraficaDashboard(grafica: GraficaDashboard): void {
    this.dashboardVerTodas = false;
    this.dashboardGraficaActiva = grafica;
    this.guardarEstadoSesionDashboard();
    if (grafica === 'tendencia') {
      this.cargarTendenciaDashboard();
      return;
    }
    if (grafica === 'baja-rotacion') {
      this.cargarSinVentaDashboard();
      return;
    }
    this.programarGraficaDashboard();
  }

  verTodasLasGraficasDashboard(): void {
    this.dashboardVerTodas = true;
    this.guardarEstadoSesionDashboard();
    this.destruirGraficasDashboard();
    this.programarGraficaDashboard();
    this.cargarTendenciaDashboard();
    this.cargarSinVentaDashboard();
  }

  volverAGraficaDashboard(): void {
    this.dashboardVerTodas = false;
    this.guardarEstadoSesionDashboard();
    this.destruirGraficasDashboard();
    this.programarGraficaDashboard();
  }

  async exportarDashboard(): Promise<void> {
    if (!this.dashboardConsulta || !this.dashboardConsulta.filas.length || this.dashboardExportando) return;

    this.dashboardExportando = true;
    this.dashboardErrorExportacion = null;
    try {
      await new Promise<void>(resolve => setTimeout(resolve));
      // Import dinámico: exceljs pesa ~947 KB y antes se cargaba completo en
      // main.js para todos aunque nunca exportaran -- ahora solo se descarga
      // la primera vez que alguien le da clic a exportar.
      const { default: ExcelJS } = await import('exceljs');
      const libro = new ExcelJS.Workbook();
      libro.creator = 'Elite Bike';
      libro.created = new Date();

      this.agregarResumenExcel(libro);
      this.agregarDatosExcel(libro);
      this.agregarAnalisisExcel(libro);

      const contenido = await libro.xlsx.writeBuffer();
      const blob = new Blob([contenido as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Dashboard_Ventas_${this.fechaFinDashboardExportacion()}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url));
    } catch {
      this.dashboardErrorExportacion = 'No fue posible generar el archivo de Excel. Intenta nuevamente.';
    } finally {
      this.dashboardExportando = false;
    }
  }

  private agregarResumenExcel(libro: ExcelJS.Workbook): void {
    const consulta = this.dashboardConsulta!;
    const hoja = libro.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
    hoja.mergeCells('A1:D1');
    const titulo = hoja.getCell('A1');
    titulo.value = this.tituloContextualDashboard();
    titulo.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB5E28' } };
    titulo.alignment = { horizontal: 'center' };

    const filas: Array<[string, string | number]> = [
      ['Periodo', `${consulta.consulta.fecha_inicio} - ${consulta.consulta.fecha_fin}`],
      ['Vista', consulta.consulta.vista === 'facturas' ? 'Facturas' : 'Cobranza'],
    ];
    const filtros = consulta.consulta.filtros ?? {};
    this.dashboardDimensiones.forEach(({ valor, etiqueta }) => {
      const valores = filtros[valor] ?? [];
      if (valores.length) filas.push([`Filtro: ${etiqueta}`, this.etiquetasFiltroConsultaDashboard(valor, valores).join(', ')]);
    });
    const desgloses = consulta.consulta.desgloses ?? [];
    filas.push(['Desgloses', desgloses.length
      ? desgloses.map(valor => this.dashboardDimensiones.find(item => item.valor === valor)?.etiqueta ?? valor).join(', ')
      : 'Sin desglose']);
    filas.push(['Pzas', consulta.totales.pzas]);
    if (!this.debeOcultarMontosDashboard() && consulta.totales.venta != null) filas.push(['Venta', consulta.totales.venta]);

    filas.forEach(([etiqueta, valor], indice) => {
      const fila = hoja.getRow(indice + 3);
      fila.getCell(1).value = etiqueta;
      fila.getCell(1).font = { bold: true, color: { argb: 'FF403D39' } };
      fila.getCell(2).value = valor;
      if (etiqueta === 'Venta') fila.getCell(2).numFmt = '$#,##0.00';
      if (etiqueta === 'Pzas') fila.getCell(2).numFmt = '#,##0.00';
    });
    hoja.getColumn(1).width = 24;
    hoja.getColumn(2).width = 65;
  }

  private agregarDatosExcel(libro: ExcelJS.Workbook): void {
    const consulta = this.dashboardConsulta!;
    const ocultarMontos = this.debeOcultarMontosDashboard();
    const columnas = consulta.columnas.filter(columna => columna.key !== 'referencia_comercial'
      && !(ocultarMontos && columna.key === 'venta')
      && (columna.key !== 'existencia' || this.dashboardMostrarExistencias));
    const hoja = libro.addWorksheet('Datos', { views: [{ state: 'frozen', ySplit: 1 }] });
    const encabezados = columnas.map(columna => columna.label);
    const encabezado = hoja.addRow(encabezados);
    this.estilizarEncabezadoExcel(encabezado);

    consulta.filas.forEach(fila => {
      hoja.addRow(columnas.map(columna => this.valorCeldaDatosExcel(fila, columna)));
    });
    if (columnas.length) {
      hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: hoja.rowCount, column: columnas.length } };
    }
    columnas.forEach((columna, indice) => {
      const columnaExcel = hoja.getColumn(indice + 1);
      columnaExcel.width = this.anchoColumnaDatosExcel(encabezados[indice], columnaExcel.values);
      if (columna.key === 'pzas') columnaExcel.numFmt = '#,##0.00';
      if (columna.key === 'existencia') columnaExcel.numFmt = '#,##0.00';
      if (columna.key === 'venta') columnaExcel.numFmt = '$#,##0.00';
      if (columna.key === 'participacion') columnaExcel.numFmt = '0.00%';
    });
  }

  private agregarAnalisisExcel(libro: ExcelJS.Workbook): void {
    const hoja = libro.addWorksheet('Análisis', { views: [{ showGridLines: false }] });
    hoja.mergeCells('A1:R1');
    const titulo = hoja.getCell('A1');
    titulo.value = this.tituloContextualDashboard();
    titulo.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB5E28' } };
    titulo.alignment = { horizontal: 'center' };
    hoja.getCell('A2').value = this.dashboardVerTodas ? 'Vista: Ver todas' : 'Vista: gráfica individual';
    hoja.getCell('A2').font = { italic: true, color: { argb: 'FF5A554F' } };

    const graficas: GraficaDashboard[] = this.dashboardVerTodas
      ? ['barras', 'tendencia', 'participacion', 'pzas-venta', 'top-10', 'baja-rotacion']
      : [this.dashboardGraficaActiva];
    graficas.forEach((grafica, indice) => {
      const columna = this.dashboardVerTodas ? (indice % 2) * 9 : 0;
      const fila = this.dashboardVerTodas ? 3 + Math.floor(indice / 2) * 20 : 3;
      const detalle = this.tituloYDescripcionGraficaDashboard(grafica);
      const celdaTitulo = hoja.getCell(fila + 1, columna + 1);
      celdaTitulo.value = detalle.titulo;
      celdaTitulo.font = { bold: true, color: { argb: 'FF403D39' } };
      const celdaDescripcion = hoja.getCell(fila + 2, columna + 1);
      celdaDescripcion.value = detalle.descripcion;
      celdaDescripcion.font = { italic: true, color: { argb: 'FF5A554F' } };

      if (grafica === 'pzas-venta' && this.debeOcultarMontosDashboard()) {
        hoja.getCell(fila + 3, columna + 1).value = 'Sin permiso para visualizar montos.';
        return;
      }
      const imagen = this.imagenGraficaDashboard(grafica);
      if (!imagen) {
        hoja.getCell(fila + 3, columna + 1).value = 'No hay gráfica disponible para la consulta aplicada.';
        return;
      }
      const imageId = libro.addImage({ base64: imagen.split(',')[1], extension: 'png' });
      hoja.addImage(imageId, {
        tl: { col: columna, row: fila + 2 },
        ext: { width: this.dashboardVerTodas ? 480 : 860, height: this.dashboardVerTodas ? 270 : 480 },
      });
    });
    for (let indice = 1; indice <= 18; indice++) hoja.getColumn(indice).width = 13;
  }

  private estilizarEncabezadoExcel(fila: ExcelJS.Row): void {
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF403D39' } };
    fila.alignment = { vertical: 'middle', wrapText: true };
  }

  private valorCeldaDatosExcel(
    fila: Record<string, unknown>,
    columna: { key: string; tipo: 'dimension' | 'informativa' | 'metrica' },
  ): string | number | null {
    if (columna.tipo === 'dimension') return this.etiquetaDimensionDashboard(fila, columna.key);
    if (columna.tipo === 'informativa') return this.referenciasComercialesDashboard(fila).join(' · ');
    const valor = this.metricaDashboard(fila, columna.key as CampoOrdenDashboard);
    return columna.key === 'participacion' && valor != null ? valor / 100 : valor;
  }

  private anchoColumnaDatosExcel(encabezado: string, valores: readonly unknown[]): number {
    const maximo = Math.max(encabezado.length, ...valores.slice(1).map(valor => String(valor ?? '').length));
    return Math.min(Math.max(maximo + 2, 12), 42);
  }

  private tituloContextualDashboard(): string {
    const filtros = this.dashboardConsulta?.consulta.filtros ?? this.dashboardFiltrosConsulta;
    const integrales = this.etiquetasFiltroConsultaDashboard('integral', filtros.integral ?? []);
    if (integrales.length) return `Integral: ${integrales.join(', ')}`;

    const clientes = this.etiquetasFiltroConsultaDashboard('cliente', filtros.cliente ?? []);
    if (clientes.length) return `Cliente: ${clientes.join(', ')}`;

    return 'Análisis de ventas';
  }

  private tituloYDescripcionGraficaDashboard(grafica: GraficaDashboard): { titulo: string; descripcion: string } {
    if (grafica === 'pzas-venta' && this.debeOcultarMontosDashboard()) {
      return {
        titulo: 'Gráfica no disponible',
        descripcion: 'No tienes permiso para visualizar montos en esta consulta.',
      };
    }

    const desgloses = this.nombresDesglosesDashboard();
    const metrica = this.metricaGraficaEfectiva() === 'venta' ? 'Venta' : 'Piezas';
    const metricaBarras = this.metricaGraficaEfectiva() === 'venta' ? 'Venta' : 'Piezas vendidas';

    switch (grafica) {
      case 'barras':
        return {
          titulo: `${metricaBarras} por ${desgloses}`,
          descripcion: 'Top 15 de la consulta actual, ordenado de mayor a menor.',
        };
      case 'tendencia':
        return {
          titulo: `Tendencia mensual de ${metrica}`,
          descripcion: 'Evolución mensual de la consulta actual según los filtros aplicados.',
        };
      case 'participacion':
        return {
          titulo: `Participación por ${desgloses}`,
          descripcion: 'Porcentaje que representa cada elemento dentro del total de la consulta actual.',
        };
      case 'pzas-venta':
        return {
          titulo: `Piezas vs Venta por ${desgloses}`,
          descripcion: 'Relación entre la cantidad vendida y el monto vendido para cada elemento de la consulta.',
        };
      case 'top-10':
        return {
          titulo: `Top 10 por ${metrica} de ${desgloses}`,
          descripcion: 'Los 10 elementos con mayor resultado dentro de la consulta actual.',
        };
      case 'baja-rotacion':
        return {
          titulo: `Sin venta +60 días por ${desgloses}`,
          descripcion: 'Productos con más de 60 días sin venta dentro de la consulta actual.',
        };
    }
  }

  private nombresDesglosesDashboard(): string {
    const nombres = this.dashboardDesglosesGrafica
      .map(dimension => this.dashboardDimensiones.find(item => item.valor === dimension)?.etiqueta ?? dimension);
    if (!nombres.length) return 'la consulta actual';
    if (nombres.length === 1) return nombres[0];
    if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
    return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
  }

  private imagenGraficaDashboard(grafica: GraficaDashboard): string | null {
    const chart = {
      barras: this.dashboardBarrasChart,
      tendencia: this.dashboardTendenciaChart,
      participacion: this.dashboardParticipacionChart,
      'pzas-venta': this.dashboardPzasVentaChart,
      'top-10': this.dashboardTop10Chart,
      'baja-rotacion': this.dashboardBajaRotacionChart,
    }[grafica];
    return chart ? this.imagenGraficaExcel(chart) : null;
  }

  private imagenGraficaExcel(chart: Chart): string | null {
    const configuracionOriginal = (chart.config as unknown as { _config?: Record<string, any> })._config;
    if (!configuracionOriginal) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const configuracion = this.clonarConfiguracionChart(configuracionOriginal) as Record<string, any>;
    const opciones = configuracion['options'] ?? {};
    const escalas = opciones.scales ?? {};
    Object.values(escalas).forEach((escala: any) => {
      escala.ticks = {
        ...(escala.ticks ?? {}),
        color: '#000000',
        font: { ...(escala.ticks?.font ?? {}), size: Math.max(11, escala.ticks?.font?.size ?? 0), weight: escala.ticks?.font?.weight ?? '500' },
      };
      escala.title = {
        ...(escala.title ?? {}),
        color: '#000000',
        font: { ...(escala.title?.font ?? {}), size: Math.max(11, escala.title?.font?.size ?? 0), weight: escala.title?.font?.weight ?? '500' },
      };
      escala.grid = { ...(escala.grid ?? {}), color: '#D9D9D9' };
    });
    opciones.color = '#000000';
    opciones.responsive = false;
    opciones.maintainAspectRatio = false;
    opciones.animation = false;
    opciones.plugins = {
      ...(opciones.plugins ?? {}),
      legend: {
        ...(opciones.plugins?.legend ?? {}),
        labels: {
          ...(opciones.plugins?.legend?.labels ?? {}),
          color: '#000000',
          font: { ...(opciones.plugins?.legend?.labels?.font ?? {}), size: Math.max(11, opciones.plugins?.legend?.labels?.font?.size ?? 0), weight: opciones.plugins?.legend?.labels?.font?.weight ?? '500' },
        },
      },
      title: {
        ...(opciones.plugins?.title ?? {}),
        color: '#000000',
        font: { ...(opciones.plugins?.title?.font ?? {}), size: Math.max(12, opciones.plugins?.title?.font?.size ?? 0), weight: opciones.plugins?.title?.font?.weight ?? '500' },
      },
    };
    configuracion['options'] = opciones;
    configuracion['plugins'] = [
      ...(configuracion['plugins'] ?? []),
      {
        id: 'fondo-blanco-exportacion-excel',
        beforeDraw: (instancia: Chart) => {
          const contexto = instancia.ctx;
          contexto.save();
          contexto.globalCompositeOperation = 'destination-over';
          contexto.fillStyle = '#FFFFFF';
          contexto.fillRect(0, 0, instancia.width, instancia.height);
          contexto.restore();
        },
      },
    ];

    const chartTemporal = new Chart(canvas, configuracion as any);
    const imagen = canvas.toDataURL('image/png');
    chartTemporal.destroy();
    return imagen;
  }

  private clonarConfiguracionChart(valor: unknown): unknown {
    if (Array.isArray(valor)) return valor.map(elemento => this.clonarConfiguracionChart(elemento));
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(
        Object.entries(valor as Record<string, unknown>)
          .map(([clave, contenido]) => [clave, this.clonarConfiguracionChart(contenido)]),
      );
    }
    return valor;
  }

  private fechaFinDashboardExportacion(): string {
    return this.dashboardConsulta?.consulta.fecha_fin || new Date().toISOString().slice(0, 10);
  }

  mostrarGraficaDashboard(grafica: GraficaDashboard): boolean {
    return this.dashboardVerTodas || this.dashboardGraficaActiva === grafica;
  }

  private metricaGraficaEfectiva(): MetricaGraficaDashboard {
    return this.dashboardMetricaGrafica === 'venta' && !this.debeOcultarMontosDashboard()
      ? 'venta'
      : 'pzas';
  }

  private programarGraficaDashboard(): void {
    setTimeout(() => {
      if (this.dashboardVerTodas) {
        this.renderizarGraficaDashboard();
        this.renderizarTendenciaDashboard();
        this.renderizarParticipacionDashboard();
        this.renderizarPzasVentaDashboard();
        this.renderizarTop10Dashboard();
        this.renderizarBajaRotacionDashboard();
        return;
      }
      if (this.dashboardGraficaActiva === 'barras') this.renderizarGraficaDashboard();
      else if (this.dashboardGraficaActiva === 'tendencia') this.renderizarTendenciaDashboard();
      else if (this.dashboardGraficaActiva === 'participacion') this.renderizarParticipacionDashboard();
      else if (this.dashboardGraficaActiva === 'pzas-venta') this.renderizarPzasVentaDashboard();
      else if (this.dashboardGraficaActiva === 'top-10') this.renderizarTop10Dashboard();
      else this.renderizarBajaRotacionDashboard();
    });
  }

  private destruirGraficasDashboard(): void {
    this.dashboardBarrasChart?.destroy();
    this.dashboardBarrasChart = undefined;
    this.dashboardTendenciaChart?.destroy();
    this.dashboardTendenciaChart = undefined;
    this.dashboardParticipacionChart?.destroy();
    this.dashboardParticipacionChart = undefined;
    this.dashboardPzasVentaChart?.destroy();
    this.dashboardPzasVentaChart = undefined;
    this.dashboardTop10Chart?.destroy();
    this.dashboardTop10Chart = undefined;
    this.dashboardBajaRotacionChart?.destroy();
    this.dashboardBajaRotacionChart = undefined;
  }

  private etiquetaFilaDashboard(fila: Record<string, unknown>): string {
    return this.dashboardDesglosesGrafica
      .map(dimension => this.etiquetaDimensionDashboard(fila, dimension))
      .join(' · ');
  }

  private datosRankingDashboard(direccion: 'asc' | 'desc'): DatoRankingDashboard[] {
    if (!this.dashboardConsulta || !this.dashboardTieneDesgloseGrafica) return [];
    const metrica = this.metricaGraficaEfectiva();
    return this.dashboardConsulta.filas
      .map(fila => ({
        etiqueta: this.etiquetaFilaDashboard(fila),
        valor: this.metricaDashboard(fila, metrica),
      }))
      .filter((fila): fila is DatoRankingDashboard => fila.valor != null)
      .sort((a, b) => direccion === 'desc' ? b.valor - a.valor : a.valor - b.valor)
      .slice(0, 10);
  }

  private renderizarGraficaDashboard(): void {
    this.dashboardBarrasChart?.destroy();
    this.dashboardBarrasChart = undefined;
    const canvas = this.dashboardBarrasCanvas?.nativeElement;
    const datos = this.dashboardDatosGrafica;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !datos.length) return;

    const esVenta = this.metricaGraficaEfectiva() === 'venta';
    this.dashboardBarrasChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: datos.map(dato => dato.etiqueta),
        datasets: [{
          data: datos.map(dato => dato.valor),
          backgroundColor: '#EB5E28',
          hoverBackgroundColor: '#ff7847',
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: contexto => esVenta
                ? `Venta: ${this.formatearMontoGrafica(Number(contexto.raw))}`
                : `Pzas: ${this.formatearPzasDashboard(Number(contexto.raw))}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: {
              color: '#a79d93',
              callback: valor => esVenta
                ? this.formatearMontoGrafica(Number(valor))
                : this.formatearPzasDashboard(Number(valor)),
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e2ddd7', font: { size: 11 } },
          },
        },
      },
    });
  }

  private formatearMontoGrafica(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
    }).format(valor);
  }

  private crearGraficaRankingDashboard(
    canvas: HTMLCanvasElement,
    datos: DatoRankingDashboard[],
  ): Chart {
    const esVenta = this.metricaGraficaEfectiva() === 'venta';
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: datos.map(fila => fila.etiqueta),
        datasets: [{
          data: datos.map(fila => fila.valor),
          backgroundColor: '#EB5E28',
          hoverBackgroundColor: '#ff7847',
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: contexto => esVenta
                ? `Venta: ${this.formatearMontoGrafica(Number(contexto.raw))}`
                : `Pzas: ${this.formatearPzasDashboard(Number(contexto.raw))}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: {
              color: '#a79d93',
              callback: valor => esVenta
                ? this.formatearMontoGrafica(Number(valor))
                : this.formatearPzasDashboard(Number(valor)),
            },
          },
          y: { grid: { display: false }, ticks: { color: '#e2ddd7', font: { size: 11 } } },
        },
      },
    });
  }

  private renderizarTop10Dashboard(): void {
    this.dashboardTop10Chart?.destroy();
    this.dashboardTop10Chart = undefined;
    const canvas = this.dashboardTop10Canvas?.nativeElement;
    const datos = this.dashboardDatosTop10;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !this.mostrarGraficaDashboard('top-10') || !datos.length) return;
    this.dashboardTop10Chart = this.crearGraficaRankingDashboard(canvas, datos);
  }

  private renderizarBajaRotacionDashboard(): void {
    this.dashboardBajaRotacionChart?.destroy();
    this.dashboardBajaRotacionChart = undefined;
    const canvas = this.dashboardBajaRotacionCanvas?.nativeElement;
    const datos = this.dashboardDatosSinVenta;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !this.mostrarGraficaDashboard('baja-rotacion') || !datos.length) return;
    this.dashboardBajaRotacionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: datos.map(fila => fila.etiqueta),
        datasets: [{
          data: datos.map(fila => fila.dias_sin_venta ?? 0),
          backgroundColor: datos.map(fila => fila.con_existencia ? '#EB5E28' : '#756d65'),
          hoverBackgroundColor: datos.map(fila => fila.con_existencia ? '#ff7847' : '#968d85'),
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: contexto => datos[contexto[0]?.dataIndex]?.etiqueta ?? '',
              label: contexto => {
                const fila = datos[contexto.dataIndex];
                if (!fila) return '';
                return [
                  `Última venta: ${fila.ultima_venta ? this.formatearFechaSinVentaDashboard(fila.ultima_venta) : 'Nunca vendido'}`,
                  `Días sin venta: ${fila.dias_sin_venta ?? '—'}`,
                  `Existencia: ${this.formatearPzasDashboard(fila.existencia)}`,
                  fila.con_existencia ? 'Con existencia actual' : 'Sin existencia pronosticada disponible',
                ];
              },
            },
          },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(255, 252, 242, .08)' }, ticks: { color: '#a79d93', callback: valor => `${valor} días` } },
          y: { grid: { display: false }, ticks: { color: '#e2ddd7', font: { size: 11 } } },
        },
      },
    });
  }

  formatearFechaSinVentaDashboard(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  private renderizarParticipacionDashboard(): void {
    this.dashboardParticipacionChart?.destroy();
    this.dashboardParticipacionChart = undefined;
    const canvas = this.dashboardParticipacionCanvas?.nativeElement;
    const datos = this.dashboardDatosParticipacion;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !this.mostrarGraficaDashboard('participacion') || !datos.length) return;

    this.dashboardParticipacionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: datos.map(dato => dato.etiqueta),
        datasets: [{
          data: datos.map(dato => dato.participacion),
          backgroundColor: '#EB5E28',
          hoverBackgroundColor: '#ff7847',
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: contexto => `Participación: ${this.formatearParticipacionDashboard(Number(contexto.raw))}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: {
              color: '#a79d93',
              callback: valor => this.formatearParticipacionDashboard(Number(valor)),
            },
          },
          y: { grid: { display: false }, ticks: { color: '#e2ddd7', font: { size: 11 } } },
        },
      },
    });
  }

  private renderizarPzasVentaDashboard(): void {
    this.dashboardPzasVentaChart?.destroy();
    this.dashboardPzasVentaChart = undefined;
    const canvas = this.dashboardPzasVentaCanvas?.nativeElement;
    const datos = this.dashboardDatosPzasVenta;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !this.mostrarGraficaDashboard('pzas-venta') || !datos.length) return;

    this.dashboardPzasVentaChart = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          data: datos.map(dato => ({ x: dato.pzas, y: dato.venta, etiqueta: dato.etiqueta })),
          backgroundColor: 'rgba(235, 94, 40, .8)',
          hoverBackgroundColor: '#ffb08e',
          borderColor: '#EB5E28',
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: contexto => {
                const punto = contexto[0]?.raw as { etiqueta?: string } | undefined;
                return punto?.etiqueta ?? '';
              },
              label: contexto => {
                const punto = contexto.raw as { x: number; y: number };
                return [
                  `Pzas: ${this.formatearPzasDashboard(punto.x)}`,
                  `Venta: ${this.formatearMontoGrafica(punto.y)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            beginAtZero: true,
            title: { display: true, text: 'Pzas', color: '#a79d93' },
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: { color: '#a79d93', callback: valor => this.formatearPzasDashboard(Number(valor)) },
          },
          y: {
            type: 'linear',
            beginAtZero: true,
            title: { display: true, text: 'Venta', color: '#a79d93' },
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: { color: '#a79d93', callback: valor => this.formatearMontoCompacto(Number(valor)) },
          },
        },
      },
    });
  }

  private claveTendenciaDashboard(): string {
    return JSON.stringify({
      fecha_inicio: this.dashboardFechaInicioConsulta,
      fecha_fin: this.dashboardFechaFinConsulta,
      vista: this.dashboardVistaConsulta,
      filtros: this.dashboardFiltrosConsulta,
    });
  }

  private invalidarTendenciaDashboard(): void {
    this.dashboardTendenciaSolicitud++;
    this.dashboardTendencia = null;
    this.dashboardTendenciaClave = null;
    this.dashboardCargandoTendencia = false;
    this.dashboardErrorTendencia = null;
    this.dashboardTendenciaChart?.destroy();
    this.dashboardTendenciaChart = undefined;
  }

  private claveSinVentaDashboard(): string {
    return JSON.stringify({
      fecha_inicio: this.dashboardFechaInicioConsulta,
      fecha_fin: this.dashboardFechaFinConsulta,
      vista: this.dashboardVistaConsulta,
      filtros: this.dashboardFiltrosConsulta,
    });
  }

  private invalidarSinVentaDashboard(): void {
    this.dashboardSinVentaSolicitud++;
    this.dashboardSinVenta = null;
    this.dashboardSinVentaClave = null;
    this.dashboardCargandoSinVenta = false;
    this.dashboardErrorSinVenta = null;
    this.dashboardMostrarTodosSinVenta = false;
    this.dashboardBajaRotacionChart?.destroy();
    this.dashboardBajaRotacionChart = undefined;
  }

  private cargarSinVentaDashboard(): void {
    if (!this.dashboardFiltrosAplicados || !this.dashboardConsulta || this.dashboardCargandoConsulta) return;
    const clave = this.claveSinVentaDashboard();
    if (this.dashboardSinVentaClave === clave && (this.dashboardSinVenta || this.dashboardCargandoSinVenta)) {
      this.programarGraficaDashboard();
      return;
    }
    const solicitud = ++this.dashboardSinVentaSolicitud;
    this.dashboardSinVentaClave = clave;
    this.dashboardSinVenta = null;
    this.dashboardErrorSinVenta = null;
    this.dashboardCargandoSinVenta = true;
    this.dashboardMostrarTodosSinVenta = false;
    this.dashboardBajaRotacionChart?.destroy();
    this.dashboardBajaRotacionChart = undefined;
    this.ventasService.consultarSinVentaDashboard({
      fecha_inicio: this.dashboardFechaInicioConsulta,
      fecha_fin: this.dashboardFechaFinConsulta,
      vista: this.dashboardVistaConsulta,
      filtros: this.dashboardFiltrosConsulta,
      desgloses: this.dashboardDesglosesConsulta,
      orden: this.ordenDashboardParaConsulta(),
    }).subscribe({
      next: datos => {
        if (solicitud !== this.dashboardSinVentaSolicitud) return;
        this.dashboardSinVenta = datos;
        this.dashboardCargandoSinVenta = false;
        this.programarGraficaDashboard();
      },
      error: () => {
        if (solicitud !== this.dashboardSinVentaSolicitud) return;
        this.dashboardSinVenta = null;
        this.dashboardErrorSinVenta = 'No fue posible cargar el análisis sin venta.';
        this.dashboardCargandoSinVenta = false;
      },
    });
  }

  alternarTablaSinVentaDashboard(): void {
    this.dashboardMostrarTodosSinVenta = !this.dashboardMostrarTodosSinVenta;
  }

  private cargarTendenciaDashboard(): void {
    if (!this.dashboardFiltrosAplicados || !this.dashboardConsulta || this.dashboardCargandoConsulta) return;
    const clave = this.claveTendenciaDashboard();
    if (this.dashboardTendenciaClave === clave && (this.dashboardTendencia || this.dashboardCargandoTendencia)) {
      this.programarGraficaDashboard();
      return;
    }
    const solicitud = ++this.dashboardTendenciaSolicitud;
    this.dashboardTendenciaClave = clave;
    this.dashboardTendencia = null;
    this.dashboardErrorTendencia = null;
    this.dashboardCargandoTendencia = true;
    this.dashboardTendenciaChart?.destroy();
    this.dashboardTendenciaChart = undefined;
    this.ventasService.consultarTendenciaDashboard({
      fecha_inicio: this.dashboardFechaInicioConsulta,
      fecha_fin: this.dashboardFechaFinConsulta,
      vista: this.dashboardVistaConsulta,
      filtros: this.dashboardFiltrosConsulta,
    }).subscribe({
      next: datos => {
        if (solicitud !== this.dashboardTendenciaSolicitud) return;
        this.dashboardTendencia = datos;
        if (datos.permisos.ocultar_montos) this.dashboardMetricaGrafica = 'pzas';
        this.dashboardCargandoTendencia = false;
        this.programarGraficaDashboard();
      },
      error: () => {
        if (solicitud !== this.dashboardTendenciaSolicitud) return;
        this.dashboardTendencia = null;
        this.dashboardErrorTendencia = 'No fue posible cargar la tendencia de ventas.';
        this.dashboardCargandoTendencia = false;
      },
    });
  }

  private renderizarTendenciaDashboard(): void {
    this.dashboardTendenciaChart?.destroy();
    this.dashboardTendenciaChart = undefined;
    const canvas = this.dashboardTendenciaCanvas?.nativeElement;
    const datos = this.dashboardDatosTendencia;
    if (!canvas || this.vistaPrincipal !== 'dashboard' || !this.mostrarGraficaDashboard('tendencia') || !datos.length) return;

    const esVenta = this.metricaGraficaEfectiva() === 'venta';
    this.dashboardTendenciaChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: datos.map(dato => dato.label),
        datasets: [{
          data: datos.map(dato => esVenta ? dato.venta ?? 0 : dato.pzas),
          borderColor: '#EB5E28',
          backgroundColor: 'rgba(235, 94, 40, .14)',
          pointBackgroundColor: '#FFFCF2',
          pointBorderColor: '#EB5E28',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: .24,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: contexto => this.etiquetaCompletaTendencia(datos[contexto[0]?.dataIndex]),
              label: contexto => esVenta
                ? `Venta: ${this.formatearMontoGrafica(Number(contexto.raw))}`
                : `Pzas: ${this.formatearPzasDashboard(Number(contexto.raw))}`,
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255, 252, 242, .08)' }, ticks: { color: '#a79d93' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 252, 242, .08)' },
            ticks: {
              color: '#a79d93',
              callback: valor => esVenta ? this.formatearMontoCompacto(Number(valor)) : this.formatearPzasDashboard(Number(valor)),
            },
          },
        },
      },
    });
  }

  private etiquetaCompletaTendencia(periodo?: { periodo: string }): string {
    if (!periodo?.periodo) return '';
    const [anio, mes] = periodo.periodo.split('-').map(Number);
    return `${MESES[mes - 1]?.nombre ?? periodo.periodo} ${anio}`;
  }

  private formatearMontoCompacto(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1,
    }).format(valor);
  }

  private copiarFiltrosDashboard(filtros: FiltrosDashboard): FiltrosDashboard {
    const copia: FiltrosDashboard = {};
    this.dashboardDimensiones.forEach(({ valor }) => {
      copia[valor] = [...(filtros[valor] ?? [])];
    });
    return copia;
  }

  private ordenDashboardParaConsulta(): { campo: CampoOrdenDashboard; direccion: 'asc' | 'desc' } {
    if (this.dashboardOrden.campo === 'venta' && this.debeOcultarMontosDashboard()) {
      return { campo: 'pzas', direccion: 'desc' };
    }
    return this.dashboardOrden;
  }

  cambiarVista(v: 'facturas' | 'cobranza'): void {
    if (this.vista === v) return;
    this.vista = v;
    this.guardarEstadoSesionDashboard();
    if (this.dashboardFiltrosAplicados) {
      // La vista forma parte del universo aplicado: al cambiarla se conserva
      // el resto de la consulta, pero se solicita el universo correspondiente.
      this.dashboardVistaConsulta = v;
      this.ejecutarConsultaDashboard();
    }
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

  formatCurrency(val: number | null | undefined): string {
    if (this.authService.debeOcultarMontos('ventas_monitor')) return '-';
    if (val === null || val === undefined) return '';
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
