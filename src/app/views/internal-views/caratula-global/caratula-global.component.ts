import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaratulasService } from '../../../services/caratulas.service';
import { MultimarcasService } from '../../../services/multimarcas.service';
import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TemporadaSelectorComponent } from '../../../components/temporada-selector/temporada-selector.component';
import { AvisoHistoricoComponent } from '../../../components/aviso-historico/aviso-historico.component';

@Component({
  selector: 'app-caratula-global',
  standalone: true,
  imports: [HomeBarComponent, CommonModule, RouterModule, TemporadaSelectorComponent, AvisoHistoricoComponent],
  templateUrl: './caratula-global.component.html',
  styleUrl: './caratula-global.component.css'
})
export class CaratulaGlobalComponent implements OnInit {
  totalMetaMY25: number = 0;
  totalMetaMY25_2: number = 0;

  totalAcumulado: number = 0;
  totalAcumulado_2: number = 0;

  proyectadoMonto1: number = 0;
  avance_proyectado_monto1: number = 0;
  avance_proyectado_monto2: number = 0;
  avance_proyectado_monto3: number = 0;

  semanasTranscurridas: number = 0;
  semanasEnTemporada: number = 52;

  acumuladoGeneral: number = 0;

  metaPrincipal = 185000000.00;

  porcentajeMonto1: number | null = null;
  porcentajeMonto2: number | null = null;
  porcentajeMonto3: number | null = null;

  metaVittorria: number = 0;
  metaSyncros: number = 0;
  metaApparel: number = 0;
  metaScott: number = 0;

  proyectadoVittoria: number = 0;
  proyectadoSyncros: number = 0;
  proyectadoApparel: number = 0;
  proyectadoScott: number = 0;

  acumuladoScott: number = 0;
  acumuladoApparel: number = 0;

  porcentajeScott: number | null = null;
  porcentajeApparel: number | null = null;
  porcentajeScott_2: number | null = null;
  porcentajeApparel_2: number | null = null;

  diferencia1: number = 0;

  temporadasDisponibles: string[] = [];
  modoHistorico = false;
  temporadaHistoricaSeleccionada: string | null = null;

  constructor(
    private caratulasService: CaratulasService,
    private router: Router,
    private multimarcasService: MultimarcasService
  ) { }

  ngOnInit(): void {
    this.semanasTranscurridas = this.obtenerSemanasTranscurridas();

    this.calculateTotalMeta();
    this.calculateTotalMeta2();
    this.calculateTotalAcumulado();
    this.calculateTotalAcumulado2();
    this.calculateAcumuladoGeneral();
    this.calculateAcumuladoScott();
    this.calculateAcumuladoApparel();

    this.calcularMetaVittoria();
    this.calcularMetaSyncros();
    this.calcularMetaApparel();
    this.calcularMetaScott();

    this.calcularProyectadoMonto3();
    this.calcularPorcentajeMonto2();
    this.calcularProyectadoVittoria();
    this.calcularProyectadoSyncros();
    this.calcularProyectadoApparel();
    this.calcularProyectadoScott();
    this.calcularPorcentajeScott();
    this.calcularPorcentajeApparel();
    this.calcularPorcentajeScott_2();
    this.calcularPorcentajeApparel_2();
    this.calcularDiferencia1();

    this.cargarTemporadasDisponibles();
  }

  cargarTemporadasDisponibles(): void {
    this.caratulasService.getTemporadasDisponibles().subscribe({
      next: (temporadas) => this.temporadasDisponibles = temporadas,
      error: (err) => console.error('Error cargando temporadas disponibles:', err)
    });
  }

  // Mismos miembros de Grupos Integral que excluye /datos_previo en vivo: su
  // avance ya esta representado por la fila "Integral N" -- sumarlos aparte
  // duplicaria el monto (previo_historico no aplica esa exclusion como si lo
  // hace el endpoint en vivo, asi que se replica aqui para el total general).
  private readonly CLAVES_INTEGRAL_MIEMBROS = new Set([
    'JC539', 'EC216', 'LC657',
    'GC411', 'MC679', 'MC677',
    'LC625', 'LC626', 'LC627',
    'LD653', 'MD680', 'ID492',
    'LD660', 'NA718', '7C042'
  ]);

  private readonly NIVELES_PARTNER_PLUS = new Set(['Partner', 'Partner Elite', 'Partner Elite Plus']);

