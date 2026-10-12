import { AfterViewInit, Component, ElementRef, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
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
} from '../../../services/ventas.service';
import { AuthService } from '../../../services/auth.service';

type Modo = 'anual' | 'comparar' | 'comparar-anual' | 'comparar-integrales' | 'cliente';
type VistaPrincipal = 'resumen' | 'dashboard';
type CampoOrdenDashboard = 'pzas' | 'venta' | 'participacion';
type MetricaGraficaDashboard = 'pzas' | 'venta';
type GraficaDashboard = 'barras' | 'tendencia';
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
  private dashboardDesglosesConsulta: DimensionDashboard[] = [];
  private dashboardFechaInicioConsulta = '';
  private dashboardFechaFinConsulta = '';
  private dashboardVistaConsulta: 'facturas' | 'cobranza' = 'cobranza';
  dashboardConsulta: RespuestaConsultaDashboard | null = null;
  dashboardCargandoConsulta = false;
  dashboardErrorConsulta: string | null = null;
  private dashboardConsultaSolicitud = 0;
  dashboardMetricaGrafica: MetricaGraficaDashboard = 'pzas';
  dashboardGraficaActiva: GraficaDashboard = 'barras';
  dashboardTendencia: RespuestaTendenciaDashboard | null = null;
  dashboardCargandoTendencia = false;
  dashboardErrorTendencia: string | null = null;
  private dashboardTendenciaClave: string | null = null;
  private dashboardTendenciaSolicitud = 0;
  @ViewChild('dashboardBarras') private dashboardBarrasCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardBarrasChart?: Chart;
  @ViewChild('dashboardTendencia') private dashboardTendenciaCanvas?: ElementRef<HTMLCanvasElement>;
  private dashboardTendenciaChart?: Chart;
  dashboardOrden: { campo: CampoOrdenDashboard; direccion: 'asc' | 'desc' } = {
    campo: 'venta', direccion: 'desc',
  };
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

  get dashboardTituloGrafica(): string {
    const dimensiones = this.dashboardDesglosesGrafica
      .map(dimension => this.dashboardDimensiones.find(item => item.valor === dimension)?.etiqueta ?? dimension);
    const metrica = this.metricaGraficaEfectiva() === 'venta' ? 'Venta' : 'Piezas vendidas';
    return dimensiones.length ? `${metrica} por ${dimensiones.join(' y ')}` : 'Análisis de ventas';
  }

  get dashboardAlturaGrafica(): number {
    return Math.max(300, this.dashboardDatosGrafica.length * 38 + 86);
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
    this.destruirGraficasDashboard();
    this.busquedaSubject.complete();
    Object.values(this.dashboardBusquedaTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
  }

  ngAfterViewInit(): void {
    this.programarGraficaDashboard();
  }

  // ── Navegación ──────────────────────────────────────────────────────────────
  cambiarModo(nuevo: Modo): void {
    this.modo = nuevo;
    this.resumen = null; this.resumen1 = null; this.resumen2 = null;
    this.comparacionAnual = null; this.modalClienteAbierto = false; this.error = null;
  }

  cambiarVistaPrincipal(vista: VistaPrincipal): void {
    this.vistaPrincipal = vista;
    if (vista === 'dashboard') {
      this.cerrarModalEstado();
      this.programarGraficaDashboard();
    }
  }

  aplicarFiltrosDashboard(): void {
    this.dashboardFiltrosConsulta = this.copiarFiltrosDashboard(this.dashboardFiltros);
    this.dashboardDesglosesConsulta = [...this.dashboardDesgloses];
    this.dashboardFechaInicioConsulta = this.fechaInicioStr;
    this.dashboardFechaFinConsulta = this.fechaFinStr;
    this.dashboardVistaConsulta = this.vista;
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
        this.programarGraficaDashboard();
      },
      error: (e) => {
        if (this.dashboardConsultaSolicitud !== solicitud) return;
        this.dashboardConsulta = null;
        this.dashboardErrorConsulta = e?.error?.error || 'No se pudo cargar la consulta del dashboard.';
        this.dashboardCargandoConsulta = false;
        this.destruirGraficasDashboard();
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
  }

  quitarOpcionDashboard(dimension: DimensionDashboard, id: string): void {
    this.dashboardFiltros = {
      ...this.dashboardFiltros,
      [dimension]: (this.dashboardFiltros[dimension] ?? []).filter(valor => valor !== id),
    };
  }

  limpiarFiltroDashboard(dimension: DimensionDashboard): void {
    this.dashboardFiltros = { ...this.dashboardFiltros, [dimension]: [] };
    this.dashboardBusquedas[dimension] = '';
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
    if (!this.dashboardFiltrosAplicados || this.dashboardCargandoConsulta) return;
    this.dashboardDesglosesConsulta = [];
    this.ejecutarConsultaDashboard();
  }

  seleccionarDesgloseDashboard(dimension: DimensionDashboard): void {
    this.dashboardDesgloses = this.dashboardDesgloses.includes(dimension)
      ? this.dashboardDesgloses.filter(valor => valor !== dimension)
      : [...this.dashboardDesgloses, dimension];
    if (!this.dashboardFiltrosAplicados || this.dashboardCargandoConsulta) return;
    this.dashboardDesglosesConsulta = [...this.dashboardDesgloses];
    this.ejecutarConsultaDashboard();
  }

  ordenarDashboard(campo: string): void {
    if (this.dashboardCargandoConsulta || !this.dashboardConsulta) return;
    if (campo !== 'pzas' && campo !== 'venta' && campo !== 'participacion') return;
    this.dashboardOrden = this.dashboardOrden.campo === campo
      ? { campo, direccion: this.dashboardOrden.direccion === 'desc' ? 'asc' : 'desc' }
      : { campo, direccion: 'desc' };
    this.ejecutarConsultaDashboard();
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
    this.programarGraficaDashboard();
  }

  seleccionarGraficaDashboard(grafica: GraficaDashboard): void {
    this.dashboardGraficaActiva = grafica;
    if (grafica === 'tendencia') {
      this.cargarTendenciaDashboard();
      return;
    }
    this.programarGraficaDashboard();
  }

  private metricaGraficaEfectiva(): MetricaGraficaDashboard {
    return this.dashboardMetricaGrafica === 'venta' && !this.debeOcultarMontosDashboard()
      ? 'venta'
      : 'pzas';
  }

  private programarGraficaDashboard(): void {
    setTimeout(() => {
      if (this.dashboardGraficaActiva === 'barras') this.renderizarGraficaDashboard();
      else this.renderizarTendenciaDashboard();
    });
  }

  private destruirGraficasDashboard(): void {
    this.dashboardBarrasChart?.destroy();
    this.dashboardBarrasChart = undefined;
    this.dashboardTendenciaChart?.destroy();
    this.dashboardTendenciaChart = undefined;
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
    if (!canvas || this.vistaPrincipal !== 'dashboard' || this.dashboardGraficaActiva !== 'tendencia' || !datos.length) return;

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
