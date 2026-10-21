import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import {
  ActividadInventarioRespuesta,
  EventoInventarioDetallado,
  ParticipacionInventarioUsuario,
  AuditoriasService
} from '../../../../services/inventario/auditorias.service';

@Component({
  selector: 'app-inventario-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, FechaInventarioComponent],
  templateUrl: './actividad-usuarios.component.html',
  styleUrl: './actividad-usuarios.component.css'
})
export class ActividadUsuariosComponent implements OnInit {
  constructor(private auditoriasService: AuditoriasService) {}
  ngOnInit(): void { this.cargarActividad(); }

  actividad: ActividadInventarioRespuesta = {
    total: 0, modo: 'todas', desde: '', hasta: '', usuarios: [], eventos: []
  };
  modoActividad: 'ediciones' | 'todas' = 'todas';
  fechaDesdeActividad = '';
  fechaHastaActividad = '';
  cargandoActividad = false;
  errorActividad = '';
  private versionActividad = 0;

  usuarioSeleccionado: ParticipacionInventarioUsuario | null = null;
  historialUsuario: EventoInventarioDetallado[] = [];
  historialTotal = 0;
  cargandoHistorial = false;
  errorHistorial = '';
  historialExpandidoId: number | null = null;
  private versionHistorial = 0;

  abrirHistorialUsuario(usuario: ParticipacionInventarioUsuario): void {
    this.versionHistorial++;
    this.usuarioSeleccionado = usuario;
    this.historialUsuario = [];
    this.historialTotal = 0;
    this.historialExpandidoId = null;
    this.errorHistorial = '';
    this.cargandoHistorial = false;
    this.cargarHistorialUsuario();
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    if (this.usuarioSeleccionado) this.cerrarHistorialUsuario();
  }

  cerrarHistorialUsuario(): void {
    this.versionHistorial++;
    this.usuarioSeleccionado = null;
    this.cargandoHistorial = false;
    this.historialUsuario = [];
    this.historialExpandidoId = null;
  }

  cargarHistorialUsuario(): void {
    const usuario = this.usuarioSeleccionado;
    if (!usuario || this.cargandoHistorial ||
        this.historialUsuario.length >= this.historialTotal && this.historialUsuario.length > 0) {
      return;
    }
    const version = this.versionHistorial;
    const offset = this.historialUsuario.length;
    this.cargandoHistorial = true;
    this.errorHistorial = '';
    this.auditoriasService.obtenerHistorialUsuario(
      usuario.usuarioId, this.modoActividad,
      this.fechaDesdeActividad, this.fechaHastaActividad, offset
    ).subscribe({
      next: datos => {
        if (version !== this.versionHistorial) return;
        this.historialTotal = datos.total;
        this.historialUsuario = [...this.historialUsuario, ...datos.eventos];
        this.cargandoHistorial = false;
      },
      error: () => {
        if (version !== this.versionHistorial) return;
        this.errorHistorial = 'No fue posible consultar el historial de este usuario.';
        this.cargandoHistorial = false;
      }
    });
  }

  alternarEvento(id: number): void {
    this.historialExpandidoId = this.historialExpandidoId === id ? null : id;
  }

  etiquetaCampo(campo: string): string {
    const nombres: Record<string, string> = {
      numero_inventario: 'N.º de inventario', numero_serie: 'Número de serie',
      numero_empleado: 'N.º de empleado', apellido_paterno: 'Apellido paterno',
      apellido_materno: 'Apellido materno', fecha_programada: 'Fecha programada',
      auditor_responsable: 'Auditor responsable', estado_correccion: 'Estado de corrección',
      accion_requerida: 'Acción requerida', ubicacion_encontrada: 'Ubicación encontrada',
      estado_encontrado: 'Estado encontrado', fecha_firma: 'Fecha de firma',
      fecha_anulacion: 'Fecha de anulación', motivo_anulacion: 'Motivo de anulación',
      equipo_id: 'ID de equipo', colaborador_id: 'ID de colaborador',
      fecha_devolucion: 'Fecha de devolución',
      observaciones_devolucion: 'Observaciones de devolución',
      responsiva_estado: 'Estado de responsiva'
    };
    return nombres[campo] ?? campo.replace(/_/g, ' ');
  }

  mostrarValorAuditoria(valor: string | number | boolean | null): string {
    if (valor === null || valor === '') return 'Sin dato';
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    return String(valor);
  }

  limpiarFiltrosActividad(): void {
    this.modoActividad = 'todas';
    this.fechaDesdeActividad = '';
    this.fechaHastaActividad = '';
    this.cargarActividad();
  }

  cargarActividad(): void {
    if (this.fechaDesdeActividad && this.fechaHastaActividad &&
        this.fechaDesdeActividad > this.fechaHastaActividad) {
      ++this.versionActividad;
      this.cargandoActividad = false;
      this.errorActividad = 'La fecha inicial debe ser anterior a la fecha final.';
      return;
    }
    this.cerrarHistorialUsuario();
    const version = ++this.versionActividad;
    this.cargandoActividad = true;
    this.errorActividad = '';
    this.auditoriasService.obtenerActividad(
      this.modoActividad, this.fechaDesdeActividad, this.fechaHastaActividad
    ).subscribe({
      next: datos => {
        if (version !== this.versionActividad) return;
        this.actividad = datos;
        this.cargandoActividad = false;
      },
      error: () => {
        if (version !== this.versionActividad) return;
        this.errorActividad = 'No fue posible consultar la actividad. Comprueba la conexión y la migración SQL.';
        this.cargandoActividad = false;
      }
    });
  }




}
