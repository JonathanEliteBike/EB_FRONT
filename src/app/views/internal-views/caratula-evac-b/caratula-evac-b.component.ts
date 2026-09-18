import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { CaratulasService } from '../../../services/caratulas.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { FiltroComponent } from '../../../components/filtro/filtro.component';
import {
  FiltroOrdenComponent,
  OrdenDirection
} from '../../../components/filtro-orden/filtro-orden.component';


interface Cliente {
  nombre_cliente: string;
  nivel: string;
  compra_minima_anual: number;
  acumulado_anticipado: number;
  avance_proyectado?: number;

  // =========================================================
  // COMPROMISOS Y AVANCES
  // =========================================================
  compromiso_scott?: number;
  avance_global_scott?: number;

  compromiso_apparel_syncros_vittoria?: number;
  avance_global_apparel_syncros_vittoria?: number;

  // =========================================================
  // PERIODOS BICICLETAS
  // =========================================================
  compromiso_jul_ago?: number;
  avance_jul_ago?: number;

  compromiso_sep_oct?: number;
  avance_sep_oct?: number;

  compromiso_nov_dic?: number;
  avance_nov_dic?: number;

  // =========================================================
  // PERIODOS APPAREL
  // =========================================================
  compromiso_jul_ago_app?: number;
  avance_jul_ago_app?: number;

  compromiso_sep_oct_app?: number;
  avance_sep_oct_app?: number;

  compromiso_nov_dic_app?: number;
  avance_nov_dic_app?: number;

  // UI
  expanded?: boolean;
}


interface ResumenEvacMy27 {
  meta: number;
  categoria: number;
  distribuidor: number;

  bicicletas: number;
  apparel: number;

  acumulado_general: number;
  acumulado_bicicletas: number;
  acumulado_apparel: number;
  acumulado_otros: number;
  acumulado_megamo: number;
}


@Component({
  selector: 'app-caratula-evac-b',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    HomeBarComponent,
    FiltroComponent,
    FiltroOrdenComponent
  ],

  templateUrl: './caratula-evac-b.component.html',
  styleUrl: './caratula-evac-b.component.css'
})
export class CaratulaEvacBComponent implements OnInit {

  @Output() onInit = new EventEmitter<void>();


  // =========================================================
  // ESTADO
  // =========================================================

