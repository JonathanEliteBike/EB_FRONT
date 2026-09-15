import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AsignacionesImportacionService,
  ClientePrioridad,
} from '../../../../../services/asignaciones-importacion.service';

type Paso = 'form' | 'resumen' | 'terminado';

interface ResultadoReserva {
  sku: string;
  ok: boolean;
  error?: string;
}

/** Una fila por (producto, mes) con proyección para el cliente elegido. */
interface FilaCliente {
  producto_id: number;
  sku: string;
  descripcion: string | null;
  mes: string;          // 'YYYY-MM'
  proyectado: number;
  vigente: number;
  sugerido: number;
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

function formatoMes(ym: string | null | undefined): string {
  if (!ym) return '—';
  const [anio, mes] = ym.split('-');
  const idx = parseInt(mes, 10);
  return NOMBRES_MES[idx] ? `${NOMBRES_MES[idx]} ${anio}` : ym;
}

@Component({
  selector: 'app-asignaciones-reservas-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-reservas-cliente.component.html',
  styleUrl: './asignaciones-reservas-cliente.component.css',
})
export class AsignacionesReservasClienteComponent implements OnInit {
  @Input() importacionId!: number;
  @Output() cerrar = new EventEmitter<void>();

  readonly meses = MESES;

  paso: Paso = 'form';

  // ── Combobox de cliente ──
  clientes: ClientePrioridad[] = [];
  cargandoClientes = true;
  errorClientes = '';
  busquedaCliente = '';
  mostrarLista = false;
  indiceActivo = -1;
  clienteElegido: ClientePrioridad | null = null;

  // ── Ventana de meses ──
  mesDesde = 'octubre';
  mesHasta = 'diciembre';
  calculando = false;
  errorForm = '';

  // ── Resultado ──
  filas: FilaCliente[] = [];
  errorResumen = '';
  reservandoTodo = false;
  resultados: ResultadoReserva[] = [];

  constructor(private svc: AsignacionesImportacionService) {}

  ngOnInit(): void {
    this.svc.prioridadClientes().subscribe({
      next: (data) => {
        this.clientes = [...data].sort((a, b) => a.prioridad - b.prioridad);
        this.cargandoClientes = false;
      },
      error: () => {
        this.errorClientes = 'No se pudo cargar la lista de clientes';
        this.cargandoClientes = false;
      },
    });
  }

  // ── Combobox ─────────────────────────────────────────────────────────────

  clientesFiltrados(): ClientePrioridad[] {
    const q = this.busquedaCliente.trim().toLowerCase();
    if (!q) return this.clientes;
    return this.clientes.filter((c) =>
      c.nombre.toLowerCase().includes(q) || c.clave.toLowerCase().includes(q));
  }

  onInputCliente(): void {
    this.mostrarLista = true;
    this.indiceActivo = -1;
    const etiquetaActual = this.clienteElegido ? this._etiqueta(this.clienteElegido) : '';
    if (this.clienteElegido && this.busquedaCliente !== etiquetaActual) {
      this.clienteElegido = null;
    }
  }

  onFocusCliente(): void {
    this.mostrarLista = true;
  }

  onBlurCliente(): void {
    setTimeout(() => { this.mostrarLista = false; }, 120);
  }

  onKeydownCliente(event: KeyboardEvent): void {
    const opciones = this.clientesFiltrados();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.mostrarLista = true;
      this.indiceActivo = Math.min(this.indiceActivo + 1, opciones.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indiceActivo = Math.max(this.indiceActivo - 1, 0);
    } else if (event.key === 'Enter') {
      if (this.indiceActivo >= 0 && opciones[this.indiceActivo]) {
        event.preventDefault();
        this.elegirCliente(opciones[this.indiceActivo]);
      }
    } else if (event.key === 'Escape') {
      this.mostrarLista = false;
    }
  }

  private _etiqueta(c: ClientePrioridad): string {
    return `${c.nombre} (${c.clave})`;
  }

  elegirCliente(c: ClientePrioridad): void {
    this.clienteElegido = c;
    this.busquedaCliente = this._etiqueta(c);
    this.mostrarLista = false;
    this.errorForm = '';
    this.paso = 'form';
    this.filas = [];
  }

  // ── Cálculo de la propuesta para el cliente elegido ─────────────────────

  calcular(): void {
    this.errorForm = '';
    if (!this.clienteElegido) {
      this.errorForm = 'Selecciona un cliente de la lista';
      return;
    }
    if (!this.mesDesde || !this.mesHasta) {
      this.errorForm = 'Selecciona la ventana de meses';
      return;
    }
    const clave = this.clienteElegido.clave;
    this.calculando = true;
    this.svc.recalcular(this.importacionId, this.mesDesde, this.mesHasta).subscribe({
      next: (propuestas) => {
        this.calculando = false;
        const filas: FilaCliente[] = [];
        for (const p of propuestas) {
          const cli = p.propuesta.find((c) => c.clave_cliente === clave);
          if (!cli) continue;
          for (const m of cli.meses) {
            if (m.proyectado > 0 || m.vigente > 0 || m.sugerido > 0) {
              filas.push({
                producto_id: p.producto_id, sku: p.sku, descripcion: p.descripcion,
                mes: m.mes, proyectado: m.proyectado, vigente: m.vigente, sugerido: m.sugerido,
              });
            }
          }
        }
        this.filas = filas;
        this.paso = 'resumen';
      },
      error: (err) => {
        this.calculando = false;
        this.errorForm = err?.error?.error?.message || 'No se pudo calcular la propuesta';
      },
    });
  }

  formatoMes(ym: string | null | undefined): string {
    return formatoMes(ym);
  }

  totalGeneralSugerido(): number {
    return this.filas.reduce((s, f) => s + f.sugerido, 0);
  }

  reservarTodo(): void {
    if (!this.clienteElegido) return;
    const clave = this.clienteElegido.clave;
    const porProducto = new Map<number, { sku: string; reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[] }>();
    for (const f of this.filas) {
      if (f.sugerido <= 0) continue;
      if (!porProducto.has(f.producto_id)) porProducto.set(f.producto_id, { sku: f.sku, reservas: [] });
      porProducto.get(f.producto_id)!.reservas.push({
        clave_cliente: clave, mes_objetivo: f.mes, cantidad: f.sugerido, proyectado: f.proyectado,
      });
    }

    if (!porProducto.size) {
      this.errorResumen = 'No hay ninguna cantidad sugerida mayor a 0 para reservar';
      return;
    }

    this.reservandoTodo = true;
    this.errorResumen = '';
    const llamadas = [...porProducto.entries()].map(([productoId, x]) =>
      this.svc.reservar(this.importacionId, productoId, x.reservas).pipe(
        map((): ResultadoReserva => ({ sku: x.sku, ok: true })),
        catchError((err) => of<ResultadoReserva>({
          sku: x.sku, ok: false,
          error: err?.error?.error?.message || 'No se pudo reservar',
        })),
      ),
    );

    forkJoin(llamadas).subscribe((resultados) => {
      this.reservandoTodo = false;
      this.resultados = resultados;
      this.paso = 'terminado';
    });
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}
