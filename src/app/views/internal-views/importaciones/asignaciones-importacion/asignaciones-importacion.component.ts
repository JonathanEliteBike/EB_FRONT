import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import {
  AsignacionesImportacionService,
  AsignacionesResumen,
  AsignacionesProducto,
  ImportacionResultado,
  EstadoReserva,
} from '../../../../services/asignaciones-importacion.service';
import { AsignacionesDetalleProductoComponent } from './asignaciones-detalle-producto/asignaciones-detalle-producto.component';
import { AsignacionesPropuestaMasivaComponent } from './asignaciones-propuesta-masiva/asignaciones-propuesta-masiva.component';
import { AsignacionesReservasClienteComponent } from './asignaciones-reservas-cliente/asignaciones-reservas-cliente.component';
import { AsignacionesReservasDetalleComponent } from './asignaciones-reservas-detalle/asignaciones-reservas-detalle.component';

@Component({
  selector: 'app-asignaciones-importacion',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, HomeBarComponent,
    AsignacionesDetalleProductoComponent, AsignacionesPropuestaMasivaComponent,
    AsignacionesReservasClienteComponent, AsignacionesReservasDetalleComponent,
  ],
  templateUrl: './asignaciones-importacion.component.html',
  styleUrl: './asignaciones-importacion.component.css',
})
export class AsignacionesImportacionComponent implements OnInit {
  importacionId!: number;
  resumen: AsignacionesResumen | null = null;
  cargando = true;
  error = '';

  /** Periodos disponibles para importar (YYYY-YYYY). Lista explícita que trae
   *  el backend (no un rango calculado en el navegador): arranca con un solo
   *  periodo vigente y solo crece cuando se decide abrir el siguiente, para
   *  no tentar a elegir uno que todavía no toca (la misma familia de bug que
   *  el "MY27" de texto libre). */
  periodos: string[] = [];
  creandoSiguientePeriodo = false;
  errorPeriodos = '';

  periodoImport = '';
  archivoImport: File | null = null;
  archivoNombre = '';
  importando = false;
  errorImport = '';
  resultadoImport: ImportacionResultado | null = null;

  productoSeleccionado: AsignacionesProducto | null = null;

  /** Selección múltiple para la propuesta consolidada (embarcado/proyectado/
   *  reservado/pendiente/sobrante/disponible de varios SKU a la vez). */
  seleccionados = new Set<number>();
  propuestaMasivaAbierta = false;
  /** Snapshot fijo al abrir el modal: si fuera un método ligado en el template,
   *  cada ciclo de detección de cambios generaría un array nuevo y reiniciaría
   *  el estado interno del modal (ngOnChanges) en cada tick. */
  productosParaPropuesta: AsignacionesProducto[] = [];

  /** Buscador de reservas de este embarque por cliente. */
  reservasClienteAbierto = false;

  /** Detalle de reservas al hacer clic en las tarjetas de KPI (quién tiene
   *  qué reservado y con qué orden de Odoo). */
  reservasDetalleAbierto = false;
  reservasDetalleEstadoInicial: EstadoReserva | undefined = undefined;

