import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RetroactivosService } from '../../../services/retroactivos.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';

// Interfaz para el buscador
interface SugerenciaCliente {
  CLAVE: string;
  CLIENTE: string;
}

// Interfaz flexible porque el backend puede devolver campos en MAYÚSCULAS o minúsculas
interface DatosRetroactivo {
  CLAVE: string;
  ZONA: string;
  CLIENTE: string;
  CATEGORIA: string;

  COMPRA_MINIMA_ANUAL: number;
  COMPRA_GLOBAL_SCOTT: number;
  porcentaje_avance_scott: number;

  COMPRA_MINIMA_APPAREL: number;
  COMPRA_GLOBAL_APPAREL: number;
  porcentaje_avance_apparel: number;

  COMPRA_GLOBAL_BOLD: number;
  TOTAL_ACUMULADO: number;

  COMPRAS_TOTALES_CRUDO: number;
  notas_credito: number;
  garantias: number;
  acumulado_global_calculado: number;

  productos_ofertados: number;
  bicicleta_demo: number;
  bicicletas_bold: number;
  importe_final: number;

  compra_adicional: number;
  porcentaje_retroactivo: number;
  porcentaje_retroactivo_apparel: number;
  retroactivo_total: number;
  importe: number;

  porcentaje_avance_general: number;
  total_bicis_deduccion: number;

  [key: string]: any;
}

