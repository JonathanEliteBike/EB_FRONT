import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ReporteFila,
  ReportesCatalogos,
  ReportesFiltros,
  ReportesService,
  TipoReporte
} from '../../../../services/inventario/reportes.service';

type DireccionOrden = 'asc' | 'desc';
type TipoColumna = 'texto' | 'numero' | 'fecha' | 'estado' | 'enlace';

interface ColumnaReporte {
  clave: string;
  titulo: string;
  tipo?: TipoColumna;
}

interface OpcionReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  empresas: string[] = [];
  departamentos: string[] = [];

  filtroEmpresa = 'Todas';
  filtroDepartamento = 'Todos';
  filtroEstado = 'Todos';
  fechaInicio = '';
  fechaFin = '';
  terminoBusqueda = '';

  tipoReporteSeleccionado: TipoReporte = 'equipos';
  filasReporte: ReporteFila[] = [];

  cargando = false;
  exportando = false;
  errorCarga = '';
  mensajeExito = '';

  paginaActual = 1;
  registrosPorPagina = 25;
  readonly opcionesPaginacion = [10, 25, 50, 100];

  columnaOrden = '';
  direccionOrden: DireccionOrden = 'asc';

  readonly opcionesReporte: OpcionReporte[] = [
    {
      tipo: 'equipos',
      titulo: 'Equipos',
      descripcion: 'Inventario general, características, responsables y ubicación.',
      icono: '▣'
    },
    {
      tipo: 'asignaciones',
      titulo: 'Asignaciones',
      descripcion: 'Entregas, devoluciones y asignaciones activas o finalizadas.',
      icono: '⇄'
    },
    {
      tipo: 'responsivas',
      titulo: 'Responsivas',
      descripcion: 'Documentos generados, firmados, pendientes y anulados.',
      icono: '▤'
    },
    {
      tipo: 'auditorias',
      titulo: 'Auditorías',
      descripcion: 'Revisiones, avances, diferencias y correcciones pendientes.',
      icono: '◎'
    },
    {
      tipo: 'movimientos',
      titulo: 'Movimientos',
      descripcion: 'Trazabilidad de cambios y acciones realizadas sobre equipos.',
      icono: '↻'
    }
  ];

  readonly estadosPorTipo: Record<TipoReporte, string[]> = {
    equipos: ['Todos', 'Asignado', 'Disponible', 'Baja'],
    asignaciones: ['Todos', 'Activa', 'Finalizada', 'Cancelada'],
    responsivas: ['Todos', 'Pendiente', 'Firmada', 'Anulada'],
    auditorias: ['Todos', 'Planeada', 'En proceso', 'Finalizada', 'Cancelada'],
    movimientos: ['Todos']
  };

  readonly columnasPorTipo: Record<TipoReporte, ColumnaReporte[]> = {
    equipos: [
      { clave: 'inventario', titulo: 'No. inventario' },
      { clave: 'equipo', titulo: 'Equipo' },
      { clave: 'categoria', titulo: 'Categoría' },
      { clave: 'marca', titulo: 'Marca' },
      { clave: 'modelo', titulo: 'Modelo' },
      { clave: 'serie', titulo: 'No. serie' },
      { clave: 'empresa', titulo: 'Empresa' },
      { clave: 'departamento', titulo: 'Departamento' },
      { clave: 'responsable', titulo: 'Responsable' },
      { clave: 'estado', titulo: 'Estado', tipo: 'estado' },
      { clave: 'funcionamiento', titulo: 'Funcionamiento', tipo: 'estado' },
      { clave: 'ubicacion', titulo: 'Ubicación' },
      { clave: 'responsiva', titulo: 'Responsiva', tipo: 'estado' }
    ],
    asignaciones: [
      { clave: 'inventario', titulo: 'No. inventario' },
      { clave: 'equipo', titulo: 'Equipo' },
      { clave: 'colaborador', titulo: 'Colaborador' },
      { clave: 'numero_empleado', titulo: 'No. empleado' },
      { clave: 'puesto', titulo: 'Puesto' },
      { clave: 'empresa', titulo: 'Empresa' },
      { clave: 'departamento', titulo: 'Departamento' },
      { clave: 'fecha_asignacion', titulo: 'Fecha asignación', tipo: 'fecha' },
      { clave: 'fecha_devolucion', titulo: 'Fecha devolución', tipo: 'fecha' },
      { clave: 'estado', titulo: 'Estado', tipo: 'estado' },
      { clave: 'observaciones_entrega', titulo: 'Observaciones entrega' },
      { clave: 'observaciones_devolucion', titulo: 'Observaciones devolución' },
      { clave: 'usuario_registro', titulo: 'Registró' }
    ],
    responsivas: [
      { clave: 'folio', titulo: 'Folio' },
      { clave: 'inventario', titulo: 'No. inventario' },
      { clave: 'equipo', titulo: 'Equipo' },
      { clave: 'responsable', titulo: 'Responsable' },
      { clave: 'empresa', titulo: 'Empresa' },
      { clave: 'departamento', titulo: 'Departamento' },
      { clave: 'estado', titulo: 'Estado', tipo: 'estado' },
      { clave: 'fecha_generacion', titulo: 'Fecha generación', tipo: 'fecha' },
      { clave: 'fecha_firma', titulo: 'Fecha firma', tipo: 'fecha' },
      { clave: 'fecha_anulacion', titulo: 'Fecha anulación', tipo: 'fecha' },
      { clave: 'motivo_anulacion', titulo: 'Motivo anulación' },
      { clave: 'observaciones', titulo: 'Observaciones' },
      { clave: 'archivo_pdf', titulo: 'Documento', tipo: 'enlace' }
    ],
    auditorias: [
      { clave: 'folio', titulo: 'Folio' },
      { clave: 'nombre', titulo: 'Auditoría' },
      { clave: 'tipo', titulo: 'Tipo' },
      { clave: 'empresa', titulo: 'Empresa' },
      { clave: 'departamento', titulo: 'Departamento' },
      { clave: 'ubicacion', titulo: 'Ubicación' },
      { clave: 'fecha_programada', titulo: 'Programada', tipo: 'fecha' },
      { clave: 'fecha_inicio', titulo: 'Inicio', tipo: 'fecha' },
      { clave: 'fecha_finalizacion', titulo: 'Finalización', tipo: 'fecha' },
      { clave: 'estado', titulo: 'Estado', tipo: 'estado' },
      { clave: 'auditor_responsable', titulo: 'Auditor' },
      { clave: 'total_equipos', titulo: 'Total equipos', tipo: 'numero' },
      { clave: 'revisados', titulo: 'Revisados', tipo: 'numero' },
      { clave: 'diferencias', titulo: 'Diferencias', tipo: 'numero' },
      { clave: 'no_localizados', titulo: 'No localizados', tipo: 'numero' },
      { clave: 'correcciones_pendientes', titulo: 'Correcciones pendientes', tipo: 'numero' }
    ],
    movimientos: [
      { clave: 'inventario', titulo: 'No. inventario' },
      { clave: 'equipo', titulo: 'Equipo' },
      { clave: 'empresa', titulo: 'Empresa' },
      { clave: 'departamento', titulo: 'Departamento' },
      { clave: 'tipo_movimiento', titulo: 'Movimiento', tipo: 'estado' },
      { clave: 'descripcion', titulo: 'Descripción' },
      { clave: 'responsable_anterior', titulo: 'Responsable anterior' },
      { clave: 'responsable_nuevo', titulo: 'Responsable nuevo' },
      { clave: 'usuario_registro', titulo: 'Registró' },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' }
    ]
  };

  constructor(private reportesService: ReportesService) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarReporte();
  }

  get opcionActual(): OpcionReporte {
    return this.opcionesReporte.find(
      opcion => opcion.tipo === this.tipoReporteSeleccionado
    ) || this.opcionesReporte[0];
  }

  get columnasActuales(): ColumnaReporte[] {
    return this.columnasPorTipo[this.tipoReporteSeleccionado];
  }

  get estadosDisponibles(): string[] {
    return this.estadosPorTipo[this.tipoReporteSeleccionado];
  }

  get mostrarFiltroEstado(): boolean {
    return this.tipoReporteSeleccionado !== 'movimientos';
  }

  get mostrarFiltrosFecha(): boolean {
    return this.tipoReporteSeleccionado !== 'equipos';
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filasReporte.length / this.registrosPorPagina));
  }

  get filasPaginadas(): ReporteFila[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.filasReporte.slice(inicio, inicio + this.registrosPorPagina);
  }

  get registroInicial(): number {
    if (!this.filasReporte.length) {
      return 0;
    }

    return (this.paginaActual - 1) * this.registrosPorPagina + 1;
  }

  get registroFinal(): number {
    return Math.min(
      this.paginaActual * this.registrosPorPagina,
      this.filasReporte.length
    );
  }

  get cantidadFiltrosActivos(): number {
    return this.etiquetasFiltrosActivos.length;
  }

  get etiquetasFiltrosActivos(): string[] {
    const etiquetas: string[] = [];

    if (this.filtroEmpresa !== 'Todas') {
      etiquetas.push(`Empresa: ${this.filtroEmpresa}`);
    }

    if (this.filtroDepartamento !== 'Todos') {
      etiquetas.push(`Departamento: ${this.filtroDepartamento}`);
    }

    if (this.mostrarFiltroEstado && this.filtroEstado !== 'Todos') {
      etiquetas.push(`Estado: ${this.filtroEstado}`);
    }

    if (this.mostrarFiltrosFecha && this.fechaInicio) {
      etiquetas.push(`Desde: ${this.fechaInicio}`);
    }

    if (this.mostrarFiltrosFecha && this.fechaFin) {
      etiquetas.push(`Hasta: ${this.fechaFin}`);
    }

    if (this.terminoBusqueda.trim()) {
      etiquetas.push(`Búsqueda: ${this.terminoBusqueda.trim()}`);
    }

    return etiquetas;
  }

  cargarCatalogos(): void {
    this.reportesService.obtenerCatalogos().subscribe({
      next: (datos: ReportesCatalogos) => {
        this.empresas = datos.empresas || [];
        this.departamentos = datos.departamentos || [];
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar catálogos de reportes:', error);
      }
    });
  }

  seleccionarReporte(tipo: TipoReporte): void {
    if (this.tipoReporteSeleccionado === tipo) {
      return;
    }

    this.tipoReporteSeleccionado = tipo;
    this.filtroEstado = 'Todos';
    this.paginaActual = 1;
    this.columnaOrden = '';
    this.direccionOrden = 'asc';
    this.filasReporte = [];
    this.cargarReporte();
  }

  cargarReporte(): void {
    if (!this.validarFechas()) {
      return;
    }

    this.cargando = true;
    this.errorCarga = '';
    this.mensajeExito = '';

    this.reportesService.obtenerDetalle(
      this.tipoReporteSeleccionado,
      this.obtenerFiltros()
    ).subscribe({
      next: (filas: ReporteFila[]) => {
        this.filasReporte = Array.isArray(filas) ? filas : [];
        this.paginaActual = 1;
        this.aplicarOrdenActual();
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar el reporte:', error);
        this.errorCarga = this.obtenerMensajeError(
          error,
          'No se pudo cargar el reporte seleccionado.'
        );
        this.filasReporte = [];
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarReporte();
  }

  buscar(): void {
    this.cargarReporte();
  }

  limpiarFiltros(): void {
    this.filtroEmpresa = 'Todas';
    this.filtroDepartamento = 'Todos';
    this.filtroEstado = 'Todos';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.terminoBusqueda = '';
    this.cargarReporte();
  }

  cambiarRegistrosPorPagina(): void {
    this.paginaActual = 1;
  }

  ordenarPor(columna: ColumnaReporte): void {
    if (this.columnaOrden === columna.clave) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrden = columna.clave;
      this.direccionOrden = 'asc';
    }

    this.aplicarOrdenActual();
  }

  indicadorOrden(clave: string): string {
    if (this.columnaOrden !== clave) {
      return '↕';
    }

    return this.direccionOrden === 'asc' ? '↑' : '↓';
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaActual = pagina;
  }

  exportarReporte(): void {
    if (this.exportando || !this.validarFechas()) {
      return;
    }

    this.exportando = true;
    this.errorCarga = '';
    this.mensajeExito = '';

    this.reportesService.exportarReporte(
      this.tipoReporteSeleccionado,
      this.obtenerFiltros()
    ).subscribe({
      next: (archivo: Blob) => {
        if (!archivo || archivo.size === 0) {
          this.errorCarga = 'El archivo generado está vacío.';
          this.exportando = false;
          return;
        }

        const urlTemporal = window.URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        enlace.href = urlTemporal;
        enlace.download = `reporte_${this.tipoReporteSeleccionado}_${fecha}.xlsx`;
        enlace.style.display = 'none';

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(() => window.URL.revokeObjectURL(urlTemporal), 1000);

        this.mensajeExito = 'El reporte se exportó correctamente.';
        this.exportando = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al exportar reporte:', error);
        this.exportando = false;

        if (error.error instanceof Blob) {
          this.leerErrorBlob(error.error);
        } else {
          this.errorCarga = this.obtenerMensajeError(
            error,
            'No se pudo exportar el reporte.'
          );
        }
      }
    });
  }

  imprimirReporte(): void {
    window.print();
  }

  tieneFiltrosActivos(): boolean {
    return this.cantidadFiltrosActivos > 0;
  }

  formatearValor(valor: unknown, columna: ColumnaReporte): string {
    if (valor === null || valor === undefined || valor === '') {
      return 'Sin dato';
    }

    if (columna.tipo === 'fecha' || columna.clave.includes('fecha')) {
      return this.formatearFecha(String(valor));
    }

    if (typeof valor === 'boolean') {
      return valor ? 'Sí' : 'No';
    }

    return String(valor);
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
      hour: fecha.length > 10 ? '2-digit' : undefined,
      minute: fecha.length > 10 ? '2-digit' : undefined
    });
  }

  esEnlace(valor: unknown): boolean {
    return typeof valor === 'string' && /^https?:\/\//i.test(valor.trim());
  }

  abrirEnlace(valor: unknown): void {
    if (this.esEnlace(valor)) {
      window.open(String(valor).trim(), '_blank', 'noopener,noreferrer');
    }
  }

  claseEstado(valor: unknown): string {
    return String(valor || 'sin-estado')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  trackByFila(indice: number, fila: ReporteFila): string | number {
    const id = fila['id'];
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }

    const folio = fila['folio'];
    if (typeof folio === 'string' || typeof folio === 'number') {
      return folio;
    }

    const inventario = fila['inventario'];
    if (typeof inventario === 'string' || typeof inventario === 'number') {
      return inventario;
    }

    return indice;
  }

  private aplicarOrdenActual(): void {
    if (!this.columnaOrden) {
      return;
    }

    const direccion = this.direccionOrden === 'asc' ? 1 : -1;
    const clave = this.columnaOrden;

    this.filasReporte = [...this.filasReporte].sort((a, b) => {
      const valorA = a[clave];
      const valorB = b[clave];

      if (valorA === null || valorA === undefined || valorA === '') {
        return 1;
      }

      if (valorB === null || valorB === undefined || valorB === '') {
        return -1;
      }

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * direccion;
      }

      return String(valorA).localeCompare(String(valorB), 'es', {
        numeric: true,
        sensitivity: 'base'
      }) * direccion;
    });

    this.paginaActual = 1;
  }

  private obtenerFiltros(): ReportesFiltros {
    return {
      empresa: this.filtroEmpresa,
      departamento: this.filtroDepartamento,
      estado: this.mostrarFiltroEstado ? this.filtroEstado : 'Todos',
      fechaInicio: this.mostrarFiltrosFecha ? this.fechaInicio : '',
      fechaFin: this.mostrarFiltrosFecha ? this.fechaFin : '',
      busqueda: this.terminoBusqueda
    };
  }

  private validarFechas(): boolean {
    if (this.fechaInicio && this.fechaFin && this.fechaInicio > this.fechaFin) {
      this.errorCarga = 'La fecha inicial no puede ser posterior a la fecha final.';
      return false;
    }

    return true;
  }

  private obtenerMensajeError(error: HttpErrorResponse, mensaje: string): string {
    return error.error?.detalle || error.error?.error || mensaje;
  }

  private leerErrorBlob(blob: Blob): void {
    const lector = new FileReader();

    lector.onload = () => {
      try {
        const respuesta = JSON.parse(String(lector.result || ''));
        this.errorCarga =
          respuesta.detalle ||
          respuesta.error ||
          'No se pudo exportar el reporte.';
      } catch {
        this.errorCarga = 'No se pudo exportar el reporte.';
      }
    };

    lector.readAsText(blob);
  }
}
