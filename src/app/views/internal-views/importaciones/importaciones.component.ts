import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { TemporadaSelectorComponent, TEMPORADA_HISTORICO } from '../../../components/temporada-selector/temporada-selector.component';
import { ImportacionesService, Importacion } from '../../../services/importaciones.service';

@Component({
  selector: 'app-importaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, DatePickerComponent, TemporadaSelectorComponent],
  templateUrl: './importaciones.component.html',
  styleUrl: './importaciones.component.css',
})
export class ImportacionesComponent implements OnInit, AfterViewInit, OnDestroy {
  // Solo Administrador (rol 1) ve el acceso a Tiempos Estimados -- esa
  // pantalla queda restringida por adminGuard en app.routes.ts; este flag
  // solo evita mostrar un botón que llevaría a un usuario normal a un redirect.
  readonly esAdmin: boolean = (() => {
    try {
      const token = localStorage.getItem('token');
      return !!token && (jwtDecode(token) as any).rol === 1;
    } catch { return false; }
  })();

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

  // ── Temporadas (MY27 desde R26-1414; anteriores = MY26) ──────────────────
  temporadaSel: 'MY27' | 'MY26' | 'todas' = 'MY27';
  private static readonly _CORTE_MY27 = 1414;
  readonly temporadasCerradas = ['MY26'];

  temporadaDe(e: Importacion): 'MY27' | 'MY26' {
    const ref = (e?.referencia || '').toUpperCase();
    const m = /R\d+-(\d+)/.exec(ref) || /(\d{3,})/.exec(ref);
    const num = m ? parseInt(m[1], 10) : 0;
    return num >= ImportacionesComponent._CORTE_MY27 ? 'MY27' : 'MY26';
  }
  get temporadaSelValor(): string {
    if (this.temporadaSel === 'MY26')  return 'MY26';
    if (this.temporadaSel === 'todas') return TEMPORADA_HISTORICO;
    return '';
  }
  onTemporadaCambio(v: string): void {
    this.temporadaSel = v === TEMPORADA_HISTORICO ? 'todas' : (v === 'MY26' ? 'MY26' : 'MY27');
    this.filtrar();
  }