  verTemporadaPasada(temporada: string): void {
    if (!temporada) {
      this.volverATemporadaActual();
      return;
    }
    this.modoHistorico = true;
    this.temporadaHistoricaSeleccionada = temporada;
    this.caratulasService.getDatosPrevioHistorico(temporada).subscribe({
      next: (datos) => {
        const datosSinDuplicados = datos.filter((item: any) => !this.CLAVES_INTEGRAL_MIEMBROS.has(item.clave));

        this.acumuladoGeneral = datosSinDuplicados
          .reduce((total: number, item: any) => total + (Number(item.acumulado_anticipado) || 0), 0);

        this.totalAcumulado = datosSinDuplicados
          .filter((item: any) => this.NIVELES_PARTNER_PLUS.has(item.nivel))
          .reduce((total: number, item: any) => total + (Number(item.acumulado_anticipado) || 0), 0);

        this.totalAcumulado_2 = datosSinDuplicados
          .filter((item: any) => item.nivel === 'Distribuidor')
          .reduce((total: number, item: any) => total + (Number(item.acumulado_anticipado) || 0), 0);

        // Seccion b) Especifico -- por categoria de producto (SCOTT / APPAREL-SYNCROS-VITTORIA),
        // no por nivel de cliente. Multimarcas no aplica a temporadas cerradas.
        this.acumuladoScott = datosSinDuplicados.reduce((total: number, item: any) =>
          total + (Number(item.avance_global_scott) || 0) + (Number(item.acumulado_bold) || 0), 0);

        this.acumuladoApparel = datosSinDuplicados.reduce((total: number, item: any) =>
          total + (Number(item.avance_global_apparel_syncros_vittoria) || 0), 0);

        // Temporada cerrada -> "Avance Proyectado" ya no es una fraccion de semanas
        // transcurridas (eso es para la temporada EN CURSO): la proyeccion de una
        // temporada terminada es su propia meta completa (100%).
        this.avance_proyectado_monto3 = this.metaPrincipal;
        this.avance_proyectado_monto1 = this.totalMetaMY25;
        this.avance_proyectado_monto2 = this.totalMetaMY25_2;
        this.proyectadoScott = this.metaScott;
        this.proyectadoApparel = this.metaApparel;

        this.calcularPorcentajeMonto1();
        this.calcularPorcentajeMonto2();
        this.calcularPorcentajeMonto3();
        this.calcularPorcentajeScott();
        this.calcularPorcentajeApparel();
        this.calcularPorcentajeScott_2();
        this.calcularPorcentajeApparel_2();
        this.calcularDiferencia1();
      },
      error: (err) => console.error('Error cargando temporada historica:', err)
    });
  }

  volverATemporadaActual(): void {
    this.modoHistorico = false;
    this.temporadaHistoricaSeleccionada = null;
    this.ngOnInit();
  }

  get totalAcumuladoCategorias(): number {
    return (Number(this.acumuladoScott) || 0) + (Number(this.acumuladoApparel) || 0);
  }

  get totalProyectadoCategorias(): number {
    return (Number(this.proyectadoScott) || 0) + (Number(this.proyectadoApparel) || 0);
  }

  get otrosProductos(): number {
    return Number(this.diferencia1) || 0;
  }

  calcularDiferencia1(): void {
    const diferencia =
      (Number(this.acumuladoGeneral) || 0) -
      ((Number(this.acumuladoScott) || 0) + (Number(this.acumuladoApparel) || 0));

    this.diferencia1 = Math.round(diferencia * 100) / 100;
  }

  obtenerFechaHoy(): string {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('es-ES', opciones);
  }

  obtenerDiaTemporada(): number {
    const semanaISO = this.obtenerSemanaISO();
    return semanaISO - 26;
  }

  calculateTotalMeta(): void {
    forkJoin([
      this.caratulasService.getDatosEvacA(),
      this.caratulasService.getDatosEvacB()
    ]).subscribe({
      next: ([datosA, datosB]) => {
        const my25A = datosA.find((item: any) => item.categoria === 'MY25');
        const my25B = datosB.find((item: any) => item.categoria === 'MY25');

        if (my25A && my25B) {
          this.totalMetaMY25 = my25A.meta + my25B.meta;
          this.calcularProyectadoMonto1();
        } else {
          console.error('No se encontraron datos MY25 en uno o ambos conjuntos');
        }
      },
      error: (err) => {
        console.error('Error al obtener los datos:', err);
      }
    });
  }

  calcularMetaVittoria(): void {
    this.metaVittorria = 3655126.16 * 2;
  }

  calcularMetaSyncros(): void {
    this.metaSyncros = 4874083.92 * 1.8;
  }

