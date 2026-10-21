import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlCambiosService, ResumenControlCambios } from '../../../../services/inventario/control-cambios.service';
import { RouterLink } from '@angular/router';

import {
  DashboardCatalogos,
  DashboardFiltros,
  DashboardInventarioData,
  DashboardInventarioService,
  DetalleDashboardFila,
  DistribucionDashboard,
  MovimientoDashboard,
  TendenciaDashboard,
  TipoDetalleDashboard
} from '../../../../services/inventario/dashboard-inventario.service';

type TipoDistribucion = 'categoria' | 'empresa' | 'departamento';

type TipoCeldaDetalle = 'texto' | 'fecha' | 'estado';

interface ColumnaDetalle {
  clave: string;
  titulo: string;
  tipo?: TipoCeldaDetalle;
}

interface ConfiguracionDetalle {
  tipo: TipoDetalleDashboard;
  estado: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  columnas: ColumnaDetalle[];
}


interface AlertaDashboard {
  clase: 'warning' | 'danger' | 'info';
  titulo: string;
  descripcion: string;
  ruta: string;
  boton: string;
  queryParams?: Record<string, string>;
}

interface EstadoInventarioItem {
  etiqueta: string;
  total: number;
  clase: string;
}

interface IndicadorOperativo {
  etiqueta: string;
  porcentaje: number;
  detalle: string;
  clase: string;
}

@Component({
  selector: 'app-dashboard-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './dashboard-inventario.component.html',
  styleUrl: './dashboard-inventario.component.css'
})
export class DashboardInventarioComponent implements OnInit {
  dashboard: DashboardInventarioData = this.crearDashboardVacio();
  controlMensual: ResumenControlCambios = {total: 0, pendientes: 0, validados: 0, observados: 0};
  controlMensualCargando = false;
  controlMensualError = '';
  periodoControlEtiqueta = new Intl.DateTimeFormat('es-MX', {month: 'long', year: 'numeric'}).format(new Date());

  empresas: string[] = [];
  departamentos: string[] = [];
  estados: string[] = [
    'Todos',
    'Asignado',
    'Disponible',
    'Baja'
  ];

  filtroEmpresa = 'Todas';
  filtroDepartamento = 'Todos';
  filtroEstado = 'Todos';

  tipoDistribucion: TipoDistribucion = 'categoria';

  cargando = false;
  errorCarga = '';
  ultimaActualizacion = '';

  mostrarDetalle = false;
  cargandoDetalle = false;
  errorDetalle = '';
  filasDetalle: DetalleDashboardFila[] = [];
  configuracionDetalle: ConfiguracionDetalle | null = null;


  constructor(
    private dashboardService: DashboardInventarioService,
    private controlCambiosService: ControlCambiosService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDashboard();
    this.cargarControlMensual();
  }


  @HostListener('document:keydown.escape')
  cerrarModalConEscape(): void {
    if (this.mostrarDetalle) {
      this.cerrarDetalle();
    }
  }

  cargarControlMensual(): void {
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    this.controlMensualCargando = true;
    this.controlMensualError = '';
    this.controlCambiosService.resumen(`${mes}-01`, `${mes}-${String(ultimoDia).padStart(2, '0')}`)
      .subscribe({
        next: datos => { this.controlMensual = datos.resumen; this.controlMensualCargando = false; },
        error: () => {
          this.controlMensualCargando = false;
          this.controlMensualError = 'Control de cambios pendiente de configurar en backend.';
        }
      });
  }

  cargarCatalogos(): void {
    this.dashboardService.obtenerCatalogos().subscribe({
      next: (datos: DashboardCatalogos) => {
        this.empresas = datos.empresas || [];
        this.departamentos = datos.departamentos || [];

        this.estados = datos.estadosEquipo?.length
          ? datos.estadosEquipo
          : this.estados;

        if (!this.estados.includes('Todos')) {
          this.estados = ['Todos', ...this.estados];
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al cargar catálogos del dashboard:',
          error
        );
      }
    });
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.dashboardService
      .obtenerDashboard(this.obtenerFiltros())
      .subscribe({
        next: (datos: DashboardInventarioData) => {
          this.dashboard = datos;

          this.ultimaActualizacion =
            new Date().toLocaleString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

          this.cargando = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error(
            'Error al cargar el dashboard:',
            error
          );

          this.errorCarga =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo cargar el Dashboard de Inventario IT.';

          this.cargando = false;
        }
      });
  }

