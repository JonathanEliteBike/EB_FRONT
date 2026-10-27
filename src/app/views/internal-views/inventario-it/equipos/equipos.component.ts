import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

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
    FormsModule,
    FechaInventarioComponent
  ],
  templateUrl: './equipos.component.html',
  styleUrl: './equipos.component.css'
})
export class EquiposComponent implements OnInit {
  terminoBusqueda = '';
  filtroEstado = 'Todos';
  filtroResponsiva = 'Todas';
  filtroEmpresa = 'Todas';
  filtroCategoria = 'Todas';

  cargando = false;
  errorCarga = '';
  avisoEquipoVinculado = '';

  mostrarFormulario = false;
  guardando = false;
  errorFormulario = '';
  mensajeExito = '';
  folioRecienGenerado = '';

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

  ubicacionesFisicas: string[] = [
    'Almacen',
    'Oficina',
    'Tienda'
  ];

  estadosRegistro: EstadoEquipo[] = [
    'Disponible',
    'Baja'
  ];

  nuevoEquipo: NuevoEquipo = this.crearEquipoVacio();

  constructor(
    private equiposService: EquiposService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.aplicarFiltrosDeRuta();
    this.cargarEquipos();
    this.abrirEquipoDesdeAuditoria();
  }

  get modoEdicion(): boolean {
    return this.equipoEditandoId !== null;
  }

