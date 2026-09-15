import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AsignacionesImportacionService,
  ClientePrioridad,
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
  selector: 'app-asignaciones-reservas-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-reservas-cliente.component.html',
  styleUrl: './asignaciones-reservas-cliente.component.css',
})
export class AsignacionesReservasClienteComponent implements OnInit {
  @Input() importacionId!: number;
  @Output() cerrar = new EventEmitter<void>();

  clientes: ClientePrioridad[] = [];
  cargandoClientes = true;
  errorClientes = '';

  claveSeleccionada = '';
  reservas: ReservaEmbarque[] = [];
  cargando = false;
  error = '';

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

  onClienteChange(): void {
    this.reservas = [];
    this.error = '';
    if (!this.claveSeleccionada) return;
    this.cargando = true;
    this.svc.reservasEmbarque(this.importacionId, this.claveSeleccionada).subscribe({
      next: (data) => { this.reservas = data; this.cargando = false; },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.error?.message || 'No se pudieron cargar las reservas de este cliente';
      },
    });
  }

  formatoMes(ym: string | null | undefined): string {
    return formatoMes(ym);
  }

  totalReservado(): number {
    return this.reservas.reduce((s, r) => s + r.cantidad_asignada, 0);
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
