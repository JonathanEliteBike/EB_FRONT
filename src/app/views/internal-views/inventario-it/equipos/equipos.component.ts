import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  EquiposService,
  Equipo,
  NuevoEquipo,
  EstadoEquipo
} from '../../../../services/inventario/equipos.service';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './equipos.component.html',
  styleUrl: './equipos.component.css'
})
export class EquiposComponent implements OnInit {
  terminoBusqueda = '';
  filtroEstado = 'Todos';
  filtroResponsiva = 'Todas';

  cargando = false;
  errorCarga = '';

  mostrarFormulario = false;
  guardando = false;
  errorFormulario = '';
  mensajeExito = '';

  mostrarDetalle = false;
  equipoSeleccionado: Equipo | null = null;

  equipoEditandoId: number | null = null;
  estadoOriginalEdicion: EstadoEquipo | null = null;

  mensajeUrlCopiada = '';

  equipos: Equipo[] = [];

  estadosFiltro: string[] = [
    'Todos',
    'Asignado',
    'Disponible',
    'Baja'
  ];

  responsivasFiltro: string[] = [
    'Todas',
    'Pendiente',
    'Firmada',
    'No aplica'
  ];

  empresas: string[] = [
    'ELITE BIKE',
    'GARNIER SPORTS'
  ];

  categorias: string[] = [
    'EQUIPO DE COMPUTO',
    'ACCESORIOS',
    'DISPOSITIVO E IMPRESORAS',
    'EQUIPO DE VIDEO'
  ];

  funcionamientos: string[] = [
    'Excelente',
    'Bueno',
    'Medio',
    'Bajo',
    'No funciona'
  ];

  estadosRegistro: EstadoEquipo[] = [
    'Disponible',
    'Baja'
  ];

  nuevoEquipo: NuevoEquipo = this.crearEquipoVacio();

  constructor(
    private equiposService: EquiposService
  ) {}

  ngOnInit(): void {
    this.cargarEquipos();
  }

  get modoEdicion(): boolean {
    return this.equipoEditandoId !== null;
  }

  get totalEquipos(): number {
    return this.equipos.length;
  }

  get asignados(): number {
    return this.equipos.filter(
      equipo => equipo.estado === 'Asignado'
    ).length;
  }

  get disponibles(): number {
    return this.equipos.filter(
      equipo => equipo.estado === 'Disponible'
    ).length;
  }

  get bajas(): number {
    return this.equipos.filter(
      equipo => equipo.estado === 'Baja'
    ).length;
  }