@Component({
  selector: 'app-caratula-retroactivos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './caratula-retroactivos.component.html',
  styleUrl: './caratula-retroactivos.component.css'
})
export class CaratulaRetroactivosComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  terminoBusqueda: string = '';
  sugerenciasFiltradas: SugerenciaCliente[] = [];
  mostrarSugerencias: boolean = false;
  isLoading = false;
  error: string | null = null;

  datosCliente: DatosRetroactivo | null = null;

  private searchSubject = new Subject<string>();
  private allClientes: SugerenciaCliente[] = [];
  private cacheClientesCargado = false;
  private isSearchingDirectly = false;

  constructor(private retroactivosService: RetroactivosService) { }

  ngOnInit() {
    this.cargarCacheClientes();
    this.configurarBuscador();
  }

  private cargarCacheClientes() {
    this.cacheClientesCargado = false;

    this.retroactivosService.getRetroactivos().subscribe({
      next: (data) => {
        this.allClientes = data.map(item => ({
          CLAVE: item.CLAVE,
          CLIENTE: item.CLIENTE
        }));

        this.cacheClientesCargado = true;

        // Si el usuario ya escribió algo antes de que terminara el cache,
        // recalculamos sugerencias automáticamente.
        const terminoActual = this.terminoBusqueda.trim();
        if (terminoActual.length >= 2 && !this.isSearchingDirectly) {
          this.filtrarSugerencias(terminoActual);
        }
      },
      error: (err) => {
        this.cacheClientesCargado = false;
        console.error('Error al cargar caché:', err);
      }
    });
  }

  private filtrarSugerencias(term: string) {
    const termLower = term.toLowerCase();

    this.sugerenciasFiltradas = this.allClientes.filter(c =>
      (c.CLAVE && c.CLAVE.toLowerCase().includes(termLower)) ||
      (c.CLIENTE && c.CLIENTE.toLowerCase().includes(termLower))
    ).slice(0, 10);

    this.mostrarSugerencias = this.sugerenciasFiltradas.length > 0;
  }

  private configurarBuscador() {
    this.searchSubject.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(term => {
      if (!term || term.length < 2 || this.isSearchingDirectly) {
        this.sugerenciasFiltradas = [];
        this.mostrarSugerencias = false;
        return;
      }

      // Si todavía no terminó de cargar el cache, no hacemos nada.
      // Cuando termine cargarCacheClientes(), se filtra automáticamente.
      if (!this.cacheClientesCargado) {
        this.sugerenciasFiltradas = [];
        this.mostrarSugerencias = false;
        return;
      }

      this.filtrarSugerencias(term);
    });
  }

  onInputChange(event: any) {
    this.isSearchingDirectly = false;
    this.searchSubject.next(event.target.value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.mostrarSugerencias = false;
      this.buscarCliente();
    }
  }

  seleccionarSugerencia(sugerencia: SugerenciaCliente) {
    this.terminoBusqueda = sugerencia.CLAVE;
    this.mostrarSugerencias = false;
    this.isSearchingDirectly = true;
    this.buscarCliente(sugerencia.CLAVE);
  }

  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.datosCliente = null;
    this.sugerenciasFiltradas = [];
    this.error = null;

    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  buscarCliente(claveForzada?: string) {
    const identificador = claveForzada || this.terminoBusqueda.trim();
    if (!identificador) return;

    this.isLoading = true;
    this.error = null;
    this.datosCliente = null;
    this.mostrarSugerencias = false;

    this.retroactivosService.getRetroactivoCliente(identificador).subscribe({
      next: (data) => {
        this.datosCliente = data;
        this.isLoading = false;

        console.log('Datos retroactivo recibidos:', data);
        console.log('TOTAL_ACUMULADO calculado:', this.getTotalAcumulado());
      },
      error: (err) => {
        this.error = 'No se encontró información para este cliente.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  private n(...values: any[]): number {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== '') {
        const parsed = Number(value);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  }

  getCompraMinimaAnual(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.COMPRA_MINIMA_ANUAL,
      d.compra_minima_anual
    );
  }

  getCompraMinimaApparel(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.COMPRA_MINIMA_APPAREL,
      d.compra_minima_apparel
    );
  }

  getCompraGlobalScott(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.COMPRA_GLOBAL_SCOTT,
      d.compra_global_scott,
      d.avance_global_scott
    );
  }

  getCompraGlobalApparel(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.COMPRA_GLOBAL_APPAREL,
      d.compra_global_apparel,
      d.avance_global_apparel_syncros_vittoria
    );
  }

  getCompraGlobalBold(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.COMPRA_GLOBAL_BOLD,
      d.compra_global_bold,
      d.acumulado_bold
    );
  }

  getTotalAcumulado(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    const totalAcumulado = this.n(
      d.COMPRAS_TOTALES_CRUDO,
      d.compras_totales_crudo,
      d.TOTAL_ACUMULADO,
      d.total_acumulado,
      d.avance_global
    );

    if (totalAcumulado > 0) {
      return totalAcumulado;
    }

    return (
      this.getCompraGlobalScott() +
      this.getCompraGlobalApparel() +
      this.getCompraGlobalBold()
    );
  }

  getPorcentajeAvanceGeneral(): number {
    const meta = this.getCompraMinimaAnual();
    if (!meta) return 0;

    return this.getTotalAcumulado() / meta;
  }

  getPorcentajeAvanceApparel(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    const porcentaje = this.n(
      d.porcentaje_avance_apparel,
      d.PORCENTAJE_AVANCE_APPAREL
    );

    if (porcentaje > 0) {
      return porcentaje;
    }

    const metaApparel = this.getCompraMinimaApparel();
    if (!metaApparel) return 0;

    return this.getCompraGlobalApparel() / metaApparel;
  }

  getNotasCredito(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.notas_credito,
      d.NOTAS_CREDITO
    );
  }

  getGarantias(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.garantias,
      d.GARANTIAS
    );
  }

  getAcumuladoGlobalCalculado(): number {
    return (
      this.getTotalAcumulado() -
      this.getNotasCredito() -
      this.getGarantias()
    );
  }

  getProductosOfertados(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.productos_ofertados,
      d.PRODUCTOS_OFERTADOS
    );
  }

  getTotalBicisDeduccion(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    const totalBicis = this.n(
      d.total_bicis_deduccion,
      d.TOTAL_BICIS_DEDUCCION
    );

    if (totalBicis > 0) {
      return totalBicis;
    }

    return (
      this.n(d.bicicleta_demo, d.BICICLETA_DEMO) +
      this.n(d.bicicletas_bold, d.BICICLETAS_BOLD)
    );
  }

  getImporteFinalBase(): number {
    return (
      this.getAcumuladoGlobalCalculado() -
      this.getProductosOfertados() -
      this.getTotalBicisDeduccion()
    );
  }

  getCompraAdicionalCalculada(): number {
    return (
      this.getAcumuladoGlobalCalculado() -
      this.getCompraMinimaAnual()
    );
  }

  getPorcentajeRetroactivo(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.porcentaje_retroactivo,
      d.PORCENTAJE_RETROACTIVO
    );
  }

  getPorcentajeRetroactivoApparel(): number {
    if (!this.datosCliente) return 0;
    const d: any = this.datosCliente;

    return this.n(
      d.porcentaje_retroactivo_apparel,
      d.PORCENTAJE_RETROACTIVO_APPAREL
    );
  }

  getRetroactivoTotal(): number {
    return this.getPorcentajeRetroactivo() + this.getPorcentajeRetroactivoApparel();
  }

  getImportePagar(): number {
    return this.getImporteFinalBase() * this.getRetroactivoTotal();
  }
}