import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FechaInventarioComponent } from '../fecha-inventario/fecha-inventario.component';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ControlCambiosComponent } from '../control-cambios/control-cambios.component';
import { ActividadUsuariosComponent } from '../actividad-usuarios/actividad-usuarios.component';

import {
  HistorialCatalogos,
  HistorialEstadisticas,
  HistorialFiltros,
  HistorialService,
  MovimientoHistorial
} from '../../../../services/inventario/historial.service';


type FiltroTarjetaHistorial =
  | 'Todos'
  | 'Asignación'
  | 'Devolución'
  | 'Otros';


@Component({
  selector: 'app-historial',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ActividadUsuariosComponent,
    ControlCambiosComponent,
    FechaInventarioComponent
  ],

  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit {

  pestanaHistorial: 'control' | 'movimientos' | 'actividad' = 'control';
  private movimientosInicializados = false;

  movimientos: MovimientoHistorial[] = [];

  estadisticas: HistorialEstadisticas = {
    total: 0,
    asignaciones: 0,
    devoluciones: 0,
    otros: 0
  };


  empresasFiltro: string[] = [
    'Todas'
  ];


  terminoBusqueda = '';

  filtroTarjeta: FiltroTarjetaHistorial =
    'Todos';

  filtroTipo = 'Todos';

  filtroEmpresa = 'Todas';

  fechaInicio = '';

  fechaFin = '';


  cargando = false;

  cargandoDetalle = false;

  exportando = false;


  errorCarga = '';

  errorAccion = '';

  mensajeExito = '';


  mostrarDetalle = false;

  movimientoSeleccionado:
    MovimientoHistorial | null = null;


  private solicitudMovimientos = 0;


  constructor(
    private historialService:
      HistorialService,
    private rutaActiva: ActivatedRoute
  ) {}


  ngOnInit(): void {
    const pestana = this.rutaActiva.snapshot.queryParamMap.get('pestana');
    if (pestana === 'movimientos' || pestana === 'actividad' || pestana === 'control') {
      this.pestanaHistorial = pestana;
    }
    if (this.pestanaHistorial === 'movimientos') {
      this.inicializarMovimientos();
    }
  }

  seleccionarPestana(pestana: 'control' | 'movimientos' | 'actividad'): void {
    this.pestanaHistorial = pestana;
    if (pestana === 'movimientos') this.inicializarMovimientos();
  }

  private inicializarMovimientos(): void {
    if (this.movimientosInicializados) return;
    this.movimientosInicializados = true;
    this.cargarCatalogos();
    this.cargarInformacion();
  }


  /*
   * =========================================================
   * CARGA GENERAL
   * =========================================================
   */

  cargarInformacion(): void {
    this.cargarMovimientos();
    this.cargarEstadisticas();
  }


  cargarMovimientos(): void {
    const solicitudActual =
      ++this.solicitudMovimientos;

    this.cargando = true;
    this.errorCarga = '';

    this.historialService
      .obtenerMovimientos(
        this.obtenerFiltros()
      )
      .subscribe({
        next: (
          datos: MovimientoHistorial[]
        ) => {
          if (
            solicitudActual !==
            this.solicitudMovimientos
          ) {
            return;
          }

          const lista =
            Array.isArray(datos)
              ? datos
              : [];

          this.movimientos =
            this.filtroTarjeta === 'Otros'
              ? lista.filter(
                  movimiento =>
                    this.esMovimientoOtro(
                      movimiento.tipoMovimiento
                    )
                )
              : lista;

          this.cargando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          if (
            solicitudActual !==
            this.solicitudMovimientos
          ) {
            return;
          }

          console.error(
            'Error al cargar el historial:',
            error
          );

          this.movimientos = [];

          this.errorCarga =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo cargar el historial de movimientos.';

          this.cargando = false;
        }
      });
  }


  cargarEstadisticas(): void {
    /*
     * Las estadísticas no reciben el filtro de la tarjeta.
     * Así las cuatro tarjetas conservan sus cantidades y
     * siempre pueden utilizarse para cambiar de sección.
     */

    this.historialService
      .obtenerEstadisticas(
        this.obtenerFiltrosEstadisticas()
      )
      .subscribe({
        next: (
          datos: HistorialEstadisticas
        ) => {
          this.estadisticas = {
            total:
              Number(datos?.total) || 0,

            asignaciones:
              Number(datos?.asignaciones) || 0,

            devoluciones:
              Number(datos?.devoluciones) || 0,

            otros:
              Number(datos?.otros) || 0
          };
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar las estadísticas:',
            error
          );

          this.estadisticas = {
            total: 0,
            asignaciones: 0,
            devoluciones: 0,
            otros: 0
          };
        }
      });
  }


  cargarCatalogos(): void {
    this.historialService
      .obtenerCatalogos()
      .subscribe({
        next: (
          datos: HistorialCatalogos
        ) => {
          const empresasUnicas = [
            ...new Set(
              datos.empresas || []
            )
          ];

          this.empresasFiltro = [
            'Todas',
            ...empresasUnicas
          ];
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar los catálogos:',
            error
          );

          this.empresasFiltro = [
            'Todas',
            'ELITE BIKE',
            'GARNIER SPORTS'
          ];
        }
      });
  }


  /*
   * =========================================================
   * TARJETAS FUNCIONALES
   * =========================================================
   */

  seleccionarTarjeta(
    filtro: FiltroTarjetaHistorial
  ): void {
    if (
      this.filtroTarjeta === filtro &&
      !this.cargando
    ) {
      return;
    }

    this.filtroTarjeta = filtro;

    /*
     * "Otros" no se manda directamente al backend porque
     * agrupa edición, baja, cambio de estado, reasignación,
     * entre otros movimientos.
     */

    this.filtroTipo =
      filtro === 'Otros'
        ? 'Todos'
        : filtro;

    this.limpiarMensajes();
    this.cargarInformacion();
  }


  /*
   * =========================================================
   * BÚSQUEDA Y FILTROS
   * =========================================================
   */

  buscar(): void {
    this.limpiarMensajes();
    this.cargarInformacion();
  }


  aplicarFiltros(): void {
    if (
      this.fechaInicio &&
      this.fechaFin &&
      this.fechaInicio > this.fechaFin
    ) {
      this.errorCarga =
        'La fecha inicial no puede ser posterior a la fecha final.';

      return;
    }

    this.limpiarMensajes();
    this.cargarInformacion();
  }


  limpiarFiltros(): void {
    this.terminoBusqueda = '';

    this.filtroTarjeta = 'Todos';

    this.filtroTipo = 'Todos';

    this.filtroEmpresa = 'Todas';

    this.fechaInicio = '';

    this.fechaFin = '';

    this.limpiarMensajes();
    this.cargarInformacion();
  }


  get textoFiltroActivo(): string {
    switch (this.filtroTarjeta) {
      case 'Asignación':
        return 'Mostrando asignaciones';

      case 'Devolución':
        return 'Mostrando devoluciones';

      case 'Otros':
        return 'Mostrando otros cambios';

      default:
        return 'Mostrando todos los movimientos';
    }
  }


  tieneFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda.trim() ||
      this.filtroTarjeta !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.fechaInicio ||
      this.fechaFin
    );
  }


  /*
   * =========================================================
   * DETALLE
   * =========================================================
   */

  verDetalle(
    movimiento: MovimientoHistorial
  ): void {
    this.movimientoSeleccionado =
      movimiento;

    this.mostrarDetalle = true;

    this.cargandoDetalle = true;

    this.errorAccion = '';

    this.historialService
      .obtenerMovimiento(
        movimiento.id
      )
      .subscribe({
        next: (
          detalle: MovimientoHistorial
        ) => {
          this.movimientoSeleccionado =
            detalle;

          this.cargandoDetalle = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al obtener el movimiento:',
            error
          );

          this.errorAccion =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo cargar el detalle completo del movimiento.';

          this.cargandoDetalle = false;
        }
      });
  }


  cerrarDetalle(): void {
    this.mostrarDetalle = false;

    this.movimientoSeleccionado = null;

    this.cargandoDetalle = false;

    this.errorAccion = '';
  }


  /*
   * =========================================================
   * EXPORTACIÓN
   * =========================================================
   */

  exportarHistorial(): void {
    if (this.exportando) {
      return;
    }

    if (
      this.fechaInicio &&
      this.fechaFin &&
      this.fechaInicio > this.fechaFin
    ) {
      this.errorCarga =
        'La fecha inicial no puede ser posterior a la fecha final.';

      return;
    }

    /*
     * El filtro "Otros" se procesa en el frontend.
     * Por eso también se exporta desde el listado visible.
     */

    if (
      this.filtroTarjeta === 'Otros'
    ) {
      this.exportarMovimientosVisibles();
      return;
    }

    this.exportando = true;

    this.errorAccion = '';

    this.mensajeExito = '';

    this.historialService
      .exportarHistorial(
        this.obtenerFiltros()
      )
      .subscribe({
        next: (
          archivo: Blob
        ) => {
          if (
            !archivo ||
            archivo.size === 0
          ) {
            this.errorAccion =
              'El archivo exportado está vacío.';

            this.exportando = false;

            return;
          }

          this.descargarArchivo(
            archivo,
            this.crearNombreExportacion()
          );

          this.exportando = false;

          this.mensajeExito =
            'El historial se exportó correctamente.';
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al exportar historial:',
            error
          );

          this.errorAccion =
            'No se pudo exportar el historial.';

          this.exportando = false;

          if (
            error.error instanceof Blob
          ) {
            this.leerErrorBlob(
              error.error
            );
          } else {
            this.errorAccion =
              error.error?.detalle ||
              error.error?.error ||
              'No se pudo exportar el historial.';
          }
        }
      });
  }


  private exportarMovimientosVisibles(): void {
    if (
      this.movimientos.length === 0
    ) {
      this.errorAccion =
        'No hay movimientos para exportar.';

      return;
    }

    this.exportando = true;

    this.errorAccion = '';

    this.mensajeExito = '';

    const encabezados = [
      'Movimiento',
      'Tipo',
      'Equipo',
      'Inventario',
      'Marca',
      'Modelo',
      'Responsable anterior',
      'Responsable nuevo',
      'Fecha',
      'Usuario',
      'Descripción'
    ];

    const filas =
      this.movimientos.map(
        movimiento => [
          movimiento.folio,
          movimiento.tipoMovimiento,
          movimiento.equipo?.nombre || '',
          movimiento.equipo?.inventario || '',
          movimiento.equipo?.marca || '',
          movimiento.equipo?.modelo || '',
          movimiento.responsableAnterior || '',
          movimiento.responsableNuevo || '',
          this.formatearFecha(
            movimiento.fechaMovimiento
          ),
          movimiento.usuarioRegistro || 'Sistema',
          movimiento.descripcion || ''
        ]
      );

    const contenidoCsv = [
      encabezados,
      ...filas
    ]
      .map(
        fila =>
          fila
            .map(
              valor =>
                this.escaparCsv(
                  String(valor ?? '')
                )
            )
            .join(',')
      )
      .join('\r\n');

    const archivo = new Blob(
      [
        '\uFEFF',
        contenidoCsv
      ],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

    this.descargarArchivo(
      archivo,
      this.crearNombreExportacion()
    );

    this.exportando = false;

    this.mensajeExito =
      'El historial se exportó correctamente.';
  }


  /*
   * =========================================================
   * FUNCIONES PARA LA VISTA
   * =========================================================
   */

  tipoClase(
    tipo: string
  ): string {
    return (
      tipo ||
      'otro'
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
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  obtenerIniciales(
    nombre: string
  ): string {
    if (!nombre?.trim()) {
      return '—';
    }

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        parte =>
          parte
            .charAt(0)
            .toUpperCase()
      )
      .join('');
  }


  trackByMovimiento(
    indice: number,
    movimiento: MovimientoHistorial
  ): number {
    return movimiento.id || indice;
  }


  /*
   * =========================================================
   * FUNCIONES PRIVADAS
   * =========================================================
   */

  private obtenerFiltros():
    HistorialFiltros {
    return {
      busqueda:
        this.terminoBusqueda.trim(),

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
    HistorialFiltros {
    return {
      busqueda:
        this.terminoBusqueda.trim(),

      tipo:
        'Todos',

      empresa:
        this.filtroEmpresa,

      fechaInicio:
        this.fechaInicio,

      fechaFin:
        this.fechaFin
    };
  }


  private esMovimientoOtro(
    tipo: string
  ): boolean {
    const clase =
      this.tipoClase(tipo);

    return (
      clase !== 'asignacion' &&
      clase !== 'devolucion'
    );
  }


  private crearNombreExportacion():
    string {
    const fechaActual =
      new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, '-');

    return (
      `historial_movimientos_${fechaActual}.csv`
    );
  }


  private descargarArchivo(
    archivo: Blob,
    nombre: string
  ): void {
    const urlTemporal =
      window.URL.createObjectURL(
        archivo
      );

    const enlace =
      document.createElement('a');

    enlace.href = urlTemporal;

    enlace.download = nombre;

    enlace.style.display = 'none';

    document.body.appendChild(
      enlace
    );

    enlace.click();

    enlace.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(
        urlTemporal
      );
    }, 1000);
  }


  private escaparCsv(
    valor: string
  ): string {
    return (
      `"${valor.replace(/"/g, '""')}"`
    );
  }


  private leerErrorBlob(
    blob: Blob
  ): void {
    const lector =
      new FileReader();

    lector.onload = () => {
      try {
        const contenido =
          String(
            lector.result || ''
          );

        const respuesta =
          JSON.parse(contenido);

        this.errorAccion =
          respuesta.detalle ||
          respuesta.error ||
          'No se pudo exportar el historial.';
      } catch {
        this.errorAccion =
          'No se pudo exportar el historial.';
      }
    };

    lector.onerror = () => {
      this.errorAccion =
        'No se pudo interpretar la respuesta del servidor.';
    };

    lector.readAsText(blob);
  }


  private limpiarMensajes(): void {
    this.errorCarga = '';

    this.errorAccion = '';

    this.mensajeExito = '';
  }
}