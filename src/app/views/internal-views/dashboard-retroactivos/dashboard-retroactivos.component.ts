import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RetroactivosService } from '../../../services/retroactivos.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { FiltroComponent } from '../../../components/filtro/filtro.component';
import { TemporadaSelectorComponent } from '../../../components/temporada-selector/temporada-selector.component';
import { AvisoHistoricoComponent } from '../../../components/aviso-historico/aviso-historico.component';
import { switchMap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface FiltroOption {
  value: string;
  selected: boolean;
}

@Component({
  selector: 'app-dashboard-retroactivos',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent, FiltroComponent, TemporadaSelectorComponent, AvisoHistoricoComponent],
  templateUrl: './dashboard-retroactivos.component.html',
  styleUrl: './dashboard-retroactivos.component.css'
})
export class DashboardRetroactivosComponent implements OnInit {

  // Variables de datos
  retroactivosOriginales: any[] = []; // Guarda los datos puros que vienen del backend
  retroactivos: any[] = [];           // Esta es la tabla que se muestra (filtrada)
  cargando: boolean = true;
  fechaActual: Date = new Date();

  // Variables para Opciones de Filtros
  opcionesFiltroClave: FiltroOption[] = [];
  opcionesFiltroZona: FiltroOption[] = [];
  opcionesFiltroCliente: FiltroOption[] = [];
  opcionesFiltroCategoria: FiltroOption[] = [];

  // Estado de los filtros (Qué seleccionó el usuario)
  filtrosActivos = {
    claves: [] as string[],
    zonas: [] as string[],
    clientes: [] as string[],
    categorias: [] as string[]
  };

  // Objeto para almacenar los totales
  totales: any = {
    compra_minima_anual: 0,
    compra_minima_apparel: 0,
    compras_totales_crudo: 0,
    compra_global_scott: 0,
    compra_global_apparel: 0,
    compra_global_bold: 0,
    total_acumulado: 0,
    notas_credito: 0,
    garantias: 0,
    productos_ofertados: 0,
    bicicleta_demo: 0,
    bicicletas_bold: 0,
    importe_final: 0,
    compra_anual_crudo: 0,
    compra_adicional: 0,
    importe: 0,
    estatus: '',
    fecha_aplicacion: null
  };

  @ViewChild('tablaContainer') tablaContainer!: ElementRef;
  @ViewChild('dummyScroll') dummyScroll!: ElementRef;
  @ViewChild('tabla') tabla!: ElementRef;

  temporadasDisponibles: string[] = [];
  modoHistorico = false;
  temporadaHistoricaSeleccionada: string | null = null;