  meta = '';

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];

  loading = false;
  error: string | null = null;


  // =========================================================
  // RESUMEN MAESTRO MY27
  // =========================================================

  private resumenEvacBMy27: ResumenEvacMy27 | null = null;

  resumenMy27Cargado = false;

  acumuladoGeneralMy27 = 0;
  acumuladoOtrosMy27 = 0;
  acumuladoMegamoMy27 = 0;


  // =========================================================
  // META / ACUMULADO
  // =========================================================

  // Partner + Partner Elite + Partner Elite Plus
  my25_monto1 = 0;

  // Distribuidor
  my25_monto2 = 0;

  // Acumulado Categoría
  my25_monto3 = 0;

  // Acumulado Distribuidor
  my25_monto4 = 0;


  // =========================================================
  // PROYECCIONES
  // =========================================================

  avance_proyectado_monto1 = 0;
  avance_proyectado_monto2 = 0;


  // =========================================================
  // LÍNEAS
  // =========================================================

  montoCompromisoApparel = 0;
  montoCompromisoScott = 0;

  avanceGlobalScott = 0;
  avanceGlobaApparel = 0;

  avance_proyectado_scott = 0;
  avance_proyectado_apparel = 0;


  // =========================================================
  // FILTROS
  // =========================================================

  filtroOpciones = {
    nombre_cliente: [] as any[],
    nivel: [] as any[]
  };

  filtrosAplicados = {
    nombre_cliente: [] as string[],
    nivel: [] as string[]
  };


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private caratulasService: CaratulasService,
    private router: Router
  ) { }


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.cargarClientes();
    this.onInit.emit();
  }


  // =========================================================
  // CLIENTES
  // =========================================================

  cargarClientes(): void {

    this.loading = true;
    this.error = null;

    this.resumenEvacBMy27 = null;
    this.resumenMy27Cargado = false;

    this.acumuladoGeneralMy27 = 0;
    this.acumuladoOtrosMy27 = 0;
    this.acumuladoMegamoMy27 = 0;

    this.caratulasService
      .getClientesEvacB()
      .subscribe({

        next: (data: Cliente[]) => {

          const clientesFiltrados = [...data];

          const ordenNiveles: { [key: string]: number } = {
            'Partner Elite Plus': 1,
            'Partner Elite': 2,
            'Partner': 3,
            'Distribuidor': 4
          };

          clientesFiltrados.sort(
            (a: Cliente, b: Cliente) => {

              const nivelA =
                ordenNiveles[a.nivel] || 99;

              const nivelB =
                ordenNiveles[b.nivel] || 99;

              return nivelA - nivelB;
            }
          );

          this.clientes = clientesFiltrados;

          this.prepararOpcionesFiltros();
          this.filtrarClientes();

          // =================================================
          // Calculamos primero usando clientes como fallback
          // mientras llega el resumen maestro.
          // =================================================

          this.calcularMontosDesdeClientes();

          // =================================================
          // Después cargamos fuente oficial MY27.
          // =================================================

          this.cargarResumenEvacBMy27();
        },

        error: (error) => {

          console.error(
            'Error cargando clientes EVAC-B:',
            error
          );

          this.error =
            'Error al cargar los clientes';

          this.loading = false;
        }
      });
  }


  recargarClientes(): void {
    this.cargarClientes();
  }


  // =========================================================
  // RESUMEN MAESTRO MY27
  // =========================================================

  private cargarResumenEvacBMy27(): void {

    this.caratulasService
      .getResumenCaratulasMy27()
      .subscribe({

        next: (resumen: any) => {

          console.log(
            'RESPUESTA COMPLETA RESUMEN MY27:',
            resumen
          );

          const evacB =
            resumen?.evac_b as ResumenEvacMy27;

          if (!evacB) {

            console.error(
              'El backend no devolvió resumen.evac_b'
            );

            this.resumenEvacBMy27 = null;
            this.resumenMy27Cargado = false;

            // Dejamos los valores calculados
            // desde clientes como fallback.
            this.recalcularProyecciones();

            this.loading = false;

            return;
          }


          // =================================================
          // GUARDAR RESUMEN
          // =================================================

          this.resumenEvacBMy27 = evacB;


          // =================================================
          // METAS OFICIALES
          // =================================================

          this.my25_monto1 =
            this.redondear(
              Number(evacB.categoria) || 0
            );

          this.my25_monto2 =
            this.redondear(
              Number(evacB.distribuidor) || 0
            );


          // =================================================
          // ACUMULADO GENERAL OFICIAL
          // =================================================

          this.acumuladoGeneralMy27 =
            this.redondear(
              Number(evacB.acumulado_general) || 0
            );


          // =================================================
          // OTROS / MEGAMO
          // =================================================

          this.acumuladoOtrosMy27 =
            this.redondear(
              Number(evacB.acumulado_otros) || 0
            );

          this.acumuladoMegamoMy27 =
            this.redondear(
              Number(evacB.acumulado_megamo) || 0
            );


          // =================================================
          // METAS DE LÍNEA
          // =================================================

          this.montoCompromisoScott =
            this.redondear(
              Number(evacB.bicicletas) || 0
            );

          this.montoCompromisoApparel =
            this.redondear(
              Number(evacB.apparel) || 0
            );


          // =================================================
          // ACUMULADOS DE LÍNEA
          // =================================================

          this.avanceGlobalScott =
            this.redondear(
              Number(
                evacB.acumulado_bicicletas
              ) || 0
            );

          this.avanceGlobaApparel =
            this.redondear(
              Number(
                evacB.acumulado_apparel
              ) || 0
            );


          // =================================================
          // A PARTIR DE AQUÍ MANDA EL RESUMEN MAESTRO
          // =================================================

          this.resumenMy27Cargado = true;


          // =================================================
          // CATEGORÍA / DISTRIBUIDOR ACUMULADO
          //
          // El endpoint maestro todavía no separa
          // acumulado de Categoría y Distribuidor.
          // Por eso estos dos siguen saliendo del detalle
          // de clientes.
          // =================================================

          this.calcularMonto3();
          this.calcularMonto4();


          // =================================================
          // PROYECCIONES
          // =================================================

          this.recalcularProyecciones();


          // =================================================
          // VALIDACIÓN EN CONSOLA
          // =================================================

          console.log(
            'EVAC-B MY27 CARGADO:',
            {

              metaGeneral:
                this.obtenerMetaTotalNumero(),

              categoria: {
                meta:
                  this.my25_monto1,

                acumulado:
                  this.my25_monto3
              },

              distribuidor: {
                meta:
                  this.my25_monto2,

                acumulado:
                  this.my25_monto4
              },

              acumuladoGeneral:
                this.acumuladoGeneralMy27,

              bicicletas: {
                meta:
                  this.montoCompromisoScott,

                acumulado:
                  this.avanceGlobalScott
              },

              apparel: {
                meta:
                  this.montoCompromisoApparel,

                acumulado:
                  this.avanceGlobaApparel
              },

              otros:
                this.acumuladoOtrosMy27,

              megamo:
                this.acumuladoMegamoMy27,

              validacionLineas:
                this.redondear(
                  this.avanceGlobalScott +
                  this.avanceGlobaApparel +
                  this.acumuladoOtrosMy27
                )
            }
          );


          // =================================================
          // GUARDAR CARÁTULA
          // =================================================

          this.actualizarDatosCaratula();
        },

        error: (error) => {

          console.error(
            'Error cargando resumen maestro EVAC-B:',
            error
          );

          this.resumenEvacBMy27 = null;
          this.resumenMy27Cargado = false;

          this.recalcularProyecciones();

          this.loading = false;
        }
      });
  }


  // =========================================================
  // CÁLCULOS DESDE CLIENTES
  // =========================================================

  private calcularMontosDesdeClientes(): void {

    this.calcularMonto1();
    this.calcularMonto2();

    this.calcularMonto3();
    this.calcularMonto4();

    this.calcularCompromisoApparel();
    this.calcularCompromisoScott();

    this.calcularAvanceGlobalScott();
    this.calcularAvanceGlobalApparel();

    this.recalcularProyecciones();
  }


  // =========================================================
  // RECALCULAR PROYECCIONES
  // =========================================================

  private recalcularProyecciones(): void {

    this.calcularAvanceProyectadoMonto1();
    this.calcularAvanceProyectadoMonto2();

    this.calcularAvanceProyectadoScott();
    this.calcularAvanceProyectadoApparel();
  }


  // =========================================================
  // EXPANDIR CLIENTE
  // =========================================================

  toggleCliente(cliente: Cliente): void {
    cliente.expanded = !cliente.expanded;
  }


  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  irACaratula(nombreCliente: string): void {

    this.router.navigate(
      ['/caratulas'],
      {
        queryParams: {
          q: nombreCliente
        }
      }
    );
  }


  // =========================================================
  // FILTROS
  // =========================================================

  private prepararOpcionesFiltros(): void {

    const nombresUnicos = [
      ...new Set(
        this.clientes.map(
          cliente =>
            cliente.nombre_cliente
        )
      )
    ];

    this.filtroOpciones.nombre_cliente =
      nombresUnicos.map(
        nombre => ({
          value: nombre,
          selected: false
        })
      );


    const nivelesUnicos = [
      ...new Set(
        this.clientes.map(
          cliente =>
            cliente.nivel
        )
      )
    ];

    this.filtroOpciones.nivel =
      nivelesUnicos.map(
        nivel => ({
          value: nivel,
          selected: false
        })
      );
  }


  public aplicarFiltro(
    campo: 'nombre_cliente' | 'nivel',
    valores: string[]
  ): void {

    this.filtrosAplicados[campo] =
      valores;

    this.filtrarClientes();
  }


  public limpiarFiltro(
    campo: 'nombre_cliente' | 'nivel'
  ): void {

    this.filtrosAplicados[campo] = [];

    this.filtrarClientes();
  }


  public limpiarTodosFiltros(): void {

    this.filtrosAplicados.nombre_cliente = [];
    this.filtrosAplicados.nivel = [];

    this.filtrarClientes();
  }


  private filtrarClientes(): void {

    this.clientesFiltrados =
      this.clientes.filter(
        cliente => {

          const cumpleFiltroNombre =
            this.filtrosAplicados
              .nombre_cliente
              .length === 0 ||

            this.filtrosAplicados
              .nombre_cliente
              .includes(
                cliente.nombre_cliente
              );


          const cumpleFiltroNivel =
            this.filtrosAplicados
              .nivel
              .length === 0 ||

            this.filtrosAplicados
              .nivel
              .includes(
                cliente.nivel
              );


          return (
            cumpleFiltroNombre &&
            cumpleFiltroNivel
          );
        }
      );
  }


  // =========================================================
  // ORDEN
  // =========================================================

  ordenarColumna(
    campo:
      | 'compromiso'
      | 'acumulado'
      | 'proyectado'
      | 'diferencia',

    direccion: OrdenDirection
  ): void {

    if (!direccion) {

      this.filtrarClientes();

      return;
    }


    this.clientesFiltrados.sort(
      (a, b) => {

        let valorA = 0;
        let valorB = 0;


        switch (campo) {

          case 'compromiso':

            valorA =
              a.compra_minima_anual || 0;

            valorB =
              b.compra_minima_anual || 0;

            break;


          case 'acumulado':

            valorA =
              a.acumulado_anticipado || 0;

            valorB =
              b.acumulado_anticipado || 0;

            break;


          case 'proyectado':

            valorA =
              this.calcularAvanceProyectadoCliente(
                a.compra_minima_anual
              );

            valorB =
              this.calcularAvanceProyectadoCliente(
                b.compra_minima_anual
              );

            break;


          case 'diferencia':

            valorA =
              this.calcularDiferencia(a);

            valorB =
              this.calcularDiferencia(b);

            break;
        }


        if (direccion === 'asc') {
          return valorA - valorB;
        }

        return valorB - valorA;
      }
    );
  }


  // =========================================================
  // META CATEGORÍA
  // =========================================================

  calcularMonto1(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.my25_monto1 = 0;

    const nivelesPermitidos = [
      'Partner',
      'Partner Elite',
      'Partner Elite Plus'
    ];


    this.clientes.forEach(
      cliente => {

        if (
          nivelesPermitidos.includes(
            cliente.nivel
          )
        ) {

          this.my25_monto1 +=
            Number(
              cliente.compra_minima_anual
            ) || 0;
        }
      }
    );


    this.my25_monto1 =
      this.redondear(
        this.my25_monto1
      );
  }


  // =========================================================
  // META DISTRIBUIDOR
  // =========================================================

  calcularMonto2(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.my25_monto2 = 0;


    this.clientes.forEach(
      cliente => {

        if (
          cliente.nivel ===
          'Distribuidor'
        ) {

          this.my25_monto2 +=
            Number(
              cliente.compra_minima_anual
            ) || 0;
        }
      }
    );


    this.my25_monto2 =
      this.redondear(
        this.my25_monto2
      );
  }


  // =========================================================
  // ACUMULADO CATEGORÍA
  // =========================================================

  calcularMonto3(): void {

    this.my25_monto3 = 0;

    const nivelesPermitidos = [
      'Partner',
      'Partner Elite',
      'Partner Elite Plus'
    ];


    this.clientes.forEach(
      cliente => {

        if (
          nivelesPermitidos.includes(
            cliente.nivel
          )
        ) {

          this.my25_monto3 +=
            Number(
              cliente.acumulado_anticipado
            ) || 0;
        }
      }
    );


    this.my25_monto3 =
      this.redondear(
        this.my25_monto3
      );
  }


  // =========================================================
  // ACUMULADO DISTRIBUIDOR
  // =========================================================

  calcularMonto4(): void {

    this.my25_monto4 = 0;


    this.clientes.forEach(
      cliente => {

        if (
          cliente.nivel ===
          'Distribuidor'
        ) {

          this.my25_monto4 +=
            Number(
              cliente.acumulado_anticipado
            ) || 0;
        }
      }
    );


    this.my25_monto4 =
      this.redondear(
        this.my25_monto4
      );
  }


  // =========================================================
  // META APPAREL
  // =========================================================

  calcularCompromisoApparel(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.montoCompromisoApparel = 0;


    this.clientes.forEach(
      cliente => {

        this.montoCompromisoApparel +=
          Number(
            cliente
              .compromiso_apparel_syncros_vittoria
          ) || 0;
      }
    );


    this.montoCompromisoApparel =
      this.redondear(
        this.montoCompromisoApparel
      );
  }


  // =========================================================
  // META BICICLETAS
  // =========================================================

  calcularCompromisoScott(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.montoCompromisoScott =
      (
        this.my25_monto1 +
        this.my25_monto2
      ) -
      this.montoCompromisoApparel;


    this.montoCompromisoScott =
      this.redondear(
        this.montoCompromisoScott
      );
  }


  // =========================================================
  // ACUMULADO BICICLETAS
  // =========================================================

  calcularAvanceGlobalScott(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.avanceGlobalScott = 0;


    this.clientes.forEach(
      cliente => {

        this.avanceGlobalScott +=
          Number(
            cliente.avance_global_scott
          ) || 0;
      }
    );


    this.avanceGlobalScott =
      this.redondear(
        this.avanceGlobalScott
      );
  }


  // =========================================================
  // ACUMULADO APPAREL
  // =========================================================

  calcularAvanceGlobalApparel(): void {

    if (this.resumenMy27Cargado) {
      return;
    }

    this.avanceGlobaApparel = 0;


    this.clientes.forEach(
      cliente => {

        this.avanceGlobaApparel +=
          Number(
            cliente
              .avance_global_apparel_syncros_vittoria
          ) || 0;
      }
    );


    this.avanceGlobaApparel =
      this.redondear(
        this.avanceGlobaApparel
      );
  }


  // =========================================================
  // META GENERAL
  // =========================================================

  obtenerMetaTotal(): string {

    return this.formatearMoneda(
      this.obtenerMetaTotalNumero()
    );
  }


  private obtenerMetaTotalNumero(): number {

    if (
      this.resumenMy27Cargado &&
      this.resumenEvacBMy27
    ) {

      return this.redondear(
        Number(
          this.resumenEvacBMy27.meta
        ) || 0
      );
    }


    return this.redondear(
      this.my25_monto1 +
      this.my25_monto2
    );
  }


  // =========================================================
  // ACUMULADO GENERAL
  // =========================================================

  obtenerAcumuladoTotal(): string {

    return this.formatearMoneda(
      this.obtenerAcumuladoTotalNumero()
    );
  }


  private obtenerAcumuladoTotalNumero(): number {

    // =======================================================
    // FUENTE OFICIAL MY27
    // =======================================================

    if (this.resumenMy27Cargado) {

      return this.redondear(
        this.acumuladoGeneralMy27
      );
    }


    // =======================================================
    // FALLBACK
    // =======================================================

    return this.redondear(
      this.my25_monto3 +
      this.my25_monto4
    );
  }


  // =========================================================
  // SEMANA ISO
  // =========================================================

  obtenerSemanaISO(
    fecha: Date = new Date()
  ): number {

    const date =
      new Date(
        fecha.getTime()
      );


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
  // SEMANA DE LA TEMPORADA
  // =========================================================

  obtenerDiaTemporada(): number {

    const semanaISO =
      this.obtenerSemanaISO();

    const semanaInicioTemporada = 26;


    if (
      semanaISO <
      semanaInicioTemporada
    ) {

      return (
        52 -
        semanaInicioTemporada
      ) +
      semanaISO;
    }


    return (
      semanaISO -
      semanaInicioTemporada
    );
  }


  // =========================================================
  // SEMANAS CERRADAS
  // =========================================================

  obtenerSemanasTranscurridas(): number {

    // Semana visible 9
    // =
    // 8 semanas cerradas.

    return Math.max(
      0,
      Math.min(
        52,
        this.obtenerDiaTemporada() - 1
      )
    );
  }


  // =========================================================
  // PROYECTADO CATEGORÍA
  // =========================================================

  calcularAvanceProyectadoMonto1(): void {

    if (!this.my25_monto1) {

      this.avance_proyectado_monto1 = 0;

      return;
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    this.avance_proyectado_monto1 =
      this.redondear(
        (
          semanas /
          52
        ) *
        this.my25_monto1
      );
  }


  // =========================================================
  // PROYECTADO DISTRIBUIDOR
  // =========================================================

  calcularAvanceProyectadoMonto2(): void {

    if (!this.my25_monto2) {

      this.avance_proyectado_monto2 = 0;

      return;
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    this.avance_proyectado_monto2 =
      this.redondear(
        (
          semanas /
          52
        ) *
        this.my25_monto2
      );
  }


  // =========================================================
  // PROYECTADO BICICLETAS
  // =========================================================

  calcularAvanceProyectadoScott(): void {

    if (!this.montoCompromisoScott) {

      this.avance_proyectado_scott = 0;

      return;
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    this.avance_proyectado_scott =
      this.redondear(
        (
          semanas /
          52
        ) *
        this.montoCompromisoScott
      );
  }


  // =========================================================
  // PROYECTADO APPAREL
  // =========================================================

  calcularAvanceProyectadoApparel(): void {

    if (!this.montoCompromisoApparel) {

      this.avance_proyectado_apparel = 0;

      return;
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    this.avance_proyectado_apparel =
      this.redondear(
        (
          semanas /
          52
        ) *
        this.montoCompromisoApparel
      );
  }


  // =========================================================
  // PROYECTADO GENERAL
  // =========================================================

  calcularAvanceProyectadoTotal(): void {

    this.recalcularProyecciones();
  }


  obtenerAvanceProyectadoTotalFormateado(): string {

    const metaTotal =
      this.obtenerMetaTotalNumero();


    if (!metaTotal) {
      return this.formatearMoneda(0);
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    const proyectado =
      (
        semanas /
        52
      ) *
      metaTotal;


    return this.formatearMoneda(
      this.redondear(
        proyectado
      )
    );
  }


  calcularYFormatearAvanceProyectado(
    metaValor: number
  ): string {

    if (!metaValor) {
      return this.formatearMoneda(0);
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    const proyectado =
      (
        semanas /
        52
      ) *
      metaValor;


    return this.formatearMoneda(
      this.redondear(
        proyectado
      )
    );
  }


  // =========================================================
  // PROYECTADO POR CLIENTE
  // =========================================================

  calcularAvanceProyectadoCliente(
    compraMinimaAnual: number
  ): number {

    if (!compraMinimaAnual) {
      return 0;
    }


    const semanas =
      this.obtenerSemanasTranscurridas();


    return this.redondear(
      (
        semanas /
        52
      ) *
      compraMinimaAnual
    );
  }


  // =========================================================
  // DIFERENCIA
  // =========================================================

  calcularDiferencia(
    cliente: Cliente
  ): number {

    const avanceProyectado =
      this.calcularAvanceProyectadoCliente(
        cliente.compra_minima_anual
      );


    const acumuladoReal =
      Number(
        cliente.acumulado_anticipado
      ) || 0;


    return avanceProyectado >
      acumuladoReal

      ? avanceProyectado -
        acumuladoReal

      : 0;
  }


  // =========================================================
  // PORCENTAJE GENERAL
  // =========================================================

  calcularPorcentajeEB(): string {

    const acumulado =
      this.obtenerAcumuladoTotalNumero();


    const metaTotal =
      this.obtenerMetaTotalNumero();


    const semanas =
      this.obtenerSemanasTranscurridas();


    const proyectado =
      (
        semanas /
        52
      ) *
      metaTotal;


    if (!proyectado) {
      return '0%';
    }


    const porcentaje =
      (
        (
          acumulado /
          proyectado
        ) -
        1
      ) *
      100;


    return `${Math.round(
      porcentaje
    )}%`;
  }


  // =========================================================
  // PORCENTAJE CATEGORÍA
  // =========================================================

  calcularPorcentajeMonto1(): string {

    const acumulado =
      this.my25_monto3;


    const proyectado =
      this.avance_proyectado_monto1;


    if (!proyectado) {
      return '0%';
    }


    const porcentaje =
      (
        (
          acumulado /
          proyectado
        ) -
        1
      ) *
      100;


    return `${Math.round(
      porcentaje
    )}%`;
  }


  // =========================================================
  // PORCENTAJE DISTRIBUIDOR
  // =========================================================

  calcularPorcentajeMonto2(): string {

    const acumulado =
      this.my25_monto4;


    const proyectado =
      this.avance_proyectado_monto2;


    if (!proyectado) {
      return '0%';
    }


    const porcentaje =
      (
        (
          acumulado /
          proyectado
        ) -
        1
      ) *
      100;


    return `${Math.round(
      porcentaje
    )}%`;
  }


  // =========================================================
  // PORCENTAJE BICICLETAS
  // =========================================================

  calcularPorcentajeScott(): string {

    if (
      !this.avance_proyectado_scott
    ) {

      return '0%';
    }


    const porcentaje =
      (
        (
          this.avanceGlobalScott /
          this.avance_proyectado_scott
        ) -
        1
      ) *
      100;


    return `${Math.round(
      porcentaje
    )}%`;
  }


  // =========================================================
  // PORCENTAJE APPAREL
  // =========================================================

  calcularPorcentajeApparel(): string {

    if (
      !this.avance_proyectado_apparel
    ) {

      return '0%';
    }


    const porcentaje =
      (
        (
          this.avanceGlobaApparel /
          this.avance_proyectado_apparel
        ) -
        1
      ) *
      100;


    return `${Math.round(
      porcentaje
    )}%`;
  }


  // =========================================================
  // FALTANTES
  // =========================================================

  private getMesActual(): number {
    return new Date().getMonth() + 1;
  }


  getFaltanteScott(
    cliente: Cliente
  ): number {

    const mes =
      this.getMesActual();


    let compromisoAcumulado =
      cliente.compromiso_jul_ago || 0;


    if (mes >= 9) {

      compromisoAcumulado +=
        cliente.compromiso_sep_oct || 0;
    }


    if (mes >= 11) {

      compromisoAcumulado +=
        cliente.compromiso_nov_dic || 0;
    }


    let avanceAcumulado =
      cliente.avance_jul_ago || 0;


    if (mes >= 9) {

      avanceAcumulado +=
        cliente.avance_sep_oct || 0;
    }


    if (mes >= 11) {

      avanceAcumulado +=
        cliente.avance_nov_dic || 0;
    }


    const diferencia =
      compromisoAcumulado -
      avanceAcumulado;


    return diferencia > 0
      ? diferencia
      : 0;
  }


  getMetaAcumuladaScott(
    cliente: Cliente
  ): number {

    const mes =
      this.getMesActual();


    let compromisoAcumulado =
      cliente.compromiso_jul_ago || 0;


    if (mes >= 9) {

      compromisoAcumulado +=
        cliente.compromiso_sep_oct || 0;
    }


    if (mes >= 11) {

      compromisoAcumulado +=
        cliente.compromiso_nov_dic || 0;
    }


    return compromisoAcumulado;
  }


  getFaltanteApparel(
    cliente: Cliente
  ): number {

    const mes =
      this.getMesActual();


    let compromisoAcumulado =
      cliente.compromiso_jul_ago_app || 0;


    if (mes >= 9) {

      compromisoAcumulado +=
        cliente.compromiso_sep_oct_app || 0;
    }


    if (mes >= 11) {

      compromisoAcumulado +=
        cliente.compromiso_nov_dic_app || 0;
    }


    let avanceAcumulado =
      cliente.avance_jul_ago_app || 0;


    if (mes >= 9) {

      avanceAcumulado +=
        cliente.avance_sep_oct_app || 0;
    }


    if (mes >= 11) {

      avanceAcumulado +=
        cliente.avance_nov_dic_app || 0;
    }


    const diferencia =
      compromisoAcumulado -
      avanceAcumulado;


    return diferencia > 0
      ? diferencia
      : 0;
  }


  getMetaAcumuladaApparel(
    cliente: Cliente
  ): number {

    const mes =
      this.getMesActual();


    let compromisoAcumulado =
      cliente.compromiso_jul_ago_app || 0;


    if (mes >= 9) {

      compromisoAcumulado +=
        cliente.compromiso_sep_oct_app || 0;
    }


    if (mes >= 11) {

      compromisoAcumulado +=
        cliente.compromiso_nov_dic_app || 0;
    }


    return compromisoAcumulado;
  }


  // =========================================================
  // ACTUALIZAR CARÁTULA EVAC-B
  // =========================================================

  actualizarDatosCaratula(): void {

    if (
      this.clientes.length === 0
    ) {

      console.warn(
        'No hay clientes cargados'
      );

      this.loading = false;

      return;
    }


    // =======================================================
    // IMPORTANTE:
    //
    // NO llamamos calcularMontosDesdeClientes()
    // aquí porque podría pisar el resumen maestro.
    // =======================================================

    this.calcularMonto3();
    this.calcularMonto4();

    this.recalcularProyecciones();


    // =======================================================
    // GENERAL
    // =======================================================

    const metaEB =
      this.obtenerMetaTotalNumero();


    const acumuladoEB =
      this.obtenerAcumuladoTotalNumero();


    const avanceProyectadoEB =
      this.redondear(
        (
          this.obtenerSemanasTranscurridas() /
          52
        ) *
        metaEB
      );


    // =======================================================
    // PAYLOAD
    // =======================================================

    const datos = [

      {
        categoria: 'EB',

        meta:
          metaEB,

        acumulado_real:
          acumuladoEB,

        avance_proyectado:
          avanceProyectadoEB,

        porcentaje:
          parseFloat(
            this
              .calcularPorcentajeEB()
              .replace('%', '')
          ) || 0
      },


      {
        categoria: 'MY25',

        meta:
          this.my25_monto1,

        acumulado_real:
          this.my25_monto3,

        avance_proyectado:
          this.avance_proyectado_monto1,

        porcentaje:
          parseFloat(
            this
              .calcularPorcentajeMonto1()
              .replace('%', '')
          ) || 0
      },


      {
        categoria: 'MY25_2',

        meta:
          this.my25_monto2,

        acumulado_real:
          this.my25_monto4,

        avance_proyectado:
          this.avance_proyectado_monto2,

        porcentaje:
          parseFloat(
            this
              .calcularPorcentajeMonto2()
              .replace('%', '')
          ) || 0
      },


      {
        categoria: 'SCOTT',

        meta:
          this.montoCompromisoScott,

        acumulado_real:
          this.avanceGlobalScott,

        avance_proyectado:
          this.avance_proyectado_scott,

        porcentaje:
          parseFloat(
            this
              .calcularPorcentajeScott()
              .replace('%', '')
          ) || 0
      },


      {
        categoria: 'APPAREL',

        meta:
          this.montoCompromisoApparel,

        acumulado_real:
          this.avanceGlobaApparel,

        avance_proyectado:
          this.avance_proyectado_apparel,

        porcentaje:
          parseFloat(
            this
              .calcularPorcentajeApparel()
              .replace('%', '')
          ) || 0
      }
    ];


    // =======================================================
    // DEBUG
    // =======================================================

    console.log(
      'EVAC-B FINAL ANTES DEL POST:',
      {

        semana:
          this.obtenerDiaTemporada(),

        semanasCerradas:
          this.obtenerSemanasTranscurridas(),

        metaGeneral:
          metaEB,

        acumuladoGeneral:
          acumuladoEB,

        avanceProyectadoGeneral:
          avanceProyectadoEB,

        porcentajeGeneral:
          this.calcularPorcentajeEB(),

        categoria: {
          meta:
            this.my25_monto1,

          acumulado:
            this.my25_monto3,

          proyectado:
            this.avance_proyectado_monto1,

          porcentaje:
            this.calcularPorcentajeMonto1()
        },

        distribuidor: {
          meta:
            this.my25_monto2,

          acumulado:
            this.my25_monto4,

          proyectado:
            this.avance_proyectado_monto2,

          porcentaje:
            this.calcularPorcentajeMonto2()
        },

        bicicletas: {
          meta:
            this.montoCompromisoScott,

          acumulado:
            this.avanceGlobalScott,

          proyectado:
            this.avance_proyectado_scott,

          porcentaje:
            this.calcularPorcentajeScott()
        },

        apparel: {
          meta:
            this.montoCompromisoApparel,

          acumulado:
            this.avanceGlobaApparel,

          proyectado:
            this.avance_proyectado_apparel,

          porcentaje:
            this.calcularPorcentajeApparel()
        },

        otros:
          this.acumuladoOtrosMy27,

        validacionGeneral:
          this.redondear(
            this.avanceGlobalScott +
            this.avanceGlobaApparel +
            this.acumuladoOtrosMy27
          )
      }
    );


    // =======================================================
    // GUARDAR
    // =======================================================

    this.caratulasService
      .actualizarCaratulaEvacB(datos)
      .subscribe({

        next: () => {

          this.loading = false;
        },

        error: (error) => {

          console.error(
            'Error actualizando EVAC-B:',
            error
          );

          this.loading = false;

          this.error =
            'Error al actualizar los datos: ' +
            (
              error.error?.error ||
              error.message
            );
        }
      });
  }


  // =========================================================
  // FECHA
  // =========================================================

  obtenerFechaHoy(): string {

    const hoy =
      new Date();


    return hoy.toLocaleDateString(
      'es-ES',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );
  }


  // =========================================================
  // HELPERS
  // =========================================================

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


  formatearMoneda(
    valor: number
  ): string {

    if (
      valor === null ||
      valor === undefined ||
      isNaN(valor)
    ) {

      return '$0.00';
    }


    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(valor);
  }

}