import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import { jwtDecode } from 'jwt-decode';
import {
  Component,
  HostListener,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  RouterModule
} from '@angular/router';

import {
  AsignacionesService,
  Asignacion,
  NuevaAsignacion,
  FinalizarAsignacion,
  EstadisticasAsignaciones,
  ColaboradorCatalogo,
  EquipoCatalogo
} from '../../../../services/inventario/asignaciones.service';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FechaInventarioComponent
  ],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.css'
})
export class AsignacionesComponent implements OnInit {
  asignaciones: Asignacion[] = [];

  colaboradores: ColaboradorCatalogo[] = [];
  equipos: EquipoCatalogo[] = [];

  departamentos: string[] = [
    'OPERACIONES',
    'ADMINISTRACIÓN',
    'TIENDA'
  ];

  empresas: string[] = [
    'ELITE BIKE',
    'GARNIER SPORTS'
  ];

  terminoBusqueda = '';
  filtroEstado = 'Todas';
  filtroDepartamento = 'Todos';
  filtroEmpresa = 'Todas';

  cargando = false;
  errorCarga = '';

  mostrarFormulario = false;
  guardando = false;
  errorFormulario = '';
  mensajeExito = '';

  mostrarDetalle = false;
  cargandoDetalle = false;
  errorDetalle = '';
  asignacionSeleccionada: Asignacion | null = null;

  mostrarDevolucion = false;
  finalizando = false;
  errorDevolucion = '';
  mensajeDevolucion = '';
  asignacionFinalizar: Asignacion | null = null;

  colaboradorSeleccionado:
    ColaboradorCatalogo | null = null;

  equipoSeleccionado:
    EquipoCatalogo | null = null;

  estadisticas: EstadisticasAsignaciones = {
    total: 0,
    activas: 0,
    finalizadas: 0,
    canceladas: 0,
    equiposDisponibles: 0,
    colaboradoresConEquipo: 0
  };

  nuevaAsignacion: NuevaAsignacion =
    this.crearAsignacionVacia();

  datosDevolucion: FinalizarAsignacion =
    this.crearDevolucionVacia();

  private temporizadorBusqueda: number | null = null;

  constructor(
    private asignacionesService:
      AsignacionesService
  ) {}

  ngOnInit(): void {
    this.cargarModulo();
  }