  get equiposFiltrados(): Equipo[] {
    const busqueda = this.terminoBusqueda
      .trim()
      .toLowerCase();

    return this.equipos.filter(equipo => {
      const coincideBusqueda =
        !busqueda ||
        equipo.inventario
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.nombre
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.marca
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.modelo
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.serie
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.categoria
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.estado
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.responsable
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.cargo
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.departamento
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.ubicacion
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.funcionamiento
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.responsiva
          ?.toLowerCase()
          .includes(busqueda) ||
        equipo.empresa
          ?.toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        this.filtroEstado === 'Todos' ||
        equipo.estado === this.filtroEstado;

      const coincideResponsiva =
        this.filtroResponsiva === 'Todas' ||
        equipo.responsiva === this.filtroResponsiva;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideResponsiva
      );
    });
  }

  cargarEquipos(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.equiposService.obtenerEquipos().subscribe({
      next: data => {
        this.equipos = data;
        this.cargando = false;
      },

      error: error => {
        console.error(
          'Error al cargar equipos:',
          error
        );

        this.errorCarga =
          'No se pudieron cargar los equipos desde el backend.';

        this.cargando = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroResponsiva = 'Todas';
  }

  estadoClase(estado: string): string {
    return estado
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  responsivaClase(responsiva: string): string {
    return responsiva
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  abrirFormulario(): void {
    this.equipoEditandoId = null;
    this.estadoOriginalEdicion = null;

    this.nuevoEquipo = this.crearEquipoVacio();

    this.errorFormulario = '';
    this.mensajeExito = '';
    this.mostrarFormulario = true;

    this.desplazarAlFormulario();
  }

  editarEquipo(equipo: Equipo): void {
    this.equipoEditandoId = equipo.id;
    this.estadoOriginalEdicion = equipo.estado;

    this.nuevoEquipo = {
      inventario: equipo.inventario ?? '',
      fechaRegistro: equipo.fechaRegistro ?? '',
      empresa: equipo.empresa ?? 'ELITE BIKE',
      departamento: equipo.departamento ?? '',

      responsable:
        equipo.responsable === 'Sin asignar'
          ? ''
          : equipo.responsable ?? '',

      cargo:
        equipo.cargo === 'Sin cargo'
          ? ''
          : equipo.cargo ?? '',

      categoria: equipo.categoria ?? '',
      nombre: equipo.nombre ?? '',
      marca: equipo.marca ?? '',
      modelo: equipo.modelo ?? '',
      serie: equipo.serie ?? '',
      funcionamiento: equipo.funcionamiento ?? 'Bueno',
      estado: equipo.estado ?? 'Disponible',
      ubicacion: equipo.ubicacion ?? '',
      imagenUrl: equipo.imagenUrl ?? '',
      comentariosSistemas:
        equipo.comentariosSistemas ?? '',
      extras: equipo.extras ?? '',
      responsiva: equipo.responsiva ?? 'No aplica'
    };

    this.errorFormulario = '';
    this.mensajeExito = '';
    this.mensajeUrlCopiada = '';

    this.mostrarDetalle = false;
    this.equipoSeleccionado = null;
    this.mostrarFormulario = true;

    this.desplazarAlFormulario();
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.equipoEditandoId = null;
    this.estadoOriginalEdicion = null;
    this.guardando = false;
    this.errorFormulario = '';
    this.mensajeExito = '';

    this.nuevoEquipo = this.crearEquipoVacio();
  }

  verEquipo(equipo: Equipo): void {
    this.mensajeUrlCopiada = '';
    this.equipoSeleccionado = equipo;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.equipoSeleccionado = null;
    this.mensajeUrlCopiada = '';
  }

  async copiarUrlImagen(url?: string): Promise<void> {
    const enlace = url?.trim();

    if (!enlace) {
      return;
    }

    try {
      await navigator.clipboard.writeText(enlace);

      this.mensajeUrlCopiada =
        'Enlace copiado al portapapeles.';
    } catch (error) {
      console.error(
        'No se pudo copiar con Clipboard API:',
        error
      );

      this.copiarUrlConMetodoAlternativo(enlace);
    }

    window.setTimeout(() => {
      this.mensajeUrlCopiada = '';
    }, 2500);
  }

  guardarEquipo(): void {
    this.errorFormulario = '';
    this.mensajeExito = '';

    const inventario =
      this.nuevoEquipo.inventario?.trim();

    const categoria =
      this.nuevoEquipo.categoria?.trim();

    const nombre =
      this.nuevoEquipo.nombre?.trim();

    if (!inventario || !categoria || !nombre) {
      this.errorFormulario =
        'Completa los campos obligatorios: ' +
        'No. inventario, categoría y equipo.';

      return;
    }

    const editando =
      this.equipoEditandoId !== null;

    const equipoGuardar: NuevoEquipo = {
      ...this.nuevoEquipo,
      inventario,
      categoria,
      nombre,
      fechaRegistro:
        this.nuevoEquipo.fechaRegistro || ''
    };

    /*
     * Los datos de asignación solamente se limpian
     * al registrar un equipo nuevo.
     *
     * Durante la edición se conservan los datos actuales.
     */
    if (!editando) {
      equipoGuardar.departamento = '';
      equipoGuardar.responsable = '';
      equipoGuardar.cargo = '';
      equipoGuardar.responsiva = 'No aplica';

      if (!equipoGuardar.estado) {
        equipoGuardar.estado = 'Disponible';
      }
    }

    this.guardando = true;

    const solicitud = editando
      ? this.equiposService.actualizarEquipo(
          this.equipoEditandoId as number,
          equipoGuardar
        )
      : this.equiposService.crearEquipo(
          equipoGuardar
        );

    solicitud.subscribe({
      next: respuesta => {
        console.log(respuesta.message);

        this.guardando = false;
        this.cerrarFormulario();
        this.cargarEquipos();
      },

      error: error => {
        console.error(
          editando
            ? 'Error al actualizar equipo:'
            : 'Error al registrar equipo:',
          error
        );

        this.guardando = false;

        this.errorFormulario =
          error?.error?.detalle ||
          error?.error?.error ||
          (
            editando
              ? 'No se pudo actualizar el equipo.'
              : 'No se pudo registrar el equipo.'
          );
      }
    });
  }

  private crearEquipoVacio(): NuevoEquipo {
    return {
      inventario: '',
      fechaRegistro: '',
      empresa: 'ELITE BIKE',
      departamento: '',
      responsable: '',
      cargo: '',
      categoria: '',
      nombre: '',
      marca: '',
      modelo: '',
      serie: '',
      funcionamiento: 'Bueno',
      estado: 'Disponible',
      ubicacion: '',
      imagenUrl: '',
      comentariosSistemas: '',
      extras: '',
      responsiva: 'No aplica'
    };
  }

  private desplazarAlFormulario(): void {
    window.setTimeout(() => {
      document
        .getElementById('formulario-equipo')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 0);
  }

  private copiarUrlConMetodoAlternativo(
    enlace: string
  ): void {
    const textarea =
      document.createElement('textarea');

    textarea.value = enlace;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const copiado =
      document.execCommand('copy');

    document.body.removeChild(textarea);

    this.mensajeUrlCopiada = copiado
      ? 'Enlace copiado al portapapeles.'
      : 'No se pudo copiar el enlace.';
  }
}