  aplicarFiltros(): void {
    this.cargarDashboard();
  }

  limpiarFiltros(): void {
    this.filtroEmpresa = 'Todas';
    this.filtroDepartamento = 'Todos';
    this.filtroEstado = 'Todos';
    this.cargarDashboard();
  }

  tieneFiltrosActivos(): boolean {
    return (
      this.filtroEmpresa !== 'Todas' ||
      this.filtroDepartamento !== 'Todos' ||
      this.filtroEstado !== 'Todos'
    );
  }


  abrirDetalle(
    tipo: TipoDetalleDashboard,
    estado: string
  ): void {
    this.configuracionDetalle =
      this.obtenerConfiguracionDetalle(tipo, estado);

    this.mostrarDetalle = true;
    this.cargandoDetalle = true;
    this.errorDetalle = '';
    this.filasDetalle = [];

    this.dashboardService
      .obtenerDetalle(tipo, {
        empresa: this.filtroEmpresa,
        departamento: this.filtroDepartamento,
        estado
      })
      .subscribe({
        next: (filas: DetalleDashboardFila[]) => {
          this.filasDetalle = filas || [];
          this.cargandoDetalle = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error(
            `Error al cargar detalle de ${tipo}:`,
            error
          );

          this.errorDetalle =
            error.error?.detalle ||
            error.error?.error ||
            'No se pudo cargar el detalle solicitado.';

          this.cargandoDetalle = false;
        }
      });
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.cargandoDetalle = false;
    this.errorDetalle = '';
    this.filasDetalle = [];
    this.configuracionDetalle = null;
  }

  detenerCierre(evento: MouseEvent): void {
    evento.stopPropagation();
  }

  get columnasDetalle(): ColumnaDetalle[] {
    return this.configuracionDetalle?.columnas || [];
  }

  get tituloDetalle(): string {
    return this.configuracionDetalle?.titulo || 'Detalle';
  }

  get descripcionDetalle(): string {
    return this.configuracionDetalle?.descripcion || '';
  }

  get rutaDetalle(): string {
    return this.configuracionDetalle?.ruta || '/inventario-it';
  }

  get parametrosDetalle(): Record<string, string> | null {
    const estado = this.configuracionDetalle?.estado;

    if (!estado) {
      return null;
    }

    const parametros: Record<string, string> = {
      estado
    };

    if (this.filtroEmpresa !== 'Todas') {
      parametros['empresa'] = this.filtroEmpresa;
    }

    if (this.filtroDepartamento !== 'Todos') {
      parametros['departamento'] = this.filtroDepartamento;
    }

    return parametros;
  }

  get textoConteoDetalle(): string {
    const total = this.filasDetalle.length;
    return `${total} registro${total === 1 ? '' : 's'}`;
  }

  formatearValorDetalle(
    fila: DetalleDashboardFila,
    columna: ColumnaDetalle
  ): string {
    const valor = fila[columna.clave];

    if (valor === null || valor === undefined || valor === '') {
      return '—';
    }

    if (columna.tipo === 'fecha') {
      return this.formatearFecha(String(valor));
    }

    if (typeof valor === 'boolean') {
      return valor ? 'Sí' : 'No';
    }

    return String(valor);
  }

  claseEstadoDetalle(valor: unknown): string {
    return String(valor || 'sin-estado')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  trackByDetalle(
    indice: number,
    fila: DetalleDashboardFila
  ): string | number {
    const id = fila['id'];
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }

    const folio = fila['folio'];
    if (typeof folio === 'string' || typeof folio === 'number') {
      return folio;
    }

    const inventario = fila['inventario'];
    if (
      typeof inventario === 'string' ||
      typeof inventario === 'number'
    ) {
      return inventario;
    }

    return indice;
  }

  seleccionarDistribucion(
    tipo: TipoDistribucion
  ): void {
    this.tipoDistribucion = tipo;
  }