  calcularMetaApparel(): void {
    this.caratulasService.getDatosPrevio().subscribe({
      next: (datosPrevio) => {
        try {
          this.metaApparel = datosPrevio.reduce((total: number, item: any) => {
            return total + (Number(item.compromiso_apparel_syncros_vittoria) || 0);
          }, 0);

          this.calcularMetaScott();
          this.calcularProyectadoApparel();
          this.calcularPorcentajeApparel();
          this.calcularPorcentajeApparel_2();

        } catch (e) {
          console.error('Error calculando meta apparel:', e);
          this.metaApparel = 0;
          this.calcularMetaScott();
          this.calcularProyectadoApparel();
        }
      },
      error: (err) => {
        console.error('Error obteniendo datos previos:', err);
        this.metaApparel = 0;
      }
    });
  }

  calcularMetaScott(): void {
    const metaApparelValue = Number(this.metaApparel) || 0;

    this.metaScott = this.metaPrincipal - metaApparelValue;

    this.calcularProyectadoScott();
    this.calcularPorcentajeScott();
    this.calcularPorcentajeScott_2();
  }

  calcularProyectadoVittoria(): void {
    if (this.metaVittorria === 0) return;

    this.proyectadoVittoria = (this.semanasTranscurridas / this.semanasEnTemporada) * this.metaVittorria;
    this.proyectadoVittoria = Math.round(this.proyectadoVittoria * 100) / 100;
  }

  calcularProyectadoSyncros(): void {
    if (this.metaSyncros === 0) return;

    this.proyectadoSyncros = (this.semanasTranscurridas / this.semanasEnTemporada) * this.metaSyncros;
    this.proyectadoSyncros = Math.round(this.proyectadoSyncros * 100) / 100;
  }

  calcularProyectadoApparel(): void {
    if (this.metaApparel === 0) return;

    this.proyectadoApparel = (this.semanasTranscurridas / this.semanasEnTemporada) * this.metaApparel;
    this.proyectadoApparel = Math.round(this.proyectadoApparel * 100) / 100;
  }

  calcularProyectadoScott(): void {
    if (this.metaScott === 0) return;

    this.proyectadoScott = (this.semanasTranscurridas / this.semanasEnTemporada) * this.metaScott;
    this.proyectadoScott = Math.round(this.proyectadoScott * 100) / 100;
  }

  calculateTotalMeta2(): void {
    forkJoin([
      this.caratulasService.getDatosEvacA(),
      this.caratulasService.getDatosEvacB()
    ]).subscribe({
      next: ([datosA, datosB]) => {
        const my25A = datosA.find((item: any) => item.categoria === 'MY25_2');
        const my25B = datosB.find((item: any) => item.categoria === 'MY25_2');

        if (my25A && my25B) {
          this.totalMetaMY25_2 = my25A.meta + my25B.meta;
          this.calcularProyectadoMonto2();
        } else {
          console.error('No se encontraron datos MY25_2 en uno o ambos conjuntos');
        }
      },
      error: (err) => {
        console.error('Error al obtener los datos:', err);
      }
    });
  }

  calculateTotalAcumulado(): void {
    forkJoin([
      this.caratulasService.getDatosEvacA(),
      this.caratulasService.getDatosEvacB()
    ]).subscribe({
      next: ([datosA, datosB]) => {
        const my25A = datosA.find((item: any) => item.categoria === 'MY25');
        const my25B = datosB.find((item: any) => item.categoria === 'MY25');

        if (my25A && my25B) {
          this.totalAcumulado = my25A.acumulado_real + my25B.acumulado_real;
          this.calcularPorcentajeMonto2();
        } else {
          console.error('No se encontraron datos MY25 en uno o ambos conjuntos');
        }
      },
      error: (err) => {
        console.error('Error al obtener los datos:', err);
      }
    });
  }

  calculateTotalAcumulado2(): void {
    forkJoin([
      this.caratulasService.getDatosEvacA(),
      this.caratulasService.getDatosEvacB()
    ]).subscribe({
      next: ([datosA, datosB]) => {
        const my25A = datosA.find((item: any) => item.categoria === 'MY25_2');
        const my25B = datosB.find((item: any) => item.categoria === 'MY25_2');

        if (my25A && my25B) {
          this.totalAcumulado_2 = my25A.acumulado_real + my25B.acumulado_real;
          this.calcularPorcentajeMonto3();
        } else {
          console.error('No se encontraron datos MY25_2 en uno o ambos conjuntos');
        }
      },
      error: (err) => {
        console.error('Error al obtener los datos:', err);
      }
    });
  }

