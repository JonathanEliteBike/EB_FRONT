import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import {
  ProyeccionesMY27Service,
  ProyeccionesMY27Response,
  ArticuloMY27,
  DesgloseDist,
  DistribucionSku,
} from '../../../services/proyecciones-my27.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-proyecciones-my27',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './proyecciones-my27.component.html',
  styleUrl: './proyecciones-my27.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyeccionesMY27Component implements OnInit {

  datos: ProyeccionesMY27Response | null = null;
  cargando = true;
  error = '';

  // Filtro de búsqueda
  busqueda = '';

  // Expansión de desglose por SKU
  expandidos = new Set<string>();

  // SKU seleccionado para modal de desglose
  articuloModal: ArticuloMY27 | null = null;
  modalAbierto = false;

  readonly mesesLabels = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'];
  readonly mesesKeys   = ['mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'enero', 'febrero', 'marzo', 'abril'];
  readonly periodo = '2026-2027';

  // --- Tab system ---
  activeTab: 'monitor' | 'inventario' = 'monitor';
  modalKpi: 'cubiertos' | 'faltantes' | 'sobrantes' | 'meses' | null = null;
  kpisData: any = null;

  // --- Upload state ---
  archivoInventario: File | null = null;
  uploadEstado: 'idle' | 'cargando' | 'ok' | 'error' = 'idle';
  uploadResultado: { total: number; insertados: number; actualizados: number; errores: string[] } | null = null;

  // --- Inventario y cobertura ---
  inventarioMegamo: any[] = [];
  coberturaMegamo: any[] = [];
  coberturaFiltrada: any[] = [];
  cargandoCobertura = false;
  errorCobertura: string | null = null;
  filtroBusqueda = '';

  // --- Distribución prioritaria ---
  distribucion: any[] = [];
  distribucionFiltrada: any[] = [];
  cargandoDistribucion = false;
  distribucionModal: DistribucionSku | null = null;

  // --- Generar reserva en Odoo ---
  reservaOpen = false;
  reservaCliente = '';
  reservaMes = '';
  reservaSeleccion: Map<string, number> = new Map();
  reservaGenerando = false;
  reservaResultado: { order_id: number; order_name: string; partner_name: string; lineas_creadas: number; skus_no_encontrados: string[] } | null = null;
  reservaError = '';

  readonly CLIENTES_PRIORITARIOS = [
    { clave: 'LC657', nombre: 'Víctor Hugo Villanueva Guzman',             prioridad: 1  },
    { clave: 'MC677', nombre: 'BICICLETAS SCJM',                           prioridad: 2  },
    { clave: 'MC679', nombre: 'Adventure Bike Rider S. A. DE C. V. (GPE)', prioridad: 3  },
    { clave: 'GC411', nombre: 'Adventure Bike Rider S. A. DE C. V.',       prioridad: 4  },
    { clave: 'HE420', nombre: 'Xavier James Lord Santos',                   prioridad: 5  },
    { clave: 'EC216', nombre: 'Marco Tulio (Morelia)',                      prioridad: 6  },
    { clave: 'JC539', nombre: 'Marco Tulio Andrade Navarro (León)',         prioridad: 7  },
    { clave: 'MD670', nombre: 'LIVING FOR BIKES',                           prioridad: 8  },
    { clave: 'GD380', nombre: 'Cycling Riding de Mexico (Metepec)',         prioridad: 9  },
    { clave: 'HA433', nombre: 'Lucia Salazar Lopez',                        prioridad: 10 },
    { clave: 'ID506', nombre: 'Angelica Osorio Gasperin',                   prioridad: 11 },
    { clave: '4E013', nombre: 'CHRISTIAN BOCCALETTI.',                      prioridad: 12 },
    { clave: 'JE537', nombre: 'Christian Boccaletti.',                      prioridad: 13 },
    { clave: 'LC625', nombre: 'Naruco S. A. de C. V. Arcos',               prioridad: 14 },
    { clave: 'LC626', nombre: 'Naruco S. A. de C. V. SJR',                 prioridad: 15 },
    { clave: 'LC627', nombre: 'Naruco S. A. de C. V. (Jurica)',            prioridad: 16 },
    { clave: '84920', nombre: 'Naruco Corregidora',                         prioridad: 17 },
    { clave: 'MD697', nombre: 'Fernando Pontón Rocha',                      prioridad: 18 },
    { clave: 'EA219', nombre: 'Victor Alejandro Garnier Morga',             prioridad: 19 },
    { clave: 'HF427', nombre: 'Opciones Creativas SA de CV',                prioridad: 20 },
    { clave: 'FA271', nombre: 'Juan Manuel Ruacho Rangel',                  prioridad: 21 },
    { clave: 'AG873', nombre: 'Alta Gama 87',                               prioridad: 22 },
    { clave: 'LD664', nombre: 'Bikes 95 Cycling Club S. A. De C. V.',      prioridad: 23 },
    { clave: '5GEG6', nombre: 'FELIPE ENRIQUEZ ROJAS',                     prioridad: 24 },
    { clave: 'IA500', nombre: 'Jesus Manuel Medrano Velarde',               prioridad: 25 },
    { clave: 'DC192', nombre: 'ANA CECILIA LOPEZ LOPEZ',                    prioridad: 26 },
    { clave: 'JC554', nombre: 'ZIRANDA MADRIGAL EUGENA',                    prioridad: 27 },
  ];

  readonly MESES_RESERVA = [
    { key: 'agosto',     label: 'Agosto'     },
    { key: 'septiembre', label: 'Septiembre' },
    { key: 'octubre',    label: 'Octubre'    },
    { key: 'noviembre',  label: 'Noviembre'  },
    { key: 'diciembre',  label: 'Diciembre'  },
    { key: 'enero',      label: 'Enero'      },
    { key: 'febrero',    label: 'Febrero'    },
    { key: 'marzo',      label: 'Marzo'      },
    { key: 'abril',      label: 'Abril'      },
  ];

  readonly MESES = [
    { key: 'mayo', label: 'May' }, { key: 'junio', label: 'Jun' },
    { key: 'julio', label: 'Jul' }, { key: 'agosto', label: 'Ago' },
    { key: 'septiembre', label: 'Sep' }, { key: 'octubre', label: 'Oct' },
    { key: 'noviembre', label: 'Nov' }, { key: 'diciembre', label: 'Dic' },
    { key: 'enero', label: 'Ene' }, { key: 'febrero', label: 'Feb' },
    { key: 'marzo', label: 'Mar' }, { key: 'abril', label: 'Abr' },
  ];

  constructor(
    private svc: ProyeccionesMY27Service,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
  ) {}

  get puedeEditar(): boolean {
    return this.auth.getRol() !== 4
      || this.auth.tienePermisoInterno('proyecciones_my27', 'editar');
  }

  get puedeCrear(): boolean {
    return this.auth.getRol() !== 4
      || this.auth.tienePermisoInterno('proyecciones_my27', 'crear');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(refresh = false): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();
    this.svc.getDatos('2026-2027', refresh).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar proyecciones MY27.';
        this.cargando = false;
        this.cdr.markForCheck();
        console.error(err);
      },
    });
  }

  exportar(): void {
    this.descargarExportacion();
  }

  exportarMegamo(): void {
    this.descargarExportacion('MEGAMO');
  }

  exportarCobertura(): void {
    this.svc.exportarCobertura(this.periodo).subscribe({
      next: archivo => this.descargarArchivo(archivo, `InventarioEntrante_${this.periodo}.xlsx`),
      error: err => console.error('Error al exportar inventario:', err),
    });
  }

  private descargarExportacion(marca = ''): void {
    const periodo = this.datos?.periodo ?? this.periodo;
    this.svc.exportar(periodo, marca).subscribe({
      next: archivo => this.descargarArchivo(archivo, `ProyeccionesMY27${marca ? `_${marca}` : ''}_${periodo}.xlsx`),
      error: err => console.error('Error al exportar proyecciones MY27:', err),
    });
  }

  private descargarArchivo(archivo: Blob, nombre: string): void {
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(archivo);
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  get articulosFiltrados(): ArticuloMY27[] {
    if (!this.datos) return [];
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.datos.articulos;
    return this.datos.articulos.filter(
      (a) =>
        a.sku.toLowerCase().includes(q) ||
        a.producto.toLowerCase().includes(q) ||
        a.marca.toLowerCase().includes(q) ||
        a.modelo.toLowerCase().includes(q),
    );
  }

  getCantidad(art: ArticuloMY27, mes: string): number {
    return art.meses[mes]?.cantidad ?? 0;
  }

  isDisponible(art: ArticuloMY27, mes: string): boolean {
    return art.meses[mes]?.disponible ?? true;
  }

  getCelClass(art: ArticuloMY27, mes: string): string {
    if (!this.isDisponible(art, mes)) return 'cel-bloqueado';
    const v = this.getCantidad(art, mes);
    return v > 0 ? 'cel-con-valor' : 'cel-vacio';
  }

  toggleExpandir(sku: string): void {
    if (this.expandidos.has(sku)) {
      this.expandidos.delete(sku);
    } else {
      this.expandidos.add(sku);
    }
    this.cdr.markForCheck();
  }

  estaExpandido(sku: string): boolean {
    return this.expandidos.has(sku);
  }

  abrirModal(art: ArticuloMY27): void {
    this.articuloModal = art;
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.articuloModal = null;
    this.cdr.markForCheck();
  }

  trackBySku(_: number, art: ArticuloMY27): string {
    return art.sku;
  }

  trackByCliente(_: number, d: DesgloseDist): string {
    return d.clave_cliente;
  }

  getTotalMes(mes: string): number {
    return this.datos?.totales_mes[mes] ?? 0;
  }

  getTotalCostoMes(mes: string): number | null {
    return this.datos?.total_costo_mes?.[mes] ?? null;
  }

  formatPrecio(v: number): string {
    return v > 0 ? '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 0 }) : '—';
  }

  formatCosto(v: number | null | undefined): string {
    if (v === null || v === undefined) return '-';
    return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Métodos de inventario y cobertura ---

  setTab(tab: 'monitor' | 'inventario'): void {
    this.activeTab = tab;
    if (tab === 'inventario') {
      if (this.coberturaMegamo.length === 0) {
        this.cargarCobertura(); // chains cargarDistribucion() in next()
      } else {
        if (!this.kpisData) {
          this.kpisData = this._computeKpis();
          this.cdr.markForCheck();
        }
        if (this.distribucion.length === 0 && !this.cargandoDistribucion) {
          this.cargarDistribucion();
        }
      }
    }
    this.cdr.markForCheck();
  }

  actualizar(): void {
    if (this.activeTab === 'inventario') {
      this.distribucion = [];
      this.distribucionFiltrada = [];
      this.coberturaMegamo = [];
      this.coberturaFiltrada = [];
      this.kpisData = null;
      this.cargando = true;
      this.cdr.markForCheck();
      // refresh=true en getDatos regenera el monitor; refresh=true en cobertura fuerza re-fetch de Odoo
      this.svc.getDatos(this.periodo, true).subscribe({
        next: (d) => {
          this.datos = d;
          this.cargando = false;
          this.cdr.markForCheck();
          this.cargarCobertura(true);
        },
        error: () => {
          this.cargando = false;
          this.cdr.markForCheck();
          this.cargarCobertura(true);
        },
      });
    } else {
      this.cargar(true);
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.archivoInventario = files[0];
      this.uploadEstado = 'idle';
      this.uploadResultado = null;
      this.cdr.markForCheck();
    }
  }

  subirInventario(): void {
    if (!this.archivoInventario) return;
    this.uploadEstado = 'cargando';
    this.uploadResultado = null;
    this.cdr.markForCheck();
    this.svc.subirInventarioMegamo(this.archivoInventario, this.periodo)
      .subscribe({
        next: (res) => {
          this.uploadEstado = 'ok';
          this.uploadResultado = res;
          this.cdr.markForCheck();
          this.cargarCobertura();
        },
        error: (err) => {
          this.uploadEstado = 'error';
          this.uploadResultado = { total: 0, insertados: 0, actualizados: 0, errores: [err?.error?.error || 'Error al subir el archivo'] };
          this.cdr.markForCheck();
        }
      });
  }

  cargarCobertura(refresh = false): void {
    this.cargandoCobertura = true;
    this.errorCobertura = null;
    this.kpisData = null;
    this.cdr.markForCheck();
    this.svc.getCoberturaMegamo(this.periodo, refresh)
      .subscribe({
        next: (res) => {
          this.coberturaMegamo = res.cobertura || [];
          this.cargandoCobertura = false;
          this.filtrarCobertura();
          this.kpisData = this._computeKpis();
          this.cargarDistribucion();
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorCobertura = 'No se pudo cargar el análisis de cobertura.';
          this.cargandoCobertura = false;
          this.cdr.markForCheck();
        }
      });
  }

  filtrarCobertura(): void {
    const q = this.filtroBusqueda.toLowerCase().trim();
    if (!q) {
      this.coberturaFiltrada = this.coberturaMegamo;
    } else {
      this.coberturaFiltrada = this.coberturaMegamo.filter(c =>
        c.sku.toLowerCase().includes(q) || (c.producto || '').toLowerCase().includes(q)
      );
    }
    this.cdr.markForCheck();
  }

  cargarDistribucion(): void {
    this.cargandoDistribucion = true;
    this.cdr.markForCheck();
    this.svc.getDistribucionPrioritaria(this.periodo).subscribe({
      next: (res) => {
        this.distribucion = res.distribuciones || [];
        this.distribucionFiltrada = this.distribucion;
        this.cargandoDistribucion = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoDistribucion = false;
        this.cdr.markForCheck();
      },
    });
  }

  abrirDistribucion(item: any): void {
    this.distribucionModal = this.distribucion.find(d => d.sku === item.sku) ?? null;
    this.cdr.markForCheck();
  }

  cerrarDistribucion(): void {
    this.distribucionModal = null;
    this.cdr.markForCheck();
  }

  getPrioridadLabel(prio: number): string {
    return prio <= 27 ? `#${prio}` : 'Extra';
  }

  getPrioridadClass(prio: number): string {
    if (prio <= 5)  return 'prio-top';
    if (prio <= 15) return 'prio-mid';
    if (prio <= 27) return 'prio-low';
    return 'prio-extra';
  }

  getPorcentajeCubierto(asignado: number, demanda: number): number {
    return demanda > 0 ? Math.round((asignado / demanda) * 100) : 0;
  }

  resumenCobertura(item: any): string {
    const mesesCompletos = item.cobertura.filter((c: any) => c.estado === 'completo' && c.proyectado > 0);
    const mesParcial     = item.cobertura.find((c: any) => c.estado === 'parcial');
    const mesesLabels: Record<string, string> = {
      mayo: 'Mayo', junio: 'Junio', julio: 'Julio', agosto: 'Agosto',
      septiembre: 'Sep', octubre: 'Oct', noviembre: 'Nov', diciembre: 'Dic',
      enero: 'Ene', febrero: 'Feb', marzo: 'Mar', abril: 'Abr'
    };
    const partes: string[] = mesesCompletos.map((c: any) => mesesLabels[c.mes] || c.mes);
    if (mesParcial) {
      partes.push(`${mesesLabels[mesParcial.mes] || mesParcial.mes} (${mesParcial.cubierto}/${mesParcial.proyectado})`);
    }
    if (partes.length === 0) return item.total_proyectado === 0 ? 'Sin demanda' : 'Sin cobertura';
    return partes.join(', ');
  }

  getCoberturaColor(estado: string): string {
    switch (estado) {
      case 'completo':      return '#22c55e';
      case 'parcial':       return '#f59e0b';
      case 'sin_cobertura': return '#ef4444';
      default:              return '#d1d5db';
    }
  }

  abrirModalKpi(tipo: 'cubiertos' | 'faltantes' | 'sobrantes' | 'meses'): void {
    this.modalKpi = tipo;
    this.cdr.markForCheck();
  }

  cerrarModalKpi(): void {
    this.modalKpi = null;
    this.cdr.markForCheck();
  }

  barWidth(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }

  // --- Métodos de reserva Odoo ---

  get productosParaReserva(): any[] {
    return this.coberturaMegamo.filter((s: any) => (s.total_disponible ?? 0) > 0);
  }

  abrirReserva(): void {
    this.reservaOpen = true;
    this.reservaCliente = this.CLIENTES_PRIORITARIOS[0].clave;
    this.reservaMes = 'agosto';
    this.reservaSeleccion = new Map();
    this.reservaResultado = null;
    this.reservaError = '';
    this.cdr.markForCheck();
  }

  cerrarReserva(): void {
    this.reservaOpen = false;
    this.reservaResultado = null;
    this.reservaError = '';
    this.cdr.markForCheck();
  }

  toggleReservaSku(sku: string, checked: boolean, disponible: number): void {
    if (checked) {
      this.reservaSeleccion.set(sku, Math.min(1, disponible));
    } else {
      this.reservaSeleccion.delete(sku);
    }
    this.cdr.markForCheck();
  }

  setReservaCantidad(sku: string, val: string, disponible: number): void {
    const n = Math.max(1, Math.min(parseInt(val, 10) || 1, disponible));
    this.reservaSeleccion.set(sku, n);
    this.cdr.markForCheck();
  }

  isSkuSeleccionado(sku: string): boolean {
    return this.reservaSeleccion.has(sku);
  }

  getReservaCantidad(sku: string): number {
    return this.reservaSeleccion.get(sku) ?? 1;
  }

  get reservaLineas(): { sku: string; cantidad: number }[] {
    return Array.from(this.reservaSeleccion.entries()).map(([sku, cantidad]) => ({ sku, cantidad }));
  }

  generarReservaOdoo(): void {
    if (!this.reservaCliente || !this.reservaMes || this.reservaSeleccion.size === 0) return;
    this.reservaGenerando = true;
    this.reservaResultado = null;
    this.reservaError = '';
    this.cdr.markForCheck();
    this.svc.generarOrdenOdoo({
      clave_cliente: this.reservaCliente,
      mes: this.reservaMes,
      lineas: this.reservaLineas,
    }).subscribe({
      next: (res) => {
        this.reservaGenerando = false;
        this.reservaResultado = res;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.reservaGenerando = false;
        this.reservaError = err?.error?.error || 'Error al generar la orden en Odoo.';
        this.cdr.markForCheck();
      },
    });
  }

  private _computeKpis(): any {
    const skus = this.coberturaMegamo;
    if (!skus.length) return null;

    const conProyeccion = skus.filter((s: any) => s.total_proyectado > 0);
    const sinDemanda    = skus.filter((s: any) => s.total_proyectado === 0);
    const cubiertos     = conProyeccion.filter((s: any) => s.total_deficit === 0);
    const faltantes     = conProyeccion
      .filter((s: any) => s.total_deficit > 0)
      .sort((a: any, b: any) => b.total_deficit - a.total_deficit);
    const sobrantes     = skus
      .filter((s: any) => s.sobrante > 0)
      .sort((a: any, b: any) => b.sobrante - a.sobrante);

    const totalSobrante = skus.reduce((acc: number, s: any) => acc + (s.sobrante || 0), 0);
    const totalFaltante = skus.reduce((acc: number, s: any) => acc + (s.total_deficit || 0), 0);

    const mesTotales = this.MESES.map(m => {
      const total = skus.reduce((acc: number, s: any) => {
        const mc = (s.cobertura || []).find((c: any) => c.mes === m.key);
        return acc + (mc ? (mc.proyectado || 0) : 0);
      }, 0);
      return { key: m.key, label: m.label, total };
    });
    const maxMes  = mesTotales.reduce((mx, m) => m.total > mx ? m.total : mx, 0);
    const mesPico = mesTotales.find(m => m.total === maxMes && maxMes > 0) || null;

    return {
      totalSKUs: skus.length,
      conProyeccion: conProyeccion.length,
      sinDemanda: sinDemanda.length,
      cubiertos, faltantes, sobrantes,
      totalSobrante, totalFaltante,
      mesTotales, mesPico, maxMes,
    };
  }

}
