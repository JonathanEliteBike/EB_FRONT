import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
import {
  AsignacionesImportacionService,
  ClientePrioridad,
} from '../../../../../services/asignaciones-importacion.service';

type Paso = 'form' | 'resumen' | 'terminado';

interface ResultadoReserva {
  sku: string;
  ok: boolean;
  error?: string;
  ordenesOdoo?: string[];
}

/** Una fila por (cliente, producto, mes) con proyección para alguno de los
 *  clientes elegidos. */
interface FilaCliente {
  clave_cliente: string;
  nombre_cliente: string;
  prioridad: number;
  producto_id: number;
  sku: string;
  descripcion: string | null;
  mes: string;          // 'YYYY-MM'
  proyectado: number;
  vigente: number;
  sugerido: number;
}

/** Filas agrupadas por cliente, para poder reservarle a uno a la vez sin
 *  esperar a que los demás EVAC terminen de revisar el suyo. */
interface GrupoCliente {
  clave_cliente: string;
  nombre_cliente: string;
  prioridad: number;
  filas: FilaCliente[];
  totalSugerido: number;
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

  // ── Combobox de cliente (selección múltiple) ──
  clientes: ClientePrioridad[] = [];
  cargandoClientes = true;
  errorClientes = '';
  busquedaCliente = '';
  mostrarLista = false;
  indiceActivo = -1;
  clientesElegidos: ClientePrioridad[] = [];

  // ── Ventana de meses ──
  mesDesde = 'octubre';
  mesHasta = 'diciembre';
  calculando = false;
  errorForm = '';

  // ── Resultado ──
  filas: FilaCliente[] = [];
  filtroMes = '';
  filtroCliente = '';
  /** Copia agrupada de filasFiltradas(), recalculada solo cuando cambian los
   *  datos o los filtros -- NO en cada detección de cambios. Si se recalculara
   *  en el template (p. ej. llamando a un método ahí), cada clic en una
   *  casilla dispararía un ciclo de CD que reconstruye por completo las filas
   *  con objetos nuevos; Angular destruye y recrea los <input type="checkbox">
   *  y el tick nativo del navegador se pierde -- la casilla nunca se ve marcada. */
  grupos: GrupoCliente[] = [];
  errorResumen = '';
  reservandoTodo = false;
  /** clave del cliente cuyo grupo se está reservando por separado (o null). */
  reservandoClave: string | null = null;
  resultados: ResultadoReserva[] = [];

  /** claves de los grupos que el usuario desplegó manualmente. */
  private gruposExpandidos = new Set<string>();

