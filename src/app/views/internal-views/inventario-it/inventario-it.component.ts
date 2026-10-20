import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DashboardInventarioData,
  DashboardInventarioService
} from '../../../services/inventario/dashboard-inventario.service';


interface ModuloInicio {
  numero: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: string;
  clase: string;
}


@Component({
  selector: 'app-inventario-it',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './inventario-it.component.html',
  styleUrl: './inventario-it.component.css'
})
export class InventarioItComponent implements OnInit {

  dashboard: DashboardInventarioData =
    this.crearDashboardVacio();


  cargando = false;

  errorCarga = '';


  /*
   * =========================================================
   * MÓDULOS DESTACADOS
   *
   * El Dashboard General corresponde al número 01.
   * =========================================================
   */

  readonly modulosDestacados: ModuloInicio[] = [

    {
      numero: '02',
      titulo: 'Equipos',

      descripcion:
        'Consulta, registra y administra los activos tecnológicos.',

      ruta:
        '/inventario-it/equipos',

      icono:
        '▣',

      clase:
        'azul'
    },


    {
      numero: '03',
      titulo: 'Asignaciones',

      descripcion:
        'Gestiona entregas, responsables y devoluciones de equipos.',

      ruta:
        '/inventario-it/asignaciones',

      icono:
        '⇄',

      clase:
        'verde'
    },


    {
      numero: '04',
      titulo: 'Reportes',

      descripcion:
        'Filtra, consulta, imprime y exporta información consolidada.',

      ruta:
        '/inventario-it/reportes',

      icono:
        '▤',

      clase:
        'morado'
    }

  ];


  /*
   * =========================================================
   * MÓDULOS DE ADMINISTRACIÓN Y CONTROL
   * =========================================================
   */

  readonly modulosSecundarios: ModuloInicio[] = [

    {
      numero: '05',
      titulo: 'Colaboradores',

      descripcion:
        'Administra a las personas responsables de los activos.',

      ruta:
        '/inventario-it/colaboradores',

      icono:
        '◉',

      clase:
        'morado'
    },


    {
      numero: '06',
      titulo: 'Responsivas',

      descripcion:
        'Consulta documentos, firmas y seguimiento de resguardos.',

      ruta:
        '/inventario-it/responsivas',

      icono:
        '▥',

      clase:
        'amarillo'
    },


    {
      numero: '07',
      titulo: 'Control y auditoría',

      descripcion:
        'Valida cambios mensuales, responsables e historial de los activos.',

      ruta:
        '/inventario-it/historial',

      icono:
        '↻',

      clase:
        'celeste'
    },


    {
      numero: '08',
      titulo: 'Verificación de equipos',

      descripcion:
        'Sistemas verifica equipos, responsivas y diferencias físicas.',

      ruta:
        '/inventario-it/auditorias',

      icono:
        '◎',

      clase:
        'rojo'
    }

  ];


  constructor(
    private dashboardService:
      DashboardInventarioService
  ) {}


  ngOnInit(): void {
    this.cargarResumen();
  }


  /*
   * =========================================================
   * CARGAR INFORMACIÓN DEL DASHBOARD
   * =========================================================
   */

  cargarResumen(): void {
    this.cargando = true;

    this.errorCarga = '';


    this.dashboardService
      .obtenerDashboard()
      .subscribe({

        next: (
          datos: DashboardInventarioData
        ) => {
          this.dashboard = datos;

          this.cargando = false;
        },


        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al cargar el resumen de Inventario IT:',
            error
          );


          this.errorCarga =
            error.error?.detalle ||
            error.error?.error ||
            'No fue posible cargar los indicadores. Los módulos siguen disponibles.';


          this.cargando = false;
        }

      });
  }


  /*
   * =========================================================
   * INDICADORES
   * =========================================================
   */

  get totalEquipos(): number {
    return Number(
      this.dashboard
        .resumen
        .equipos
        .total || 0
    );
  }


  get equiposAsignados(): number {
    return Number(
      this.dashboard
        .resumen
        .equipos
        .asignados || 0
    );
  }


  get equiposDisponibles(): number {
    return Number(
      this.dashboard
        .resumen
        .equipos
        .disponibles || 0
    );
  }


  get pendientesTotales(): number {

    const responsivas = Number(
      this.dashboard
        .resumen
        .responsivas
        .pendientes || 0
    );


    const auditorias = Number(
      this.dashboard
        .resumen
        .auditorias
        .enProceso || 0
    );


    const correcciones = Number(
      this.dashboard
        .resumen
        .hallazgos
        .correccionesPendientes || 0
    );


    return (
      responsivas +
      auditorias +
      correcciones
    );
  }


  get etiquetaPendientes(): string {

    if (this.cargando) {
      return 'Cargando';
    }


    if (this.pendientesTotales === 0) {
      return 'Sin pendientes';
    }


    return (
      `${this.pendientesTotales} pendiente${
        this.pendientesTotales === 1
          ? ''
          : 's'
      }`
    );
  }


  /*
   * =========================================================
   * IDENTIFICACIÓN PARA LOS NGFOR
   * =========================================================
   */

  trackByModulo(
    _indice: number,
    modulo: ModuloInicio
  ): string {
    return modulo.ruta;
  }


  /*
   * =========================================================
   * ESTRUCTURA VACÍA DEL DASHBOARD
   * =========================================================
   */

  private crearDashboardVacio():
    DashboardInventarioData {

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