import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import {
  ControlCambiosService, EventoControlCambios, EstadoRevisionCambio,
  FiltroEstadoCambio, ResumenControlCambios, RevisionHistorialCambio, ExpedienteMovimiento
} from '../../../../services/inventario/control-cambios.service';

@Component({
  selector: 'app-control-cambios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FechaInventarioComponent],
  templateUrl: './control-cambios.component.html',
  styleUrl: './control-cambios.component.css'
})
export class ControlCambiosComponent implements OnInit {
  constructor(private readonly servicio: ControlCambiosService) {}
  private readonly hoy = new Date();
  desde = `${this.hoy.getFullYear()}-${String(this.hoy.getMonth() + 1).padStart(2, '0')}-01`;
  hasta = `${this.hoy.getFullYear()}-${String(this.hoy.getMonth() + 1).padStart(2, '0')}-${String(new Date(this.hoy.getFullYear(), this.hoy.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  estado: FiltroEstadoCambio = 'Todos';
  usuario = '';
  tipo = 'Todos';
  buscar = '';
  orden = 'recientes';
  readonly tipos = ['Todos', 'Altas', 'Ediciones', 'Asignaciones', 'Devoluciones', 'Responsivas', 'Verificaciones', 'Otros'];
  resumen: ResumenControlCambios = {total: 0, pendientes: 0, validados: 0, observados: 0};
  eventos: EventoControlCambios[] = [];
  totalFiltrado = 0;
  limite = 30;
  offset = 0;
  cargando = false;
  guardando = false;
  exportando = false;
  error = '';
  exito = '';
  seleccionado: EventoControlCambios | null = null;
  estadoEdicion: EstadoRevisionCambio = 'Pendiente';
  observacionEdicion = '';
  historial: RevisionHistorialCambio[] = [];
  cargandoHistorial = false;
  expediente: ExpedienteMovimiento | null = null;
  cargandoExpediente = false;
  errorExpediente = '';
  private solicitud = 0;

  get alertasExpediente() {
    return (this.expediente?.comprobaciones || []).filter(c => c.estado === 'advertencia');
  }

  ngOnInit(): void { this.cargar(); }

  aplicar(): void { this.offset = 0; this.cargar(); }

  filtrarUltimosDias(dias: number): void {
    const fin = new Date();
    const inicio = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - (dias - 1));
    const formato = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.desde = formato(inicio);
    this.hasta = formato(fin);
    this.orden = 'recientes';
    this.aplicar();
  }


  seleccionarEstado(estado: FiltroEstadoCambio): void {
    this.estado = estado; this.aplicar();
  }

  limpiar(): void {
    const ahora = new Date();
    this.desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
    const ult = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
    this.hasta = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ult).padStart(2, '0')}`;
    this.estado = 'Todos'; this.usuario = ''; this.tipo = 'Todos'; this.buscar = ''; this.orden = 'recientes';
    this.aplicar();
  }

  cargar(): void {
    if (!this.desde || !this.hasta || this.desde > this.hasta) {
      this.error = 'Selecciona un periodo con fecha inicial y final válidas.'; return;
    }
    const actual = ++this.solicitud;
    this.cargando = true; this.error = ''; this.exito = '';
    this.servicio.listar({desde: this.desde, hasta: this.hasta,
      estado: this.estado, usuario: this.usuario, tipo: this.tipo, buscar: this.buscar, orden: this.orden, limite: this.limite, offset: this.offset})
      .subscribe({
        next: resp => {
          if (actual !== this.solicitud) return;
          this.eventos = resp.eventos;
          this.resumen = resp.resumen;
          this.totalFiltrado = resp.totalFiltrado;
          this.cargando = false;
        },
        error: err => {
          if (actual !== this.solicitud) return;
          this.cargando = false;
          this.error = err?.error?.error || 'No fue posible consultar los cambios. Verifica que la migración esté aplicada.';
        }
      });
  }

  anterior(): void { if (this.offset > 0) { this.offset = Math.max(0, this.offset - this.limite); this.cargar(); } }
  siguiente(): void { if (this.eventos.length === this.limite && this.offset + this.limite < this.totalFiltrado) { this.offset += this.limite; this.cargar(); } }

  abrir(e: EventoControlCambios): void {
    this.seleccionado = e;
    this.estadoEdicion = e.estadoRevision;
    this.observacionEdicion = e.observacion;
    this.historial = [];
    this.cargandoHistorial = true;
    this.cargandoExpediente = true;
    this.expediente = null;
    this.errorExpediente = '';
    this.servicio.expediente(e.id).subscribe({
      next: data => { if (this.seleccionado?.id === e.id) { this.expediente = data; this.cargandoExpediente = false; } },
      error: err => { if (this.seleccionado?.id === e.id) {
        this.cargandoExpediente = false;
        this.errorExpediente = err?.error?.error || 'No fue posible consultar los datos asociados al movimiento.';
      } }
    });
    this.servicio.historialRevision(e.id).subscribe({
      next: datos => { if (this.seleccionado?.id === e.id) { this.historial = datos; this.cargandoHistorial = false; } },
      error: () => { if (this.seleccionado?.id === e.id) this.cargandoHistorial = false; }
    });
  }
  cerrar(): void { if (!this.guardando) { this.seleccionado = null; this.expediente = null; this.errorExpediente = ''; } }

  guardar(): void {
    if (!this.seleccionado || this.guardando) return;
    if (this.estadoEdicion === 'Observado' && this.observacionEdicion.trim().length < 5) {
      this.error = 'Para observar un cambio, escribe el motivo (mínimo 5 caracteres).'; return;
    }
    this.guardando = true; this.error = '';
    this.servicio.guardarRevision(this.seleccionado.id, this.estadoEdicion, this.observacionEdicion)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: () => { this.seleccionado = null; this.cargar(); this.exito = 'Revisión guardada con su responsable y fecha.'; },
        error: err => this.error = err?.error?.error || 'No se pudo guardar el dictamen.'
      });
  }

  exportar(): void {
    if (this.exportando || !this.desde || !this.hasta || this.desde > this.hasta) return;
    this.exportando = true; this.error = '';
    this.servicio.exportar({desde: this.desde, hasta: this.hasta, estado: this.estado, usuario: this.usuario, tipo: this.tipo, buscar: this.buscar, orden: this.orden})
      .pipe(finalize(() => this.exportando = false))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `control_cambios_${this.desde}_${this.hasta}.xlsx`;
          a.click(); URL.revokeObjectURL(url);
        },
        error: () => this.error = 'No fue posible generar el Excel de control de cambios.'
      });
  }

  // Términos de negocio para que Auditoría no tenga que leer nombres SQL.
  private readonly nombresCampos: Record<string, string> = {
    numero_inventario: 'Número de inventario', numeroInventario: 'Número de inventario',
    numero_serie: 'Número de serie', serie: 'Número de serie',
    empresa: 'Empresa', departamento: 'Departamento', responsable: 'Responsable',
    cargo: 'Cargo', categoria: 'Categoría', descripcion: 'Descripción',
    marca: 'Marca', modelo: 'Modelo', funcionamiento: 'Funcionamiento',
    estado: 'Estado', ubicacion: 'Ubicación', extras: 'Accesorios / extras',
    responsiva_estado: 'Estado de responsiva',
    numero_empleado: 'Número de empleado', nombre: 'Nombre',
    apellido_paterno: 'Apellido paterno', apellido_materno: 'Apellido materno',
    puesto: 'Puesto', fecha_programada: 'Fecha programada',
    auditor_responsable: 'Responsable de revisión', observaciones: 'Observaciones',
    conclusiones: 'Conclusiones', estado_correccion: 'Estado de corrección',
    ubicacion_encontrada: 'Ubicación encontrada', estado_encontrado: 'Estado encontrado',
    accion_requerida: 'Acción requerida', fecha_devolucion: 'Fecha de devolución',
    fecha_asignacion: 'Fecha de asignación', colaborador_id: 'ID del colaborador',
    equipo_id: 'ID del equipo', observaciones_devolucion: 'Observaciones de devolución',
    fecha_firma: 'Fecha de firma', fecha_anulacion: 'Fecha de anulación',
    motivo_anulacion: 'Motivo de anulación',
  };

  textoCampo(valor: unknown): string {
    if (valor === null || valor === undefined || String(valor).trim() === '') return 'No registrado';
    return String(valor);
  }

  etiquetaTipo(tipo: string): string {
    const titulos: Record<string, string> = {
      Todos: 'Todas las operaciones', Altas: 'Equipos y colaboradores nuevos', Ediciones: 'Ediciones',
      Asignaciones: 'Asignaciones', Devoluciones: 'Devoluciones', Responsivas: 'Responsivas',
      Verificaciones: 'Verificaciones físicas', Otros: 'Otras operaciones'
    };
    return titulos[tipo] || tipo;
  }

  urlDocumento(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(parsed.hostname)
        ? parsed.href : null;
    } catch { return null; }
  }

  tituloAccion(accion: string): string {
    const acciones: Record<string, string> = {
      editar: 'Modificación', crear: 'Alta de registro', asignar: 'Asignación',
      devolver: 'Devolución', cancelar: 'Cancelación', anular: 'Anulación',
      eliminar: 'Baja de registro', corregir: 'Corrección',
    };
    return acciones[accion.toLowerCase()] || this.campo(accion);
  }

  identificadorRegistro(evento: EventoControlCambios): string {
    const numero = evento.cambios.find(c => c.campo === 'numero_inventario' || c.campo === 'numeroInventario');
    const etiqueta = numero?.despues || numero?.antes;
    return etiqueta ? `${evento.entidad} ${String(etiqueta)}` :
      `${evento.entidad}${evento.entidadId !== null ? ' #' + evento.entidadId : ''}`;
  }

  valorComparacion(v: string | number | boolean | null, accion: string, anterior: boolean): string {
    if (v === null || v === '') {
      return anterior && ['crear', 'asignar'].includes(accion.toLowerCase())
        ? 'Sin registro anterior' : 'Sin dato';
    }
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    return String(v);
  }

  campo(v: string): string {
    if (this.nombresCampos[v]) return this.nombresCampos[v];
    const legible = v.replace(/_/g, ' ').replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2');
    return legible.charAt(0).toLocaleUpperCase('es-MX') + legible.slice(1);
  }
  get haySiguiente(): boolean {
    return this.eventos.length === this.limite && this.offset + this.limite < this.totalFiltrado;
  }
}
