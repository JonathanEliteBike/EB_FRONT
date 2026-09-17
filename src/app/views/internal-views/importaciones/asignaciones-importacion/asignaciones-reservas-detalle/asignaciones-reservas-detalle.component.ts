import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AsignacionesImportacionService,
  EstadoReserva,
  ReservaEmbarque,
} from '../../../../../services/asignaciones-importacion.service';

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
  selector: 'app-asignaciones-reservas-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-reservas-detalle.component.html',
  styleUrl: './asignaciones-reservas-detalle.component.css',
})
export class AsignacionesReservasDetalleComponent implements OnInit {
  @Input() importacionId!: number;
  /** Estado con el que abre filtrada la tabla (p. ej. al hacer clic en la
   *  tarjeta "Pend. confirmación"). El usuario puede cambiarlo libremente. */
  @Input() estadoInicial?: EstadoReserva;
  @Output() cerrar = new EventEmitter<void>();

  reservas: ReservaEmbarque[] = [];
  cargando = true;
  error = '';

  filtroEstado: EstadoReserva | '' = '';
  filtroTexto = '';

  /** clave -> nombre, para mostrar el cliente identificable y no solo la clave. */
  private nombresPorClave = new Map<string, string>();

  constructor(private svc: AsignacionesImportacionService) {}

  ngOnInit(): void {
    this.filtroEstado = this.estadoInicial || '';
    this.svc.prioridadClientes().subscribe({
      next: (data) => {
        this.nombresPorClave = new Map(data.map((c) => [c.clave, c.nombre]));
      },
      error: () => { /* si falla, se sigue mostrando solo la clave */ },
    });
    this.svc.reservasEmbarque(this.importacionId).subscribe({
      next: (data) => { this.reservas = data; this.cargando = false; },
      error: (err) => {
        this.error = err?.error?.error?.message || 'No se pudieron cargar las reservas';
        this.cargando = false;
      },
    });
  }

  nombreCliente(clave: string): string {
    return this.nombresPorClave.get(clave) || '';
  }

  reservasFiltradas(): ReservaEmbarque[] {
    const q = this.filtroTexto.trim().toLowerCase();
    return this.reservas
      .filter((r) => !this.filtroEstado || r.estado === this.filtroEstado)
      .filter((r) => !q
        || r.clave_cliente.toLowerCase().includes(q)
        || this.nombreCliente(r.clave_cliente).toLowerCase().includes(q)
        || r.sku.toLowerCase().includes(q)
        || (r.descripcion || '').toLowerCase().includes(q)
        || (r.odoo_order_name || '').toLowerCase().includes(q));
  }

  totalCantidad(): number {
    return this.reservasFiltradas().reduce((s, r) => s + r.cantidad_asignada, 0);
  }

  formatoMes(ym: string | null | undefined): string {
    return formatoMes(ym);
  }

  origenLabel(o: string): string {
    return o === 'REASIGNACION' ? 'Reasignación' : 'Inicial';
  }

  estadoLabel(e: string): string {
    return ({
      RESERVADA: 'Reservada',
      PENDIENTE_CONFIRMACION: 'Pendiente conf.',
      CONFIRMADA: 'Confirmada',
      RECHAZADA: 'Rechazada',
      CANCELADA: 'Cancelada',
    } as Record<string, string>)[e] || e;
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}
