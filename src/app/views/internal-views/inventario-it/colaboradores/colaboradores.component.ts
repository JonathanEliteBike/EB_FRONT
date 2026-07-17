import {
  Component,
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

interface PuestoCatalogo {
  sigla: string;
  nombre: string;
}

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './colaboradores.component.html',
  styleUrl: './colaboradores.component.css'
})
export class ColaboradoresComponent
implements OnInit {
  colaboradores: Colaborador[] = [];

  empresas: string[] = [
    'ELITE BIKE',
    'GARNIER SPORTS'
  ];

  departamentos: string[] = [
    'OPERACIONES',
    'ADMINISTRACIÓN',
    'TIENDA'
  ];

  estados: EstadoColaborador[] = [
    'Activo',
    'Inactivo'
  ];

  puestos: PuestoCatalogo[] = [
    {
      sigla: 'DG',
      nombre: 'Dirección General'
    },
    {
      sigla: 'GG',
      nombre: 'Gerencia General'
    },
    {
      sigla: 'GO',
      nombre: 'Gerente de Operaciones'
    },
    {
      sigla: 'AO',
      nombre: 'Auxiliar de Operaciones'
    },
    {
      sigla: 'ELEI',
      nombre: 'Ejecutivo de Logística e Importaciones'
    },
    {
      sigla: 'CA',
      nombre: 'Coordinador de Almacenes'
    },
    {
      sigla: 'AA-A',
      nombre: 'Auxiliar de Almacén A'
    },
    {
      sigla: 'AA-B',
      nombre: 'Auxiliar de Almacén B'
    },
    {
      sigla: 'CGC',
      nombre: 'Contador General Comercializadora'
    },
    {
      sigla: 'CG',
      nombre: 'Contador General'
    },
    {
      sigla: 'AC',
      nombre: 'Auxiliar Contable'
    },
    {
      sigla: 'BPC',
      nombre: 'Ejecutivo de Banca y Pagos'
    },
    {
      sigla: 'AS-A',
      nombre: 'Auxiliar de Sistemas A'
    },
    {
      sigla: 'AS-B',
      nombre: 'Auxiliar de Sistemas B'
    },
    {
      sigla: 'AS-C',
      nombre: 'Auxiliar de Sistemas C'
    },
    {
      sigla: 'CRH',
      nombre: 'Coordinador de Recursos Humanos'
    },
    {
      sigla: 'APA',
      nombre: 'Analista de Procesos / Auditor'
    },
    {
      sigla: 'AUX-APA',
      nombre: 'Auxiliar de Procesos / APA'
    },
    {
      sigla: 'CMKT',
      nombre: 'Coordinador de Mercadotecnia'
    },
    {
      sigla: 'SMM',
      nombre: 'Social Media Manager'
    },
    {
      sigla: 'DIS',
      nombre: 'Diseñador Gráfico'
    },
    {
      sigla: 'EVAC-A',
      nombre: 'Ejecutivo de Eventos y Atención al Cliente A'
    },
    {
      sigla: 'EVAC-B',
      nombre: 'Ejecutivo de Eventos y Atención al Cliente B'
    },
    {
  sigla: 'CS',
  nombre: 'Coordinador de Sucursal'
},
{
  sigla: 'MEC-A',
  nombre: 'Mecánico A'
},
{
  sigla: 'MEC-B',
  nombre: 'Mecánico B'
}
    
  ];

  terminoBusqueda = '';
  filtroEstado = 'Todos';
  filtroDepartamento = 'Todos';
  filtroEmpresa = 'Todas';
  filtroAsignacion = 'Todos';

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
  colaboradorSeleccionado: Colaborador | null = null;

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

  constructor(
    private colaboradoresService:
      ColaboradoresService
  ) {}

  ngOnInit(): void {
    this.cargarModulo();
  }

  get hayFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda ||
      this.filtroEstado !== 'Todos' ||
      this.filtroDepartamento !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.filtroAsignacion !== 'Todos'
    );
  }

  cargarModulo(): void {
    this.cargarColaboradores();
    this.cargarEstadisticas();
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
          this.colaboradores = data;
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

  aplicarFiltros(): void {
    this.cargarColaboradores();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroDepartamento = 'Todos';
    this.filtroEmpresa = 'Todas';
    this.filtroAsignacion = 'Todos';

    this.cargarColaboradores();
  }

  abrirFormulario(): void {
    this.modoEdicion = false;
    this.colaboradorEditandoId = null;

    this.nuevoColaborador =
      this.crearColaboradorVacio();

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
        colaborador.empresa ?? 'ELITE BIKE',

      departamento:
        colaborador.departamento ?? '',

      puesto:
        colaborador.puesto ?? '',

      correo:
        colaborador.correo ?? '',

      fechaIngreso:
        colaborador.fechaIngreso ?? '',

      estado:
        colaborador.estado ?? 'Activo',

      comentarios:
        colaborador.comentarios ?? ''
    };

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

    const puesto =
      this.nuevoColaborador
        .puesto
        ?.trim();

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

    const colaboradorGuardar:
      NuevoColaborador = {
        ...this.nuevoColaborador,

        numeroEmpleado,
        nombre,
        apellidoPaterno,
        departamento,
        puesto,

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
            .empresa || 'ELITE BIKE',

        estado:
          this.nuevoColaborador
            .estado || 'Activo'
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
    );
  }

  estadoClase(
    estado: string
  ): string {
    return estado
      .toLowerCase()
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

    return variantes[
      colaborador.id %
      variantes.length
    ];
  }

  obtenerSiglaPuesto(
    nombrePuesto: string
  ): string {
    const puestoEncontrado =
      this.puestos.find(
        puesto =>
          puesto.nombre === nombrePuesto
      );

    return puestoEncontrado?.sigla || '';
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