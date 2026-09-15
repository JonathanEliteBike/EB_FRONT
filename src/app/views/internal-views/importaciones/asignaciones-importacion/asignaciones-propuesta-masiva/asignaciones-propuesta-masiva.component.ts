import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
import {
  AsignacionesImportacionService,
  AsignacionesProducto,
  PropuestaProducto,
} from '../../../../../services/asignaciones-importacion.service';

type Paso = 'form' | 'resumen' | 'terminado';

interface ResultadoReserva {
  sku: string;
  ok: boolean;
  error?: string;
}

/** Fila consolidada: lo que el producto ya trae (embarcado/reservado/pendiente/
 *  sobrante/vendido/disponible) + lo que arroja la propuesta calculada
 *  (proyectado/a reservar/faltante) para la ventana de meses elegida. */
interface FilaConsolidada {
  producto: AsignacionesProducto;
  prop: PropuestaProducto | null;
}

const MESES: { valor: string; label: string }[] = [
  { valor: 'mayo', label: 'Mayo' }, { valor: 'junio', label: 'Junio' },
  { valor: 'julio', label: 'Julio' }, { valor: 'agosto', label: 'Agosto' },
  { valor: 'septiembre', label: 'Septiembre' }, { valor: 'octubre', label: 'Octubre' },
  { valor: 'noviembre', label: 'Noviembre' }, { valor: 'diciembre', label: 'Diciembre' },
  { valor: 'enero', label: 'Enero' }, { valor: 'febrero', label: 'Febrero' },
  { valor: 'marzo', label: 'Marzo' }, { valor: 'abril', label: 'Abril' },
];

const NOMBRES_MES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** 'YYYY-MM' -> 'Diciembre 2026'. Si no calza con el formato, regresa el valor tal cual. */
function formatoMes(ym: string | null | undefined): string {
  if (!ym) return '—';
  const [anio, mes] = ym.split('-');
  const idx = parseInt(mes, 10);
  return NOMBRES_MES[idx] ? `${NOMBRES_MES[idx]} ${anio}` : ym;
}

@Component({
  selector: 'app-asignaciones-propuesta-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-propuesta-masiva.component.html',
  styleUrl: './asignaciones-propuesta-masiva.component.css',
})
export class AsignacionesPropuestaMasivaComponent implements OnChanges {
  @Input() importacionId!: number;
  @Input() productos: AsignacionesProducto[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() cambio = new EventEmitter<void>();

  readonly meses = MESES;

  paso: Paso = 'form';
  periodoComun: string | null = null;
  errorPeriodo = '';

  mesDesde = 'octubre';
  mesHasta = 'diciembre';
  calculando = false;
  errorForm = '';

  filas: FilaConsolidada[] = [];
  busqueda = '';
  expandidos = new Set<number>();
  errorResumen = '';
  reservandoTodo = false;
  resultados: ResultadoReserva[] = [];

  constructor(private svc: AsignacionesImportacionService) {}

  ngOnChanges(): void {
    this.paso = 'form';
    this.errorForm = '';
    this.errorResumen = '';
    this.filas = [];
    this.busqueda = '';
    this.expandidos.clear();
    this.resultados = [];

    const periodos = new Set(this.productos.map((p) => p.periodo));
    if (periodos.size > 1) {
      this.periodoComun = null;
      this.errorPeriodo = `Seleccionaste productos con periodos distintos (${[...periodos].join(', ')}). `
        + 'Elige solo productos del mismo periodo para calcular la propuesta.';
    } else {
      this.periodoComun = [...periodos][0] ?? null;
      this.errorPeriodo = '';
    }
  }

  calcular(): void {
    if (this.errorPeriodo || !this.periodoComun) return;
    if (!this.mesDesde || !this.mesHasta) {
      this.errorForm = 'Selecciona la ventana de meses';
      return;
    }
    this.calculando = true;
    this.errorForm = '';
    const idsSeleccionados = new Set(this.productos.map((p) => p.id));
    this.svc.recalcular(this.importacionId, this.mesDesde, this.mesHasta, this.periodoComun).subscribe({
      next: (propuesta) => {
        this.calculando = false;
        const porProducto = new Map(propuesta.filter((p) => idsSeleccionados.has(p.producto_id))
          .map((p) => [p.producto_id, p]));
        this.filas = this.productos.map((producto) => ({
          producto,
          prop: porProducto.get(producto.id) ?? null,
        }));
        this.paso = 'resumen';
      },
      error: (err) => {
        this.calculando = false;
        this.errorForm = err?.error?.error?.message || 'No se pudo calcular la propuesta';
      },
    });
  }

  totalProyectado(prop: PropuestaProducto | null): number {
    return prop ? prop.propuesta.reduce((s, c) => s + c.proyectado_total, 0) : 0;
  }

  totalSugerido(prop: PropuestaProducto | null): number {
    return prop ? prop.propuesta.reduce((s, c) => s + c.sugerido_total, 0) : 0;
  }

  totalFaltante(prop: PropuestaProducto | null): number {
    return prop ? prop.propuesta.reduce((s, c) => s + c.faltante_total, 0) : 0;
  }

  totalGeneralSugerido(): number {
    return this.filas.reduce((s, f) => s + this.totalSugerido(f.prop), 0);
  }

  filasFiltradas(): FilaConsolidada[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.filas;
    return this.filas.filter((f) =>
      f.producto.sku.toLowerCase().includes(q)
      || (f.producto.descripcion || '').toLowerCase().includes(q));
  }

  formatoMes(ym: string | null | undefined): string {
    return formatoMes(ym);
  }

  toggleExpandido(productoId: number): void {
    if (this.expandidos.has(productoId)) this.expandidos.delete(productoId);
    else this.expandidos.add(productoId);
  }

  private _reservasDe(prop: PropuestaProducto) {
    const reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[] = [];
    for (const c of prop.propuesta) {
      for (const m of c.meses) {
        if (m.sugerido > 0) {
          reservas.push({ clave_cliente: c.clave_cliente, mes_objetivo: m.mes, cantidad: m.sugerido, proyectado: m.proyectado });
        }
      }
    }
    return reservas;
  }

  reservarTodo(): void {
    const candidatos = this.filas
      .filter((f): f is FilaConsolidada & { prop: PropuestaProducto } => !!f.prop)
      .map((f) => ({ f, reservas: this._reservasDe(f.prop) }))
      .filter((x) => x.reservas.length > 0);

    if (!candidatos.length) {
      this.errorResumen = 'No hay ninguna cantidad sugerida mayor a 0 para reservar';
      return;
    }

    this.reservandoTodo = true;
    this.errorResumen = '';
    const llamadas = candidatos.map((x) =>
      this.svc.reservar(this.importacionId, x.f.producto.id, x.reservas).pipe(
        map((): ResultadoReserva => ({ sku: x.f.producto.sku, ok: true })),
        catchError((err) => of<ResultadoReserva>({
          sku: x.f.producto.sku, ok: false,
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
