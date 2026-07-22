import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  Auditoria,
  AuditoriaDetalle,
  AuditoriaEquipoCatalogo,
  AuditoriasCatalogos,
  AuditoriasEstadisticas,
  AuditoriasFiltros,
  AuditoriasService,
  EstadoCorreccion,
  GuardarAuditoriaPayload,
  ResultadoAuditoria,
  TipoAuditoria
} from '../../../../services/inventario/auditorias.service';

@Component({
  selector: 'app-auditorias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auditorias.component.html',
  styleUrl: './auditorias.component.css'
})
export class AuditoriasComponent implements OnInit {
  auditorias: Auditoria[] = [];

  estadisticas: AuditoriasEstadisticas = {
    total: 0,
    planeadas: 0,
    enProceso: 0,
    finalizadas: 0,
    canceladas: 0
  };

  tipos: TipoAuditoria[] = ['General', 'Empresa', 'Departamento', 'Ubicación', 'Muestra'];
  estados = ['Todos', 'Planeada', 'En proceso', 'Finalizada', 'Cancelada'];
  resultadosDetalle = ['Todos', 'Pendiente', 'Conforme', 'Con diferencia', 'No localizado', 'No aplica'];

  empresas: string[] = [];
  departamentos: string[] = [];
  ubicaciones: string[] = [];
  equiposCatalogo: AuditoriaEquipoCatalogo[] = [];

  terminoBusqueda = '';
  filtroEstado = 'Todos';
  filtroTipo = 'Todos';
  filtroEmpresa = 'Todas';
  fechaInicio = '';
  fechaFin = '';

  cargando = false;
  procesando = false;
  exportandoId: number | null = null;

  errorCarga = '';
  errorAccion = '';
  mensajeExito = '';

  mostrarFormulario = false;
  modoEdicion = false;
  auditoriaEditandoId: number | null = null;

  mostrarDetalle = false;
  auditoriaSeleccionada: Auditoria | null = null;
  busquedaDetalle = '';
  filtroResultadoDetalle = 'Todos';

  mostrarRevision = false;
  detalleSeleccionado: AuditoriaDetalle | null = null;

  mostrarFinalizacion = false;
  conclusionesFinalizacion = '';

  mostrarCancelacion = false;
  motivoCancelacion = '';

  formulario: GuardarAuditoriaPayload = this.crearFormularioVacio();

  formularioRevision = {
    encontrado: true,
    resultado: '' as '' | ResultadoAuditoria,
    codigoBarrasEncontrado: '',
    numeroSerieEncontrado: '',
    empresaEncontrada: '',
    departamentoEncontrado: '',
    responsableEncontrado: '',
    estadoEncontrado: '',
    ubicacionEncontrada: '',
    funcionamientoEncontrado: '',
    extrasEncontrados: '',
    tipoDiferencia: '',
    observaciones: '',
    evidenciaUrl: '',
    accionRequerida: '',
    estadoCorreccion: 'No aplica' as EstadoCorreccion,
    revisadoPor: ''
  };

