import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
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


// Las coincidencias solo se preparan tras una declaración expresa de revisión física.
// Abrir una ventana nunca confirma datos por sí solo.
type CampoComprobacion = 'serie' | 'empresa' | 'departamento' | 'responsable' |
  'estado' | 'ubicacion' | 'funcionamiento' | 'extras';
type DecisionComprobacion = '' | 'Coincide' | 'Diferente' | 'No verificable' | 'Sin dato';
type CampoFormulario = 'numeroSerieEncontrado' | 'empresaEncontrada' |
  'departamentoEncontrado' | 'responsableEncontrado' | 'estadoEncontrado' |
  'ubicacionEncontrada' | 'funcionamientoEncontrado' | 'extrasEncontrados';
type CampoEsperado = 'serie' | 'empresa' | 'departamento' | 'responsable' |
  'estado' | 'ubicacion' | 'funcionamiento' | 'extras';

const NUEVAS_COMPROBACIONES: Record<CampoComprobacion, DecisionComprobacion> = {
  serie: '', empresa: '', departamento: '', responsable: '', estado: '',
  ubicacion: '', funcionamiento: '', extras: ''
};

@Component({
  selector: 'app-auditorias',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FechaInventarioComponent
  ],

  templateUrl: './auditorias.component.html',
  styleUrl: './auditorias.component.css'
})
export class AuditoriasComponent implements OnInit {

  auditorias: Auditoria[] = [];
  auditorActual = '';
  accionesAuditoriaId: number | null = null;

  private versionListado = 0;
  private versionEstadisticas = 0;

  alternarAccionesAuditoria(id: number): void {
    this.accionesAuditoriaId = this.accionesAuditoriaId === id ? null : id;
  }

  auditoriaPendienteInicio: Auditoria | null = null;

  @HostListener('document:keydown.escape')
  cerrarConfirmacionConEscape(): void {
    this.cancelarInicioAuditoria();
  }

  cancelarInicioAuditoria(): void {
    if (!this.procesando) this.auditoriaPendienteInicio = null;
  }

  estadisticas: AuditoriasEstadisticas = {
    total: 0,
    planeadas: 0,
    enProceso: 0,
    finalizadas: 0,
    canceladas: 0
  };


  tipos: TipoAuditoria[] = [
    'General',
    'Empresa',
    'Departamento',
    'Ubicación',
    'Muestra'
  ];


  estados = [
    'Todos',
    'Planeada',
    'En proceso',
    'Finalizada',
    'Cancelada'
  ];


  resultadosDetalle = [
    'Todos',
    'Pendiente',
    'Conforme',
    'Con diferencia',
    'No localizado',
    'No aplica'
  ];


  empresas: string[] = [];

  departamentos: string[] = [];

  ubicaciones: string[] = [];

  equiposCatalogo:
    AuditoriaEquipoCatalogo[] = [];


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

  auditoriaSeleccionada:
    Auditoria | null = null;

  busquedaDetalle = '';

  filtroResultadoDetalle = 'Todos';


  mostrarRevision = false;

  // Flujo guiado: el detalle campo por campo solo se abre cuando hay diferencias.
  modoRevision: 'inicio' | 'rapida' | 'diferencias' | 'no-localizado' | 'no-aplica' = 'inicio';
  confirmaRevisionFisica = false;
  mostrarCamposOpcionales = false;
  avisoRevision = '';

  // Los extras pueden ser opcionales, pero una serie o referencia operativa ausente
  // NO debe aprobarse silenciosamente como "Coincide".
  get camposSinReferenciaEsencial(): string[] {
    if (!this.detalleSeleccionado) return [];
    return this.camposRevision
      .filter(c => c.clave !== 'extras' &&
        !(c.clave === 'responsable' &&
          !/asignad/i.test(this.detalleSeleccionado?.esperado.estado || '')) &&
        !String(this.detalleSeleccionado?.esperado[c.esperado] ?? '').trim())
      .map(c => c.etiqueta);
  }

  get cantidadComprobacionesConDato(): number {
    if (!this.detalleSeleccionado) return 0;
    return this.camposRevision.filter(c =>
      !!String(this.detalleSeleccionado?.esperado[c.esperado] ?? '').trim()).length;
  }

  get haySiguientePendiente(): boolean {
    return !!this.auditoriaSeleccionada?.detalles?.some(d =>
      d.id !== this.detalleSeleccionado?.id && d.resultado === 'Pendiente');
  }