  constructor(private retroactivosService: RetroactivosService) { }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarTemporadasDisponibles();
  }

  cargarTemporadasDisponibles(): void {
    this.retroactivosService.getTemporadasDisponibles().subscribe({
      next: (temporadas) => this.temporadasDisponibles = temporadas,
      error: (err) => console.error('Error cargando temporadas disponibles:', err)
    });
  }

  verTemporadaPasada(temporada: string): void {
    if (!temporada) {
      this.volverATemporadaActual();
      return;
    }
    this.cargando = true;
    this.modoHistorico = true;
    this.temporadaHistoricaSeleccionada = temporada;
    this.limpiarTodosLosFiltros();

    this.retroactivosService.getRetroactivosHistorico(temporada).subscribe({
      next: (data) => {
        this.retroactivosOriginales = data;
        this.retroactivos = [...data];
        this.extraerOpcionesFiltros();
        this.calcularTotales();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando temporada histórica:', err);
        this.cargando = false;
      }
    });
  }

  volverATemporadaActual(): void {
    this.modoHistorico = false;
    this.temporadaHistoricaSeleccionada = null;
    this.limpiarTodosLosFiltros();
    this.cargarDatos();
  }

  private limpiarTodosLosFiltros(): void {
    this.filtrosActivos = { claves: [], zonas: [], clientes: [], categorias: [] };
  }

  actualizarDatos(): void {
    if (this.cargando) return;

    this.cargando = true;

    this.retroactivosService.sincronizarNotasOdoo().pipe(
      switchMap((resRetro) => {
        console.log('Retroactivos sincronizados:', resRetro);
        return this.retroactivosService.getRetroactivos();
      })
    ).subscribe({
      next: (data) => {
        this.retroactivosOriginales = data;
        this.retroactivos = [...data];

        this.extraerOpcionesFiltros();
        this.calcularTotales();

        this.cargando = false;
      },
      error: (err) => {
        console.error('Error actualizando retroactivos:', err);
        this.cargando = false;
        alert('Error al actualizar retroactivos. Revisa la consola del servidor.');
      }
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    this.retroactivosService.getRetroactivos().subscribe({
      next: (data) => {
        this.retroactivosOriginales = data;
        this.retroactivos = [...data]; // Inicialmente mostrar todo

        this.extraerOpcionesFiltros();
        this.calcularTotales();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar retroactivos', err);
        this.cargando = false;
      }
    });
  }

  // ==========================================
  // LÓGICA DE FILTROS
  // ==========================================

  extraerOpcionesFiltros() {
    // Usamos Set para evitar duplicados, limpiamos y ordenamos alfabéticamente
    const claves = Array.from(new Set(this.retroactivosOriginales.map(r => r.CLAVE).filter(Boolean))).sort();
    const zonas = Array.from(new Set(this.retroactivosOriginales.map(r => r.ZONA).filter(Boolean))).sort();
    const clientes = Array.from(new Set(this.retroactivosOriginales.map(r => r.CLIENTE).filter(Boolean))).sort();
    const categorias = Array.from(new Set(this.retroactivosOriginales.map(r => r.CATEGORIA).filter(Boolean))).sort();
    // Convertimos al formato que requiere tu app-filtro
    this.opcionesFiltroClave = claves.map(v => ({ value: v, selected: false }));
    this.opcionesFiltroZona = zonas.map(v => ({ value: v, selected: false }));
    this.opcionesFiltroCliente = clientes.map(v => ({ value: v, selected: false }));
    this.opcionesFiltroCategoria = categorias.map(v => ({ value: v, selected: false }));
  }

  aplicarFiltroClave(seleccionados: string[]) {
    this.filtrosActivos.claves = seleccionados;
    this.filtrarTabla();
  }

  aplicarFiltroZona(seleccionados: string[]) {
    this.filtrosActivos.zonas = seleccionados;
    this.filtrarTabla();
  }

  aplicarFiltroCliente(seleccionados: string[]) {
    this.filtrosActivos.clientes = seleccionados;
    this.filtrarTabla();
  }

  aplicarFiltroCategoria(seleccionados: string[]) {
    this.filtrosActivos.categorias = seleccionados;
    this.filtrarTabla();
  }

  limpiarFiltroClave() {
    this.filtrosActivos.claves = [];
    this.filtrarTabla();
  }

  limpiarFiltroZona() {
    this.filtrosActivos.zonas = [];
    this.filtrarTabla();
  }

  limpiarFiltroCliente() {
    this.filtrosActivos.clientes = [];
    this.filtrarTabla();
  }

  limpiarFiltroCategoria() {
    this.filtrosActivos.categorias = [];
    this.filtrarTabla();
  }

  filtrarTabla() {
    this.retroactivos = this.retroactivosOriginales.filter(item => {
      // Si el filtro está vacío (longitud 0), se asume que pasa (true)
      const pasaClave = this.filtrosActivos.claves.length === 0 || this.filtrosActivos.claves.includes(item.CLAVE);
      const pasaZona = this.filtrosActivos.zonas.length === 0 || this.filtrosActivos.zonas.includes(item.ZONA);
      const pasaCliente = this.filtrosActivos.clientes.length === 0 || this.filtrosActivos.clientes.includes(item.CLIENTE);
      const pasaCategoria = this.filtrosActivos.categorias.length === 0 || this.filtrosActivos.categorias.includes(item.CATEGORIA);

      return pasaClave && pasaZona && pasaCliente && pasaCategoria;
    });

    // Recalcular los totales cada vez que se filtra la tabla
    this.calcularTotales();
  }

  // ==========================================

  exportarExcel(): void {
    const pct = (v: number) => v ? `${(v * 100).toFixed(1)}%` : '0.0%';
    const usd = (v: number) => v ?? 0;

    const filas = this.retroactivos.map(item => ({
      'Clave':                    item.CLAVE,
      'Zona':                     item.ZONA,
      'Cliente':                  item.CLIENTE,
      'Categoría':                item.CATEGORIA,
      'Compra Mín. Anual':        usd(item.COMPRA_MINIMA_ANUAL),
      'Compra Mín. Apparel':      usd(item.COMPRA_MINIMA_APPAREL),
      'Compras Totales (Crudo)':  usd(item.COMPRAS_TOTALES_CRUDO),
      '% Avance General':         pct(item.porcentaje_avance_general),
      'Meta MY26':                item.META_MY26_CUMPLIDA === 'SI' || item.META_MY26_CUMPLIDA === 1 ? 'SÍ' : 'NO',
      'Compra Global Scott':      usd(item.COMPRA_GLOBAL_SCOTT),
      '% Avance Scott':           pct(item.porcentaje_avance_scott),
      'Compra Global Apparel':    usd(item.COMPRA_GLOBAL_APPAREL),
      '% Avance Apparel':         pct(item.porcentaje_avance_apparel),
      'Compra Global Bold':       usd(item.COMPRA_GLOBAL_BOLD),
      'Total Acumulado':          usd(item.TOTAL_ACUMULADO),
      'Notas de Crédito':         usd(item.notas_credito),
      'Garantías':                usd(item.garantias),
      'Prod. Ofertados':          usd(item.productos_ofertados),
      'Bici Demo':                usd(item.bicicleta_demo),
      'Bicis Bold':               usd(item.bicicletas_bold),
      'Importe Final Base':       usd(item.importe_final),
      'Compra Anual Crudo':       usd(item.compra_anual_crudo),
      'Compra Adicional':         usd(item.compra_adicional),
      '% Retroactivo':            pct(item.porcentaje_retroactivo),
      '% Retroactivo Apparel':    pct(item.porcentaje_retroactivo_apparel),
      '% Total':                  pct(item.retroactivo_total),
      'Importe a Pagar':          usd(item.importe),
      'Estatus':                  item.estatus ?? '',
      'Fecha Aplicación':         item.fecha_aplicacion ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retroactivos MY26');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `retroactivos_${fecha}.xlsx`);
  }

  calcularTotales(): void {
    // Reiniciamos totales
    Object.keys(this.totales).forEach(key => this.totales[key] = 0);
    this.totales.estatus = '';
    this.totales.fecha_aplicacion = null;

    // Sumamos iterando sobre la tabla FILTRADA
    this.retroactivos.forEach(item => {
      this.totales.compra_minima_anual += item.COMPRA_MINIMA_ANUAL || 0;
      this.totales.compra_minima_apparel += item.COMPRA_MINIMA_APPAREL || 0;
      this.totales.compras_totales_crudo += item.COMPRAS_TOTALES_CRUDO || 0;
      this.totales.compra_global_scott += item.COMPRA_GLOBAL_SCOTT || 0;
      this.totales.compra_global_apparel += item.COMPRA_GLOBAL_APPAREL || 0;
      this.totales.compra_global_bold += item.COMPRA_GLOBAL_BOLD || 0;
      this.totales.total_acumulado += (
        (item.COMPRA_GLOBAL_SCOTT || 0) +
        (item.COMPRA_GLOBAL_APPAREL || 0) +
        (item.COMPRA_GLOBAL_BOLD || 0)
      );
      this.totales.notas_credito += item.notas_credito || 0;
      this.totales.garantias += item.garantias || 0;
      this.totales.productos_ofertados += item.productos_ofertados || 0;
      this.totales.bicicleta_demo += item.bicicleta_demo || 0;
      this.totales.bicicletas_bold += item.bicicletas_bold || 0;
      this.totales.importe_final += item.importe_final || 0;
      this.totales.compra_anual_crudo += item.compra_anual_crudo || 0;
      this.totales.compra_adicional += item.compra_adicional || 0;
      this.totales.importe += item.importe || 0;
    });
  }
}