import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterModule
} from '@angular/router';

import {
  FormsModule
} from '@angular/forms';

import {
  ColaboradoresService,
  Colaborador,
  NuevoColaborador,
  EstadoColaborador,
  EstadisticasColaboradores
} from '../../../../services/inventario/colaboradores.service';



type FiltroKpi =
  | 'Todos'
  | 'Activos'
  | 'Con equipos'
  | 'Sin equipos';


@Component({
  selector: 'app-colaboradores',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FechaInventarioComponent
  ],

  templateUrl: './colaboradores.component.html',
  styleUrl: './colaboradores.component.css'
})
export class ColaboradoresComponent
implements OnInit, OnDestroy {

  colaboradores: Colaborador[] = [];


  empresas: string[] = [
    'ELITE BIKE',
    'GARNIER SPORTS'
  ];


  // Catálogo aprobado y fijo. No se alimenta desde MySQL.
  readonly puestosPorDepartamento: Record<string, readonly string[]> = {
    'DIRECCIÓN': [
      'Director General',
      'Gerente General',
    ],
    'ADMINISTRACIÓN Y FINANZAS': [
      'Contador General',
      'Contador General Comercializadora',
      'Auxiliar Contable',
      'Ejecutivo de Banca y Pagos',
    ],
    'SISTEMAS': [
      'Coordinador de Sistemas',
      'Analista de Sistemas',
      'Auxiliar de Sistemas',
    ],
    'OPERACIONES': [
      'Gerente de Operaciones',
      'Auxiliar de Operaciones',
      'Coordinador de Almacenes',
      'Auxiliar de Almacén',
    ],
    'RECURSOS HUMANOS': [
      'Coordinador de Recursos Humanos',
      'Analista de Procesos / Auditor',
      'Analista de Mejora Continua',
    ],
    'MARKETING': [
      'Coordinador de Mercadotecnia',
      'Community Manager',
      'Social Media Manager',
      'Diseñador Gráfico',
    ],
    'COMERCIAL / VENTAS': [
      'Ejecutivo de Eventos y Atención al Cliente',
    ],
    'TIENDA': [
      'Coordinador de Sucursal',
      'Vendedor',
      'Mecánico',
    ],
    'LOGÍSTICA E IMPORTACIONES': [
      'Ejecutivo de Logística e Importaciones',
    ],
  };

  readonly departamentos: string[] = Object.keys(this.puestosPorDepartamento);
  readonly estados: EstadoColaborador[] = ['Activo', 'Inactivo'];
  readonly opcionOtroPuesto = '__otro_puesto__';

  // Solo controla el formulario, nunca añade opciones a los catálogos.
  puestoSeleccionado = '';
  otroPuesto = '';


  terminoBusqueda = '';

  filtroEstado = 'Todos';
  filtroDepartamento = 'Todos';
  filtroEmpresa = 'Todas';
  filtroAsignacion = 'Todos';

  filtroKpiSeleccionado: FiltroKpi | null =
    'Todos';


  cargando = false;
  errorCarga = '';


  mostrarFormulario = false;
  modoEdicion = false;
  colaboradorEditandoId: number | null = null;

  guardando = false;
  errorFormulario = '';
  mensajeExito = '';


  mostrarDetalle = false;
  cargandoDetalle = false;
  errorDetalle = '';

  colaboradorSeleccionado:
    Colaborador | null = null;


  cambiandoEstadoId: number | null = null;


  estadisticas: EstadisticasColaboradores = {
    total: 0,
    activos: 0,
    inactivos: 0,
    conEquipos: 0,
    sinEquipos: 0
  };


  nuevoColaborador: NuevoColaborador =
    this.crearColaboradorVacio();


  private temporizadorBusqueda:
    number | null = null;


  constructor(
    private colaboradoresService:
      ColaboradoresService
  ) {}


  ngOnInit(): void {
    this.cargarModulo();
  }


  ngOnDestroy(): void {
    if (
      this.temporizadorBusqueda !== null
    ) {
      window.clearTimeout(
        this.temporizadorBusqueda
      );
    }
  }


  /*
   * Permite cerrar el formulario o el modal
   * presionando la tecla Escape.
   */
  @HostListener(
    'document:keydown.escape'
  )
  cerrarConEscape(): void {
    if (this.mostrarDetalle) {
      this.cerrarDetalle();
      return;
    }

    if (this.mostrarFormulario) {
      this.cerrarFormulario();
    }
  }


  get hayFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda.trim() ||
      this.filtroEstado !== 'Todos' ||
      this.filtroDepartamento !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.filtroAsignacion !== 'Todos'
    );
  }


  /*
   * Texto que se mostrará debajo de los filtros.
   */
  get textoFiltroActivo(): string {
    if (
      this.filtroKpiSeleccionado ===
      'Activos'
    ) {
      return 'Mostrando colaboradores activos';
    }

    if (
      this.filtroKpiSeleccionado ===
      'Con equipos'
    ) {
      return 'Mostrando colaboradores con equipos';
    }

    if (
      this.filtroKpiSeleccionado ===
      'Sin equipos'
    ) {
      return 'Mostrando colaboradores sin equipos';
    }

    if (
      this.filtroKpiSeleccionado ===
      'Todos'
    ) {
      return 'Mostrando todos los colaboradores';
    }

    return 'Mostrando filtros personalizados';
  }


  cargarModulo(): void {
    this.cargarColaboradores();
    this.cargarEstadisticas();
  }



  get puestosDisponibles(): readonly string[] {
    return this.puestosPorDepartamento[this.nuevoColaborador.departamento] || [];
  }

  // En edición respetamos el departamento histórico sin añadirlo al menú fijo.
  get departamentoHistorico(): string {
    const actual = this.nuevoColaborador.departamento;
    return this.modoEdicion && actual && !this.departamentos.includes(actual)
      ? actual
      : '';
  }

  cambiarDepartamento(): void {
    this.puestoSeleccionado = '';
    this.otroPuesto = '';
    this.nuevoColaborador.puesto = '';
  }

  cambiarPuesto(): void {
    if (this.puestoSeleccionado === this.opcionOtroPuesto) {
      this.nuevoColaborador.puesto = this.otroPuesto.trim();
    } else {
      this.otroPuesto = '';
      this.nuevoColaborador.puesto = this.puestoSeleccionado;
    }
  }

  private configurarPuestoEnEdicion(puesto: string): void {
    if (this.puestosDisponibles.includes(puesto)) {
      this.puestoSeleccionado = puesto;
      this.otroPuesto = '';
    } else {
      // Un puesto anterior o personalizado conserva su texto original.
      this.puestoSeleccionado = this.opcionOtroPuesto;
      this.otroPuesto = puesto;
    }
  }

  cargarColaboradores(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.colaboradoresService
      .obtenerColaboradores({
        busqueda:
          this.terminoBusqueda.trim(),

        estado:
          this.filtroEstado,

        departamento:
          this.filtroDepartamento,

        empresa:
          this.filtroEmpresa,

        asignacion:
          this.filtroAsignacion
      })
      .subscribe({
        next: data => {
          this.colaboradores =
            Array.isArray(data)
              ? data
              : [];

          this.cargando = false;
        },

        error: error => {
          console.error(
            'Error al cargar colaboradores:',
            error
          );

          this.errorCarga =
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudieron cargar los colaboradores.';

          this.colaboradores = [];
          this.cargando = false;
        }
      });
  }


  cargarEstadisticas(): void {
    this.colaboradoresService
      .obtenerEstadisticas()
      .subscribe({
        next: data => {
          this.estadisticas = data;
        },

        error: error => {
          console.error(
            'Error al cargar estadísticas:',
            error
          );
        }
      });
  }


  /*
   * Ejecuta la búsqueda 350 milisegundos
   * después de dejar de escribir.
   */
  programarBusqueda(): void {
    if (
      this.temporizadorBusqueda !== null
    ) {
      window.clearTimeout(
        this.temporizadorBusqueda
      );
    }

    this.temporizadorBusqueda =
      window.setTimeout(() => {
        this.cargarColaboradores();

        this.temporizadorBusqueda = null;
      }, 350);
  }


  limpiarBusqueda(): void {
    if (!this.terminoBusqueda) {
      return;
    }

    this.terminoBusqueda = '';
    this.cargarColaboradores();
  }


  /*
   * Convierte las tarjetas KPI en filtros directos.
   */
  seleccionarFiltroKpi(
    filtro: FiltroKpi
  ): void {
    this.filtroKpiSeleccionado = filtro;

    this.filtroEstado = 'Todos';
    this.filtroAsignacion = 'Todos';

    switch (filtro) {
      case 'Activos':
        this.filtroEstado = 'Activo';
        break;

      case 'Con equipos':
        this.filtroAsignacion =
          'Con equipo';
        break;

      case 'Sin equipos':
        this.filtroAsignacion =
          'Sin equipo';
        break;

      case 'Todos':
      default:
        break;
    }

    this.cargarColaboradores();
  }


  /*
   * Se ejecuta cuando cambia un filtro secundario.
   */
  aplicarFiltros(): void {
    this.sincronizarFiltroKpi();
    this.cargarColaboradores();
  }


  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroDepartamento = 'Todos';
    this.filtroEmpresa = 'Todas';
    this.filtroAsignacion = 'Todos';

    this.filtroKpiSeleccionado =
      'Todos';

    this.cargarColaboradores();
  }


  /*
   * Mantiene resaltada la tarjeta KPI correcta
   * cuando los filtros se modifican manualmente.
   */
  private sincronizarFiltroKpi(): void {
    const sinFiltrosSecundarios =
      this.filtroDepartamento === 'Todos' &&
      this.filtroEmpresa === 'Todas';

    if (
      this.filtroEstado === 'Todos' &&
      this.filtroAsignacion === 'Todos' &&
      sinFiltrosSecundarios
    ) {
      this.filtroKpiSeleccionado =
        'Todos';

      return;
    }

    if (
      this.filtroEstado === 'Activo' &&
      this.filtroAsignacion === 'Todos' &&
      sinFiltrosSecundarios
    ) {
      this.filtroKpiSeleccionado =
        'Activos';

      return;
    }

    if (
      this.filtroEstado === 'Todos' &&
      this.filtroAsignacion ===
        'Con equipo' &&
      sinFiltrosSecundarios
    ) {
      this.filtroKpiSeleccionado =
        'Con equipos';

      return;
    }

    if (
      this.filtroEstado === 'Todos' &&
      this.filtroAsignacion ===
        'Sin equipo' &&
      sinFiltrosSecundarios
    ) {
      this.filtroKpiSeleccionado =
        'Sin equipos';

      return;
    }

    this.filtroKpiSeleccionado = null;
  }


  abrirFormulario(): void {
    this.modoEdicion = false;
    this.colaboradorEditandoId = null;

    this.nuevoColaborador =
      this.crearColaboradorVacio();

    this.puestoSeleccionado = '';
    this.otroPuesto = '';
    this.errorFormulario = '';
    this.mensajeExito = '';
    this.mostrarFormulario = true;

    this.desplazarAlFormulario();
  }


  editarColaborador(
    colaborador: Colaborador
  ): void {
    this.modoEdicion = true;

    this.colaboradorEditandoId =
      colaborador.id;

    this.nuevoColaborador = {
      numeroEmpleado:
        colaborador.numeroEmpleado ?? '',

      nombre:
        colaborador.nombre ?? '',

      apellidoPaterno:
        colaborador.apellidoPaterno ?? '',

      apellidoMaterno:
        colaborador.apellidoMaterno ?? '',

      empresa:
        colaborador.empresa ??
        'ELITE BIKE',

      departamento:
        colaborador.departamento ?? '',

      puesto:
        colaborador.puesto ?? '',
      prefijo: colaborador.prefijo ?? '',

      correo:
        colaborador.correo ?? '',

      fechaIngreso:
        colaborador.fechaIngreso ?? '',

      estado:
        colaborador.estado ??
        'Activo',

      comentarios:
        colaborador.comentarios ?? ''
    };

    this.configurarPuestoEnEdicion(this.nuevoColaborador.puesto);
    this.errorFormulario = '';
    this.mensajeExito = '';

    this.mostrarDetalle = false;
    this.colaboradorSeleccionado = null;

    this.mostrarFormulario = true;

    this.desplazarAlFormulario();
  }


  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.modoEdicion = false;

    this.colaboradorEditandoId = null;

    this.guardando = false;
    this.errorFormulario = '';
    this.mensajeExito = '';

    this.nuevoColaborador =
      this.crearColaboradorVacio();
    this.puestoSeleccionado = '';
    this.otroPuesto = '';
  }


  guardarColaborador(): void {
    this.errorFormulario = '';
    this.mensajeExito = '';

    const numeroEmpleado =
      this.nuevoColaborador
        .numeroEmpleado
        ?.trim();

    const nombre =
      this.nuevoColaborador
        .nombre
        ?.trim();

    const apellidoPaterno =
      this.nuevoColaborador
        .apellidoPaterno
        ?.trim();

    const departamento =
      this.nuevoColaborador
        .departamento
        ?.trim();

    const puesto = this.puestoSeleccionado === this.opcionOtroPuesto
      ? this.otroPuesto.trim()
      : this.puestoSeleccionado.trim();


    if (
      !numeroEmpleado ||
      !nombre ||
      !apellidoPaterno ||
      !departamento ||
      !puesto
    ) {
      this.errorFormulario =
        'Completa los campos obligatorios: número de empleado, nombre, apellido paterno, departamento y puesto.';

      return;
    }


    if (puesto.length > 120) {
      this.errorFormulario = 'El puesto debe tener máximo 120 caracteres.';
      return;
    }

    const colaboradorGuardar:
      NuevoColaborador = {
        ...this.nuevoColaborador,

        numeroEmpleado,
        nombre,
        apellidoPaterno,
        departamento,
        puesto,
        prefijo: (this.nuevoColaborador.prefijo || '').trim().toUpperCase(),

        apellidoMaterno:
          this.nuevoColaborador
            .apellidoMaterno
            ?.trim() || '',

        correo:
          this.nuevoColaborador
            .correo
            ?.trim() || '',

        comentarios:
          this.nuevoColaborador
            .comentarios
            ?.trim() || '',

        fechaIngreso:
          this.nuevoColaborador
            .fechaIngreso || '',

        empresa:
          this.nuevoColaborador
            .empresa ||
          'ELITE BIKE',

        estado:
          this.nuevoColaborador
            .estado ||
          'Activo'
      };


    this.guardando = true;


    const solicitud =
      this.modoEdicion &&
      this.colaboradorEditandoId !== null

        ? this.colaboradoresService
            .actualizarColaborador(
              this.colaboradorEditandoId,
              colaboradorGuardar
            )

        : this.colaboradoresService
            .crearColaborador(
              colaboradorGuardar
            );


    solicitud.subscribe({
      next: respuesta => {
        this.guardando = false;

        this.mensajeExito =
          respuesta.message;

        window.setTimeout(() => {
          this.cerrarFormulario();
          this.cargarModulo();
        }, 700);
      },

      error: error => {
        console.error(
          'Error al guardar colaborador:',
          error
        );

        this.guardando = false;

        this.errorFormulario =
          error?.error?.detalle ||
          error?.error?.error ||
          (
            this.modoEdicion
              ? 'No se pudo actualizar el colaborador.'
              : 'No se pudo registrar el colaborador.'
          );
      }
    });
  }


  verColaborador(
    colaborador: Colaborador
  ): void {
    this.mostrarDetalle = true;
    this.cargandoDetalle = true;
    this.errorDetalle = '';

    this.colaboradorSeleccionado = null;

    this.colaboradoresService
      .obtenerColaborador(
        colaborador.id
      )
      .subscribe({
        next: data => {
          this.colaboradorSeleccionado =
            data;

          this.cargandoDetalle = false;
        },

        error: error => {
          console.error(
            'Error al cargar detalle:',
            error
          );

          this.errorDetalle =
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudo cargar el detalle del colaborador.';

          this.cargandoDetalle = false;
        }
      });
  }


  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.cargandoDetalle = false;
    this.errorDetalle = '';

    this.colaboradorSeleccionado = null;
  }


  cambiarEstado(
    colaborador: Colaborador
  ): void {
    const nuevoEstado:
      EstadoColaborador =
      colaborador.estado === 'Activo'
        ? 'Inactivo'
        : 'Activo';

    const accion =
      nuevoEstado === 'Inactivo'
        ? 'desactivar'
        : 'activar';


    const confirmado = window.confirm(
      `¿Deseas ${accion} a ${colaborador.nombreCompleto}?`
    );


    if (!confirmado) {
      return;
    }


    this.cambiandoEstadoId =
      colaborador.id;


    this.colaboradoresService
      .cambiarEstado(
        colaborador.id,
        nuevoEstado
      )
      .subscribe({
        next: () => {
          this.cambiandoEstadoId = null;
          this.cargarModulo();
        },

        error: error => {
          console.error(
            'Error al cambiar estado:',
            error
          );

          this.cambiandoEstadoId = null;

          window.alert(
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudo cambiar el estado del colaborador.'
          );
        }
      });
  }


  obtenerIniciales(
    colaborador: Colaborador
  ): string {
    const inicialNombre =
      colaborador.nombre
        ?.charAt(0)
        .toUpperCase() || '';

    const inicialApellido =
      colaborador.apellidoPaterno
        ?.charAt(0)
        .toUpperCase() || '';

    return (
      inicialNombre +
      inicialApellido
    ) || '--';
  }


  estadoClase(
    estado: string
  ): string {
    return String(
      estado || 'sin-estado'
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


  claseAvatar(
    colaborador: Colaborador
  ): string {
    const variantes = [
      'avatar-orange',
      'avatar-green',
      'avatar-purple',
      'avatar-blue'
    ];

    const identificador =
      Number(colaborador.id) || 0;

    return variantes[
      identificador %
      variantes.length
    ];
  }


  obtenerSiglaPuesto(colaborador: Colaborador): string {
    return colaborador.prefijo || '';
  }


  trackByColaborador(
    indice: number,
    colaborador: Colaborador
  ): number {
    return colaborador.id || indice;
  }


  private crearColaboradorVacio():
    NuevoColaborador {
    return {
      numeroEmpleado: '',
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      empresa: 'ELITE BIKE',
      departamento: '',
      puesto: '',
      prefijo: '',
      correo: '',
      fechaIngreso: '',
      estado: 'Activo',
      comentarios: ''
    };
  }


  private desplazarAlFormulario(): void {
    window.setTimeout(() => {
      document
        .getElementById(
          'formulario-colaborador'
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 0);
  }
}