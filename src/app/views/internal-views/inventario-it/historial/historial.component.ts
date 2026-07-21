import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  HistorialCatalogos,
  HistorialEstadisticas,
  HistorialFiltros,
  HistorialService,
  MovimientoHistorial
} from '../../../../services/inventario/historial.service';


@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit {
  movimientos: MovimientoHistorial[] = [];

  estadisticas: HistorialEstadisticas = {
    total: 0,
    asignaciones: 0,
    devoluciones: 0,
    otros: 0
  };

  tiposFiltro: string[] = ['Todos'];
  empresasFiltro: string[] = ['Todas'];

  terminoBusqueda = '';
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
  movimientoSeleccionado: MovimientoHistorial | null = null;

  constructor(private historialService: HistorialService) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarInformacion();
  }


  cargarInformacion(): void {
    this.cargarMovimientos();
    this.cargarEstadisticas();
  }


  cargarMovimientos(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.historialService.obtenerMovimientos(this.obtenerFiltros()).subscribe({
      next: (datos: MovimientoHistorial[]) => {
        this.movimientos = datos;
        this.cargando = false;
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar el historial:', error);

        this.errorCarga =
          error.error?.detalle ||
          error.error?.error ||
          'No se pudo cargar el historial de movimientos.';

        this.cargando = false;
      }
    });
  }


  cargarEstadisticas(): void {
    this.historialService.obtenerEstadisticas(this.obtenerFiltros()).subscribe({
      next: (datos: HistorialEstadisticas) => {
        this.estadisticas = datos;
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar las estadísticas:', error);

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
    this.historialService.obtenerCatalogos().subscribe({
      next: (datos: HistorialCatalogos) => {
        const tiposUnicos = [...new Set(datos.tipos || [])];
        const empresasUnicas = [...new Set(datos.empresas || [])];

        this.tiposFiltro = ['Todos', ...tiposUnicos];
        this.empresasFiltro = ['Todas', ...empresasUnicas];
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar los catálogos:', error);

        this.tiposFiltro = [
          'Todos',
          'Asignación',
          'Devolución',
          'Reasignación',
          'Cambio de estado',
          'Baja',
          'Edición'
        ];

        this.empresasFiltro = [
          'Todas',
          'ELITE BIKE',
          'GARNIER SPORTS'
        ];
      }
    });
  }


  buscar(): void {
    this.limpiarMensajes();
    this.cargarInformacion();
  }


  seleccionarTipo(tipo: string): void {
    this.filtroTipo = tipo;
    this.limpiarMensajes();
    this.cargarInformacion();
  }


  aplicarFiltros(): void {
    if (this.fechaInicio && this.fechaFin && this.fechaInicio > this.fechaFin) {
      this.errorCarga = 'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }

    this.limpiarMensajes();
    this.cargarInformacion();
  }


  limpiarFiltros(): void {
    this.terminoBusqueda = '';
    this.filtroTipo = 'Todos';
    this.filtroEmpresa = 'Todas';
    this.fechaInicio = '';
    this.fechaFin = '';

    this.limpiarMensajes();
    this.cargarInformacion();
  }


  verDetalle(movimiento: MovimientoHistorial): void {
    this.movimientoSeleccionado = movimiento;
    this.mostrarDetalle = true;
    this.cargandoDetalle = true;
    this.errorAccion = '';

    this.historialService.obtenerMovimiento(movimiento.id).subscribe({
      next: (detalle: MovimientoHistorial) => {
        this.movimientoSeleccionado = detalle;
        this.cargandoDetalle = false;
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener el movimiento:', error);

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


  exportarHistorial(): void {
    if (this.exportando) {
      return;
    }

    if (this.fechaInicio && this.fechaFin && this.fechaInicio > this.fechaFin) {
      this.errorCarga = 'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }

    this.exportando = true;
    this.errorAccion = '';
    this.mensajeExito = '';

    this.historialService.exportarHistorial(this.obtenerFiltros()).subscribe({
      next: (archivo: Blob) => {
        if (!archivo || archivo.size === 0) {
          this.errorAccion = 'El archivo exportado está vacío.';
          this.exportando = false;
          return;
        }

        const urlTemporal = window.URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        const fechaActual = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, '-');

        enlace.href = urlTemporal;
        enlace.download = `historial_movimientos_${fechaActual}.csv`;
        enlace.style.display = 'none';

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(() => {
          window.URL.revokeObjectURL(urlTemporal);
        }, 1000);

        this.exportando = false;
        this.mensajeExito = 'El historial se exportó correctamente.';
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error al exportar historial:', error);

        this.errorAccion = 'No se pudo exportar el historial.';
        this.exportando = false;

        if (error.error instanceof Blob) {
          this.leerErrorBlob(error.error);
        } else {
          this.errorAccion =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo exportar el historial.';
        }
      }
    });
  }


  tipoClase(tipo: string): string {
    return (tipo || 'otro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
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
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  obtenerIniciales(nombre: string): string {
    if (!nombre?.trim()) {
      return '—';
    }

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(parte => parte.charAt(0).toUpperCase())
      .join('');
  }


  tieneFiltrosActivos(): boolean {
    return Boolean(
      this.terminoBusqueda ||
      this.filtroTipo !== 'Todos' ||
      this.filtroEmpresa !== 'Todas' ||
      this.fechaInicio ||
      this.fechaFin
    );
  }


  private obtenerFiltros(): HistorialFiltros {
    return {
      busqueda: this.terminoBusqueda,
      tipo: this.filtroTipo,
      empresa: this.filtroEmpresa,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    };
  }


  private leerErrorBlob(blob: Blob): void {
    const lector = new FileReader();

    lector.onload = () => {
      try {
        const contenido = String(lector.result || '');
        const respuesta = JSON.parse(contenido);

        this.errorAccion =
          respuesta.detalle ||
          respuesta.error ||
          'No se pudo exportar el historial.';
      } catch {
        this.errorAccion = 'No se pudo exportar el historial.';
      }
    };

    lector.readAsText(blob);
  }


  private limpiarMensajes(): void {
    this.errorCarga = '';
    this.errorAccion = '';
    this.mensajeExito = '';
  }
}