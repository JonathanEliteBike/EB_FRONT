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

  metaPrincipal = 0;

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

    // MY27: todas las metas de Global salen del mismo resumen maestro del backend.
    this.cargarMetasMy27();

    // Partner→PEP y Distribuidor siguen tomando el universo MY27 depurado.
    this.calculateTotalAcumulado();
    this.calculateTotalAcumulado2();

    // General, BICICLETAS y APPAREL/SYNCROS/VITTORIA ya llegan
    // calculados por el mismo resumen maestro del backend.
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
    const semanaInicioTemporada = 26;

    if (semanaISO < semanaInicioTemporada) {
      return (52 - semanaInicioTemporada) + semanaISO;
    }

    return semanaISO - semanaInicioTemporada;
  }

  cargarMetasMy27(): void {
    this.caratulasService.getResumenCaratulasMy27().subscribe({
      next: (resumen) => {
        const global = resumen?.global;

        if (!global) {
          console.error('El backend no devolvió el resumen Global MY27');
          return;
        }

        // METAS
        this.metaPrincipal = Number(global.meta) || 0;
        this.totalMetaMY25 = Number(global.categoria) || 0;
        this.totalMetaMY25_2 = Number(global.distribuidor) || 0;
        this.metaApparel = Number(global.apparel) || 0;
        this.metaScott = Number(global.bicicletas) || 0;

        // ACUMULADOS MAESTROS MY27
        // BICICLETAS = SCOTT + BOLD + MEGAMO
        this.acumuladoGeneral = Number(global.acumulado_general) || 0;
        this.acumuladoScott = Number(global.acumulado_bicicletas) || 0;
        this.acumuladoApparel = Number(global.acumulado_apparel) || 0;
        this.diferencia1 = Number(global.acumulado_otros) || 0;

        this.calcularProyectadoMonto1();
        this.calcularProyectadoMonto2();
        this.calcularProyectadoMonto3();
        this.calcularProyectadoApparel();
        this.calcularProyectadoScott();

        this.calcularPorcentajeMonto1();
        this.calcularPorcentajeMonto2();
        this.calcularPorcentajeMonto3();
        this.calcularPorcentajeApparel();
        this.calcularPorcentajeScott();
        this.calcularPorcentajeApparel_2();
        this.calcularPorcentajeScott_2();

        // No recalcular "Otros" en el front: usar el valor conciliado
        // que ya entrega el backend.
      },
      error: (err) => {
        console.error('Error cargando resumen MY27:', err);
      }
    });
  }

  calcularMetaVittoria(): void {
    this.metaVittorria = 3655126.16 * 2;
  }

  calcularMetaSyncros(): void {
    this.metaSyncros = 4874083.92 * 1.8;
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

  calculateTotalAcumulado(): void {
    const nivelesCategoria = ['Partner', 'Partner Elite', 'Partner Elite Plus'];

    this.caratulasService.getDatosPrevio().subscribe({
      next: (datosPrevio) => {
        this.totalAcumulado = datosPrevio
          .filter((item: any) => nivelesCategoria.includes(item.nivel))
          .reduce((total: number, item: any) =>
            total + (Number(item.acumulado_anticipado) || 0), 0);

        this.calcularPorcentajeMonto2();
      },
      error: (err) => {
        console.error('Error calculando acumulado Partner→PEP:', err);
      }
    });
  }

  calculateTotalAcumulado2(): void {
    this.caratulasService.getDatosPrevio().subscribe({
      next: (datosPrevio) => {
        this.totalAcumulado_2 = datosPrevio
          .filter((item: any) => item.nivel === 'Distribuidor')
          .reduce((total: number, item: any) =>
            total + (Number(item.acumulado_anticipado) || 0), 0);

        this.calcularPorcentajeMonto3();
      },
      error: (err) => {
        console.error('Error calculando acumulado Distribuidor:', err);
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
    // La pantalla muestra la semana en curso, pero el proyectado usa
    // únicamente semanas cerradas. Ej.: Semana 9 => 8 semanas cerradas.
    return Math.max(0, this.obtenerDiaTemporada() - 1);
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