  /** filas marcadas a mano, para reservar solo un mes puntual de un cliente
   *  en vez de todo el grupo (identificadas por producto+mes+cliente). */
  private filasSeleccionadas = new Set<string>();

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
    const elegidas = new Set(this.clientesElegidos.map((c) => c.clave));
    const q = this.busquedaCliente.trim().toLowerCase();
    return this.clientes
      .filter((c) => !elegidas.has(c.clave))
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || c.clave.toLowerCase().includes(q));
  }

  onInputCliente(): void {
    this.mostrarLista = true;
    this.indiceActivo = -1;
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
    } else if (event.key === 'Backspace' && !this.busquedaCliente && this.clientesElegidos.length) {
      this.quitarCliente(this.clientesElegidos[this.clientesElegidos.length - 1]);
    } else if (event.key === 'Escape') {
      this.mostrarLista = false;
    }
  }

  /** Agrega el cliente a la selección (multi) y deja el buscador listo para el siguiente. */
  elegirCliente(c: ClientePrioridad): void {
    this.clientesElegidos.push(c);
    this.busquedaCliente = '';
    this.indiceActivo = -1;
    this.errorForm = '';
    this.paso = 'form';
    this.filas = [];
  }

  quitarCliente(c: ClientePrioridad): void {
    this.clientesElegidos = this.clientesElegidos.filter((x) => x.clave !== c.clave);
    this.paso = 'form';
    this.filas = [];
  }

  /** Agrega de un tiro todos los clientes que calzan con la búsqueda actual
   *  (o todos, si el buscador está vacío) en vez de uno por uno. */
  agregarTodosFiltrados(): void {
    const disponibles = this.clientesFiltrados();
    if (!disponibles.length) return;
    this.clientesElegidos = [...this.clientesElegidos, ...disponibles];
    this.busquedaCliente = '';
    this.mostrarLista = false;
    this.indiceActivo = -1;
    this.errorForm = '';
    this.paso = 'form';
    this.filas = [];
  }

  quitarTodosClientes(): void {
    this.clientesElegidos = [];
    this.paso = 'form';
    this.filas = [];
  }

  // ── Cálculo de la propuesta para los clientes elegidos ──────────────────

  calcular(): void {
    this.errorForm = '';
    if (!this.clientesElegidos.length) {
      this.errorForm = 'Selecciona al menos un cliente de la lista';
      return;
    }
    if (!this.mesDesde || !this.mesHasta) {
      this.errorForm = 'Selecciona la ventana de meses';
      return;
    }
    const porClave = new Map(this.clientesElegidos.map((c) => [c.clave, c]));
    this.calculando = true;
    this.svc.recalcular(this.importacionId, this.mesDesde, this.mesHasta).subscribe({
      next: (propuestas) => {
        this.calculando = false;
        const filas: FilaCliente[] = [];
        for (const p of propuestas) {
          for (const cli of p.propuesta) {
            const elegido = porClave.get(cli.clave_cliente);
            if (!elegido) continue;
            for (const m of cli.meses) {
              if (m.proyectado > 0 || m.vigente > 0 || m.sugerido > 0) {
                filas.push({
                  clave_cliente: cli.clave_cliente, nombre_cliente: elegido.nombre, prioridad: elegido.prioridad,
                  producto_id: p.producto_id, sku: p.sku, descripcion: p.descripcion,
                  mes: m.mes, proyectado: m.proyectado, vigente: m.vigente, sugerido: m.sugerido,
                });
              }
            }
          }
        }
        filas.sort((a, b) => a.prioridad - b.prioridad || a.mes.localeCompare(b.mes));
        this.filas = filas;
        this.filtroMes = '';
        this.filtroCliente = '';
        this.filasSeleccionadas.clear();
        this.recomputarGrupos();
        this.paso = 'resumen';
      },
      error: (err) => {
        this.calculando = false;
        this.errorForm = err?.error?.error?.message || 'No se pudo calcular la propuesta';
      },
    });
  }

  /** Meses presentes en el resultado, en orden cronológico. Para el filtro de la tabla. */
  mesesDisponibles(): string[] {
    const vistos = new Set<string>();
    const orden: string[] = [];
    for (const f of this.filas) {
      if (!vistos.has(f.mes)) { vistos.add(f.mes); orden.push(f.mes); }
    }
    return orden;
  }

  /** Solo afecta la vista: "Reservar todo" sigue operando sobre todo lo
   *  calculado, no solo lo filtrado. Las filas sin nada pendiente (ya
   *  reservadas por completo) se quitan de la vista: no hay nada que hacer
   *  con ellas y solo estorban al revisar, sobre todo en meses pasados. */
  filasFiltradas(): FilaCliente[] {
    return this.filas
      .filter((f) => f.sugerido > 0)
      .filter((f) => !this.filtroMes || f.mes === this.filtroMes)
      .filter((f) => !this.filtroCliente || f.clave_cliente === this.filtroCliente);
  }

  /** Se dispara al cambiar los selects de mes/cliente -- ahí sí toca
   *  recalcular los grupos, a diferencia de marcar una casilla o desplegar
   *  un grupo, que no cambian qué filas hay, solo cómo se ven. */
  onFiltroCambiado(): void {
    this.recomputarGrupos();
  }

  /** Agrupa las filas filtradas por cliente, para poder revisar y reservar
   *  a un distribuidor a la vez en vez de a todos juntos. Se llama a mano
   *  (no desde el template) cada vez que cambian los datos o los filtros;
   *  ver el comentario en `grupos` sobre por qué. */
  recomputarGrupos(): void {
    const mapa = new Map<string, GrupoCliente>();
    for (const f of this.filasFiltradas()) {
      let g = mapa.get(f.clave_cliente);
      if (!g) {
        g = {
          clave_cliente: f.clave_cliente, nombre_cliente: f.nombre_cliente,
          prioridad: f.prioridad, filas: [], totalSugerido: 0,
        };
        mapa.set(f.clave_cliente, g);
      }
      g.filas.push(f);
      g.totalSugerido += f.sugerido;
    }
    this.grupos = [...mapa.values()].sort((a, b) => a.prioridad - b.prioridad);
  }

  /** Un solo grupo no tiene nada que ocultar: se muestra siempre desplegado. */
  grupoExpandido(clave: string, totalGrupos: number): boolean {
    return totalGrupos === 1 || this.gruposExpandidos.has(clave);
  }

  toggleGrupo(clave: string): void {
    if (this.gruposExpandidos.has(clave)) this.gruposExpandidos.delete(clave);
    else this.gruposExpandidos.add(clave);
  }

  private claveFila(f: FilaCliente): string {
    return `${f.producto_id}|${f.mes}|${f.clave_cliente}`;
  }

  filaSeleccionada(f: FilaCliente): boolean {
    return this.filasSeleccionadas.has(this.claveFila(f));
  }

  toggleFila(f: FilaCliente): void {
    const k = this.claveFila(f);
    if (this.filasSeleccionadas.has(k)) this.filasSeleccionadas.delete(k);
    else this.filasSeleccionadas.add(k);
  }

  /** Cuántas filas de este grupo están marcadas a mano — si hay alguna,
   *  "Reservar este cliente" se limita a esas en vez de reservar todo. */
  seleccionadasEnGrupo(grupo: GrupoCliente): number {
    return grupo.filas.filter((f) => this.filaSeleccionada(f)).length;
  }

  /** true si TODAS las filas del grupo están marcadas -- para la casilla
   *  de "seleccionar este cliente completo" en el encabezado del grupo. */
  grupoSeleccionado(grupo: GrupoCliente): boolean {
    return grupo.filas.length > 0 && grupo.filas.every((f) => this.filaSeleccionada(f));
  }

  /** Marca o desmarca TODAS las filas del grupo de un tiro, para poder
   *  elegir varios clientes completos (p. ej. 2 de 8) y reservarlos juntos
   *  con un solo "Reservar seleccionados", sin tener que marcar mes por mes
   *  ni cerrar y volver a calcular la propuesta entre uno y otro. */
  toggleGrupoSeleccion(grupo: GrupoCliente): void {
    const marcarTodo = !this.grupoSeleccionado(grupo);
    for (const f of grupo.filas) {
      const k = this.claveFila(f);
      if (marcarTodo) this.filasSeleccionadas.add(k);
      else this.filasSeleccionadas.delete(k);
    }
  }

  /** Cuántos clientes distintos tienen al menos una fila marcada -- para el
   *  botón general de abajo ("Reservar seleccionados (N clientes)"). */
  totalClientesSeleccionados(): number {
    return new Set(this.filas.filter((f) => this.filaSeleccionada(f)).map((f) => f.clave_cliente)).size;
  }

  formatoMes(ym: string | null | undefined): string {
    return formatoMes(ym);
  }

  totalGeneralSugerido(): number {
    return this.filas.reduce((s, f) => s + f.sugerido, 0);
  }

  private agruparPorProducto(filas: FilaCliente[]) {
    const porProducto = new Map<number, { sku: string; reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[] }>();
    for (const f of filas) {
      if (f.sugerido <= 0) continue;
      if (!porProducto.has(f.producto_id)) porProducto.set(f.producto_id, { sku: f.sku, reservas: [] });
      porProducto.get(f.producto_id)!.reservas.push({
        clave_cliente: f.clave_cliente, mes_objetivo: f.mes, cantidad: f.sugerido, proyectado: f.proyectado,
      });
    }
    return porProducto;
  }

  private ejecutarReservas(porProducto: Map<number, { sku: string; reservas: { clave_cliente: string; mes_objetivo: string; cantidad: number; proyectado?: number }[] }>) {
    const llamadas = [...porProducto.entries()].map(([productoId, x]) =>
      this.svc.reservar(this.importacionId, productoId, x.reservas).pipe(
        map((res): ResultadoReserva => ({
          sku: x.sku, ok: true,
          ordenesOdoo: res.ordenes_odoo.map((o) => o.order_name),
        })),
        catchError((err) => of<ResultadoReserva>({
          sku: x.sku, ok: false,
          error: err?.error?.error?.message || 'No se pudo reservar',
        })),
      ),
    );

    // Secuencial (no forkJoin): varios POST /reservar en paralelo para el mismo
    // cliente compiten por el mismo registro de `clientes` en MySQL y producen
    // deadlocks (error 1213). Una reserva a la vez evita la contención.
    return from(llamadas).pipe(concatMap((obs) => obs), toArray());
  }

  /** Si hay filas marcadas (de uno o de varios clientes), reserva solo esas
   *  en una sola pasada -- así se pueden elegir 2, 3 o los que sean de los
   *  27 clientes y reservarlos juntos sin cerrar y recalcular entre uno y
   *  otro. Sin nada marcado, reserva todo lo calculado como antes. */
  reservarTodo(): void {
    const seleccionadas = this.filas.filter((f) => this.filaSeleccionada(f));
    const filasAReservar = seleccionadas.length ? seleccionadas : this.filas;
    const porProducto = this.agruparPorProducto(filasAReservar);
    if (!porProducto.size) {
      this.errorResumen = 'No hay ninguna cantidad sugerida mayor a 0 para reservar';
      return;
    }
    this.reservandoTodo = true;
    this.errorResumen = '';
    this.ejecutarReservas(porProducto).subscribe((resultados) => {
      this.reservandoTodo = false;
      this.resultados = resultados;
      for (const f of filasAReservar) this.filasSeleccionadas.delete(this.claveFila(f));
      this.paso = 'terminado';
    });
  }

  /** Reserva lo de un cliente, para que cada EVAC pueda avanzar el suyo sin
   *  esperar a que los demás terminen de revisar el propio. Si el usuario
   *  marcó filas puntuales (p. ej. un solo mes), reserva solo esas; si no
   *  marcó ninguna, reserva el grupo completo. */
  reservarGrupo(grupo: GrupoCliente): void {
    const seleccionadas = grupo.filas.filter((f) => this.filaSeleccionada(f));
    const filasAReservar = seleccionadas.length ? seleccionadas : grupo.filas;
    const porProducto = this.agruparPorProducto(filasAReservar);
    if (!porProducto.size) {
      this.errorResumen = `${grupo.nombre_cliente} no tiene ninguna cantidad sugerida mayor a 0`;
      return;
    }
    this.reservandoClave = grupo.clave_cliente;
    this.errorResumen = '';
    this.ejecutarReservas(porProducto).subscribe((resultados) => {
      this.reservandoClave = null;
      this.resultados = resultados;
      for (const f of filasAReservar) this.filasSeleccionadas.delete(this.claveFila(f));
      this.paso = 'terminado';
    });
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}
