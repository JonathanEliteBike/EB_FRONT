import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { forkJoin } from 'rxjs';

import * as XLSX from 'xlsx';

import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { CaratulasService } from '../../../services/caratulas.service';
import { MonitorOdooService } from '../../../services/monitor-odoo.service';


type EvacOperativo = 'A' | 'B';
type CategoriaVenta =
  | 'SCOTT'
  | 'MEGAMO'
  | 'APPAREL'
  | 'VITTORIA'
  | 'SYNCROS'
  | 'BOLD'
  | 'OTROS';


interface ReferenciaCliente {
  evac: EvacOperativo;
  cliente: any;
}


@Component({
  selector: 'app-caratula-evacs',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    HomeBarComponent,
    FormsModule
  ],

  templateUrl: './caratula-evacs.component.html',
  styleUrl: './caratula-evacs.component.css'
})
export class CaratulaEvacsComponent implements OnInit {


  // =========================================================
  // CLIENTES
  // =========================================================

  clientesA: any[] = [];
  clientesB: any[] = [];

  // Filas que realmente mostramos.
  // Pueden incluir una fila residual para hacer cuadrar
  // exactamente la tabla con el total del EVAC.
  filasA: any[] = [];
  filasB: any[] = [];


  // =========================================================
  // FACTURAS
  // =========================================================

  facturas: any[] = [];

  loading = true;
  loadingFacturas = false;

  error: string | null = null;


  // =========================================================
  // FECHAS
  // =========================================================

  fechaInicio = '';
  fechaFin = '';

  // true  = resumen oficial MY27 (respeta f_inicio individual de cada cliente)
  // false = rango calendario elegido manualmente por el usuario
  modoVistaOficial = true;


  // =========================================================
  // TOTALES GENERALES
  // =========================================================

  totalGeneral = 0;

  totalEvacA = 0;
  totalEvacB = 0;

  // Ventas no clasificadas contra la cartera A/B.
  // En el resumen maestro MY27 sí forman parte del Total General,
  // pero no se asignan a EVAC A ni EVAC B.
  totalSinEvac = 0;
  cantidadSinEvac = 0;

  // GO se ignora completamente.
  totalIgnoradoGO = 0;
  cantidadIgnoradaGO = 0;

  // Fuente maestra para la temporada actual.
  // Cuando el filtro está en Inicio MY27 -> hoy, las cifras oficiales
  // salen exclusivamente de /resumen_caratulas_my27.
  private resumenMaestroMy27: any | null = null;


  // =========================================================
  // DESGLOSE EXCLUSIVO
  //
  // IMPORTANTE:
  // Una factura solo puede pertenecer a UNA categoría.
  // Por eso la suma de estas categorías SIEMPRE debe
  // reconciliar contra totalGeneral.
  // =========================================================

  totalScott = 0;
  totalMegamo = 0;
  totalApparel = 0;
  totalVittoria = 0;
  totalSyncros = 0;
  totalBold = 0;
  totalOtros = 0;


  // =========================================================
  // MAPAS DE CLIENTES
  // =========================================================

  private mapaPorClave =
    new Map<string, ReferenciaCliente>();

  private mapaPorNombre =
    new Map<string, ReferenciaCliente[]>();