  /** A dónde volver: por defecto el detalle del embarque; si se llegó desde el
   *  dashboard (?from=dashboard&tab=...) se vuelve ahí en vez de "hacia adentro". */
  private returnUrl = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AsignacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.importacionId = Number(this.route.snapshot.paramMap.get('id'));
    this.returnUrl = `/importaciones/${this.importacionId}`;
    if (this.route.snapshot.queryParamMap.get('from') === 'dashboard') {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      this.returnUrl = '/importaciones/dashboard' + (tab ? `?tab=${tab}` : '');
    }
    this.cargar();
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.svc.periodosActivos().subscribe({
      next: (data) => { this.periodos = data; },
      error: () => { this.errorPeriodos = 'No se pudo cargar la lista de periodos'; },
    });
  }

  /** Solo para el texto del botón/tooltip; el backend es quien decide de verdad
   *  cuál es el siguiente periodo al crearlo. */
  siguientePeriodoPreview(): string {
    if (!this.periodos.length) return '';
    const ultimo = [...this.periodos].sort().at(-1)!;
    const [y1, y2] = ultimo.split('-').map(Number);
    return `${y1 + 1}-${y2 + 1}`;
  }

  crearSiguientePeriodo(): void {
    this.creandoSiguientePeriodo = true;
    this.errorPeriodos = '';
    this.svc.crearSiguientePeriodoActivo().subscribe({
      next: (data) => {
        this.creandoSiguientePeriodo = false;
        this.periodos = data;
        this.periodoImport = data[data.length - 1];
      },
      error: (err) => {
        this.creandoSiguientePeriodo = false;
        this.errorPeriodos = err?.error?.error?.message || 'No se pudo crear el siguiente periodo';
      },
    });
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.svc.resumen(this.importacionId).subscribe({
      next: (data) => { this.resumen = data; this.cargando = false; },
      error: (err) => {
        this.error = err?.error?.error?.message || 'No se pudo cargar el embarque';
        this.cargando = false;
      },
    });
  }

  volver(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoImport = input.files && input.files.length ? input.files[0] : null;
    this.archivoNombre = this.archivoImport ? this.archivoImport.name : '';
    this.errorImport = '';
    this.resultadoImport = null;
  }

  importarExcel(): void {
    if (!this.periodoImport.trim()) {
      this.errorImport = 'Indica el periodo (ej. 2026-2027)';
      return;
    }
    if (!this.archivoImport) {
      this.errorImport = 'Selecciona un archivo .xlsx';
      return;
    }
    this.importando = true;
    this.errorImport = '';
    this.resultadoImport = null;
    this.svc.importarProductos(this.importacionId, this.archivoImport, this.periodoImport.trim()).subscribe({
      next: (res) => {
        this.importando = false;
        this.resultadoImport = res;
        this.archivoImport = null;
        this.archivoNombre = '';
        this.cargar();
      },
      error: (err) => {
        this.importando = false;
        this.errorImport = err?.error?.error?.message || 'No se pudo importar el archivo';
      },
    });
  }

  abrirDetalle(producto: AsignacionesProducto): void {
    this.productoSeleccionado = producto;
  }

  cerrarDetalle(): void {
    this.productoSeleccionado = null;
  }

  onCambioEnDetalle(): void {
    this.cargar();
  }

  toggleSeleccion(productoId: number): void {
    if (this.seleccionados.has(productoId)) this.seleccionados.delete(productoId);
    else this.seleccionados.add(productoId);
  }

  todosSeleccionados(): boolean {
    const productos = this.resumen?.productos || [];
    return productos.length > 0 && productos.every((p) => this.seleccionados.has(p.id));
  }

  toggleTodos(event: Event): void {
    const marcar = (event.target as HTMLInputElement).checked;
    const productos = this.resumen?.productos || [];
    if (marcar) productos.forEach((p) => this.seleccionados.add(p.id));
    else this.seleccionados.clear();
  }

  productosSeleccionados(): AsignacionesProducto[] {
    const productos = this.resumen?.productos || [];
    return productos.filter((p) => this.seleccionados.has(p.id));
  }

  abrirPropuestaMasiva(): void {
    this.productosParaPropuesta = this.productosSeleccionados();
    this.propuestaMasivaAbierta = true;
  }

  cerrarPropuestaMasiva(): void {
    this.propuestaMasivaAbierta = false;
    this.seleccionados.clear();
  }

  onCambioEnPropuestaMasiva(): void {
    this.cargar();
  }

  abrirReservasCliente(): void {
    this.reservasClienteAbierto = true;
  }

  cerrarReservasCliente(): void {
    this.reservasClienteAbierto = false;
  }

  abrirReservasDetalle(estadoInicial?: EstadoReserva): void {
    this.reservasDetalleEstadoInicial = estadoInicial;
    this.reservasDetalleAbierto = true;
  }

  cerrarReservasDetalle(): void {
    this.reservasDetalleAbierto = false;
  }
}
