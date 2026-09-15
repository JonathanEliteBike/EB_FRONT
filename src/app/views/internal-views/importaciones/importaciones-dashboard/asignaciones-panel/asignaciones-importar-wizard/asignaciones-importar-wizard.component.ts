import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, catchError, concatMap, map, toArray } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { ImportacionesService, Importacion } from '../../../../../../services/importaciones.service';
import {
  AsignacionesImportacionService,
  ImportacionResultado,
  PropuestaProducto,
} from '../../../../../../services/asignaciones-importacion.service';

type Paso = 'form' | 'resumen' | 'terminado';

interface ResultadoReserva {
  sku: string;
  ok: boolean;
  error?: string;
}

const MESES: { valor: string; label: string }[] = [
  { valor: 'mayo', label: 'Mayo' }, { valor: 'junio', label: 'Junio' },
  { valor: 'julio', label: 'Julio' }, { valor: 'agosto', label: 'Agosto' },
  { valor: 'septiembre', label: 'Septiembre' }, { valor: 'octubre', label: 'Octubre' },
  { valor: 'noviembre', label: 'Noviembre' }, { valor: 'diciembre', label: 'Diciembre' },
  { valor: 'enero', label: 'Enero' }, { valor: 'febrero', label: 'Febrero' },
  { valor: 'marzo', label: 'Marzo' }, { valor: 'abril', label: 'Abril' },
];

@Component({
  selector: 'app-asignaciones-importar-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-importar-wizard.component.html',
  styleUrl: './asignaciones-importar-wizard.component.css',
})
export class AsignacionesImportarWizardComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  @Output() cambio = new EventEmitter<void>();

  readonly meses = MESES;
  /** Lista explícita que trae el backend (no un rango calculado aquí);
   *  crece solo cuando se decide abrir el siguiente periodo. */
  periodos: string[] = [];
  creandoSiguientePeriodo = false;
  errorPeriodos = '';

  paso: Paso = 'form';

  // ── Paso 1: formulario ──
  embarques: Importacion[] = [];
  cargandoEmbarques = true;
  errorEmbarques = '';

  embarqueId: number | null = null;
  periodo = '';
  mesDesde = 'octubre';
  mesHasta = 'diciembre';
  archivo: File | null = null;
  archivoNombre = '';

  procesando = false;
  errorForm = '';
  resultadoImport: ImportacionResultado | null = null;

  // ── Paso 2: resumen de la propuesta ──
  propuesta: PropuestaProducto[] = [];
  reservandoTodo = false;
  errorResumen = '';

  // ── Paso 3: resultado final ──
  resultados: ResultadoReserva[] = [];

  constructor(
    private svc: AsignacionesImportacionService,
    private importacionesSvc: ImportacionesService,
  ) {}

  ngOnInit(): void {
    this.importacionesSvc.listar().subscribe({
      next: (data) => {
        this.embarques = data
          .filter((e) => (e.estado || 'activo') === 'activo')
          .sort((a, b) => a.referencia.localeCompare(b.referencia));
        this.cargandoEmbarques = false;
      },
      error: () => {
        this.errorEmbarques = 'No se pudo cargar la lista de embarques';
        this.cargandoEmbarques = false;
      },
    });
    this.svc.periodosActivos().subscribe({
      next: (data) => { this.periodos = data; },
      error: () => { this.errorPeriodos = 'No se pudo cargar la lista de periodos'; },
    });
  }

  /** Solo para el texto del botón/tooltip; el backend decide de verdad cuál
   *  es el siguiente periodo al crearlo. */
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
        this.periodo = data[data.length - 1];
      },
      error: (err) => {
        this.creandoSiguientePeriodo = false;
        this.errorPeriodos = err?.error?.error?.message || 'No se pudo crear el siguiente periodo';
      },
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
    this.archivoNombre = this.archivo ? this.archivo.name : '';
  }

  importarYCalcular(): void {
    this.errorForm = '';
    if (!this.embarqueId) { this.errorForm = 'Selecciona el embarque (referencia)'; return; }
    if (!this.periodo) { this.errorForm = 'Selecciona el periodo'; return; }
    if (!this.mesDesde || !this.mesHasta) { this.errorForm = 'Selecciona la ventana de meses a reservar'; return; }
    if (!this.archivo) { this.errorForm = 'Selecciona el archivo Excel'; return; }

    const embarqueId = this.embarqueId;
    this.procesando = true;
    this.resultadoImport = null;
    this.svc.importarProductos(embarqueId, this.archivo, this.periodo).pipe(
      switchMap((resImport) => {
        this.resultadoImport = resImport;
        return this.svc.recalcular(embarqueId, this.mesDesde, this.mesHasta, this.periodo);
      }),
    ).subscribe({
      next: (propuesta) => {
        this.procesando = false;
        this.propuesta = propuesta;
        this.paso = 'resumen';
        this.cambio.emit();
      },
      error: (err) => {
        this.procesando = false;
        this.errorForm = err?.error?.error?.message
          || 'No se pudo importar el Excel o calcular la propuesta de reserva';
      },
    });
  }

  private _reservasDe(p: PropuestaProducto) {
    const reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[] = [];
    for (const c of p.propuesta) {
      for (const m of c.meses) {
        if (m.sugerido > 0) {
          reservas.push({ clave_cliente: c.clave_cliente, mes_objetivo: m.mes, cantidad: m.sugerido, proyectado: m.proyectado });
        }
      }
    }
    return reservas;
  }

  totalProyectado(p: PropuestaProducto): number {
    return p.propuesta.reduce((s, c) => s + c.proyectado_total, 0);
  }

  totalSugerido(p: PropuestaProducto): number {
    return p.propuesta.reduce((s, c) => s + c.sugerido_total, 0);
  }

  totalFaltante(p: PropuestaProducto): number {
    return p.propuesta.reduce((s, c) => s + c.faltante_total, 0);
  }

  totalGeneralSugerido(): number {
    return this.propuesta.reduce((s, p) => s + this.totalSugerido(p), 0);
  }

  reservarTodo(): void {
    const embarqueId = this.embarqueId;
    if (!embarqueId) return;
    const candidatos = this.propuesta
      .map((p) => ({ p, reservas: this._reservasDe(p) }))
      .filter((x) => x.reservas.length > 0);

    if (!candidatos.length) {
      this.errorResumen = 'No hay ninguna cantidad sugerida mayor a 0 para reservar';
      return;
    }

    this.reservandoTodo = true;
    this.errorResumen = '';
    const llamadas = candidatos.map((x) =>
      this.svc.reservar(embarqueId, x.p.producto_id, x.reservas).pipe(
        map((): ResultadoReserva => ({ sku: x.p.sku, ok: true })),
        catchError((err) => of<ResultadoReserva>({
          sku: x.p.sku, ok: false,
          error: err?.error?.error?.message || 'No se pudo reservar',
        })),
      ),
    );

    // Secuencial (no forkJoin): varias reservas en paralelo para el mismo
    // cliente compiten por el mismo registro de `clientes` en MySQL y producen
    // deadlocks (error 1213). Una reserva a la vez evita la contención.
    from(llamadas).pipe(concatMap((obs) => obs), toArray()).subscribe((resultados) => {
      this.reservandoTodo = false;
      this.resultados = resultados;
      this.paso = 'terminado';
      this.cambio.emit();
    });
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}