  obtenerSemanaISO(fecha: Date = new Date()): number {
    const date = new Date(fecha.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  /** Semanas transcurridas desde el inicio REAL de la temporada (1 jul 2025),
   * no desde "la semana ISO 26 mas reciente" -- ese calculo por modulo de
   * calendario se reiniciaba cada año en la semana 26 (~fin de junio),
   * dando semanas absurdamente bajas (p. ej. 3) apenas pasaba esa semana en
   * 2026 aunque la temporada llevara +50 semanas corriendo. Acotado a
   * [0, 52] para que el proyectado nunca exceda la meta una vez terminada
   * la duracion normal de una temporada. */
  obtenerSemanasTranscurridas(): number {
    const FECHA_INICIO_TEMPORADA = new Date(2025, 6, 1); // 1 jul 2025
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy.getTime() - FECHA_INICIO_TEMPORADA.getTime()) / 86400000);
    return Math.max(0, Math.min(52, Math.floor(dias / 7)));
  }

  calcularProyectadoMonto1(): void {
    if (this.totalMetaMY25 === 0) return;

    this.avance_proyectado_monto1 = (this.semanasTranscurridas / this.semanasEnTemporada) * this.totalMetaMY25;
    this.avance_proyectado_monto1 = Math.round(this.avance_proyectado_monto1 * 100) / 100;
    this.calcularPorcentajeMonto2();
  }

  calcularProyectadoMonto2(): void {
    if (this.totalMetaMY25_2 === 0) return;

    this.avance_proyectado_monto2 = (this.semanasTranscurridas / this.semanasEnTemporada) * this.totalMetaMY25_2;
    this.avance_proyectado_monto2 = Math.round(this.avance_proyectado_monto2 * 100) / 100;
    this.calcularPorcentajeMonto3();
  }

  calcularProyectadoMonto3(): void {
    if (this.metaPrincipal === 0) return;

    this.avance_proyectado_monto3 = (this.semanasTranscurridas / this.semanasEnTemporada) * this.metaPrincipal;
    this.avance_proyectado_monto3 = Math.round(this.avance_proyectado_monto3 * 100) / 100;
    this.calcularPorcentajeMonto1();
  }

  calculateAcumuladoGeneral(): void {
    forkJoin([
      this.caratulasService.getDatosPrevio(),
      this.multimarcasService.getMultimarcasTodo(),
      this.caratulasService.getVentasNoRegistradas()
    ]).subscribe({
      next: ([datosPrevio, multimarcas, ventasNoRegistradas]) => {
        try {
          const sumPrevio = datosPrevio.reduce((total: number, item: any) => {
            return total + (Number(item.acumulado_anticipado) || 0);
          }, 0);

          const sumMultimarcas = multimarcas.reduce((total: number, item: any) => {
            return total + (Number(item.avance_global) || 0);
          }, 0);

          const sumNoRegistradas = Number(ventasNoRegistradas?.total) || 0;

          this.acumuladoGeneral = sumPrevio + sumMultimarcas + sumNoRegistradas;

          this.calcularPorcentajeMonto1();
          this.calcularDiferencia1();

        } catch (e) {
          console.error('Error procesando datos:', e);
        }
      },
      error: (err) => {
        console.error('Error en servicios:', err);
      }
    });
  }

  calculateAcumuladoScott(): void {
    forkJoin([
      this.caratulasService.getDatosPrevio(),
      this.multimarcasService.getMultimarcasTodo(),
      this.caratulasService.getVentasNoRegistradas()
    ]).subscribe({
      next: ([datosPrevio, multimarcas, ventasNoRegistradas]) => {
        try {
          const sumPrevio = datosPrevio.reduce((total: number, item: any) => {
            return total
              + (Number(item.avance_global_scott) || 0)
              + (Number(item.acumulado_bold) || 0);
          }, 0);

          const sumMultimarcas = multimarcas.reduce((total: number, item: any) => {
            return total + (Number(item.avance_global_scott) || 0);
          }, 0);

          const sumNoRegistradas =
            (Number(ventasNoRegistradas?.scott) || 0) + (Number(ventasNoRegistradas?.bold) || 0);

          this.acumuladoScott = sumPrevio + sumMultimarcas + sumNoRegistradas;

          this.calcularPorcentajeScott();
          this.calcularPorcentajeScott_2();
          this.calcularDiferencia1();

        } catch (e) {
          console.error('Error procesando datos:', e);
        }
      },
      error: (err) => {
        console.error('Error en servicios:', err);
      }
    });
  }

