import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaratulasService } from '../../../services/caratulas.service';
import { MultimarcasService } from '../../../services/multimarcas.service';
import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-caratula-global',
  standalone: true,
  imports: [HomeBarComponent, CommonModule, RouterModule],
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

  obtenerSemanasTranscurridas(): number {
    const semanaActual = this.obtenerSemanaISO();
    const semanaInicioTemporada = 26;

    if (semanaActual < semanaInicioTemporada) {
      return (52 - semanaInicioTemporada) + semanaActual;
    }
    return semanaActual - semanaInicioTemporada;
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
      this.multimarcasService.getMultimarcasTodo()
    ]).subscribe({
      next: ([datosPrevio, multimarcas]) => {
        try {
          const sumPrevio = datosPrevio.reduce((total: number, item: any) => {
            return total + (Number(item.acumulado_anticipado) || 0);
          }, 0);

          const sumMultimarcas = multimarcas.reduce((total: number, item: any) => {
            return total + (Number(item.avance_global) || 0);
          }, 0);

          this.acumuladoGeneral = sumPrevio + sumMultimarcas;

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
      this.multimarcasService.getMultimarcasTodo()
    ]).subscribe({
      next: ([datosPrevio, multimarcas]) => {
        try {
          const sumPrevio = datosPrevio.reduce((total: number, item: any) => {
            return total
              + (Number(item.avance_global_scott) || 0)
              + (Number(item.acumulado_bold) || 0);
          }, 0);

          const sumMultimarcas = multimarcas.reduce((total: number, item: any) => {
            return total + (Number(item.avance_global_scott) || 0);
          }, 0);

          this.acumuladoScott = sumPrevio + sumMultimarcas;

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
      this.multimarcasService.getMultimarcasTodo()
    ]).subscribe({
      next: ([datosPrevio, multimarcas]) => {
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

          this.acumuladoApparel = sumPrevio + sumMultimarcas;

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