  get cantidadDiferenciasSeleccionadas(): number {
    return Object.values(this.formularioRevision.verificaciones)
      .filter(v => v === 'Diferente' || v === 'No verificable').length;
  }

  private rellenarDecisionesTrasVerificar(): void {
    const esperado = this.detalleSeleccionado?.esperado;
    if (!esperado) return;
    const verificaciones = { ...NUEVAS_COMPROBACIONES };
    for (const campo of this.camposRevision) {
      verificaciones[campo.clave] = String(esperado[campo.esperado] ?? '').trim()
        ? 'Coincide'
        : 'Sin dato';
    }
    this.formularioRevision.verificaciones = verificaciones;
  }

  seleccionarSinIncidencias(): void {
    if (!this.detalleSeleccionado) return;
    this.errorAccion = '';
    this.confirmaRevisionFisica = false;
    const faltantes = this.camposSinReferenciaEsencial;
    if (faltantes.length) {
      this.seleccionarConDiferencias();
      // No inventar datos que no están guardados, ni declararlos "coincidentes".
      for (const campo of this.camposRevision) {
        if (faltantes.includes(campo.etiqueta)) {
          this.formularioRevision.verificaciones[campo.clave] = 'No verificable';
        }
      }
      this.avisoRevision = `No se puede emitir «Sin incidencias»: faltan datos para contrastar (${faltantes.join(', ')}). Completa los valores físicos como «Es diferente» o conserva «No se pudo verificar» para registrar una corrección pendiente.`;
      return;
    }
    this.modoRevision = 'rapida';
    this.avisoRevision = '';
    this.formularioRevision.encontrado = true;
    this.formularioRevision.resultado = '';
    this.formularioRevision.estadoCorreccion = 'No aplica';
    this.rellenarDecisionesTrasVerificar();
  }

  seleccionarConDiferencias(): void {
    this.modoRevision = 'diferencias';
    this.avisoRevision = '';
    this.errorAccion = '';
    this.confirmaRevisionFisica = false;
    this.formularioRevision.encontrado = true;
    this.formularioRevision.resultado = '';
    this.formularioRevision.estadoCorreccion = 'Pendiente';
    this.rellenarDecisionesTrasVerificar();
    for (const campo of this.camposRevision) {
      if (this.camposSinReferenciaEsencial.includes(campo.etiqueta)) {
        this.formularioRevision.verificaciones[campo.clave] = 'No verificable';
      }
    }
  }

  seleccionarNoLocalizado(): void {
    this.modoRevision = 'no-localizado';
    this.avisoRevision = '';
    this.errorAccion = '';
    this.formularioRevision.encontrado = false;
    this.formularioRevision.resultado = '';
    this.formularioRevision.estadoCorreccion = 'Pendiente';
    this.formularioRevision.verificaciones = { ...NUEVAS_COMPROBACIONES };
  }

  volverOpcionesRevision(): void {
    this.modoRevision = 'inicio';
    this.avisoRevision = '';
    this.errorAccion = '';
    this.confirmaRevisionFisica = false;
    this.formularioRevision.encontrado = null;
    this.formularioRevision.resultado = '';
    this.formularioRevision.verificaciones = { ...NUEVAS_COMPROBACIONES };
  }

  detalleSeleccionado:
    AuditoriaDetalle | null = null;


  mostrarFinalizacion = false;

  conclusionesFinalizacion = '';


  mostrarCancelacion = false;

  motivoCancelacion = '';


  formulario:
    GuardarAuditoriaPayload =
      this.crearFormularioVacio();


  readonly camposRevision: Array<{
    clave: CampoComprobacion; etiqueta: string;
    esperado: CampoEsperado; campo: CampoFormulario
  }> = [
    { clave: 'serie', etiqueta: 'Número de serie', esperado: 'serie', campo: 'numeroSerieEncontrado' },
    { clave: 'empresa', etiqueta: 'Empresa', esperado: 'empresa', campo: 'empresaEncontrada' },
    { clave: 'departamento', etiqueta: 'Departamento', esperado: 'departamento', campo: 'departamentoEncontrado' },
    { clave: 'responsable', etiqueta: 'Responsable', esperado: 'responsable', campo: 'responsableEncontrado' },
    { clave: 'estado', etiqueta: 'Estado del equipo', esperado: 'estado', campo: 'estadoEncontrado' },
    { clave: 'ubicacion', etiqueta: 'Ubicación', esperado: 'ubicacion', campo: 'ubicacionEncontrada' },
    { clave: 'funcionamiento', etiqueta: 'Funcionamiento', esperado: 'funcionamiento', campo: 'funcionamientoEncontrado' },
    { clave: 'extras', etiqueta: 'Accesorios y extras', esperado: 'extras', campo: 'extrasEncontrados' }
  ];