  calculateAcumuladoApparel(): void {
    forkJoin([
      this.caratulasService.getDatosPrevio(),
      this.multimarcasService.getMultimarcasTodo(),
      this.caratulasService.getVentasNoRegistradas()
    ]).subscribe({
      next: ([datosPrevio, multimarcas, ventasNoRegistradas]) => {
        try {
          const sumPrevio = datosPrevio.reduce((total: number, item: any) => {
            return total + (Number(item.avance_global_apparel_syncros_vittoria) || 0);
          }, 0);

          const sumMultimarcas = multimarcas.reduce((total: number, item: any) => {
            const sumItem =
              (Number(item.avance_global_vittoria) || 0) +
              (Number(item.avance_global_syncros) || 0) +
              (Number(item.avance_global_apparel) || 0);

            return total + sumItem;
          }, 0);

          const sumNoRegistradas =
            (Number(ventasNoRegistradas?.vittoria) || 0) +
            (Number(ventasNoRegistradas?.syncros) || 0) +
            (Number(ventasNoRegistradas?.apparel) || 0);

          this.acumuladoApparel = sumPrevio + sumMultimarcas + sumNoRegistradas;

          this.calcularPorcentajeApparel();
          this.calcularPorcentajeApparel_2();
          this.calcularDiferencia1();

        } catch (e) {
          console.error('Error procesando datos:', e);
        }
      },
      error: (err) => {
        console.error('Error en servicios:', err);
      }
    });
  }

  calcularPorcentajeMonto1(): void {
    if (
      this.acumuladoGeneral === null ||
      this.avance_proyectado_monto3 === null ||
      this.avance_proyectado_monto3 === 0
    ) {
      this.porcentajeMonto1 = null;
      return;
    }

    const valorCalculado = (this.acumuladoGeneral / this.avance_proyectado_monto3) - 1;
    this.porcentajeMonto1 = Math.round(valorCalculado * 100) / 100;
  }

  calcularPorcentajeMonto2(): void {
    if (
      this.totalAcumulado === null ||
      this.avance_proyectado_monto1 === null ||
      this.avance_proyectado_monto1 === 0
    ) {
      this.porcentajeMonto2 = null;
      return;
    }

    const valorCalculado = (this.totalAcumulado / this.avance_proyectado_monto1) - 1;
    this.porcentajeMonto2 = Math.round(valorCalculado * 100) / 100;
  }

  calcularPorcentajeMonto3(): void {
    if (
      this.totalAcumulado_2 === null ||
      this.avance_proyectado_monto2 === null ||
      this.avance_proyectado_monto2 === 0
    ) {
      this.porcentajeMonto3 = null;
      return;
    }

    const valorCalculado = (this.totalAcumulado_2 / this.avance_proyectado_monto2) - 1;
    this.porcentajeMonto3 = Math.round(valorCalculado * 100) / 100;
  }

  calcularPorcentajeScott(): void {
    if (this.proyectadoScott === null || this.proyectadoScott === 0 || this.acumuladoScott === null) {
      this.porcentajeScott = null;
      return;
    }

    const porcentaje = ((this.acumuladoScott / this.proyectadoScott) - 1) * 100;
    this.porcentajeScott = Math.round(porcentaje);
  }

  calcularPorcentajeApparel(): void {
    if (this.proyectadoApparel === null || this.proyectadoApparel === 0 || this.acumuladoApparel === null) {
      this.porcentajeApparel = null;
      return;
    }

    const porcentaje = ((this.acumuladoApparel / this.proyectadoApparel) - 1) * 100;
    this.porcentajeApparel = Math.round(porcentaje);
  }

  calcularPorcentajeScott_2(): void {
    if (this.metaScott === null || this.metaScott === 0 || this.acumuladoScott === null) {
      this.porcentajeScott_2 = null;
      return;
    }

    const porcentaje = ((this.acumuladoScott / this.metaScott) - 1) * 100;
    this.porcentajeScott_2 = Math.round(porcentaje);
  }

  calcularPorcentajeApparel_2(): void {
    if (this.metaApparel === null || this.metaApparel === 0 || this.acumuladoApparel === null) {
      this.porcentajeApparel_2 = null;
      return;
    }

    const porcentaje = ((this.acumuladoApparel / this.metaApparel) - 1) * 100;
    this.porcentajeApparel_2 = Math.round(porcentaje);
  }
}