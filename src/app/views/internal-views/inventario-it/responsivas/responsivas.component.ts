import { CommonModule } from '@angular/common';
import {
  HttpErrorResponse
} from '@angular/common/http';
import {
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  Responsiva,
  ResponsivasEstadisticas,
  ResponsivasService
} from '../../../../services/inventario/responsivas.service';

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
export class ResponsivasComponent implements OnInit {
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

  terminoBusqueda = '';
  filtroEstado = 'Todos';

  cargando = false;
  procesando = false;
  descargandoId: number | null = null;

  errorCarga = '';
  mensajeExito = '';
  errorAccion = '';

  mostrarDetalle = false;
  mostrarFirma = false;
  mostrarAnulacion = false;

  responsivaSeleccionada:
    Responsiva | null = null;

  formularioFirma = {
    archivoPdf: '',
    observaciones: ''
  };

  motivoAnulacion = '';

  constructor(
    private responsivasService:
      ResponsivasService
  ) {}

  ngOnInit(): void {
    this.cargarInformacion();
  }

  cargarInformacion(): void {
    this.cargarResponsivas();
    this.cargarEstadisticas();
  }

  cargarResponsivas(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.responsivasService
      .obtenerResponsivas(
        this.terminoBusqueda,
        this.filtroEstado
      )
      .subscribe({
        next: (
          datos: Responsiva[]
        ) => {
          this.responsivas = datos;
          this.cargando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar responsivas:',
            error
          );

          this.errorCarga =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudieron cargar las responsivas.';

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
          this.estadisticas = datos;
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

  buscar(): void {
    this.cargarResponsivas();
  }

  seleccionarEstado(
    estado: string
  ): void {
    this.filtroEstado = estado;
    this.cargarResponsivas();
  }

  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroEstado = 'Todos';
    this.cargarResponsivas();
  }

  verDetalle(
    responsiva: Responsiva
  ): void {
    this.responsivaSeleccionada =
      responsiva;

    this.mostrarDetalle = true;
    this.limpiarMensajes();
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.responsivaSeleccionada = null;
    this.errorAccion = '';
  }

  abrirFirma(
    responsiva: Responsiva
  ): void {
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
    this.mostrarFirma = false;

    this.formularioFirma = {
      archivoPdf: '',
      observaciones: ''
    };

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
          this.responsivaSeleccionada = null;

          this.formularioFirma = {
            archivoPdf: '',
            observaciones: ''
          };

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
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo firmar la responsiva.';

          this.procesando = false;
        }
      });
  }

  abrirAnulacion(
    responsiva: Responsiva
  ): void {
    this.responsivaSeleccionada =
      responsiva;

    this.motivoAnulacion = '';
    this.mostrarAnulacion = true;
    this.limpiarMensajes();
  }

  cerrarAnulacion(): void {
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
          this.responsivaSeleccionada = null;

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
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo anular la responsiva.';

          this.procesando = false;
        }
      });
  }

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

          const nombreArchivo =
            `${folio || `responsiva-${id}`}.pdf`;

          enlace.href = urlTemporal;
          enlace.download = nombreArchivo;
          enlace.style.display = 'none';

          document.body.appendChild(enlace);
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

          this.errorAccion =
            'No se pudo descargar la responsiva.';

          this.descargandoId = null;

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
              'No se pudo descargar la responsiva.';
          }
        }
      });
  }

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

    window.open(
      documento,
      '_blank',
      'noopener,noreferrer'
    );
  }

  estadoClase(
    estado: string
  ): string {
    return (estado || '')
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
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
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
          String(lector.result || '');

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

    lector.readAsText(blob);
  }

  private limpiarMensajes(): void {
    this.errorAccion = '';
    this.mensajeExito = '';
  }
}