  formularioRevision = {
    encontrado: null as boolean | null,
    verificaciones: { ...NUEVAS_COMPROBACIONES },

    resultado:
      '' as '' | ResultadoAuditoria,

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

    estadoCorreccion:
      'No aplica' as EstadoCorreccion,

    revisadoPor: ''
  };


  constructor(
    private auditoriasService:
      AuditoriasService
  ) {}


  ngOnInit(): void {
    this.auditoriasService.obtenerMiUsuario().subscribe({
      next: cuenta => this.auditorActual = cuenta.nombre,
      error: () => this.auditorActual = ''
    });
    this.cargarCatalogos();
    this.cargarInformacion();
  }


  /*
   * =========================================================
   * INFORMACIÓN GENERAL
   * =========================================================
   */

  cargarInformacion(): void {
    this.cargarListadoYEstadisticas();
  }

  private cargarListadoYEstadisticas(): void {
    this.cargarAuditorias();
    this.cargarEstadisticas();
  }


  cargarAuditorias(): void {
    const version = ++this.versionListado;
    this.cargando = true;

    this.errorCarga = '';

    this.auditoriasService
      .obtenerAuditorias(
        this.obtenerFiltros()
      )
      .subscribe({
        next: (
          datos: Auditoria[]
        ) => {
          if (version !== this.versionListado) return;
          this.auditorias =
            Array.isArray(datos)
              ? datos
              : [];

          this.cargando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          if (version !== this.versionListado) return;
          console.error(
            'Error al cargar verificaciones:',
            error
          );

          this.auditorias = [];

          this.errorCarga =
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar las verificaciones.'
            );

          this.cargando = false;
        }
      });
  }


  cargarEstadisticas(): void {
    /*
     * Las estadísticas no reciben el estado seleccionado.
     * Así las cinco tarjetas mantienen sus cantidades y
     * continúan funcionando como navegación.
     */

    const version = ++this.versionEstadisticas;
    this.auditoriasService
      .obtenerEstadisticas(
        this.obtenerFiltrosEstadisticas()
      )
      .subscribe({
        next: (
          datos: AuditoriasEstadisticas
        ) => {
          if (version !== this.versionEstadisticas) return;
          this.estadisticas = {
            total:
              Number(datos?.total) || 0,

            planeadas:
              Number(datos?.planeadas) || 0,

            enProceso:
              Number(datos?.enProceso) || 0,

            finalizadas:
              Number(datos?.finalizadas) || 0,

            canceladas:
              Number(datos?.canceladas) || 0
          };
        },

        error: (
          error: HttpErrorResponse
        ) => {
          if (version !== this.versionEstadisticas) return;
          console.error(
            'Error al cargar estadísticas:',
            error
          );

          this.estadisticas = {
            total: 0,
            planeadas: 0,
            enProceso: 0,
            finalizadas: 0,
            canceladas: 0
          };
        }
      });
  }


  cargarCatalogos(): void {
    this.auditoriasService
      .obtenerCatalogos()
      .subscribe({
        next: (
          datos: AuditoriasCatalogos
        ) => {
          this.tipos =
            datos.tipos?.length
              ? datos.tipos
              : this.tipos;

          this.estados =
            datos.estados?.length
              ? datos.estados
              : this.estados;

          this.empresas =
            datos.empresas || [];

          this.departamentos =
            datos.departamentos || [];

          this.ubicaciones =
            datos.ubicaciones || [];

          this.equiposCatalogo =
            datos.equipos || [];
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar catálogos:',
            error
          );
        }
      });
  }


  /*
   * =========================================================
   * TARJETAS FUNCIONALES
   * =========================================================
   */

  seleccionarEstado(
    estado: string
  ): void {
    if (
      this.filtroEstado === estado &&
      !this.cargando
    ) {
      return;
    }

    if (!this.validarRangoFechas()) {
      return;
    }

    this.filtroEstado = estado;

    this.limpiarMensajes();

    this.cargarListadoYEstadisticas();
  }


  get textoFiltroEstado(): string {
    switch (this.filtroEstado) {
      case 'Planeada':
        return 'Mostrando verificaciones planeadas';

      case 'En proceso':
        return 'Mostrando verificaciones en proceso';

      case 'Finalizada':
        return 'Mostrando verificaciones finalizadas';

      case 'Cancelada':
        return 'Mostrando verificaciones canceladas';

      default:
        return 'Mostrando todas las verificaciones';
    }
  }


  /*
   * =========================================================
   * BÚSQUEDA Y FILTROS
   * =========================================================
   */

  buscar(): void {
    if (!this.validarRangoFechas()) {
      return;
    }

    this.limpiarMensajes();

    this.cargarListadoYEstadisticas();
  }


  aplicarFiltros(): void {
    if (!this.validarRangoFechas()) {
      return;
    }

    this.limpiarMensajes();

    this.cargarListadoYEstadisticas();
  }


  limpiarFiltros(): void {
    this.terminoBusqueda = '';

    this.filtroEstado = 'Todos';

    this.filtroTipo = 'Todos';

    this.filtroEmpresa = 'Todas';

    this.fechaInicio = '';

    this.fechaFin = '';

    this.limpiarMensajes();

    this.cargarListadoYEstadisticas();
  }


  tieneFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda.trim() ||
      this.filtroEstado !== 'Todos' ||
      this.filtroTipo !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.fechaInicio ||
      this.fechaFin
    );
  }


  /*
   * =========================================================
   * CREAR Y EDITAR
   * =========================================================
   */

  abrirNuevaAuditoria(): void {
    this.modoEdicion = false;

    this.auditoriaEditandoId = null;

    this.formulario =
      this.crearFormularioVacio();

    this.mostrarFormulario = true;

    this.limpiarMensajes();
  }


  abrirEdicion(
    auditoria: Auditoria
  ): void {
    this.modoEdicion = true;

    this.auditoriaEditandoId =
      auditoria.id;

    this.formulario = {
      nombre:
        auditoria.nombre,

      tipo:
        auditoria.tipo,

      empresa:
        auditoria.empresa,

      departamento:
        auditoria.departamento,

      ubicacion:
        auditoria.ubicacion,

      incluirBajas:
        auditoria.incluirBajas,

      fechaProgramada:
        auditoria.fechaProgramada
          ?.slice(0, 10) || '',

      observaciones:
        auditoria.observaciones,

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

    this.formulario =
      this.crearFormularioVacio();

    this.errorAccion = '';
  }


  guardarAuditoria(): void {
    const validacion =
      this.validarFormulario();

    if (validacion) {
      this.errorAccion =
        validacion;

      return;
    }

    this.procesando = true;

    this.errorAccion = '';

    this.mensajeExito = '';

    if (
      this.modoEdicion &&
      this.auditoriaEditandoId
    ) {
      this.auditoriasService
        .actualizarAuditoria(
          this.auditoriaEditandoId,
          {
            nombre:
              this.formulario.nombre,

            fechaProgramada:
              this.formulario
                .fechaProgramada,

            observaciones:
              this.formulario
                .observaciones || ''
          }
        )
        .subscribe({
          next: () =>
            this.finalizarGuardado(
              'La verificación se actualizó correctamente.'
            ),

          error: (
            error: HttpErrorResponse
          ) =>
            this.manejarErrorAccion(
              error,
              'No se pudo actualizar la verificación.'
            )
        });

      return;
    }

    this.auditoriasService
      .crearAuditoria({
        ...this.formulario,

        equipoIds:
          this.formulario.tipo ===
          'Muestra'
            ? this.formulario.equipoIds
            : []
      })
      .subscribe({
        next: () =>
          this.finalizarGuardado(
            'La verificación se creó correctamente.'
          ),

        error: (
          error: HttpErrorResponse
        ) =>
          this.manejarErrorAccion(
            error,
            'No se pudo crear la verificación.'
          )
      });
  }


  /*
   * =========================================================
   * DETALLE
   * =========================================================
   */

  verAuditoria(
    auditoria: Auditoria
  ): void {
    this.auditoriaSeleccionada =
      auditoria;

    this.busquedaDetalle = '';

    this.filtroResultadoDetalle =
      'Todos';

    this.mostrarDetalle = true;

    this.cargarDetalle();
  }


  cargarDetalle(): void {
    if (!this.auditoriaSeleccionada) {
      return;
    }

    this.cargando = true;

    this.errorAccion = '';

    this.auditoriasService
      .obtenerAuditoria(
        this.auditoriaSeleccionada.id,
        this.busquedaDetalle,
        this.filtroResultadoDetalle
      )
      .subscribe({
        next: (
          auditoria: Auditoria
        ) => {
          this.auditoriaSeleccionada =
            auditoria;

          this.cargando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          this.errorAccion =
            this.obtenerMensajeError(
              error,
              'No se pudo cargar el detalle de la verificación.'
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

    this.filtroResultadoDetalle =
      'Todos';

    this.errorAccion = '';
  }


  /*
   * =========================================================
   * INICIAR AUDITORÍA
   * =========================================================
   */

  iniciarAuditoria(auditoria: Auditoria): void {
    if (this.procesando || auditoria.estado !== 'Planeada') return;
    this.auditoriaPendienteInicio = auditoria;
  }

  confirmarInicioAuditoria(): void {
    const auditoria = this.auditoriaPendienteInicio;
    if (!auditoria || this.procesando) return;
    this.procesando = true;
    this.limpiarMensajes();
    this.auditoriasService.iniciarAuditoria(auditoria.id).subscribe({
      next: () => {
        this.procesando = false;
        this.auditoriaPendienteInicio = null;
        this.mensajeExito = 'La verificación se inició correctamente.';
        this.cargarInformacion();
        if (this.auditoriaSeleccionada?.id === auditoria.id) {
          this.cargarDetalle();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.auditoriaPendienteInicio = null;
        this.manejarErrorAccion(error, 'No se pudo iniciar la verificación.');
      }
    });
  }


  /*
   * =========================================================
   * REVISIÓN FÍSICA
   * =========================================================
   */

  abrirRevision(
    detalle: AuditoriaDetalle
  ): void {
    this.detalleSeleccionado =
      detalle;

    // Al iniciar o repetir una revisión no precargamos datos supuestamente
    // encontrados. El usuario debe verificarlos físicamente en esta sesión.
    this.formularioRevision = {
      encontrado: null,
      verificaciones: { ...NUEVAS_COMPROBACIONES },
      resultado: '',
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
      estadoCorreccion: 'No aplica',
      revisadoPor: this.auditorActual || ''
    };

    this.mostrarRevision = true;
    this.modoRevision = 'inicio';
    this.confirmaRevisionFisica = false;
    this.mostrarCamposOpcionales = false;
    this.avisoRevision = '';

    this.errorAccion = '';
  }


  marcarNoAplica(): void {
    this.modoRevision = 'no-aplica';
    this.avisoRevision = '';
    this.errorAccion = '';
    this.formularioRevision.verificaciones = { ...NUEVAS_COMPROBACIONES };
    this.formularioRevision
      .resultado = 'No aplica';

    this.formularioRevision
      .encontrado = false;

    this.formularioRevision
      .estadoCorreccion =
        'No aplica';
  }


  cambiarEncontrado(): void {
    if (
      !this.formularioRevision
        .encontrado
    ) {
      this.formularioRevision
        .resultado = '';

      this.formularioRevision
        .estadoCorreccion =
          'Pendiente';
    } else if (
      this.formularioRevision
        .resultado === 'No aplica'
    ) {
      this.formularioRevision
        .resultado = '';

      this.formularioRevision
        .estadoCorreccion =
          'No aplica';
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


  guardarRevision(continuarConSiguiente = false): void {
    if (!this.auditoriaSeleccionada || !this.detalleSeleccionado) return;
    if (this.modoRevision === 'inicio') {
      this.errorAccion = 'Primero indica el resultado de la revisión física.';
      return;
    }
    if ((this.modoRevision === 'rapida' || this.modoRevision === 'diferencias') && !this.confirmaRevisionFisica) {
      this.errorAccion = 'Confirma que revisaste físicamente el equipo y comparaste los datos mostrados.';
      return;
    }
    if (this.modoRevision === 'diferencias' && !this.cantidadDiferenciasSeleccionadas) {
      this.errorAccion = 'No marcaste ninguna diferencia. Usa «Todo coincide» si ya revisaste el equipo y está correcto.';
      return;
    }

    const form = this.formularioRevision;
    if (form.resultado === 'No aplica') {
      if (!form.observaciones.trim()) {
        this.errorAccion = 'Indica en observaciones por qué el equipo no aplica.';
        return;
      }
    } else if (form.encontrado === null) {
      this.errorAccion = 'Confirma si el equipo se localizó físicamente.';
      return;
    } else if (form.encontrado === false) {
      if (!form.observaciones.trim()) {
        this.errorAccion = 'Describe la búsqueda del equipo no localizado.';
        return;
      }
    } else {
      const esperado = this.detalleSeleccionado.esperado;
      for (const campo of this.camposRevision) {
        const decision = form.verificaciones[campo.clave];
        if (!decision || (decision === 'Sin dato' && esperado[campo.esperado])) {
          this.errorAccion = `Confirma el resultado de ${campo.etiqueta}.`;
          return;
        }
        if (decision === 'Coincide' && !esperado[campo.esperado]) {
          this.errorAccion = `${campo.etiqueta} no tiene un valor registrado con el cual coincidir.`;
          return;
        }
        if (decision === 'Diferente' && !form[campo.campo].trim()) {
          this.errorAccion = `Captura el valor encontrado en ${campo.etiqueta}.`;
          return;
        }
      }
    }

    this.procesando = true;

    this.errorAccion = '';

    this.auditoriasService
      .revisarEquipo(
        this.auditoriaSeleccionada.id,
        this.detalleSeleccionado.id,
        {
          encontrado:
            this.formularioRevision
              .encontrado === true,

          verificaciones: { ...this.formularioRevision.verificaciones },

          resultado:
            this.formularioRevision
              .resultado ||
            undefined,

          codigoBarrasEncontrado:
            this.formularioRevision
              .codigoBarrasEncontrado,

          numeroSerieEncontrado:
            this.formularioRevision
              .numeroSerieEncontrado,

          empresaEncontrada:
            this.formularioRevision
              .empresaEncontrada,

          departamentoEncontrado:
            this.formularioRevision
              .departamentoEncontrado,

          responsableEncontrado:
            this.formularioRevision
              .responsableEncontrado,

          estadoEncontrado:
            this.formularioRevision
              .estadoEncontrado,

          ubicacionEncontrada:
            this.formularioRevision
              .ubicacionEncontrada,

          funcionamientoEncontrado:
            this.formularioRevision
              .funcionamientoEncontrado,

          extrasEncontrados:
            this.formularioRevision
              .extrasEncontrados,

          tipoDiferencia:
            this.formularioRevision
              .tipoDiferencia,

          observaciones:
            this.formularioRevision
              .observaciones,

          evidenciaUrl:
            this.formularioRevision
              .evidenciaUrl,

          accionRequerida:
            this.formularioRevision
              .accionRequerida,

          estadoCorreccion:
            this.formularioRevision
              .resultado === 'No aplica'
              ? 'No aplica'
              : this.formularioRevision
                  .estadoCorreccion ===
                'No aplica'
                ? undefined
                : this.formularioRevision
                    .estadoCorreccion,

        }
      )
      .subscribe({
        next: () => {
          this.procesando = false;
          // Continuar en la misma sesión de verificación sin volver al listado.
          // Solo avanza a otro detalle pendiente de la auditoría visible.
          const siguiente = continuarConSiguiente
            ? this.auditoriaSeleccionada?.detalles?.find(d =>
                d.id !== this.detalleSeleccionado?.id && d.resultado === 'Pendiente')
            : undefined;

          this.mostrarRevision = false;
          this.detalleSeleccionado = null;
          this.mensajeExito = 'La revisión se guardó correctamente.';
          this.cargarDetalle();
          this.cargarInformacion();
          if (siguiente) this.abrirRevision(siguiente);
        },

        error: (
          error: HttpErrorResponse
        ) =>
          this.manejarErrorAccion(
            error,
            'No se pudo guardar la revisión.'
          )
      });
  }


  /*
   * =========================================================
   * FINALIZACIÓN
   * =========================================================
   */

  abrirFinalizacion(
    auditoria: Auditoria
  ): void {
    this.auditoriaSeleccionada =
      auditoria;

    this.conclusionesFinalizacion =
      auditoria.conclusiones || '';

    this.mostrarFinalizacion =
      true;

    this.errorAccion = '';
  }


  cerrarFinalizacion(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarFinalizacion =
      false;

    this.conclusionesFinalizacion =
      '';

    this.errorAccion = '';
  }


  confirmarFinalizacion(): void {
    if (!this.auditoriaSeleccionada) {
      return;
    }

    this.procesando = true;

    this.errorAccion = '';

    this.auditoriasService
      .finalizarAuditoria(
        this.auditoriaSeleccionada.id,
        this.conclusionesFinalizacion
          .trim()
      )
      .subscribe({
        next: () => {
          this.procesando = false;

          this.mostrarFinalizacion =
            false;

          this.mensajeExito =
            'La verificación se finalizó correctamente.';

          this.cargarInformacion();

          this.cargarDetalle();
        },

        error: (
          error: HttpErrorResponse
        ) =>
          this.manejarErrorAccion(
            error,
            'No se pudo finalizar la verificación.'
          )
      });
  }


  /*
   * =========================================================
   * CANCELACIÓN
   * =========================================================
   */

  abrirCancelacion(
    auditoria: Auditoria
  ): void {
    this.auditoriaSeleccionada =
      auditoria;

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

    if (
      !this.motivoCancelacion
        .trim()
    ) {
      this.errorAccion =
        'Indica el motivo de cancelación.';

      return;
    }

    this.procesando = true;

    this.errorAccion = '';

    this.auditoriasService
      .cancelarAuditoria(
        this.auditoriaSeleccionada.id,
        this.motivoCancelacion.trim()
      )
      .subscribe({
        next: () => {
          this.procesando = false;

          this.mostrarCancelacion =
            false;

          this.mensajeExito =
            'La verificación se canceló correctamente.';

          this.cargarInformacion();

          this.cerrarDetalle();
        },

        error: (
          error: HttpErrorResponse
        ) =>
          this.manejarErrorAccion(
            error,
            'No se pudo cancelar la verificación.'
          )
      });
  }


  /*
   * =========================================================
   * ELIMINACIÓN Y EXPORTACIÓN
   * =========================================================
   */

  exportarAuditoria(
    auditoria: Auditoria
  ): void {
    if (
      this.exportandoId !== null
    ) {
      return;
    }

    this.exportandoId =
      auditoria.id;

    this.errorAccion = '';

    this.auditoriasService
      .exportarAuditoria(
        auditoria.id
      )
      .subscribe({
        next: (
          archivo: Blob
        ) => {
          const urlTemporal =
            window.URL
              .createObjectURL(
                archivo
              );

          const enlace =
            document
              .createElement('a');

          enlace.href =
            urlTemporal;

          enlace.download =
            `${
              auditoria.folio ||
              `auditoria-${auditoria.id}`
            }.csv`;

          enlace.style.display =
            'none';

          document.body
            .appendChild(enlace);

          enlace.click();

          enlace.remove();

          window.setTimeout(
            () =>
              window.URL
                .revokeObjectURL(
                  urlTemporal
                ),
            1000
          );

          this.exportandoId = null;

          this.mensajeExito =
            'La verificación se exportó correctamente.';
        },

        error: (
          error: HttpErrorResponse
        ) => {
          this.exportandoId = null;

          this.errorAccion =
            'No se pudo exportar la verificación.';

          if (
            error.error instanceof Blob
          ) {
            this.leerErrorBlob(
              error.error
            );
          } else {
            this.errorAccion =
              this.obtenerMensajeError(
                error,
                'No se pudo exportar la verificación.'
              );
          }
        }
      });
  }


  /*
   * =========================================================
   * EQUIPOS DE MUESTRA
   * =========================================================
   */

  alternarEquipoMuestra(
    equipoId: number
  ): void {
    const ids =
      this.formulario.equipoIds || [];

    this.formulario.equipoIds =
      ids.includes(equipoId)
        ? ids.filter(
            id => id !== equipoId
          )
        : [
            ...ids,
            equipoId
          ];
  }


  equipoSeleccionado(
    equipoId: number
  ): boolean {
    return (
      this.formulario
        .equipoIds || []
    ).includes(equipoId);
  }


  /*
   * =========================================================
   * FUNCIONES PARA LA VISTA
   * =========================================================
   */

  estadoClase(
    valor: string
  ): string {
    return this.claseNormalizada(
      valor
    );
  }


  resultadoClase(
    valor: string
  ): string {
    return this.claseNormalizada(
      valor
    );
  }


  porcentajeSeguro(
    valor: number
  ): number {
    return Math.max(
      0,
      Math.min(
        100,
        Number(valor || 0)
      )
    );
  }


  formatearFecha(
    fecha: string
  ): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const valor =
      new Date(fecha);

    if (
      Number.isNaN(
        valor.getTime()
      )
    ) {
      return fecha;
    }

    return valor.toLocaleString(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',

        hour:
          fecha.length > 10
            ? '2-digit'
            : undefined,

        minute:
          fecha.length > 10
            ? '2-digit'
            : undefined
      }
    );
  }


  abrirEvidencia(
    url: string
  ): void {
    if (url?.trim()) {
      window.open(
        url.trim(),
        '_blank',
        'noopener,noreferrer'
      );
    }
  }


  trackByAuditoria(
    indice: number,
    auditoria: Auditoria
  ): number {
    return auditoria.id || indice;
  }


  /*
   * =========================================================
   * FUNCIONES PRIVADAS
   * =========================================================
   */

  private crearFormularioVacio():
    GuardarAuditoriaPayload {
    return {
      nombre: '',

      tipo: 'General',

      empresa: '',

      departamento: '',

      ubicacion: '',

      incluirBajas: false,

      fechaProgramada:
        new Date()
          .toISOString()
          .slice(0, 10),

      observaciones: '',

      equipoIds: []
    };
  }


  private validarFormulario():
    string {
    if (
      !this.formulario.nombre
        .trim()
    ) {
      return (
        'El nombre de la verificación es obligatorio.'
      );
    }

    if (
      !this.formulario
        .fechaProgramada
    ) {
      return (
        'La fecha programada es obligatoria.'
      );
    }

    if (
      this.formulario.tipo ===
        'Empresa' &&
      !this.formulario.empresa
    ) {
      return (
        'Selecciona la empresa que se auditará.'
      );
    }

    if (
      this.formulario.tipo ===
        'Departamento' &&
      !this.formulario.departamento
    ) {
      return (
        'Selecciona el departamento que se auditará.'
      );
    }

    if (
      this.formulario.tipo ===
        'Ubicación' &&
      !this.formulario.ubicacion
    ) {
      return (
        'Selecciona la ubicación que se auditará.'
      );
    }

    if (
      this.formulario.tipo ===
        'Muestra' &&
      !(
        this.formulario
          .equipoIds || []
      ).length
    ) {
      return (
        'Selecciona al menos un equipo para la muestra.'
      );
    }

    return '';
  }


  private obtenerFiltros():
    AuditoriasFiltros {
    return {
      busqueda:
        this.terminoBusqueda.trim(),

      estado:
        this.filtroEstado,

      tipo:
        this.filtroTipo,

      empresa:
        this.filtroEmpresa,

      fechaInicio:
        this.fechaInicio,

      fechaFin:
        this.fechaFin
    };
  }


  private obtenerFiltrosEstadisticas():
    AuditoriasFiltros {
    return {
      busqueda:
        this.terminoBusqueda.trim(),

      estado:
        'Todos',

      tipo:
        this.filtroTipo,

      empresa:
        this.filtroEmpresa,

      fechaInicio:
        this.fechaInicio,

      fechaFin:
        this.fechaFin
    };
  }


  private validarRangoFechas():
    boolean {
    if (
      this.fechaInicio &&
      this.fechaFin &&
      this.fechaInicio >
        this.fechaFin
    ) {
      this.errorCarga =
        'La fecha inicial no puede ser posterior a la fecha final.';

      return false;
    }

    return true;
  }


  private finalizarGuardado(
    mensaje: string
  ): void {
    this.procesando = false;

    this.mostrarFormulario = false;

    this.modoEdicion = false;

    this.auditoriaEditandoId = null;

    this.formulario =
      this.crearFormularioVacio();

    this.mensajeExito =
      mensaje;

    this.cargarInformacion();
  }


  private manejarErrorAccion(
    error: HttpErrorResponse,
    mensaje: string
  ): void {
    console.error(
      mensaje,
      error
    );

    this.errorAccion =
      this.obtenerMensajeError(
        error,
        mensaje
      );

    this.procesando = false;
  }


  private obtenerMensajeError(
    error: HttpErrorResponse,
    mensaje: string
  ): string {
    return (
      error.error?.detalle ||
      error.error?.error ||
      mensaje
    );
  }


  private claseNormalizada(
    valor: string
  ): string {
    return (
      valor ||
      'sin-estado'
    )
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }


  private limpiarMensajes(): void {
    this.errorCarga = '';

    this.errorAccion = '';

    this.mensajeExito = '';
  }


  private leerErrorBlob(
    blob: Blob
  ): void {
    const lector =
      new FileReader();

    lector.onload = () => {
      try {
        const respuesta =
          JSON.parse(
            String(
              lector.result || ''
            )
          );

        this.errorAccion =
          respuesta.detalle ||
          respuesta.error ||
          'No se pudo exportar la verificación.';
      } catch {
        this.errorAccion =
          'No se pudo exportar la verificación.';
      }
    };

    lector.readAsText(blob);
  }
}