  @HostListener('document:keydown.escape')
  cerrarVentanaConEscape(): void {
    if (this.mostrarDevolucion) {
      this.cerrarDevolucion();
      return;
    }

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
      this.terminoBusqueda ||
      this.filtroEstado !== 'Todas' ||
      this.filtroDepartamento !== 'Todos' ||
      this.filtroEmpresa !== 'Todas'
    );
  }

  cargarModulo(): void {
    this.cargarAsignaciones();
    this.cargarEstadisticas();
    this.cargarCatalogos();
  }

  cargarAsignaciones(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.asignacionesService
      .obtenerAsignaciones({
        busqueda: this.terminoBusqueda.trim(),
        estado: this.filtroEstado,
        departamento: this.filtroDepartamento,
        empresa: this.filtroEmpresa
      })
      .subscribe({
        next: data => {
          this.asignaciones = data || [];
          this.cargando = false;
        },

        error: error => {
          console.error(
            'Error al cargar asignaciones:',
            error
          );

          this.errorCarga =
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudieron cargar las asignaciones.';

          this.cargando = false;
        }
      });
  }

  cargarEstadisticas(): void {
    this.asignacionesService
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

  cargarCatalogos(): void {
    this.asignacionesService
      .obtenerCatalogos()
      .subscribe({
        next: data => {
          this.colaboradores =
            data.colaboradores || [];

          this.equipos =
            data.equipos || [];
        },

        error: error => {
          console.error(
            'Error al cargar catálogos:',
            error
          );
        }
      });
  }

  seleccionarEstado(
    estado: 'Todas' | 'Activa' | 'Finalizada' | 'Cancelada'
  ): void {
    this.filtroEstado = estado;
    this.cargarAsignaciones();
  }

  programarBusqueda(): void {
    if (this.temporizadorBusqueda !== null) {
      window.clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = window.setTimeout(() => {
      this.cargarAsignaciones();
      this.temporizadorBusqueda = null;
    }, 350);
  }

  aplicarFiltros(): void {
    this.cargarAsignaciones();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todas';
    this.filtroDepartamento = 'Todos';
    this.filtroEmpresa = 'Todas';

    this.cargarAsignaciones();
  }

  abrirFormulario(): void {
    this.nuevaAsignacion =
      this.crearAsignacionVacia();

    this.colaboradorSeleccionado = null;
    this.equipoSeleccionado = null;

    this.errorFormulario = '';
    this.mensajeExito = '';
    this.mostrarFormulario = true;

    window.setTimeout(() => {
      document
        .getElementById('formulario-asignacion')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 0);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.guardando = false;
    this.errorFormulario = '';
    this.mensajeExito = '';

    this.nuevaAsignacion =
      this.crearAsignacionVacia();

    this.colaboradorSeleccionado = null;
    this.equipoSeleccionado = null;
  }

  cambiarColaborador(): void {
    this.colaboradorSeleccionado =
      this.colaboradores.find(
        colaborador =>
          colaborador.id ===
          Number(this.nuevaAsignacion.colaboradorId)
      ) || null;
  }

  cambiarEquipo(): void {
    this.equipoSeleccionado =
      this.equipos.find(
        equipo =>
          equipo.id ===
          Number(this.nuevaAsignacion.equipoId)
      ) || null;
  }

  guardarAsignacion(): void {
    this.errorFormulario = '';
    this.mensajeExito = '';

    if (
      !this.nuevaAsignacion.colaboradorId ||
      !this.nuevaAsignacion.equipoId
    ) {
      this.errorFormulario =
        'Selecciona un colaborador y un equipo disponible.';

      return;
    }

    this.guardando = true;

    this.asignacionesService
      .crearAsignacion(this.nuevaAsignacion)
      .subscribe({
        next: respuesta => {
          this.guardando = false;
          this.mensajeExito = respuesta.message;

          window.setTimeout(() => {
            this.cerrarFormulario();
            this.cargarModulo();
          }, 700);
        },

        error: error => {
          console.error(
            'Error al crear asignación:',
            error
          );

          this.guardando = false;

          this.errorFormulario =
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudo crear la asignación.';
        }
      });
  }

  verAsignacion(
    asignacion: Asignacion
  ): void {
    this.mostrarDetalle = true;
    this.cargandoDetalle = true;
    this.errorDetalle = '';
    this.asignacionSeleccionada = null;

    this.asignacionesService
      .obtenerAsignacion(asignacion.id)
      .subscribe({
        next: data => {
          this.asignacionSeleccionada = data;
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
            'No se pudo cargar la asignación.';

          this.cargandoDetalle = false;
        }
      });
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.cargandoDetalle = false;
    this.errorDetalle = '';
    this.asignacionSeleccionada = null;
  }

  abrirDevolucion(
    asignacion: Asignacion
  ): void {
    this.asignacionFinalizar = asignacion;
    this.datosDevolucion =
      this.crearDevolucionVacia();

    this.errorDevolucion = '';
    this.mensajeDevolucion = '';
    this.mostrarDevolucion = true;
  }

  cerrarDevolucion(): void {
    this.mostrarDevolucion = false;
    this.finalizando = false;
    this.errorDevolucion = '';
    this.mensajeDevolucion = '';
    this.asignacionFinalizar = null;

    this.datosDevolucion =
      this.crearDevolucionVacia();
  }

  finalizarAsignacion(): void {
    if (!this.asignacionFinalizar) {
      return;
    }

    this.errorDevolucion = '';
    this.mensajeDevolucion = '';
    this.finalizando = true;

    this.asignacionesService
      .finalizarAsignacion(
        this.asignacionFinalizar.id,
        this.datosDevolucion
      )
      .subscribe({
        next: respuesta => {
          this.finalizando = false;
          this.mensajeDevolucion = respuesta.message;

          window.setTimeout(() => {
            this.cerrarDevolucion();
            this.cargarModulo();
          }, 700);
        },

        error: error => {
          console.error(
            'Error al finalizar asignación:',
            error
          );

          this.finalizando = false;

          this.errorDevolucion =
            error?.error?.detalle ||
            error?.error?.error ||
            'No se pudo finalizar la asignación.';
        }
      });
  }

  estadoClase(
    estado: string
  ): string {
    return (estado || 'sin-estado')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  textoDiasAsignado(
    asignacion: Asignacion
  ): string {
    const fechaInicio = new Date(
      asignacion.fechaAsignacion
    );

    if (Number.isNaN(fechaInicio.getTime())) {
      return 'Sin fecha';
    }

    const asignacionExtendida =
      asignacion as unknown as {
        fechaDevolucion?: string | null;
      };

    const fechaFin =
      asignacionExtendida.fechaDevolucion
        ? new Date(asignacionExtendida.fechaDevolucion)
        : new Date();

    const diferencia =
      fechaFin.getTime() - fechaInicio.getTime();

    const dias = Math.max(
      Math.floor(diferencia / 86400000),
      0
    );

    return `${dias} día${dias === 1 ? '' : 's'}`;
  }

  trackByAsignacion(
    _indice: number,
    asignacion: Asignacion
  ): number {
    return asignacion.id;
  }

  obtenerFechaActual(): string {
    const ahora = new Date();

    const año = ahora.getFullYear();

    const mes = String(
      ahora.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      ahora.getDate()
    ).padStart(2, '0');

    const horas = String(
      ahora.getHours()
    ).padStart(2, '0');

    const minutos = String(
      ahora.getMinutes()
    ).padStart(2, '0');

    return `${año}-${mes}-${dia}T${horas}:${minutos}`;
  }

  // Nombre únicamente para mostrarlo en el formulario.
  // El servidor determina quién registró la operación usando el JWT validado.
  private obtenerUsuarioSesion(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const datos = jwtDecode<{ nombre?: string; usuario?: string }>(token);
      return datos.nombre || datos.usuario || '';
    } catch {
      return '';
    }
  }

  private crearAsignacionVacia():
    NuevaAsignacion {
    return {
      equipoId: null,
      colaboradorId: null,
      fechaAsignacion:
        this.obtenerFechaActual(),
      observacionesEntrega: '',
      usuarioRegistro: this.obtenerUsuarioSesion()
    };
  }

  private crearDevolucionVacia():
    FinalizarAsignacion {
    return {
      fechaDevolucion:
        this.obtenerFechaActual(),
      observacionesDevolucion: '',
      usuarioRegistro: this.obtenerUsuarioSesion()
    };
  }
}