  /*
   * Las tarjetas se calculan con los filtros de búsqueda,
   * empresa, categoría y responsiva, pero sin aplicar el estado.
   *
   * Así cada tarjeta conserva el total correcto de su estado
   * y funciona como filtro principal.
   */
  get equiposBaseParaTarjetas(): Equipo[] {
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

      const coincideEmpresa =
        this.filtroEmpresa === 'Todas' ||
        equipo.empresa === this.filtroEmpresa;

      const coincideCategoria =
        this.filtroCategoria === 'Todas' ||
        equipo.categoria === this.filtroCategoria;

      const coincideResponsiva =
        this.filtroResponsiva === 'Todas' ||
        equipo.responsiva === this.filtroResponsiva;

      return (
        coincideBusqueda &&
        coincideEmpresa &&
        coincideCategoria &&
        coincideResponsiva
      );
    });
  }

  get totalEquipos(): number {
    return this.equiposBaseParaTarjetas.length;
  }

  get asignados(): number {
    return this.equiposBaseParaTarjetas.filter(
      equipo => equipo.estado === 'Asignado'
    ).length;
  }

  get disponibles(): number {
    return this.equiposBaseParaTarjetas.filter(
      equipo => equipo.estado === 'Disponible'
    ).length;
  }

  get bajas(): number {
    return this.equiposBaseParaTarjetas.filter(
      equipo => equipo.estado === 'Baja'
    ).length;
  }

  get equiposFiltrados(): Equipo[] {
    return this.equiposBaseParaTarjetas.filter(
      equipo =>
        this.filtroEstado === 'Todos' ||
        equipo.estado === this.filtroEstado
    );
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

  /** Abre exclusivamente el ID real indicado por Control y auditoría. */
  private abrirEquipoDesdeAuditoria(): void {
    const valor = this.route.snapshot.queryParamMap.get('equipoId');
    if (valor === null) return;
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) {
      this.avisoEquipoVinculado = 'El enlace de auditoría contiene un identificador de equipo inválido.';
      return;
    }
    this.equiposService.obtenerEquipo(id).subscribe({
      next: equipo => {
        if (equipo?.id === id) this.verEquipo(equipo);
        else this.avisoEquipoVinculado = 'El equipo solicitado no coincide con el identificador del movimiento.';
      },
      error: () => {
        this.avisoEquipoVinculado = `No fue posible abrir el equipo #${id}. No se seleccionó ningún otro equipo.`;
      }
    });
  }

  seleccionarEstado(estado: string): void {
    if (!this.estadosFiltro.includes(estado)) {
      return;
    }

    this.filtroEstado = estado;
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroResponsiva = 'Todas';
    this.filtroEmpresa = 'Todas';
    this.filtroCategoria = 'Todas';
  }

  estadoClase(estado: string): string {
    return (estado || 'sin-estado')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  responsivaClase(responsiva: string): string {
    return (responsiva || 'no-aplica')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  normalizarCampoTexto(
    campo: 'nombre' | 'marca'
  ): void {
    if (campo === 'nombre') {
      this.nuevoEquipo.nombre =
        this.normalizarTextoTitulo(
          this.nuevoEquipo.nombre
        );

      return;
    }

    this.nuevoEquipo.marca =
      this.normalizarTextoTitulo(
        this.nuevoEquipo.marca
      );
  }

  abrirFormulario(): void {
    this.equipoEditandoId = null;
    this.estadoOriginalEdicion = null;
    this.nuevoEquipo = this.crearEquipoVacio();
    this.folioRecienGenerado = '';

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
      fechaRegistro:
        equipo.fechaRegistro || this.obtenerFechaActual(),
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
      ubicacion: this.normalizarUbicacion(
        equipo.ubicacion
      ),
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
      this.normalizarTextoTitulo(
        this.nuevoEquipo.nombre
      );

    const marca =
      this.normalizarTextoTitulo(
        this.nuevoEquipo.marca
      );

    const ubicacion =
      this.normalizarUbicacion(
        this.nuevoEquipo.ubicacion
      );

    const editando =
      this.equipoEditandoId !== null;

    if ((editando && !inventario) || !categoria || !nombre) {
      this.errorFormulario = editando
        ? 'Completa el número de inventario, categoría y equipo.'
        : 'Completa los campos obligatorios: categoría y equipo.';
      return;
    }

    const equipoGuardar: NuevoEquipo = {
      ...this.nuevoEquipo,
      inventario: editando ? (inventario || '') : '',
      categoria,
      nombre,
      marca,
      ubicacion,
      fechaRegistro:
        this.nuevoEquipo.fechaRegistro ||
        this.obtenerFechaActual()
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
        this.guardando = false;
        this.cerrarFormulario();
        if (!editando && respuesta.inventario) {
          this.folioRecienGenerado = respuesta.inventario;
          this.terminoBusqueda = respuesta.inventario;
          this.filtroEstado = 'Todos';
          this.filtroResponsiva = 'Todas';
          this.filtroEmpresa = 'Todas';
          this.filtroCategoria = 'Todas';
        }
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

  trackByEquipo(
    indice: number,
    equipo: Equipo
  ): number {
    return equipo.id ?? indice;
  }

  private aplicarFiltrosDeRuta(): void {
    const parametros =
      this.route.snapshot.queryParamMap;

    const estado = parametros.get('estado');
    const responsiva = parametros.get('responsiva');
    const empresa = parametros.get('empresa');
    const categoria = parametros.get('categoria');

    if (
      estado &&
      this.estadosFiltro.includes(estado)
    ) {
      this.filtroEstado = estado;
    }

    if (
      responsiva &&
      this.responsivasFiltro.includes(responsiva)
    ) {
      this.filtroResponsiva = responsiva;
    }

    if (
      empresa &&
      this.empresas.includes(empresa)
    ) {
      this.filtroEmpresa = empresa;
    }

    if (
      categoria &&
      this.categorias.includes(categoria)
    ) {
      this.filtroCategoria = categoria;
    }
  }

  private normalizarTextoTitulo(
    valor?: string | null
  ): string {
    const texto = (valor || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!texto) {
      return '';
    }

    const acronimos: Record<string, string> = {
      ti: 'TI',
      it: 'IT',
      pc: 'PC',
      usb: 'USB',
      ssd: 'SSD',
      hdd: 'HDD',
      ram: 'RAM',
      cpu: 'CPU',
      ups: 'UPS',
      hp: 'HP',
      led: 'LED',
      lcd: 'LCD',
      hdmi: 'HDMI',
      vga: 'VGA',
      wifi: 'WiFi'
    };

    return texto
      .split(' ')
      .map(palabra => {
        const clave = palabra.toLowerCase();

        if (acronimos[clave]) {
          return acronimos[clave];
        }

        return (
          clave.charAt(0).toUpperCase() +
          clave.slice(1)
        );
      })
      .join(' ');
  }

  private normalizarUbicacion(
    valor?: string | null
  ): string {
    const clave = (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    if (!clave) {
      return '';
    }

    if (clave.includes('almacen')) {
      return 'Almacen';
    }

    if (clave.includes('oficina')) {
      return 'Oficina';
    }

    if (clave.includes('tienda')) {
      return 'Tienda';
    }

    return '';
  }

  private crearEquipoVacio(): NuevoEquipo {
    return {
      inventario: '',
      fechaRegistro: this.obtenerFechaActual(),
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

  private obtenerFechaActual(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1)
      .padStart(2, '0');
    const dia = String(fecha.getDate())
      .padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
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