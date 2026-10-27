import {
  CommonModule
} from '@angular/common';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import { switchMap, tap, throwError } from 'rxjs';

import {
  ActivatedRoute, RouterLink
} from '@angular/router';

import {
  Responsiva,
  ResponsivasEstadisticas,
  ResponsivasService
} from '../../../../services/inventario/responsivas.service';


interface FormularioFirma {
  archivoPdf: string;
  observaciones: string;
}


@Component({
  selector: 'app-responsivas',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl: './responsivas.component.html',
  styleUrl: './responsivas.component.css'
})
export class ResponsivasComponent
implements OnInit, OnDestroy {

  /*
   * =========================================================
   * LISTADO Y ESTADÍSTICAS
   * =========================================================
   */

  responsivas: Responsiva[] = [];


  estadisticas: ResponsivasEstadisticas = {
    total: 0,
    pendientes: 0,
    firmadas: 0,
    anuladas: 0
  };


  estadosFiltro: string[] = [
    'Todos',
    'Pendiente',
    'Firmada',
    'Anulada'
  ];


  /*
   * =========================================================
   * FILTROS
   * =========================================================
   */

  terminoBusqueda = '';

  filtroEstado = 'Todos';


  /*
   * =========================================================
   * ESTADOS DE CARGA
   * =========================================================
   */

  cargando = false;

  procesando = false;

  descargandoId: number | null = null;


  /*
   * =========================================================
   * MENSAJES
   * =========================================================
   */

  errorCarga = '';
  avisoResponsivaVinculada = '';

  mensajeExito = '';

  errorAccion = '';


  /*
   * =========================================================
   * MODALES
   * =========================================================
   */

  mostrarDetalle = false;

  // La edición no modifica la firma ni los demás datos del documento.
  editandoEnlace = false;
  enlaceResponsivaEditado = '';

  mostrarFirma = false;

  mostrarAnulacion = false;
  mostrarRestauracion = false;


  responsivaSeleccionada:
    Responsiva | null = null;


  /*
   * =========================================================
   * FORMULARIO DE FIRMA
   * =========================================================
   */

  formularioFirma: FormularioFirma = {
    archivoPdf: '',
    observaciones: ''
  };


  motivoAnulacion = '';


  /*
   * Temporizador utilizado para búsqueda automática.
   * Puede usarse desde el HTML con:
   * (input)="programarBusqueda()"
   */

  private temporizadorBusqueda:
    number | null = null;


  constructor(
    private responsivasService: ResponsivasService,
    private route: ActivatedRoute
  ) {}


  /*
   * =========================================================
   * CICLO DE VIDA
   * =========================================================
   */

  ngOnInit(): void {
    this.cargarInformacion();
    this.abrirResponsivaDesdeAuditoria();
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
   * Cierra el modal visible al presionar Escape.
   */

  @HostListener(
    'document:keydown.escape'
  )
  cerrarModalConEscape(): void {
    if (
      this.procesando ||
      this.descargandoId !== null
    ) {
      return;
    }

    if (this.mostrarDetalle) {
      if (this.editandoEnlace) {
        this.cancelarEdicionEnlace();
      } else {
        this.cerrarDetalle();
      }
      return;
    }

    if (this.mostrarFirma) {
      this.cerrarFirma();
      return;
    }

    if (this.mostrarAnulacion) {
      this.cerrarAnulacion();
      return;
    }

    if (this.mostrarRestauracion) {
      this.cerrarRestauracion();
    }
  }


  /*
   * =========================================================
   * CARGA GENERAL
   * =========================================================
   */

  /** Solo abre la responsiva exacta, no una búsqueda aproximada por folio. */
  private abrirResponsivaDesdeAuditoria(): void {
    const valor = this.route.snapshot.queryParamMap.get('responsivaId');
    if (valor === null) return;
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) {
      this.avisoResponsivaVinculada = 'El identificador de responsiva del enlace no es válido.';
      return;
    }
    this.responsivasService.obtenerResponsiva(id).subscribe({
      next: resp => {
        if (resp?.id === id) this.verDetalle(resp);
        else this.avisoResponsivaVinculada = 'El documento recibido no corresponde al movimiento seleccionado.';
      },
      error: () => {
        this.avisoResponsivaVinculada = `No fue posible abrir la responsiva #${id}. No se seleccionó otro documento.`;
      }
    });
  }

  cargarInformacion(): void {
    this.cargarResponsivas();
    this.cargarEstadisticas();
  }


  cargarResponsivas(): void {
    this.cargando = true;
    this.errorCarga = '';

    const busqueda =
      this.terminoBusqueda.trim();

    this.responsivasService
      .obtenerResponsivas(
        busqueda,
        this.filtroEstado
      )
      .subscribe({
        next: (
          datos: Responsiva[]
        ) => {
          this.responsivas =
            Array.isArray(datos)
              ? datos
              : [];

          this.cargando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar responsivas:',
            error
          );

          this.responsivas = [];

          this.errorCarga =
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar las responsivas.'
            );

          this.cargando = false;
        }
      });
  }


  cargarEstadisticas(): void {
    this.responsivasService
      .obtenerEstadisticas()
      .subscribe({
        next: (
          datos: ResponsivasEstadisticas
        ) => {
          this.estadisticas = {
            total:
              Number(datos?.total) || 0,

            pendientes:
              Number(datos?.pendientes) || 0,

            firmadas:
              Number(datos?.firmadas) || 0,

            anuladas:
              Number(datos?.anuladas) || 0
          };
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar estadísticas:',
            error
          );
        }
      });
  }


  /*
   * =========================================================
   * BÚSQUEDA Y FILTROS
   * =========================================================
   */

  buscar(): void {
    if (
      this.temporizadorBusqueda !== null
    ) {
      window.clearTimeout(
        this.temporizadorBusqueda
      );

      this.temporizadorBusqueda = null;
    }

    this.cargarResponsivas();
  }


  /*
   * Permite cambiar el buscador a actualización automática.
   * Ejecuta la consulta 350 ms después de dejar de escribir.
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
        this.cargarResponsivas();

        this.temporizadorBusqueda = null;
      }, 350);
  }


  limpiarBusqueda(): void {
    if (!this.terminoBusqueda) {
      return;
    }

    this.terminoBusqueda = '';
    this.cargarResponsivas();
  }


  seleccionarEstado(
    estado: string
  ): void {
    if (
      !estado ||
      this.filtroEstado === estado
    ) {
      return;
    }

    this.filtroEstado = estado;
    this.cargarResponsivas();
  }


  /*
   * Permite usar las tarjetas estadísticas como filtros.
   *
   * Ejemplo en HTML:
   * (click)="seleccionarEstadoDesdeKpi('Pendiente')"
   */

  seleccionarEstadoDesdeKpi(
    estado: string
  ): void {
    this.filtroEstado = estado;
    this.cargarResponsivas();
  }


  limpiarFiltros(): void {
    if (
      this.temporizadorBusqueda !== null
    ) {
      window.clearTimeout(
        this.temporizadorBusqueda
      );

      this.temporizadorBusqueda = null;
    }

    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';

    this.cargarResponsivas();
  }


  /*
   * =========================================================
   * MODAL DE DETALLE
   * =========================================================
   */

  verDetalle(
    responsiva: Responsiva
  ): void {
    this.cerrarTodosLosModales();

    this.responsivaSeleccionada =
      responsiva;

    this.mostrarDetalle = true;

    this.limpiarMensajes();
  }


  cerrarDetalle(): void {
    if (this.descargandoId !== null || this.procesando) {
      return;
    }

    this.mostrarDetalle = false;
    this.responsivaSeleccionada = null;
    this.editandoEnlace = false;
    this.enlaceResponsivaEditado = '';
    this.errorAccion = '';
  }


  /* =========================================================
   * CORRECCIÓN DEL ENLACE DE UNA RESPONSIVA YA FIRMADA
   * ========================================================= */

  iniciarEdicionEnlace(): void {
    const responsiva = this.responsivaSeleccionada;
    if (!responsiva || responsiva.estado !== 'Firmada' || this.procesando || this.descargandoId !== null) {
      return;
    }

    this.enlaceResponsivaEditado = responsiva.archivoPdf || '';
    this.editandoEnlace = true;
    this.limpiarMensajes();
  }

  cancelarEdicionEnlace(): void {
    if (this.procesando) return;
    this.editandoEnlace = false;
    this.enlaceResponsivaEditado = '';
    this.errorAccion = '';
  }

  guardarEdicionEnlace(): void {
    const responsiva = this.responsivaSeleccionada;
    if (!this.editandoEnlace || !responsiva || this.procesando || this.descargandoId !== null) {
      return;
    }
    if (responsiva.estado !== 'Firmada') {
      this.errorAccion = 'Solo se puede corregir el enlace de una responsiva firmada.';
      return;
    }

    const enlaceNuevo = this.enlaceResponsivaEditado.trim();
    if (!enlaceNuevo || !this.esUrlValida(enlaceNuevo)) {
      this.errorAccion = 'Ingresa un enlace válido que comience con https:// o http://.';
      return;
    }
    if (enlaceNuevo.length > 2048) {
      this.errorAccion = 'El enlace no puede superar los 2048 caracteres.';
      return;
    }
    if (enlaceNuevo === (responsiva.archivoPdf || '').trim()) {
      this.errorAccion = 'El enlace nuevo es igual al que ya está registrado.';
      return;
    }

    this.procesando = true;
    this.limpiarMensajes();
    let antesDeGuardar: Responsiva | null = null;
    let servidorAceptoActualizacion = false;

    // Volvemos a consultar para evitar sobrescribir una corrección hecha en otra sesión.
    this.responsivasService.obtenerResponsiva(responsiva.id).pipe(
      switchMap(actual => {
        if (actual.estado !== 'Firmada') {
          return throwError(() => new Error('La responsiva ya no está firmada. Actualiza la página.'));
        }
        if ((actual.archivoPdf || '').trim() !== (responsiva.archivoPdf || '').trim()) {
          return throwError(() => new Error('El enlace fue modificado en otra sesión. Cierra el detalle y vuelve a abrirlo.'));
        }
        antesDeGuardar = actual;
        // El endpoint existente requiere observaciones: enviamos el valor actual sin cambiarlo.
        return this.responsivasService.actualizarResponsiva(actual.id, {
          archivoPdf: enlaceNuevo,
          observaciones: actual.observaciones || ''
        }).pipe(
          tap(() => { servidorAceptoActualizacion = true; }),
          switchMap(() => this.responsivasService.obtenerResponsiva(actual.id))
        );
      })
    ).subscribe({
      next: actualizada => {
        this.procesando = false;
        this.responsivaSeleccionada = actualizada;
        this.responsivas = this.responsivas.map(item =>
          item.id === actualizada.id ? actualizada : item
        );

        const original = antesDeGuardar;
        const camposIntactos = !!original &&
          actualizada.folio === original.folio &&
          actualizada.estado === 'Firmada' &&
          actualizada.fechaGeneracion === original.fechaGeneracion &&
          actualizada.fechaFirma === original.fechaFirma &&
          actualizada.equipoId === original.equipoId &&
          actualizada.colaboradorId === original.colaboradorId &&
          actualizada.asignacionId === original.asignacionId &&
          actualizada.observaciones === original.observaciones;

        this.cargarInformacion();
        if ((actualizada.archivoPdf || '').trim() !== enlaceNuevo || !camposIntactos) {
          this.editandoEnlace = false;
          this.enlaceResponsivaEditado = '';
          this.errorAccion = 'El servidor respondió, pero no se confirmó que el enlace y el resto de los datos se hayan conservado correctamente. Revisa la responsiva antes de continuar.';
          return;
        }

        this.editandoEnlace = false;
        this.enlaceResponsivaEditado = '';
        this.mensajeExito = 'Enlace corregido y verificado. Se conservaron el folio, la firma y los datos del equipo.';
      },
      error: (error: HttpErrorResponse | Error) => {
        this.procesando = false;
        if (servidorAceptoActualizacion) {
          this.errorAccion = 'El servidor aceptó la actualización, pero no fue posible verificarla. Vuelve a consultar esta responsiva antes de intentar guardar otra vez.';
          this.cargarInformacion();
          return;
        }
        this.errorAccion = error instanceof HttpErrorResponse
          ? this.obtenerMensajeError(error, 'No fue posible corregir el enlace de la responsiva.')
          : (error.message || 'No fue posible corregir el enlace.');
      }
    });
  }


  /*
   * =========================================================
   * MODAL DE FIRMA
   * =========================================================
   */

  abrirFirma(
    responsiva: Responsiva
  ): void {
    this.cerrarTodosLosModales();

    this.responsivaSeleccionada =
      responsiva;

    this.formularioFirma = {
      archivoPdf:
        responsiva.archivoPdf || '',

      observaciones:
        responsiva.observaciones || ''
    };

    this.mostrarFirma = true;

    this.limpiarMensajes();
  }


  cerrarFirma(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarFirma = false;

    this.formularioFirma =
      this.crearFormularioFirmaVacio();

    this.responsivaSeleccionada = null;

    this.errorAccion = '';

    this.procesando = false;
  }


  guardarFirma(): void {
    const responsiva =
      this.responsivaSeleccionada;

    if (!responsiva) {
      this.errorAccion =
        'No se seleccionó una responsiva.';

      return;
    }


    const archivoPdf =
      this.formularioFirma
        .archivoPdf
        .trim();


    const observaciones =
      this.formularioFirma
        .observaciones
        .trim();


    if (!archivoPdf) {
      this.errorAccion =
        'Ingresa la URL de la responsiva firmada.';

      return;
    }


    if (
      !this.esUrlValida(archivoPdf)
    ) {
      this.errorAccion =
        'Ingresa una URL válida para la responsiva firmada.';

      return;
    }


    this.procesando = true;

    this.errorAccion = '';

    this.mensajeExito = '';


    this.responsivasService
      .firmarResponsiva(
        responsiva.id,
        {
          archivoPdf,
          observaciones
        }
      )
      .subscribe({
        next: () => {
          this.procesando = false;

          this.mostrarFirma = false;

          this.responsivaSeleccionada =
            null;

          this.formularioFirma =
            this.crearFormularioFirmaVacio();

          this.mensajeExito =
            'La responsiva fue marcada como firmada.';

          this.cargarInformacion();
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al firmar responsiva:',
            error
          );

          this.errorAccion =
            this.obtenerMensajeError(
              error,
              'No se pudo firmar la responsiva.'
            );

          this.procesando = false;
        }
      });
  }


  /*
   * =========================================================
   * MODAL DE ANULACIÓN
   * =========================================================
   */

  abrirAnulacion(
    responsiva: Responsiva
  ): void {
    this.cerrarTodosLosModales();

    this.responsivaSeleccionada =
      responsiva;

    this.motivoAnulacion = '';

    this.mostrarAnulacion = true;

    this.limpiarMensajes();
  }


  cerrarAnulacion(): void {
    if (this.procesando) {
      return;
    }

    this.mostrarAnulacion = false;

    this.motivoAnulacion = '';

    this.responsivaSeleccionada = null;

    this.errorAccion = '';

    this.procesando = false;
  }


  confirmarAnulacion(): void {
    const responsiva =
      this.responsivaSeleccionada;

    if (!responsiva) {
      this.errorAccion =
        'No se seleccionó una responsiva.';

      return;
    }


    const motivo =
      this.motivoAnulacion.trim();


    if (!motivo) {
      this.errorAccion =
        'Debes indicar el motivo de anulación.';

      return;
    }


    if (motivo.length < 5) {
      this.errorAccion =
        'El motivo de anulación debe contener al menos 5 caracteres.';

      return;
    }


    this.procesando = true;

    this.errorAccion = '';

    this.mensajeExito = '';


    this.responsivasService
      .anularResponsiva(
        responsiva.id,
        motivo
      )
      .subscribe({
        next: () => {
          this.procesando = false;

          this.mostrarAnulacion = false;

          this.motivoAnulacion = '';

          this.responsivaSeleccionada =
            null;

          this.mensajeExito =
            'La responsiva fue anulada correctamente.';

          this.cargarInformacion();
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al anular responsiva:',
            error
          );

          this.errorAccion =
            this.obtenerMensajeError(
              error,
              'No se pudo anular la responsiva.'
            );

          this.procesando = false;
        }
      });
  }


  /* =========================================================
   * RESTAURACIÓN DE RESPONSIVAS ANULADAS
   * ========================================================= */

  abrirRestauracion(responsiva: Responsiva): void {
    if (responsiva.estado !== 'Anulada' || this.procesando) return;
    this.cerrarTodosLosModales();
    this.responsivaSeleccionada = responsiva;
    this.mostrarRestauracion = true;
    this.limpiarMensajes();
  }

  cerrarRestauracion(): void {
    if (this.procesando) return;
    this.mostrarRestauracion = false;
    this.responsivaSeleccionada = null;
    this.errorAccion = '';
  }

  confirmarRestauracion(): void {
    const seleccionada = this.responsivaSeleccionada;
    if (!seleccionada || seleccionada.estado !== 'Anulada' || this.procesando) return;

    this.procesando = true;
    this.limpiarMensajes();

    // La API verifica la asignación activa y evita restaurar duplicados.
    this.responsivasService.restaurarResponsiva(seleccionada.id).pipe(
      switchMap(() => this.responsivasService.obtenerResponsiva(seleccionada.id))
    ).subscribe({
      next: actualizada => {
        this.procesando = false;
        this.mostrarRestauracion = false;
        this.responsivaSeleccionada = null;
        this.responsivas = this.responsivas.map(registro =>
          registro.id === actualizada.id ? actualizada : registro
        );
        this.cargarInformacion();

        const estadoEsperado = seleccionada.fechaFirma ? 'Firmada' : 'Pendiente';
        if (actualizada.estado !== estadoEsperado || actualizada.folio !== seleccionada.folio ||
            actualizada.fechaFirma !== seleccionada.fechaFirma ||
            actualizada.archivoPdf !== seleccionada.archivoPdf) {
          this.errorAccion = 'La restauración fue procesada, pero la verificación encontró diferencias. Revisa el detalle antes de continuar.';
          return;
        }
        this.mensajeExito = `Responsiva ${actualizada.folio} restaurada a ${actualizada.estado}, con su documento y folio originales.`;
      },
      error: (error: HttpErrorResponse) => {
        this.procesando = false;
        this.errorAccion = this.obtenerMensajeError(
          error,
          'No fue posible restaurar la responsiva.'
        );
        // Si la petición se procesó y falló la lectura, la lista permite verificar el estado.
        this.cargarInformacion();
      }
    });
  }

  /*
   * =========================================================
   * DESCARGA DEL PDF
   * =========================================================
   */

  descargarResponsiva(
    id: number,
    folio: string
  ): void {
    if (
      !id ||
      this.descargandoId !== null
    ) {
      return;
    }


    this.descargandoId = id;

    this.errorAccion = '';

    this.mensajeExito = '';


    this.responsivasService
      .descargarPdf(id)
      .subscribe({
        next: (
          archivo: Blob
        ) => {
          if (
            !archivo ||
            archivo.size === 0
          ) {
            this.errorAccion =
              'El backend devolvió un PDF vacío.';

            this.descargandoId = null;

            return;
          }


          const urlTemporal =
            window.URL.createObjectURL(
              archivo
            );


          const enlace =
            document.createElement('a');


          const folioSeguro =
            this.limpiarNombreArchivo(
              folio ||
              `responsiva-${id}`
            );


          const nombreArchivo =
            `${folioSeguro}.pdf`;


          enlace.href = urlTemporal;

          enlace.download =
            nombreArchivo;

          enlace.style.display =
            'none';


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


          this.descargandoId = null;

          this.mensajeExito =
            'La responsiva se descargó correctamente.';
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al descargar PDF:',
            error
          );

          this.descargandoId = null;

          if (
            error.error instanceof Blob
          ) {
            this.leerErrorBlob(
              error.error
            );

            return;
          }

          this.errorAccion =
            this.obtenerMensajeError(
              error,
              'No se pudo descargar la responsiva.'
            );
        }
      });
  }


  /*
   * =========================================================
   * APERTURA DEL DOCUMENTO FIRMADO
   * =========================================================
   */

  abrirDocumento(
    url: string
  ): void {
    const documento =
      url?.trim();

    if (!documento) {
      this.errorAccion =
        'La responsiva no tiene un documento firmado registrado.';

      return;
    }


    if (
      !this.esUrlValida(documento)
    ) {
      this.errorAccion =
        'El enlace del documento firmado no es válido.';

      return;
    }


    const ventana =
      window.open(
        documento,
        '_blank',
        'noopener,noreferrer'
      );


    if (!ventana) {
      this.errorAccion =
        'El navegador bloqueó la apertura del documento. Permite las ventanas emergentes e inténtalo nuevamente.';
    }
  }


  /*
   * =========================================================
   * FUNCIONES PARA LA VISTA
   * =========================================================
   */

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


  formatearFecha(
    fecha?: string | null
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
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  trackByResponsiva(
    indice: number,
    responsiva: Responsiva
  ): number {
    return responsiva.id || indice;
  }


  /*
   * =========================================================
   * FUNCIONES PRIVADAS
   * =========================================================
   */

  private crearFormularioFirmaVacio():
    FormularioFirma {
    return {
      archivoPdf: '',
      observaciones: ''
    };
  }


  private cerrarTodosLosModales(): void {
    this.mostrarDetalle = false;
    this.editandoEnlace = false;
    this.enlaceResponsivaEditado = '';

    this.mostrarFirma = false;

    this.mostrarAnulacion = false;
    this.mostrarRestauracion = false;

    this.responsivaSeleccionada =
      null;

    this.formularioFirma =
      this.crearFormularioFirmaVacio();

    this.motivoAnulacion = '';

    this.errorAccion = '';

    this.procesando = false;
  }


  private limpiarMensajes(): void {
    this.errorAccion = '';

    this.mensajeExito = '';
  }


  private esUrlValida(
    valor: string
  ): boolean {
    try {
      const url =
        new URL(valor);

      return (
        url.protocol === 'http:' ||
        url.protocol === 'https:'
      );
    } catch {
      return false;
    }
  }


  private limpiarNombreArchivo(
    nombre: string
  ): string {
    const nombreLimpio =
      String(nombre || 'responsiva')
        .trim()
        .replace(
          /[<>:"/\\|?*\u0000-\u001F]/g,
          '-'
        )
        .replace(/\s+/g, '_');

    return (
      nombreLimpio ||
      'responsiva'
    );
  }


  private obtenerMensajeError(
    error: HttpErrorResponse,
    mensajePredeterminado: string
  ): string {
    return (
      error.error?.detalle ||
      error.error?.error ||
      error.message ||
      mensajePredeterminado
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
          'No se pudo descargar la responsiva.';
      } catch {
        this.errorAccion =
          'No se pudo descargar la responsiva.';
      }
    };


    lector.onerror = () => {
      this.errorAccion =
        'No se pudo interpretar la respuesta del servidor.';
    };


    lector.readAsText(blob);
  }
}