  get porcentajeAsignados(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.equipos.asignados,
      this.dashboard.resumen.equipos.total
    );
  }

  get porcentajeDisponibles(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.equipos.disponibles,
      this.dashboard.resumen.equipos.total
    );
  }

  get porcentajeBajas(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.equipos.bajas,
      this.dashboard.resumen.equipos.total
    );
  }

  get porcentajeResponsivasFirmadas(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.responsivas.firmadas,
      this.dashboard.resumen.responsivas.total
    );
  }

  get porcentajeAuditoriasFinalizadas(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.auditorias.finalizadas,
      this.dashboard.resumen.auditorias.total
    );
  }

  get porcentajeEquiposLocalizados(): number {
    const total = Number(
      this.dashboard.resumen.equipos.total || 0
    );

    const noLocalizados = Number(
      this.dashboard.resumen.hallazgos.noLocalizados || 0
    );

    return this.calcularPorcentaje(
      Math.max(total - noLocalizados, 0),
      total
    );
  }

  get porcentajeAsignacionesActivas(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.asignaciones.activas,
      this.dashboard.resumen.asignaciones.total
    );
  }

  get estadosInventario(): EstadoInventarioItem[] {
    return [
      {
        etiqueta: 'Asignados',
        total: Number(
          this.dashboard.resumen.equipos.asignados || 0
        ),
        clase: 'asignados'
      },
      {
        etiqueta: 'Disponibles',
        total: Number(
          this.dashboard.resumen.equipos.disponibles || 0
        ),
        clase: 'disponibles'
      },
      {
        etiqueta: 'Bajas',
        total: Number(
          this.dashboard.resumen.equipos.bajas || 0
        ),
        clase: 'bajas'
      }
    ];
  }

  get fondoGraficaEstado(): string {
    const asignados = this.porcentajeAsignados;
    const disponibles = this.porcentajeDisponibles;
    const finalDisponibles = asignados + disponibles;

    if (!this.dashboard.resumen.equipos.total) {
      return 'conic-gradient(#263244 0 100%)';
    }

    return (
      'conic-gradient(' +
      `#f97316 0 ${asignados}%, ` +
      `#3b82f6 ${asignados}% ${finalDisponibles}%, ` +
      `#ef4444 ${finalDisponibles}% 100%)`
    );
  }

  get distribucionSeleccionada(): DistribucionDashboard[] {
    switch (this.tipoDistribucion) {
      case 'empresa':
        return this.dashboard.distribuciones.porEmpresa || [];

      case 'departamento':
        return this.dashboard.distribuciones.porDepartamento || [];

      default:
        return this.dashboard.distribuciones.porCategoria || [];
    }
  }

  get tituloDistribucion(): string {
    switch (this.tipoDistribucion) {
      case 'empresa':
        return 'Equipos por empresa';

      case 'departamento':
        return 'Equipos por departamento';

      default:
        return 'Equipos por categoría';
    }
  }

  get descripcionDistribucion(): string {
    switch (this.tipoDistribucion) {
      case 'empresa':
        return 'Distribución de los activos por razón social.';

      case 'departamento':
        return 'Áreas con mayor concentración de equipos.';

      default:
        return 'Categorías con mayor presencia en el inventario.';
    }
  }

  get indicadoresOperativos(): IndicadorOperativo[] {
    return [
      {
        etiqueta: 'Responsivas firmadas',
        porcentaje: this.porcentajeResponsivasFirmadas,
        detalle:
          `${this.dashboard.resumen.responsivas.firmadas} de ` +
          `${this.dashboard.resumen.responsivas.total}`,
        clase: 'naranja'
      },
      {
        etiqueta: 'Verificaciones físicas finalizadas',
        porcentaje: this.porcentajeAuditoriasFinalizadas,
        detalle:
          `${this.dashboard.resumen.auditorias.finalizadas} de ` +
          `${this.dashboard.resumen.auditorias.total}`,
        clase: 'morado'
      },
      {
        etiqueta: 'Equipos localizados',
        porcentaje: this.porcentajeEquiposLocalizados,
        detalle:
          `${this.dashboard.resumen.hallazgos.noLocalizados} ` +
          'no localizados',
        clase: 'verde'
      },
      {
        etiqueta: 'Asignaciones activas',
        porcentaje: this.porcentajeAsignacionesActivas,
        detalle:
          `${this.dashboard.resumen.asignaciones.activas} activas`,
        clase: 'azul'
      }
    ];
  }

  get alertas(): AlertaDashboard[] {
    const alertas: AlertaDashboard[] = [];
    const resumen = this.dashboard.resumen;

    if (resumen.hallazgos.correccionesPendientes > 0) {
      alertas.push({
        clase: 'danger',
        titulo:
          `${resumen.hallazgos.correccionesPendientes} ` +
          'correcciones pendientes',
        descripcion:
          'Se detectaron diferencias que requieren seguimiento.',
        ruta: '/inventario-it/auditorias',
        boton: 'Ver hallazgos',
        queryParams: {
          vista: 'hallazgos',
          correccion: 'Pendiente'
        }
      });
    }

    if (resumen.hallazgos.noLocalizados > 0) {
      alertas.push({
        clase: 'danger',
        titulo:
          `${resumen.hallazgos.noLocalizados} ` +
          'equipos no localizados',
        descripcion:
          'Estos activos no fueron encontrados en una verificación.',
        ruta: '/inventario-it/auditorias',
        boton: 'Revisar activos',
        queryParams: {
          vista: 'hallazgos',
          resultado: 'No localizado'
        }
      });
    }

    if (
      resumen.equipos.disponibles === 0 &&
      resumen.equipos.total > 0
    ) {
      alertas.push({
        clase: 'warning',
        titulo: 'No hay equipos disponibles',
        descripcion:
          'Los equipos activos están asignados o dados de baja.',
        ruta: '/inventario-it/equipos',
        boton: 'Consultar equipos'
      });
    }

    return alertas;
  }

  porcentajeDistribucion(
    valor: number,
    datos: DistribucionDashboard[]
  ): number {
    const maximo = Math.max(
      ...datos.map(item => Number(item.total || 0)),
      1
    );

    return Math.round(
      (Number(valor || 0) / maximo) * 100
    );
  }

  get periodosTendencia(): string[] {
    const periodos = new Set<string>();

    this.dashboard.tendencias.asignacionesPorMes
      .forEach(item => {
        if (item.periodo) {
          periodos.add(item.periodo);
        }
      });

    this.dashboard.tendencias.devolucionesPorMes
      .forEach(item => {
        if (item.periodo) {
          periodos.add(item.periodo);
        }
      });

    return [...periodos].sort();
  }

  valorPeriodo(
    datos: TendenciaDashboard[],
    periodo: string
  ): number {
    return Number(
      datos.find(item => item.periodo === periodo)?.total || 0
    );
  }

  alturaTendencia(valor: number): number {
    const valores = [
      ...this.dashboard.tendencias.asignacionesPorMes,
      ...this.dashboard.tendencias.devolucionesPorMes
    ].map(item => Number(item.total || 0));

    const maximo = Math.max(...valores, 1);
    const porcentaje = Math.round(
      (Number(valor || 0) / maximo) * 100
    );

    return valor > 0
      ? Math.max(porcentaje, 8)
      : 0;
  }

  formatearPeriodo(periodo: string): string {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return periodo;
    }

    const [anio, mes] = periodo
      .split('-')
      .map(Number);

    const fecha = new Date(anio, mes - 1, 1);

    return fecha.toLocaleDateString('es-MX', {
      month: 'short',
      year: '2-digit'
    });
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

  claseMovimiento(tipo: string): string {
    return (tipo || 'movimiento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  responsableMovimiento(
    movimiento: MovimientoDashboard
  ): string {
    return (
      movimiento.responsable_nuevo ||
      movimiento.responsable_anterior ||
      'Sin responsable'
    );
  }

  trackByMovimiento(
    indice: number,
    movimiento: MovimientoDashboard
  ): string | number {
    if (typeof movimiento.id === 'number') {
      return movimiento.id;
    }

    return `${movimiento.fecha || 'movimiento'}-${indice}`;
  }

  trackByDistribucion(
    indice: number,
    item: DistribucionDashboard
  ): string {
    return `${item.etiqueta}-${indice}`;
  }


  private obtenerConfiguracionDetalle(
    tipo: TipoDetalleDashboard,
    estado: string
  ): ConfiguracionDetalle {
    if (tipo === 'responsivas') {
      return {
        tipo,
        estado,
        titulo: 'Responsivas pendientes',
        descripcion: 'Documentos que todavía requieren firma.',
        ruta: '/inventario-it/responsivas',
        columnas: [
          { clave: 'folio', titulo: 'Folio' },
          { clave: 'inventario', titulo: 'Inventario' },
          { clave: 'equipo', titulo: 'Equipo' },
          { clave: 'responsable', titulo: 'Responsable' },
          { clave: 'empresa', titulo: 'Empresa' },
          { clave: 'departamento', titulo: 'Departamento' },
          {
            clave: 'fecha_generacion',
            titulo: 'Fecha de generación',
            tipo: 'fecha'
          },
          { clave: 'estado', titulo: 'Estado', tipo: 'estado' }
        ]
      };
    }

    if (tipo === 'auditorias') {
      return {
        tipo,
        estado,
        titulo: 'Verificaciones físicas en proceso',
        descripcion: 'Revisiones físicas que aún no han finalizado.',
        ruta: '/inventario-it/auditorias',
        columnas: [
          { clave: 'folio', titulo: 'Folio' },
          { clave: 'nombre', titulo: 'Verificación' },
          { clave: 'tipo', titulo: 'Tipo' },
          { clave: 'empresa', titulo: 'Empresa' },
          { clave: 'departamento', titulo: 'Departamento' },
          {
            clave: 'fecha_programada',
            titulo: 'Fecha programada',
            tipo: 'fecha'
          },
          {
            clave: 'auditor_responsable',
            titulo: 'Verificador responsable'
          },
          { clave: 'estado', titulo: 'Estado', tipo: 'estado' }
        ]
      };
    }

    return {
      tipo,
      estado,
      titulo: 'Equipos de baja',
      descripcion: 'Activos registrados como fuera de operación.',
      ruta: '/inventario-it/equipos',
      columnas: [
        { clave: 'inventario', titulo: 'Inventario' },
        { clave: 'equipo', titulo: 'Equipo' },
        { clave: 'marca', titulo: 'Marca' },
        { clave: 'modelo', titulo: 'Modelo' },
        { clave: 'serie', titulo: 'Número de serie' },
        { clave: 'responsable', titulo: 'Responsable' },
        { clave: 'ubicacion', titulo: 'Ubicación' },
        { clave: 'estado', titulo: 'Estado', tipo: 'estado' }
      ]
    };
  }

  private calcularPorcentaje(
    valor: number,
    total: number
  ): number {
    if (!total) {
      return 0;
    }

    return Math.min(
      Math.max(
        Math.round(
          (Number(valor || 0) / Number(total)) * 100
        ),
        0
      ),
      100
    );
  }

  private obtenerFiltros(): DashboardFiltros {
    return {
      empresa: this.filtroEmpresa,
      departamento: this.filtroDepartamento,
      estado: this.filtroEstado
    };
  }

  private crearDashboardVacio(): DashboardInventarioData {
    return {
      resumen: {
        equipos: {
          total: 0,
          asignados: 0,
          disponibles: 0,
          bajas: 0,
          responsivasPendientes: 0,
          responsivasFirmadas: 0
        },
        asignaciones: {
          total: 0,
          activas: 0,
          finalizadas: 0,
          canceladas: 0
        },
        responsivas: {
          total: 0,
          pendientes: 0,
          firmadas: 0,
          anuladas: 0
        },
        auditorias: {
          total: 0,
          planeadas: 0,
          enProceso: 0,
          finalizadas: 0,
          canceladas: 0
        },
        hallazgos: {
          totalRevisiones: 0,
          diferencias: 0,
          noLocalizados: 0,
          correccionesPendientes: 0
        }
      },
      distribuciones: {
        porEstado: [],
        porCategoria: [],
        porEmpresa: [],
        porDepartamento: [],
        porFuncionamiento: [],
        porResponsiva: []
      },
      tendencias: {
        asignacionesPorMes: [],
        devolucionesPorMes: []
      },
      movimientosRecientes: []
    };
  }
}