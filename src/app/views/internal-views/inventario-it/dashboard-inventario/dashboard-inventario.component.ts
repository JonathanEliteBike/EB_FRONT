import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  DashboardCatalogos,
  DashboardFiltros,
  DashboardInventarioData,
  DashboardInventarioService,
  DistribucionDashboard,
  MovimientoDashboard,
  TendenciaDashboard
} from '../../../../services/inventario/dashboard-inventario.service';

interface AlertaDashboard {
  clase: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  boton: string;
}

@Component({
  selector: 'app-dashboard-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-inventario.component.html',
  styleUrl: './dashboard-inventario.component.css'
})
export class DashboardInventarioComponent implements OnInit {
  dashboard: DashboardInventarioData = this.crearDashboardVacio();

  empresas: string[] = [];
  departamentos: string[] = [];
  estados: string[] = ['Todos', 'Asignado', 'Disponible', 'Baja'];

  filtroEmpresa = 'Todas';
  filtroDepartamento = 'Todos';
  filtroEstado = 'Todos';

  cargando = false;
  errorCarga = '';
  ultimaActualizacion = '';

  constructor(private dashboardService: DashboardInventarioService) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDashboard();
  }

  cargarCatalogos(): void {
    this.dashboardService.obtenerCatalogos().subscribe({
      next: (datos: DashboardCatalogos) => {
        this.empresas = datos.empresas || [];
        this.departamentos = datos.departamentos || [];
        this.estados = datos.estadosEquipo?.length
          ? datos.estadosEquipo
          : this.estados;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar catálogos del dashboard:', error);
      }
    });
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.errorCarga = '';

    this.dashboardService.obtenerDashboard(this.obtenerFiltros()).subscribe({
      next: (datos: DashboardInventarioData) => {
        this.dashboard = datos;
        this.ultimaActualizacion = new Date().toLocaleString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar el dashboard:', error);
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

  get porcentajeResponsivasFirmadas(): number {
    return this.calcularPorcentaje(
      this.dashboard.resumen.responsivas.firmadas,
      this.dashboard.resumen.responsivas.total
    );
  }

  get alertas(): AlertaDashboard[] {
    const alertas: AlertaDashboard[] = [];
    const resumen = this.dashboard.resumen;

    if (resumen.responsivas.pendientes > 0) {
      alertas.push({
        clase: 'warning',
        titulo: `${resumen.responsivas.pendientes} responsivas pendientes`,
        descripcion: 'Existen documentos de entrega que todavía no han sido firmados.',
        ruta: '/inventario-it/responsivas',
        boton: 'Revisar responsivas'
      });
    }

    if (resumen.auditorias.enProceso > 0) {
      alertas.push({
        clase: 'info',
        titulo: `${resumen.auditorias.enProceso} auditorías en proceso`,
        descripcion: 'Hay revisiones físicas que aún no han sido finalizadas.',
        ruta: '/inventario-it/auditorias',
        boton: 'Continuar auditorías'
      });
    }

    if (resumen.hallazgos.correccionesPendientes > 0) {
      alertas.push({
        clase: 'danger',
        titulo: `${resumen.hallazgos.correccionesPendientes} correcciones pendientes`,
        descripcion: 'Se detectaron diferencias que requieren seguimiento o corrección.',
        ruta: '/inventario-it/auditorias',
        boton: 'Ver hallazgos'
      });
    }

    if (resumen.hallazgos.noLocalizados > 0) {
      alertas.push({
        clase: 'danger',
        titulo: `${resumen.hallazgos.noLocalizados} equipos no localizados`,
        descripcion: 'Estos activos no fueron encontrados durante una auditoría.',
        ruta: '/inventario-it/auditorias',
        boton: 'Consultar auditorías'
      });
    }

    if (resumen.equipos.disponibles === 0 && resumen.equipos.total > 0) {
      alertas.push({
        clase: 'warning',
        titulo: 'No hay equipos disponibles',
        descripcion: 'Todos los equipos activos se encuentran asignados o dados de baja.',
        ruta: '/inventario-it/equipos',
        boton: 'Consultar equipos'
      });
    }

    return alertas;
  }

  porcentajeDistribucion(valor: number, datos: DistribucionDashboard[]): number {
    const maximo = Math.max(...datos.map(item => Number(item.total || 0)), 1);
    return Math.round((Number(valor || 0) / maximo) * 100);
  }

  get periodosTendencia(): string[] {
    const periodos = new Set<string>();

    this.dashboard.tendencias.asignacionesPorMes.forEach(item => {
      if (item.periodo) {
        periodos.add(item.periodo);
      }
    });

    this.dashboard.tendencias.devolucionesPorMes.forEach(item => {
      if (item.periodo) {
        periodos.add(item.periodo);
      }
    });

    return [...periodos].sort();
  }

  valorPeriodo(datos: TendenciaDashboard[], periodo: string): number {
    return Number(datos.find(item => item.periodo === periodo)?.total || 0);
  }

  alturaTendencia(valor: number): number {
    const valores = [
      ...this.dashboard.tendencias.asignacionesPorMes,
      ...this.dashboard.tendencias.devolucionesPorMes
    ].map(item => Number(item.total || 0));

    const maximo = Math.max(...valores, 1);
    const porcentaje = Math.round((Number(valor || 0) / maximo) * 100);

    return valor > 0 ? Math.max(porcentaje, 8) : 0;
  }

  formatearPeriodo(periodo: string): string {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return periodo;
    }

    const [anio, mes] = periodo.split('-').map(Number);
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

  trackByMovimiento(indice: number, movimiento: MovimientoDashboard): string | number {
    if (typeof movimiento.id === 'number') {
      return movimiento.id;
    }

    return `${movimiento.fecha || 'movimiento'}-${indice}`;
  }

  private calcularPorcentaje(valor: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((Number(valor || 0) / Number(total)) * 100);
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