  constructor(
    private caratulasService: CaratulasService,
    private monitorOdooService: MonitorOdooService
  ) { }


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.inicializarPeriodo();
  }


  // =========================================================
  // PERIODO
  // =========================================================

  private inicializarPeriodo(): void {

    this.loading = true;

    this.fechaFin =
      this.formatearFecha(new Date());


    this.caratulasService
      .getTemporadas()
      .subscribe({

        next: (temporadas) => {

          const abierta =
            temporadas.find(
              temporada =>
                temporada.estado === 'abierta'
            );

          if (abierta?.fecha_inicio) {

            this.fechaInicio =
              abierta.fecha_inicio;

          } else {

            this.fechaInicio =
              this.obtenerInicioTemporadaFallback();
          }

          this.cargarClientes();
        },

        error: (error) => {

          console.warn(
            'No se pudo cargar temporada abierta. ' +
            'Se utilizará inicio MY calculado.',
            error
          );

          this.fechaInicio =
            this.obtenerInicioTemporadaFallback();

          this.cargarClientes();
        }

      });
  }


  private obtenerInicioTemporadaFallback(): string {

    const hoy =
      new Date();

    let añoInicio =
      hoy.getFullYear();

    // Si aún no llegamos a julio,
    // la temporada comenzó en julio del año anterior.
    if (hoy.getMonth() < 6) {
      añoInicio--;
    }

    return `${añoInicio}-07-01`;
  }


  formatearFecha(fecha: Date): string {

    const año =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${año}-${mes}-${dia}`;
  }


  formatearFechaVista(valor: string): string {

    const partes =
      String(valor || '')
        .slice(0, 10)
        .split('-');

    if (partes.length !== 3) {
      return valor || '';
    }

    const [anio, mes, dia] = partes;

    return `${dia}/${mes}/${anio}`;
  }


  // =========================================================
  // CARGAR CLIENTES
  // =========================================================

  cargarClientes(): void {

    this.loading = true;
    this.error = null;


    // =======================================================
    // SOLO A + B.
    //
    // EVAC GO ya no se consulta.
    // =======================================================

    forkJoin({

      clientesA:
        this.caratulasService
          .getClientesEvacA(),

      clientesB:
        this.caratulasService
          .getClientesEvacB(),

      resumen:
        this.caratulasService
          .getResumenCaratulasMy27()

    }).subscribe({

      next: ({
        clientesA,
        clientesB,
        resumen
      }) => {

        this.resumenMaestroMy27 = resumen || null;
        this.modoVistaOficial = true;

        this.clientesA =
          (clientesA || [])

            .filter(
              (cliente: any) =>
                !this.esFilaIntegral(cliente)
            )

            .map(
              (cliente: any) =>
                this.inicializarTotalesCliente(
                  cliente
                )
            );


        this.clientesB =
          (clientesB || [])

            .filter(
              (cliente: any) =>
                !this.esFilaIntegral(cliente)
            )

            .map(
              (cliente: any) =>
                this.inicializarTotalesCliente(
                  cliente
                )
            );


        this.construirMapasClientes();

        this.loading = false;

        this.cargarFacturas();
      },

      error: (error) => {

        console.error(
          'Error cargando clientes EVAC A/B:',
          error
        );

        this.error =
          'No fue posible cargar los clientes.';

        this.loading = false;
      }

    });
  }


  private esFilaIntegral(cliente: any): boolean {

    const clave =
      this.normalizarTexto(
        cliente?.clave
      );

    const nombre =
      this.normalizarTexto(
        cliente?.nombre_cliente
      );

    return (
      clave.includes('INTEGRAL') ||
      nombre.startsWith('INTEGRAL ')
    );
  }


  // =========================================================
  // MAPAS
  // =========================================================

  private construirMapasClientes(): void {

    this.mapaPorClave.clear();
    this.mapaPorNombre.clear();


    this.registrarClientesEnMapa(
      this.clientesA,
      'A'
    );


    this.registrarClientesEnMapa(
      this.clientesB,
      'B'
    );


    // Diagnóstico de claves repetidas A/B.
    const clavesA =
      new Set(
        this.clientesA.map(
          c =>
            this.normalizarTexto(c.clave)
        )
      );


    const repetidas =
      this.clientesB
        .map(
          c =>
            this.normalizarTexto(c.clave)
        )
        .filter(
          clave =>
            clave &&
            clavesA.has(clave)
        );


    if (repetidas.length > 0) {

      console.warn(
        'Hay claves presentes tanto en A como en B:',
        [...new Set(repetidas)]
      );
    }
  }


  private registrarClientesEnMapa(
    clientes: any[],
    evac: EvacOperativo
  ): void {

    clientes.forEach(cliente => {

      const clave =
        this.normalizarTexto(
          cliente?.clave
        );

      const nombre =
        this.normalizarTexto(
          cliente?.nombre_cliente
        );


      if (clave) {

        this.mapaPorClave.set(
          clave,
          {
            evac,
            cliente
          }
        );
      }


      if (nombre) {

        const existentes =
          this.mapaPorNombre.get(nombre) || [];

        existentes.push({
          evac,
          cliente
        });

        this.mapaPorNombre.set(
          nombre,
          existentes
        );
      }

    });
  }


  // =========================================================
  // INICIALIZAR FILA CLIENTE
  // =========================================================

  private inicializarTotalesCliente(
    cliente: any
  ): any {

    return {

      ...cliente,

      totalGeneral: 0,

      totalScott: 0,
      totalMegamo: 0,

      totalApparel: 0,
      totalVittoria: 0,
      totalSyncros: 0,

      totalBold: 0,
      totalOtros: 0
    };
  }


  // =========================================================
  // CARGAR FACTURAS
  // =========================================================

  cargarFacturas(): void {

    this.loadingFacturas = true;
    this.error = null;


    this.monitorOdooService
      .getFacturas()
      .subscribe({

        next: (data) => {

          this.facturas =
            Array.isArray(data)
              ? data
              : [];

          this.procesarFacturas();

          this.loadingFacturas = false;
        },

        error: (error) => {

          console.error(
            'Error cargando facturas:',
            error
          );

          this.error =
            'No fue posible cargar las facturas.';

          this.loadingFacturas = false;
        }

      });
  }


  // =========================================================
  // FILTRO
  // =========================================================

  aplicarFiltros(): void {

    this.error = null;

    if (
      !this.fechaInicio ||
      !this.fechaFin
    ) {
      this.error =
        'Debes indicar fecha inicial y fecha final.';
      return;
    }

    const inicio =
      this.parsearFechaLocal(
        this.fechaInicio
      );

    const fin =
      this.parsearFechaLocal(
        this.fechaFin
      );

    if (
      !inicio ||
      !fin ||
      inicio > fin
    ) {
      this.error =
        'El rango de fechas no es válido.';
      return;
    }

    this.loadingFacturas = true;

    // Una sola fuente de verdad para cualquier rango:
    // Flask calcula clientes + acumulados + A/B + Global + categorías.
    forkJoin({
      clientesA:
        this.caratulasService
          .getClientesEvacA(
            this.fechaInicio,
            this.fechaFin
          ),

      clientesB:
        this.caratulasService
          .getClientesEvacB(
            this.fechaInicio,
            this.fechaFin
          ),

      resumen:
        this.caratulasService
          .getResumenCaratulasMy27(
            this.fechaInicio,
            this.fechaFin
          )
    }).subscribe({

      next: ({
        clientesA,
        clientesB,
        resumen
      }) => {

        this.resumenMaestroMy27 =
          resumen || null;

        this.modoVistaOficial = false;

        this.clientesA =
          (clientesA || [])
            .filter(
              (cliente: any) =>
                !this.esFilaIntegral(cliente)
            )
            .map(
              (cliente: any) =>
                this.inicializarTotalesCliente(
                  cliente
                )
            );

        this.clientesB =
          (clientesB || [])
            .filter(
              (cliente: any) =>
                !this.esFilaIntegral(cliente)
            )
            .map(
              (cliente: any) =>
                this.inicializarTotalesCliente(
                  cliente
                )
            );

        this.construirMapasClientes();
        this.procesarResumenMaestro();

        this.loadingFacturas = false;
      },

      error: (error) => {

        console.error(
          'Error calculando carátula por rango:',
          error
        );

        this.error =
          'No fue posible calcular el rango seleccionado.';

        this.loadingFacturas = false;
      }
    });
  }


  restablecerVistaMy27(): void {

    this.error = null;
    this.modoVistaOficial = true;
    this.loadingFacturas = false;

    // Reobtiene la temporada abierta y vuelve a consultar el resumen
    // oficial SIN rango manual.
    this.inicializarPeriodo();
  }


  // =========================================================
  // RESUMEN MAESTRO MY27
  // =========================================================

  private usandoResumenMaestro(): boolean {

    if (!this.resumenMaestroMy27) {
      return false;
    }

    // Si el resumen fue solicitado con un rango manual,
    // solo es válido para exactamente ese mismo rango.
    const solicitadoDesde =
      String(
        this.resumenMaestroMy27
          ?.rango_solicitado
          ?.fecha_desde || ''
      ).slice(0, 10);

    const solicitadoHasta =
      String(
        this.resumenMaestroMy27
          ?.rango_solicitado
          ?.fecha_hasta || ''
      ).slice(0, 10);

    if (solicitadoDesde && solicitadoHasta) {
      return (
        this.fechaInicio === solicitadoDesde &&
        this.fechaFin === solicitadoHasta
      );
    }

    // Sin rango manual conserva la validación MY27 actual.
    const inicioMaestro =
      String(
        this.resumenMaestroMy27
          ?.rango_my27
          ?.fecha_inicio || ''
      ).slice(0, 10);

    const hoy =
      this.formatearFecha(
        new Date()
      );

    return (
      this.fechaInicio === inicioMaestro &&
      this.fechaFin === hoy
    );
  }


  private procesarResumenMaestro(): void {

    const resumen =
      this.resumenMaestroMy27;

    const global =
      resumen?.global;

    const evacA =
      resumen?.evac_a;

    const evacB =
      resumen?.evac_b;

    if (!global || !evacA || !evacB) {
      console.error(
        'Resumen maestro MY27 incompleto:',
        resumen
      );
      return;
    }

    this.reiniciarTotales();

    // Totales oficiales.
    this.totalGeneral =
      this.redondear(
        Number(global.acumulado_general) || 0
      );

    this.totalEvacA =
      this.redondear(
        Number(evacA.acumulado_general) || 0
      );

    this.totalEvacB =
      this.redondear(
        Number(evacB.acumulado_general) || 0
      );

    // Ventas sin cliente registrado: pertenecen solo a Global.
    const noRegistradas =
      resumen?.ventas_no_registradas || {};

    this.totalSinEvac =
      this.redondear(
        Number(noRegistradas.total) || 0
      );

    this.cantidadSinEvac =
      Number(noRegistradas.filas) || 0;

    // GO no participa en la carátula vigente.
    this.totalIgnoradoGO = 0;
    this.cantidadIgnoradaGO = 0;

    // Desglose exclusivo oficial.
    const desglose =
      global?.desglose || {};

    this.totalScott =
      this.redondear(
        Number(desglose.scott) || 0
      );

    this.totalMegamo =
      this.redondear(
        Number(
          desglose.megamo ??
          global.acumulado_megamo
        ) || 0
      );

    this.totalBold =
      this.redondear(
        Number(desglose.bold) || 0
      );

    this.totalApparel =
      this.redondear(
        Number(desglose.apparel) || 0
      );

    this.totalVittoria =
      this.redondear(
        Number(desglose.vittoria) || 0
      );

    this.totalSyncros =
      this.redondear(
        Number(desglose.syncros) || 0
      );

    this.totalOtros =
      this.redondear(
        Number(
          desglose.otros ??
          global.acumulado_otros
        ) || 0
      );

    // Las tablas también se construyen desde el backend vigente.
    // La fila residual representa Multimarcas y/o Integrales que no
    // se muestran como cliente individual en esta pantalla.
    this.filasA =
      this.construirFilasResumenMaestro(
        'A',
        this.clientesA,
        evacA
      );

    this.filasB =
      this.construirFilasResumenMaestro(
        'B',
        this.clientesB,
        evacB
      );

    this.validarCuadres();

    console.log(
      'CARÁTULA EVACS - RESUMEN MAESTRO MY27:',
      {
        totalGeneral: this.totalGeneral,
        evacA: this.totalEvacA,
        evacB: this.totalEvacB,
        noRegistradas: this.totalSinEvac,
        diferenciaEvacs: this.diferenciaEvacs,
        bicicletas: this.totalBicicletas,
        apparelSyncrosVittoria:
          this.totalCategoriaApparel,
        otros: this.totalOtros,
        diferenciaCategorias:
          this.diferenciaCategorias
      }
    );
  }


  private construirFilasResumenMaestro(
    evac: EvacOperativo,
    clientes: any[],
    resumenEvac: any
  ): any[] {

    const filas =
      clientes.map(
        cliente => ({
          ...cliente,

          totalGeneral:
            this.redondear(
              Number(
                cliente?.acumulado_anticipado
              ) || 0
            ),

          totalScott:
            this.redondear(
              Number(
                cliente?.avance_global_scott
              ) || 0
            ),

          totalMegamo:
            this.redondear(
              Number(
                cliente?.acumulado_megamo
              ) || 0
            ),

          totalApparel:
            this.redondear(
              Number(
                cliente?.acumulado_apparel
              ) || 0
            ),

          totalVittoria:
            this.redondear(
              Number(
                cliente?.acumulado_vittoria
              ) || 0
            ),

          totalSyncros:
            this.redondear(
              Number(
                cliente?.acumulado_syncros
              ) || 0
            ),

          totalBold:
            this.redondear(
              Number(
                cliente?.acumulado_bold
              ) || 0
            ),

          totalOtros:
            this.redondear(
              Number(
                cliente?.acumulado_otros
              ) || 0
            )
        })
      );

    const oficial =
      resumenEvac?.desglose || {};

    const suma =
      (campo: string): number =>
        this.redondear(
          filas.reduce(
            (total, fila) =>
              total +
              (
                Number(
                  fila?.[campo]
                ) || 0
              ),
            0
          )
        );

    const residual =
      this.inicializarTotalesCliente({
        clave: '—',
        nombre_cliente:
          `OTRAS VENTAS EVAC ${evac} (INTEGRALES / MULTIMARCAS)`,
        esResidual: true
      });

    residual.totalGeneral =
      this.redondear(
        (Number(resumenEvac?.acumulado_general) || 0) -
        suma('totalGeneral')
      );

    residual.totalScott =
      this.redondear(
        (Number(oficial.scott) || 0) -
        suma('totalScott')
      );

    residual.totalMegamo =
      this.redondear(
        (Number(
          oficial.megamo ??
          resumenEvac?.acumulado_megamo
        ) || 0) -
        suma('totalMegamo')
      );

    residual.totalBold =
      this.redondear(
        (Number(oficial.bold) || 0) -
        suma('totalBold')
      );

    residual.totalApparel =
      this.redondear(
        (Number(oficial.apparel) || 0) -
        suma('totalApparel')
      );

    residual.totalVittoria =
      this.redondear(
        (Number(oficial.vittoria) || 0) -
        suma('totalVittoria')
      );

    residual.totalSyncros =
      this.redondear(
        (Number(oficial.syncros) || 0) -
        suma('totalSyncros')
      );

    residual.totalOtros =
      this.redondear(
        (Number(
          oficial.otros ??
          resumenEvac?.acumulado_otros
        ) || 0) -
        suma('totalOtros')
      );

    const tieneResidual =
      [
        residual.totalGeneral,
        residual.totalScott,
        residual.totalMegamo,
        residual.totalBold,
        residual.totalApparel,
        residual.totalVittoria,
        residual.totalSyncros,
        residual.totalOtros
      ].some(
        valor =>
          Math.abs(
            Number(valor) || 0
          ) >= 0.01
      );

    if (tieneResidual) {
      filas.push(residual);
    }

    return filas;
  }


  // =========================================================
  // PROCESAMIENTO PRINCIPAL
  // =========================================================

  procesarFacturas(): void {

    // La temporada actual tiene una única fuente oficial: Flask.
    // El cálculo crudo con monitor se conserva únicamente para filtros
    // históricos/personalizados.
    if (this.usandoResumenMaestro()) {
      this.procesarResumenMaestro();
      return;
    }

    this.reiniciarTotales();


    const facturasFiltradas =
      this.filtrarFacturasPorFecha();


    const facturasA: any[] = [];
    const facturasB: any[] = [];
    const facturasSinEvac: any[] = [];
    const facturasGO: any[] = [];


    // =======================================================
    // CADA FACTURA SE CLASIFICA UNA SOLA VEZ
    // =======================================================

    facturasFiltradas.forEach(
      factura => {

        const evac =
          this.resolverEvacFactura(
            factura
          );


        switch (evac) {

          case 'A':

            facturasA.push(factura);
            break;


          case 'B':

            facturasB.push(factura);
            break;


          case 'GO':

            // GO se ignora del universo operativo.
            facturasGO.push(factura);
            break;


          default:

            facturasSinEvac.push(
              factura
            );

            break;
        }

      }
    );


    // =======================================================
    // TOTALES EVAC
    // =======================================================

    this.totalEvacA =
      this.redondear(
        this.calcularTotalGeneral(
          facturasA
        )
      );


    this.totalEvacB =
      this.redondear(
        this.calcularTotalGeneral(
          facturasB
        )
      );


    // =======================================================
    // TOTAL GENERAL OPERATIVO
    //
    // REGLA INQUEBRANTABLE:
    // GENERAL = A + B
    // =======================================================

    this.totalGeneral =
      this.redondear(
        this.totalEvacA +
        this.totalEvacB
      );


    // =======================================================
    // DIAGNÓSTICOS
    // =======================================================

    this.totalSinEvac =
      this.redondear(
        this.calcularTotalGeneral(
          facturasSinEvac
        )
      );

    this.cantidadSinEvac =
      facturasSinEvac.length;


    this.totalIgnoradoGO =
      this.redondear(
        this.calcularTotalGeneral(
          facturasGO
        )
      );

    this.cantidadIgnoradaGO =
      facturasGO.length;


    // =======================================================
    // TABLAS DE CLIENTES
    // =======================================================

    this.procesarTablaEvac(
      'A',
      this.clientesA,
      facturasA
    );


    this.procesarTablaEvac(
      'B',
      this.clientesB,
      facturasB
    );


    // =======================================================
    // CATEGORÍAS GENERALES
    //
    // Siempre calculadas desde el mismo universo A+B.
    // =======================================================

    const facturasAB = [
      ...facturasA,
      ...facturasB
    ];


    this.calcularTotalesCategorias(
      facturasAB
    );


    // =======================================================
    // VALIDACIÓN
    // =======================================================

    this.validarCuadres();


    console.log(
      'CARÁTULA EVACS - VALIDACIÓN:',
      {

        periodo: {
          desde:
            this.fechaInicio,

          hasta:
            this.fechaFin
        },

        totalGeneral:
          this.totalGeneral,

        evacA:
          this.totalEvacA,

        evacB:
          this.totalEvacB,

        cuadreEvacs:
          this.diferenciaEvacs,

        categorias: {

          scott:
            this.totalScott,

          megamo:
            this.totalMegamo,

          bold:
            this.totalBold,

          apparel:
            this.totalApparel,

          vittoria:
            this.totalVittoria,

          syncros:
            this.totalSyncros,

          otros:
            this.totalOtros,

          bicicletas:
            this.totalBicicletas,

          apparelSyncrosVittoria:
            this.totalCategoriaApparel
        },

        cuadreCategorias:
          this.diferenciaCategorias,

        sinEvac: {
          cantidad:
            this.cantidadSinEvac,

          total:
            this.totalSinEvac
        },

        evacGoIgnorado: {
          cantidad:
            this.cantidadIgnoradaGO,

          total:
            this.totalIgnoradoGO
        }

      }
    );
  }


  // =========================================================
  // RESOLVER EVAC
  // =========================================================

  private resolverEvacFactura(
    factura: any
  ): EvacOperativo | 'GO' | null {


    // =======================================================
    // 1. PRIMERA PRIORIDAD:
    // EVAC ACTUAL DEL CLIENTE REGISTRADO.
    //
    // Esto respeta redistribuciones actuales.
    // =======================================================

    const cliente =
      this.buscarClienteFactura(
        factura
      );


    if (cliente) {
      return cliente.evac;
    }


    // =======================================================
    // 2. SI NO ES CLIENTE DE LA TABLA:
    // usamos EVAC que trae monitor.
    //
    // Esto permite Multimarcas / ventas fuera de la tabla.
    // =======================================================

    const evacFactura =
      this.normalizarTexto(
        factura?.evac
      );


    if (!evacFactura) {
      return null;
    }


    if (
      evacFactura === 'GO' ||
      evacFactura.startsWith('GO ') ||
      evacFactura.includes('EVAC GO')
    ) {

      return 'GO';
    }


    if (
      evacFactura === 'A' ||
      evacFactura.startsWith('A ') ||
      evacFactura.includes('EVAC A')
    ) {

      return 'A';
    }


    if (
      evacFactura === 'B' ||
      evacFactura.startsWith('B ') ||
      evacFactura.includes('EVAC B')
    ) {

      return 'B';
    }


    return null;
  }


  // =========================================================
  // ENCONTRAR CLIENTE
  // =========================================================

  private buscarClienteFactura(
    factura: any
  ): ReferenciaCliente | null {


    // =======================================================
    // 1. CLAVE EXACTA
    // =======================================================

    const clave =
      this.normalizarTexto(
        factura?.contacto_referencia
      );


    if (clave) {

      const encontrado =
        this.mapaPorClave.get(
          clave
        );

      if (encontrado) {
        return encontrado;
      }
    }


    // =======================================================
    // 2. NOMBRE EXACTO
    //
    // Solo lo usamos si el nombre identifica UN SOLO cliente.
    // Si existen dos clientes iguales no adivinamos.
    // =======================================================

    const nombre =
      this.normalizarTexto(
        factura?.contacto_nombre
      );


    if (!nombre) {
      return null;
    }


    const candidatos =
      this.mapaPorNombre.get(
        nombre
      ) || [];


    if (candidatos.length === 1) {
      return candidatos[0];
    }


    return null;
  }


  // =========================================================
  // PROCESAR TABLA EVAC
  // =========================================================

  private procesarTablaEvac(
    evac: EvacOperativo,
    clientes: any[],
    facturas: any[]
  ): void {


    const residual =
      this.inicializarTotalesCliente({
        clave: '—',
        nombre_cliente:
          `OTRAS VENTAS EVAC ${evac}`,
        esResidual: true
      });


    facturas.forEach(
      factura => {

        const referencia =
          this.buscarClienteFactura(
            factura
          );


        // Solo mandar a cliente si pertenece
        // realmente al EVAC que estamos procesando.
        if (
          referencia &&
          referencia.evac === evac
        ) {

          this.agregarFacturaAFila(
            referencia.cliente,
            factura
          );

        } else {

          // Multimarcas, cliente no mostrado,
          // factura sin referencia, etc.
          //
          // NO desaparece:
          // se conserva en la fila residual.
          this.agregarFacturaAFila(
            residual,
            factura
          );
        }

      }
    );


    const filas =
      [...clientes];


    if (
      Math.abs(
        Number(
          residual.totalGeneral
        ) || 0
      ) > 0.004
    ) {

      filas.push(
        residual
      );
    }


    if (evac === 'A') {
      this.filasA = filas;
    } else {
      this.filasB = filas;
    }
  }


  // =========================================================
  // AGREGAR FACTURA A UNA FILA
  // =========================================================

  private agregarFacturaAFila(
    fila: any,
    factura: any
  ): void {

    const valor =
      this.obtenerValorNumerico(
        factura?.venta_total
      );


    fila.totalGeneral =
      this.redondear(
        (
          Number(
            fila.totalGeneral
          ) || 0
        ) +
        valor
      );


    const categoria =
      this.clasificarCategoria(
        factura
      );


    switch (categoria) {

      case 'SCOTT':

        fila.totalScott =
          this.redondear(
            (
              Number(
                fila.totalScott
              ) || 0
            ) +
            valor
          );

        break;


      case 'MEGAMO':

        fila.totalMegamo =
          this.redondear(
            (
              Number(
                fila.totalMegamo
              ) || 0
            ) +
            valor
          );

        break;


      case 'APPAREL':

        fila.totalApparel =
          this.redondear(
            (
              Number(
                fila.totalApparel
              ) || 0
            ) +
            valor
          );

        break;


      case 'VITTORIA':

        fila.totalVittoria =
          this.redondear(
            (
              Number(
                fila.totalVittoria
              ) || 0
            ) +
            valor
          );

        break;


      case 'SYNCROS':

        fila.totalSyncros =
          this.redondear(
            (
              Number(
                fila.totalSyncros
              ) || 0
            ) +
            valor
          );

        break;


      case 'BOLD':

        fila.totalBold =
          this.redondear(
            (
              Number(
                fila.totalBold
              ) || 0
            ) +
            valor
          );

        break;


      case 'OTROS':

        fila.totalOtros =
          this.redondear(
            (
              Number(
                fila.totalOtros
              ) || 0
            ) +
            valor
          );

        break;
    }
  }


  // =========================================================
  // CLASIFICACIÓN EXCLUSIVA
  //
  // ORDEN IMPORTANTE:
  //
  // Vittoria / Syncros / Bold son marcas explícitas.
  // Después Apparel.
  // Después bicicletas.
  //
  // Así una factura nunca aparece dos veces.
  // =========================================================

  private clasificarCategoria(
    factura: any
  ): CategoriaVenta {

    const marca =
      this.normalizarTexto(
        factura?.marca
      );

    const apparel =
      this.normalizarTexto(
        factura?.apparel
      );


    // =======================================================
    // MARCAS EXPLÍCITAS
    // =======================================================

    if (marca === 'VITTORIA') {
      return 'VITTORIA';
    }


    if (marca === 'SYNCROS') {
      return 'SYNCROS';
    }


    if (marca === 'BOLD') {
      return 'BOLD';
    }


    // =======================================================
    // APPAREL
    //
    // SCOTT Apparel entra aquí, no en bicicletas.
    // =======================================================

    if (
      apparel === 'SI' ||
      apparel === 'SÍ' ||
      apparel === 'YES'
    ) {

      return 'APPAREL';
    }


    // =======================================================
    // MEGAMO
    //
    // Mismo criterio defensivo que usa backend:
    // marca, subcategoría o categoría producto.
    // =======================================================

    if (
      this.esMegamo(
        factura
      )
    ) {

      return 'MEGAMO';
    }


    if (marca === 'SCOTT') {
      return 'SCOTT';
    }


    return 'OTROS';
  }


  private esMegamo(
    factura: any
  ): boolean {

    const marca =
      this.normalizarTexto(
        factura?.marca
      );

    const subcategoria =
      this.normalizarTexto(
        factura?.subcategoria
      );

    const categoriaProducto =
      this.normalizarTexto(
        factura?.categoria_producto
      );


    return (
      marca === 'MEGAMO' ||
      subcategoria === 'MEGAMO' ||
      categoriaProducto.includes(
        'MEGAMO'
      )
    );
  }


  // =========================================================
  // TOTALES DE CATEGORÍAS
  // =========================================================

  private calcularTotalesCategorias(
    facturas: any[]
  ): void {

    facturas.forEach(
      factura => {

        const valor =
          this.obtenerValorNumerico(
            factura?.venta_total
          );

        const categoria =
          this.clasificarCategoria(
            factura
          );


        switch (categoria) {

          case 'SCOTT':

            this.totalScott += valor;
            break;


          case 'MEGAMO':

            this.totalMegamo += valor;
            break;


          case 'APPAREL':

            this.totalApparel += valor;
            break;


          case 'VITTORIA':

            this.totalVittoria += valor;
            break;


          case 'SYNCROS':

            this.totalSyncros += valor;
            break;


          case 'BOLD':

            this.totalBold += valor;
            break;


          case 'OTROS':

            this.totalOtros += valor;
            break;
        }

      }
    );


    this.totalScott =
      this.redondear(
        this.totalScott
      );

    this.totalMegamo =
      this.redondear(
        this.totalMegamo
      );

    this.totalApparel =
      this.redondear(
        this.totalApparel
      );

    this.totalVittoria =
      this.redondear(
        this.totalVittoria
      );

    this.totalSyncros =
      this.redondear(
        this.totalSyncros
      );

    this.totalBold =
      this.redondear(
        this.totalBold
      );

    this.totalOtros =
      this.redondear(
        this.totalOtros
      );
  }


  // =========================================================
  // DERIVADOS
  // =========================================================

  get totalBicicletas(): number {

    if (this.usandoResumenMaestro()) {
      return this.redondear(
        Number(
          this.resumenMaestroMy27
            ?.global
            ?.acumulado_bicicletas
        ) || 0
      );
    }

    return this.redondear(
      this.totalScott +
      this.totalMegamo +
      this.totalBold
    );
  }


  get totalCategoriaApparel(): number {

    if (this.usandoResumenMaestro()) {
      return this.redondear(
        Number(
          this.resumenMaestroMy27
            ?.global
            ?.acumulado_apparel
        ) || 0
      );
    }

    return this.redondear(
      this.totalApparel +
      this.totalVittoria +
      this.totalSyncros
    );
  }


  get diferenciaEvacs(): number {

    const esperado =
      this.usandoResumenMaestro()
        ? (
            this.totalEvacA +
            this.totalEvacB +
            this.totalSinEvac
          )
        : (
            this.totalEvacA +
            this.totalEvacB
          );

    return this.redondear(
      this.totalGeneral -
      esperado
    );
  }


  get diferenciaCategorias(): number {

    const totalCategorias =
      this.usandoResumenMaestro()
        ? (
            this.totalBicicletas +
            this.totalCategoriaApparel +
            this.totalOtros
          )
        : (
            this.totalScott +
            this.totalMegamo +
            this.totalBold +
            this.totalApparel +
            this.totalVittoria +
            this.totalSyncros +
            this.totalOtros
          );


    return this.redondear(
      this.totalGeneral -
      totalCategorias
    );
  }


  get cuadreCorrecto(): boolean {

    return (
      Math.abs(
        this.diferenciaEvacs
      ) < 0.01 &&

      Math.abs(
        this.diferenciaCategorias
      ) < 0.01
    );
  }


  // =========================================================
  // VALIDAR CUADRES
  // =========================================================

  private validarCuadres(): void {

    if (
      Math.abs(
        this.diferenciaEvacs
      ) >= 0.01
    ) {

      console.error(
        'ERROR DE CUADRE GENERAL:',
        this.diferenciaEvacs
      );
    }


    if (
      Math.abs(
        this.diferenciaCategorias
      ) >= 0.01
    ) {

      console.error(
        'ERROR DE CUADRE CATEGORÍAS:',
        this.diferenciaCategorias
      );
    }


    const totalTablaA =
      this.redondear(
        this.filasA.reduce(
          (sum, fila) =>
            sum +
            (
              Number(
                fila.totalGeneral
              ) || 0
            ),
          0
        )
      );


    const totalTablaB =
      this.redondear(
        this.filasB.reduce(
          (sum, fila) =>
            sum +
            (
              Number(
                fila.totalGeneral
              ) || 0
            ),
          0
        )
      );


    if (
      Math.abs(
        totalTablaA -
        this.totalEvacA
      ) >= 0.01
    ) {

      console.error(
        'TABLA A NO CUADRA:',
        {
          tabla:
            totalTablaA,

          resumen:
            this.totalEvacA
        }
      );
    }


    if (
      Math.abs(
        totalTablaB -
        this.totalEvacB
      ) >= 0.01
    ) {

      console.error(
        'TABLA B NO CUADRA:',
        {
          tabla:
            totalTablaB,

          resumen:
            this.totalEvacB
        }
      );
    }
  }


  // =========================================================
  // REINICIAR
  // =========================================================

  private reiniciarTotales(): void {

    this.totalGeneral = 0;

    this.totalEvacA = 0;
    this.totalEvacB = 0;

    this.totalSinEvac = 0;
    this.cantidadSinEvac = 0;

    this.totalIgnoradoGO = 0;
    this.cantidadIgnoradaGO = 0;

    this.totalScott = 0;
    this.totalMegamo = 0;

    this.totalApparel = 0;
    this.totalVittoria = 0;
    this.totalSyncros = 0;

    this.totalBold = 0;
    this.totalOtros = 0;


    this.clientesA.forEach(
      cliente =>
        this.reiniciarFila(
          cliente
        )
    );


    this.clientesB.forEach(
      cliente =>
        this.reiniciarFila(
          cliente
        )
    );


    this.filasA = [];
    this.filasB = [];
  }


  private reiniciarFila(
    cliente: any
  ): void {

    cliente.totalGeneral = 0;

    cliente.totalScott = 0;
    cliente.totalMegamo = 0;

    cliente.totalApparel = 0;
    cliente.totalVittoria = 0;
    cliente.totalSyncros = 0;

    cliente.totalBold = 0;
    cliente.totalOtros = 0;
  }


  // =========================================================
  // FILTRO FECHAS
  // =========================================================

  private filtrarFacturasPorFecha(): any[] {

    if (
      !this.fechaInicio ||
      !this.fechaFin
    ) {

      return this.facturas;
    }


    const inicio =
      this.parsearFechaLocal(
        this.fechaInicio
      );

    const fin =
      this.parsearFechaLocal(
        this.fechaFin
      );


    if (
      !inicio ||
      !fin
    ) {

      return [];
    }


    inicio.setHours(
      0,
      0,
      0,
      0
    );


    fin.setHours(
      23,
      59,
      59,
      999
    );


    return this.facturas.filter(
      factura => {

        const fecha =
          this.parsearFechaLocal(
            factura?.fecha_factura
          );


        if (!fecha) {
          return false;
        }


        return (
          fecha >= inicio &&
          fecha <= fin
        );
      }
    );
  }


  private parsearFechaLocal(
    valor: any
  ): Date | null {

    if (!valor) {
      return null;
    }


    if (valor instanceof Date) {

      return isNaN(
        valor.getTime()
      )
        ? null
        : new Date(
            valor.getTime()
          );
    }


    const texto =
      String(valor).trim();


    // YYYY-MM-DD...
    const coincidencia =
      texto.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );


    if (coincidencia) {

      const año =
        Number(
          coincidencia[1]
        );

      const mes =
        Number(
          coincidencia[2]
        );

      const dia =
        Number(
          coincidencia[3]
        );


      const fecha =
        new Date(
          año,
          mes - 1,
          dia
        );


      return isNaN(
        fecha.getTime()
      )
        ? null
        : fecha;
    }


    const fecha =
      new Date(valor);


    return isNaN(
      fecha.getTime()
    )
      ? null
      : fecha;
  }


  // =========================================================
  // TOTAL GENERAL DE FACTURAS
  // =========================================================

  private calcularTotalGeneral(
    facturas: any[]
  ): number {

    return facturas.reduce(
      (
        total,
        factura
      ) =>

        total +
        this.obtenerValorNumerico(
          factura?.venta_total
        ),

      0
    );
  }


  // =========================================================
  // NÚMERO
  //
  // IMPORTANTE:
  // El código anterior eliminaba el signo negativo.
  // Aquí preservamos devoluciones/notas negativas.
  // =========================================================

  private obtenerValorNumerico(
    valor: any
  ): number {

    if (
      valor === null ||
      valor === undefined
    ) {

      return 0;
    }


    if (
      typeof valor === 'number'
    ) {

      return Number.isFinite(valor)
        ? valor
        : 0;
    }


    const original =
      String(valor).trim();


    const negativoPorParentesis =
      original.startsWith('(') &&
      original.endsWith(')');


    const limpio =
      original
        .replace(/,/g, '')
        .replace(
          /[^\d.-]/g,
          ''
        );


    let numero =
      Number(limpio);


    if (
      !Number.isFinite(numero)
    ) {

      return 0;
    }


    if (
      negativoPorParentesis &&
      numero > 0
    ) {

      numero *= -1;
    }


    return numero;
  }


  // =========================================================
  // TEXTO
  // =========================================================

  private normalizarTexto(
    valor: any
  ): string {

    return String(
      valor ?? ''
    )
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      );
  }


  private redondear(
    valor: number
  ): number {

    return Math.round(
      (
        Number(valor) || 0
      ) *
      100
    ) / 100;
  }


  // =========================================================
  // FECHA / SEMANA
  // =========================================================

  obtenerFechaHoy(): string {

    return new Date()
      .toLocaleDateString(
        'es-MX',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      );
  }


  obtenerSemanaISO(): number {

    const date =
      new Date();

    date.setHours(
      0,
      0,
      0,
      0
    );


    date.setDate(
      date.getDate() +
      3 -
      (
        (
          date.getDay() +
          6
        ) %
        7
      )
    );


    const week1 =
      new Date(
        date.getFullYear(),
        0,
        4
      );


    return 1 +
      Math.round(
        (
          (
            date.getTime() -
            week1.getTime()
          ) /
          86400000 -
          3 +
          (
            (
              week1.getDay() +
              6
            ) %
            7
          )
        ) /
        7
      );
  }


  // =========================================================
  // EXCEL
  // =========================================================

  exportarExcel(): void {

    const workbook =
      XLSX.utils.book_new();


    this.crearHojaResumenTotales(
      workbook
    );


    this.crearHojaEvac(
      workbook,
      'EVAC A',
      this.filasA,
      this.totalEvacA
    );


    this.crearHojaEvac(
      workbook,
      'EVAC B',
      this.filasB,
      this.totalEvacB
    );


    XLSX.writeFile(
      workbook,
      `Caratula_EVACs_${this.formatearFechaExcel(
        new Date()
      )}.xlsx`
    );
  }


  private crearHojaResumenTotales(
    workbook: XLSX.WorkBook
  ): void {

    const datos = [

      ['CARÁTULA EVACS'],
      [''],

      [
        'Desde',
        this.fechaInicio
      ],

      [
        'Hasta',
        this.fechaFin
      ],

      [''],

      [
        'TOTAL GENERAL',
        {
          v:
            this.totalGeneral,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'EVAC A',
        {
          v:
            this.totalEvacA,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'EVAC B',
        {
          v:
            this.totalEvacB,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        this.usandoResumenMaestro()
          ? 'DIFERENCIA GENERAL - (A+B+NO REGISTRADAS)'
          : 'DIFERENCIA GENERAL - (A+B)',
        {
          v:
            this.diferenciaEvacs,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [''],

      ['DESGLOSE SIN DUPLICADOS'],

      [
        'SCOTT',
        {
          v:
            this.totalScott,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'MEGAMO',
        {
          v:
            this.totalMegamo,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'BOLD',
        {
          v:
            this.totalBold,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'APPAREL',
        {
          v:
            this.totalApparel,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'VITTORIA',
        {
          v:
            this.totalVittoria,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'SYNCROS',
        {
          v:
            this.totalSyncros,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'OTROS',
        {
          v:
            this.totalOtros,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'DIFERENCIA CATEGORÍAS',
        {
          v:
            this.diferenciaCategorias,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [''],

      [
        'BICICLETAS',
        {
          v:
            this.totalBicicletas,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        'APPAREL / SYNCROS / VITTORIA',
        {
          v:
            this.totalCategoriaApparel,
          t: 'n',
          z: '#,##0.00'
        }
      ],

      [
        this.usandoResumenMaestro()
          ? 'VENTAS NO REGISTRADAS'
          : 'SIN EVAC A/B',
        {
          v:
            this.totalSinEvac,
          t: 'n',
          z: '#,##0.00'
        }
      ]

    ];


    const ws =
      XLSX.utils.aoa_to_sheet(
        datos
      );


    ws['!cols'] = [
      { wch: 38 },
      { wch: 18 }
    ];


    XLSX.utils.book_append_sheet(
      workbook,
      ws,
      'Resumen'
    );
  }


  private crearHojaEvac(
    workbook: XLSX.WorkBook,
    nombreEvac: string,
    filas: any[],
    totalEvac: number
  ): void {

    const datos: any[] = [

      [nombreEvac],

      [''],

      [
        'CLAVE',
        'NOMBRE DEL CLIENTE',
        'TOTAL',
        'SCOTT',
        'MEGAMO',
        'APPAREL',
        'VITTORIA',
        'SYNCROS',
        'BOLD',
        'OTROS'
      ]
    ];


    filas.forEach(
      fila => {

        datos.push([

          fila.clave,

          fila.nombre_cliente,

          {
            v:
              fila.totalGeneral,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalScott,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalMegamo,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalApparel,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalVittoria,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalSyncros,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalBold,
            t: 'n',
            z: '#,##0.00'
          },

          {
            v:
              fila.totalOtros,
            t: 'n',
            z: '#,##0.00'
          }

        ]);
      }
    );


    datos.push(
      ['']
    );


    datos.push([

      'TOTAL MONETARIO',

      '',

      {
        v:
          totalEvac,
        t: 'n',
        z: '#,##0.00'
      }

    ]);


    const ws =
      XLSX.utils.aoa_to_sheet(
        datos
      );


    ws['!cols'] = [

      { wch: 12 },
      { wch: 38 },

      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 }
    ];


    XLSX.utils.book_append_sheet(
      workbook,
      ws,
      nombreEvac
    );
  }


  private formatearFechaExcel(
    fecha: Date
  ): string {

    const año =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    const horas =
      String(
        fecha.getHours()
      ).padStart(2, '0');

    const minutos =
      String(
        fecha.getMinutes()
      ).padStart(2, '0');


    return (
      `${año}${mes}${dia}_` +
      `${horas}${minutos}`
    );
  }

}