  constructor(private auditoriasService: AuditoriasService) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarInformacion();
  }

  cargarInformacion(): void {
    this.cargarAuditorias();
    this.cargarEstadisticas();
  }

  cargarAuditorias(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.auditoriasService.obtenerAuditorias(this.obtenerFiltros()).subscribe({
      next: (datos: Auditoria[]) => {
        this.auditorias = datos;
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar auditorías:', error);
        this.errorCarga = this.obtenerMensajeError(
          error,
          'No se pudieron cargar las auditorías.'
        );
        this.cargando = false;
      }
    });
  }

  cargarEstadisticas(): void {
    this.auditoriasService.obtenerEstadisticas(this.obtenerFiltros()).subscribe({
      next: (datos: AuditoriasEstadisticas) => {
        this.estadisticas = datos;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  cargarCatalogos(): void {
    this.auditoriasService.obtenerCatalogos().subscribe({
      next: (datos: AuditoriasCatalogos) => {
        this.tipos = datos.tipos?.length ? datos.tipos : this.tipos;
        this.estados = datos.estados?.length ? datos.estados : this.estados;
        this.empresas = datos.empresas || [];
        this.departamentos = datos.departamentos || [];
        this.ubicaciones = datos.ubicaciones || [];
        this.equiposCatalogo = datos.equipos || [];
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar catálogos:', error);
      }
    });
  }

  buscar(): void {
    if (!this.validarRangoFechas()) {
      return;
    }

    this.limpiarMensajes();
    this.cargarInformacion();
  }

  aplicarFiltros(): void {
    if (!this.validarRangoFechas()) {
      return;
    }

    this.limpiarMensajes();
    this.cargarInformacion();
  }

  seleccionarEstado(estado: string): void {
    this.filtroEstado = estado;
    this.cargarInformacion();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroTipo = 'Todos';
    this.filtroEmpresa = 'Todas';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.limpiarMensajes();
    this.cargarInformacion();
  }

  abrirNuevaAuditoria(): void {
    this.modoEdicion = false;
    this.auditoriaEditandoId = null;
    this.formulario = this.crearFormularioVacio();
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  abrirEdicion(auditoria: Auditoria): void {
    this.modoEdicion = true;
    this.auditoriaEditandoId = auditoria.id;
    this.formulario = {
      nombre: auditoria.nombre,
      tipo: auditoria.tipo,
      empresa: auditoria.empresa,
      departamento: auditoria.departamento,
      ubicacion: auditoria.ubicacion,
      incluirBajas: auditoria.incluirBajas,
      fechaProgramada: auditoria.fechaProgramada?.slice(0, 10) || '',
      auditorResponsable: auditoria.auditorResponsable,
      observaciones: auditoria.observaciones,
      usuarioRegistro: auditoria.usuarioRegistro,
      equipoIds: []
    };
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  cerrarFormulario(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.auditoriaEditandoId = null;
    this.formulario = this.crearFormularioVacio();
    this.errorAccion = '';
  }

  guardarAuditoria(): void {
    const validacion = this.validarFormulario();

    if (validacion) {
      this.errorAccion = validacion;
      return;
    }

    this.procesando = true;
    this.errorAccion = '';
    this.mensajeExito = '';

    if (this.modoEdicion && this.auditoriaEditandoId) {
      this.auditoriasService.actualizarAuditoria(this.auditoriaEditandoId, {
        nombre: this.formulario.nombre,
        fechaProgramada: this.formulario.fechaProgramada,
        auditorResponsable: this.formulario.auditorResponsable,
        observaciones: this.formulario.observaciones || ''
      }).subscribe({
        next: () => this.finalizarGuardado('La auditoría se actualizó correctamente.'),
        error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo actualizar la auditoría.')
      });

      return;
    }

    this.auditoriasService.crearAuditoria({
      ...this.formulario,
      equipoIds: this.formulario.tipo === 'Muestra' ? this.formulario.equipoIds : []
    }).subscribe({
      next: () => this.finalizarGuardado('La auditoría se creó correctamente.'),
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo crear la auditoría.')
    });
  }

  verAuditoria(auditoria: Auditoria): void {
    this.auditoriaSeleccionada = auditoria;
    this.busquedaDetalle = '';
    this.filtroResultadoDetalle = 'Todos';
    this.mostrarDetalle = true;
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (!this.auditoriaSeleccionada) {
      return;
    }

    this.cargando = true;
    this.errorAccion = '';

    this.auditoriasService.obtenerAuditoria(
      this.auditoriaSeleccionada.id,
      this.busquedaDetalle,
      this.filtroResultadoDetalle
    ).subscribe({
      next: (auditoria: Auditoria) => {
        this.auditoriaSeleccionada = auditoria;
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorAccion = this.obtenerMensajeError(
          error,
          'No se pudo cargar el detalle de la auditoría.'
        );
        this.cargando = false;
      }
    });
  }

  cerrarDetalle(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarDetalle = false;
    this.auditoriaSeleccionada = null;
    this.busquedaDetalle = '';
    this.filtroResultadoDetalle = 'Todos';
    this.errorAccion = '';
  }

  iniciarAuditoria(auditoria: Auditoria): void {
    if (!window.confirm(`¿Deseas iniciar la auditoría ${auditoria.folio}?`)) {
      return;
    }

    this.procesando = true;
    this.limpiarMensajes();

    this.auditoriasService.iniciarAuditoria(auditoria.id).subscribe({
      next: () => {
        this.procesando = false;
        this.mensajeExito = 'La auditoría se inició correctamente.';
        this.cargarInformacion();

        if (this.auditoriaSeleccionada?.id === auditoria.id) {
          this.cargarDetalle();
        }
      },
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo iniciar la auditoría.')
    });
  }

  abrirRevision(detalle: AuditoriaDetalle): void {
    this.detalleSeleccionado = detalle;

    const datos = detalle.encontradoDatos;
    const esperado = detalle.esperado;

    this.formularioRevision = {
      encontrado: detalle.encontrado ?? true,
      resultado: detalle.resultado === 'No aplica' ? 'No aplica' : '',
      codigoBarrasEncontrado: datos.codigoBarras || esperado.codigoBarras,
      numeroSerieEncontrado: datos.serie || esperado.serie,
      empresaEncontrada: datos.empresa || esperado.empresa,
      departamentoEncontrado: datos.departamento || esperado.departamento,
      responsableEncontrado: datos.responsable || esperado.responsable,
      estadoEncontrado: datos.estado || esperado.estado,
      ubicacionEncontrada: datos.ubicacion || esperado.ubicacion,
      funcionamientoEncontrado: datos.funcionamiento || esperado.funcionamiento,
      extrasEncontrados: datos.extras || esperado.extras,
      tipoDiferencia: detalle.tipoDiferencia,
      observaciones: detalle.observaciones,
      evidenciaUrl: detalle.evidenciaUrl,
      accionRequerida: detalle.accionRequerida,
      estadoCorreccion: detalle.estadoCorreccion || 'No aplica',
      revisadoPor: detalle.revisadoPor || ''
    };

    this.mostrarRevision = true;
    this.errorAccion = '';
  }

  marcarNoAplica(): void {
    this.formularioRevision.resultado = 'No aplica';
    this.formularioRevision.encontrado = false;
    this.formularioRevision.estadoCorreccion = 'No aplica';
  }

  cambiarEncontrado(): void {
    if (!this.formularioRevision.encontrado) {
      this.formularioRevision.resultado = '';
      this.formularioRevision.estadoCorreccion = 'Pendiente';
    } else if (this.formularioRevision.resultado === 'No aplica') {
      this.formularioRevision.resultado = '';
      this.formularioRevision.estadoCorreccion = 'No aplica';
    }
  }

  cerrarRevision(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarRevision = false;
    this.detalleSeleccionado = null;
    this.errorAccion = '';
  }

  guardarRevision(): void {
    if (!this.auditoriaSeleccionada || !this.detalleSeleccionado) {
      return;
    }

    if (!this.formularioRevision.revisadoPor.trim()) {
      this.errorAccion = 'Indica quién realizó la revisión.';
      return;
    }

    this.procesando = true;
    this.errorAccion = '';

    this.auditoriasService.revisarEquipo(
      this.auditoriaSeleccionada.id,
      this.detalleSeleccionado.id,
      {
        encontrado: this.formularioRevision.encontrado,
        resultado: this.formularioRevision.resultado || undefined,
        codigoBarrasEncontrado: this.formularioRevision.codigoBarrasEncontrado,
        numeroSerieEncontrado: this.formularioRevision.numeroSerieEncontrado,
        empresaEncontrada: this.formularioRevision.empresaEncontrada,
        departamentoEncontrado: this.formularioRevision.departamentoEncontrado,
        responsableEncontrado: this.formularioRevision.responsableEncontrado,
        estadoEncontrado: this.formularioRevision.estadoEncontrado,
        ubicacionEncontrada: this.formularioRevision.ubicacionEncontrada,
        funcionamientoEncontrado: this.formularioRevision.funcionamientoEncontrado,
        extrasEncontrados: this.formularioRevision.extrasEncontrados,
        tipoDiferencia: this.formularioRevision.tipoDiferencia,
        observaciones: this.formularioRevision.observaciones,
        evidenciaUrl: this.formularioRevision.evidenciaUrl,
        accionRequerida: this.formularioRevision.accionRequerida,
        estadoCorreccion:
          this.formularioRevision.resultado === 'No aplica'
            ? 'No aplica'
            : this.formularioRevision.estadoCorreccion === 'No aplica'
              ? undefined
              : this.formularioRevision.estadoCorreccion,
        revisadoPor: this.formularioRevision.revisadoPor
      }
    ).subscribe({
      next: () => {
        this.procesando = false;
        this.mostrarRevision = false;
        this.detalleSeleccionado = null;
        this.mensajeExito = 'La revisión se guardó correctamente.';
        this.cargarDetalle();
        this.cargarInformacion();
      },
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo guardar la revisión.')
    });
  }

  abrirFinalizacion(auditoria: Auditoria): void {
    this.auditoriaSeleccionada = auditoria;
    this.conclusionesFinalizacion = auditoria.conclusiones || '';
    this.mostrarFinalizacion = true;
    this.errorAccion = '';
  }

  cerrarFinalizacion(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarFinalizacion = false;
    this.conclusionesFinalizacion = '';
    this.errorAccion = '';
  }

  confirmarFinalizacion(): void {
    if (!this.auditoriaSeleccionada) {
      return;
    }

    this.procesando = true;
    this.errorAccion = '';

    this.auditoriasService.finalizarAuditoria(
      this.auditoriaSeleccionada.id,
      this.conclusionesFinalizacion.trim()
    ).subscribe({
      next: () => {
        this.procesando = false;
        this.mostrarFinalizacion = false;
        this.mensajeExito = 'La auditoría se finalizó correctamente.';
        this.cargarInformacion();
        this.cargarDetalle();
      },
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo finalizar la auditoría.')
    });
  }

  abrirCancelacion(auditoria: Auditoria): void {
    this.auditoriaSeleccionada = auditoria;
    this.motivoCancelacion = '';
    this.mostrarCancelacion = true;
    this.errorAccion = '';
  }

  cerrarCancelacion(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarCancelacion = false;
    this.motivoCancelacion = '';
    this.errorAccion = '';
  }

  confirmarCancelacion(): void {
    if (!this.auditoriaSeleccionada) {
      return;
    }

    if (!this.motivoCancelacion.trim()) {
      this.errorAccion = 'Indica el motivo de cancelación.';
      return;
    }

    this.procesando = true;
    this.errorAccion = '';

    this.auditoriasService.cancelarAuditoria(
      this.auditoriaSeleccionada.id,
      this.motivoCancelacion.trim()
    ).subscribe({
      next: () => {
        this.procesando = false;
        this.mostrarCancelacion = false;
        this.mensajeExito = 'La auditoría se canceló correctamente.';
        this.cargarInformacion();
        this.cerrarDetalle();
      },
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo cancelar la auditoría.')
    });
  }

  eliminarAuditoria(auditoria: Auditoria): void {
    if (!window.confirm(`¿Eliminar definitivamente la auditoría ${auditoria.folio}?`)) {
      return;
    }

    this.procesando = true;
    this.limpiarMensajes();

    this.auditoriasService.eliminarAuditoria(auditoria.id).subscribe({
      next: () => {
        this.procesando = false;
        this.mensajeExito = 'La auditoría se eliminó correctamente.';
        this.cargarInformacion();
      },
      error: (error: HttpErrorResponse) => this.manejarErrorAccion(error, 'No se pudo eliminar la auditoría.')
    });
  }

  exportarAuditoria(auditoria: Auditoria): void {
    if (this.exportandoId !== null) {
      return;
    }

    this.exportandoId = auditoria.id;
    this.errorAccion = '';

    this.auditoriasService.exportarAuditoria(auditoria.id).subscribe({
      next: (archivo: Blob) => {
        const urlTemporal = window.URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        enlace.href = urlTemporal;
        enlace.download = `${auditoria.folio || `auditoria-${auditoria.id}`}.csv`;
        enlace.style.display = 'none';

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(() => window.URL.revokeObjectURL(urlTemporal), 1000);

        this.exportandoId = null;
        this.mensajeExito = 'La auditoría se exportó correctamente.';
      },
      error: (error: HttpErrorResponse) => {
        this.exportandoId = null;
        this.errorAccion = 'No se pudo exportar la auditoría.';

        if (error.error instanceof Blob) {
          this.leerErrorBlob(error.error);
        } else {
          this.errorAccion = this.obtenerMensajeError(
            error,
            'No se pudo exportar la auditoría.'
          );
        }
      }
    });
  }

  alternarEquipoMuestra(equipoId: number): void {
    const ids = this.formulario.equipoIds || [];

    this.formulario.equipoIds = ids.includes(equipoId)
      ? ids.filter(id => id !== equipoId)
      : [...ids, equipoId];
  }

  equipoSeleccionado(equipoId: number): boolean {
    return (this.formulario.equipoIds || []).includes(equipoId);
  }

  tieneFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda ||
      this.filtroEstado !== 'Todos' ||
      this.filtroTipo !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.fechaInicio ||
      this.fechaFin
    );
  }

  estadoClase(valor: string): string {
    return this.claseNormalizada(valor);
  }

  resultadoClase(valor: string): string {
    return this.claseNormalizada(valor);
  }

  porcentajeSeguro(valor: number): number {
    return Math.max(0, Math.min(100, Number(valor || 0)));
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return fecha;
    }

    return valor.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: fecha.length > 10 ? '2-digit' : undefined,
      minute: fecha.length > 10 ? '2-digit' : undefined
    });
  }

  abrirEvidencia(url: string): void {
    if (url?.trim()) {
      window.open(url.trim(), '_blank', 'noopener,noreferrer');
    }
  }

  private crearFormularioVacio(): GuardarAuditoriaPayload {
    return {
      nombre: '',
      tipo: 'General',
      empresa: '',
      departamento: '',
      ubicacion: '',
      incluirBajas: false,
      fechaProgramada: new Date().toISOString().slice(0, 10),
      auditorResponsable: '',
      observaciones: '',
      usuarioRegistro: 'Sistema',
      equipoIds: []
    };
  }

  private validarFormulario(): string {
    if (!this.formulario.nombre.trim()) {
      return 'El nombre de la auditoría es obligatorio.';
    }

    if (!this.formulario.fechaProgramada) {
      return 'La fecha programada es obligatoria.';
    }

    if (!this.formulario.auditorResponsable.trim()) {
      return 'El auditor responsable es obligatorio.';
    }

    if (this.formulario.tipo === 'Empresa' && !this.formulario.empresa) {
      return 'Selecciona la empresa que se auditará.';
    }

    if (this.formulario.tipo === 'Departamento' && !this.formulario.departamento) {
      return 'Selecciona el departamento que se auditará.';
    }

    if (this.formulario.tipo === 'Ubicación' && !this.formulario.ubicacion) {
      return 'Selecciona la ubicación que se auditará.';
    }

    if (
      this.formulario.tipo === 'Muestra' &&
      !(this.formulario.equipoIds || []).length
    ) {
      return 'Selecciona al menos un equipo para la muestra.';
    }

    return '';
  }

  private obtenerFiltros(): AuditoriasFiltros {
    return {
      busqueda: this.terminoBusqueda,
      estado: this.filtroEstado,
      tipo: this.filtroTipo,
      empresa: this.filtroEmpresa,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    };
  }

  private validarRangoFechas(): boolean {
    if (this.fechaInicio && this.fechaFin && this.fechaInicio > this.fechaFin) {
      this.errorCarga = 'La fecha inicial no puede ser posterior a la fecha final.';
      return false;
    }

    return true;
  }

  private finalizarGuardado(mensaje: string): void {
    this.procesando = false;
    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.auditoriaEditandoId = null;
    this.formulario = this.crearFormularioVacio();
    this.mensajeExito = mensaje;
    this.cargarInformacion();
  }

  private manejarErrorAccion(error: HttpErrorResponse, mensaje: string): void {
    console.error(mensaje, error);
    this.errorAccion = this.obtenerMensajeError(error, mensaje);
    this.procesando = false;
  }

  private obtenerMensajeError(error: HttpErrorResponse, mensaje: string): string {
    return error.error?.detalle || error.error?.error || mensaje;
  }

  private claseNormalizada(valor: string): string {
    return (valor || 'sin-estado')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  private limpiarMensajes(): void {
    this.errorCarga = '';
    this.errorAccion = '';
    this.mensajeExito = '';
  }

  private leerErrorBlob(blob: Blob): void {
    const lector = new FileReader();

    lector.onload = () => {
      try {
        const respuesta = JSON.parse(String(lector.result || ''));
        this.errorAccion =
          respuesta.detalle ||
          respuesta.error ||
          'No se pudo exportar la auditoría.';
      } catch {
        this.errorAccion = 'No se pudo exportar la auditoría.';
      }
    };

    lector.readAsText(blob);
  }
}