  readonly ETAPAS = [
    { key: 'Entrega',      bg: 'rgba(236,72,153,.18)',  color: '#f472b6' },
    { key: 'Booking',      bg: 'rgba(59,130,246,.18)',  color: '#60a5fa' },
    { key: 'Lleg. Puerto', bg: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
    { key: 'Destino',      bg: 'rgba(245,158,11,.18)',  color: '#fbbf24' },
    { key: 'Almacén',      bg: 'rgba(139,92,246,.18)',  color: '#a78bfa' },
    { key: 'Verif.',       bg: 'rgba(99,102,241,.18)',  color: '#818cf8' },
    { key: 'Etiq.',        bg: 'rgba(168,85,247,.18)',  color: '#c084fc' },
    { key: 'Liberado',     bg: 'rgba(34,197,94,.18)',   color: '#22c55e' },
    { key: 'Pendiente',    bg: 'rgba(71,85,105,.18)',   color: '#94a3b8' },
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

  readonly ORIGENES_DISPONIBLES = ['VIETNAM', 'ESPAÑA', 'TAIWAN', 'BELGICA', 'CAMBOYA', 'ESTADOS UNIDOS', 'CHINA'];

  /** Selección única; "Accesorios y Bicicletas" es la única combinación real que existe,
   *  así que es una opción fija más, no una mezcla libre de las demás.
   *  "Bicicleta eléctrica" se agrega aparte porque solo se trae de España y por vía aérea. */
  private readonly TIPOS_PRODUCTO_BASE = ['Bicicleta', 'Cascos', 'Zapatos', 'Accesorios', 'Accesorios y Bicicletas'];

  private esCombinacionBicicletaElectrica(): boolean {
    return this.nuevoEmbarque.via_transporte === 'AEREO' && this.nuevoEmbarque.log_origen === 'ESPAÑA';
  }

  tiposProductoDisponibles(): string[] {
    const tipos = [...this.TIPOS_PRODUCTO_BASE];
    if (this.esCombinacionBicicletaElectrica()) {
      tipos.unshift('Bicicleta eléctrica');
    }
    return tipos;
  }

  seleccionarTipoProducto(tipo: string): void {
    this.nuevoEmbarque.log_tipo_productos = tipo;
  }

  private limpiarBicicletaElectricaSiYaNoAplica(): void {
    if (!this.esCombinacionBicicletaElectrica() && this.nuevoEmbarque.log_tipo_productos === 'Bicicleta eléctrica') {
      this.nuevoEmbarque.log_tipo_productos = '';
    }
  }

  cambiarViaTransporte(via: 'MARITIMO' | 'AEREO'): void {
    this.nuevoEmbarque.via_transporte = via;
    this.limpiarBicicletaElectricaSiYaNoAplica();
  }

  cambiarOrigen(origen: string): void {
    this.nuevoEmbarque.log_origen = origen;
    this.limpiarBicicletaElectricaSiYaNoAplica();
  }

  abrirNuevo(): void {
    this.nuevoEmbarque = { referencia: '', nombre: '', via_transporte: 'MARITIMO', log_origen: '', log_tipo_productos: '' };
    this.mostrarNuevo = true;
  }

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
      const matchTemp  = this.temporadaSel === 'todas' || this.temporadaDe(e) === this.temporadaSel;
      const eta    = e.imp_llegada_contenedor_puerto || '';
      const matchF = (!desde && !hasta) || ((!desde || eta >= desde) && (!hasta || eta <= hasta));
      return matchQ && matchO && matchV && matchE && matchEtapa && matchTemp && matchF;
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

  get embarquesTemporada(): Importacion[] {
    if (this.temporadaSel === 'todas') return this.embarques;
    return this.embarques.filter(e => this.temporadaDe(e) === this.temporadaSel);
  }

  countEtapa(key: string): number {
    return this.embarquesTemporada.filter(e => this.estadoActual(e) === key).length;
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

  private static readonly _ETAPAS_ORDEN: { nombre: string; campo: keyof Importacion }[] = [
    { nombre: 'Entrega',      campo: 'log_fecha_entrega' },
    { nombre: 'Booking',      campo: 'log_fecha_booking' },
    { nombre: 'Lleg. Puerto', campo: 'imp_llegada_contenedor_puerto' },
    { nombre: 'Destino',      campo: 'des_fecha_cruce_real' },
    { nombre: 'Almacén',      campo: 'des_llegada_almacen' },
    { nombre: 'Verif.',       campo: 'alm_liberacion_uva' },
    { nombre: 'Etiq.',        campo: 'alm_terminacion_etiquetado' },
    { nombre: 'Liberado',     campo: 'rec_liberacion_final' },
  ];

  /** Mismo campo y mismo nombre que _estado_actual() en el backend -- ver
   *  routes/importaciones.py. Se duplica aquí porque esta pantalla filtra
   *  sobre el listado ya cargado en el cliente, sin volver a pedirle al
   *  backend el estado por cada embarque.
   *
   *  Una etapa con fecha real capturada ya quedó atrás: el estado debe
   *  avanzar a la siguiente etapa de la secuencia, no quedarse mostrando
   *  la que ya se completó. */
  estadoActual(e: Importacion): string {
    const etapas = ImportacionesComponent._ETAPAS_ORDEN;
    let ultimoCompletado = -1;
    for (let i = 0; i < etapas.length; i++) {
      if (e[etapas[i].campo]) ultimoCompletado = i;
    }

    if (ultimoCompletado === -1) return 'Pendiente';
    if (ultimoCompletado === etapas.length - 1) return 'Liberado';
    return etapas[ultimoCompletado + 1].nombre;
  }

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

  estadoStyle(e: Importacion): { background: string; color: string } {
    const cfg = ImportacionesComponent._ESTADO_CFG[this.estadoActual(e)]
              ?? { bg: 'rgba(71,85,105,.18)', color: '#94a3b8' };
    return { background: cfg.bg, color: cfg.color };
  }

  private _normOrigen(s: string): string {
    if (!s) return '';
    const key = s.normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // acentos
      .replace(/[�?]/g, '')         // � y ? (corrupción de ñ/é en la BD)
      .trim().toUpperCase();
    const canon: Record<string, string> = {
      'ESPANA': 'ESPAÑA', 'ESPAA': 'ESPAÑA',
      'BELGICA': 'BÉLGICA', 'BLGICA': 'BÉLGICA',
    };
    return canon[key] ?? key;
  }

  /** Origen normalizado para mostrar en plantilla (arregla ñ/é dañadas). */
  origenBonito(s: string | null | undefined): string {
    return this._normOrigen(s || '');
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
