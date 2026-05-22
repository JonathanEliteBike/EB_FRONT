import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { ClientesService } from '../../../services/clientes.service';
import { PrevioService } from '../../../services/previo.service';
import { FiltroService } from '../../../services/filtro.service';
import { FiltroPrevioComponent } from '../../../components/filtro-previo/filtro-previo.component';
import { AlertaService } from '../../../services/alerta.service';
import { TooltipComponent } from '../../../components/tooltip/tooltip.component';
import * as XLSX from 'xlsx';

import { FechaActualizacionComponent } from '../../../components/fecha-actualizacion/fecha-actualizacion.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cliente {
  clave: string;
  zona: string;
  evac: string;
  nombre_cliente: string;
  nivel: string;
  f_inicio?: string;
  f_fin?: string;
}

interface FacturaOdoo {
  contacto_referencia: string;
  contacto_nombre: string;
  cantidad: number;
  precio_unitario: string;
  fecha_factura: string;
  categoria_producto: string;
  numero_factura: string;
  nombre_producto: string;
  estado_factura: string;
  costo_producto: string;
  venta_total: number;
  apparel?: string;
  marca?: string;
  id?: string;
  estado?: string;
  subcategoria?: string;
  referencia_interna?: string;
  eride?: string;
  evac?: string;
}

interface ClienteConAcumulado extends Cliente {
  acumulado_anticipado: number;
  avance_global_scott?: number;
  esIntegral?: boolean;
  grupoIntegral?: number;
  compra_minima_anual?: number;
  compra_minima_inicial?: number;
  avance_global?: number;
  compromiso_scott?: number;
  compromiso_jul_ago?: number;
  compromiso_sep_oct?: number;
  compromiso_nov_dic?: number;
  compromiso_apparel_syncros_vittoria?: number;
  avance_global_apparel_syncros_vittoria?: number;
  compromiso_jul_ago_app?: number;
  compromiso_sep_oct_app?: number;
  compromiso_nov_dic_app?: number;
  avance_jul_ago?: number;
  avance_sep_oct?: number;
  avance_nov_dic?: number;

  // NUEVOS CAMPOS NORMALES (SCOTT)
  compromiso_ene_feb?: number;
  avance_ene_feb?: number;
  porcentaje_ene_feb?: number;

  compromiso_mar_abr?: number;
  avance_mar_abr?: number;
  porcentaje_mar_abr?: number;

  compromiso_may_jun?: number;
  avance_may_jun?: number;
  porcentaje_may_jun?: number;

  avance_jul_ago_app?: number;
  avance_sep_oct_app?: number;
  avance_nov_dic_app?: number;

  // NUEVOS CAMPOS APP
  compromiso_ene_feb_app?: number;
  avance_ene_feb_app?: number;
  porcentaje_ene_feb_app?: number;

  compromiso_mar_abr_app?: number;
  avance_mar_abr_app?: number;
  porcentaje_mar_abr_app?: number;

  compromiso_may_jun_app?: number;
  avance_may_jun_app?: number;
  porcentaje_may_jun_app?: number;

  acumulado_syncros?: number;
  acumulado_apparel?: number;
  acumulado_vittoria?: number;
  acumulado_bold?: number;
  avance_global_1?: number;
  f_inicio?: string;
  f_fin?: string;
  fecha_inicio_calculo?: string;
  esParteDeIntegral?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-previo',
  standalone: true,
  imports: [HomeBarComponent, RouterModule, CommonModule, FormsModule,
    FiltroPrevioComponent, TooltipComponent, FechaActualizacionComponent],
  templateUrl: './previo.component.html',
  styleUrl: './previo.component.css'
})

export class PrevioComponent implements OnInit, OnDestroy, AfterViewInit {
  @Output() onInit = new EventEmitter<void>();

  datosPrevio: any[] = [];

  @ViewChild('tablaContainer') tablaContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('dummyScroll') dummyScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('tabla') tabla?: ElementRef<HTMLTableElement>;

  tablaWidth = 0;
  tablaLista = false;

  tooltipPosition: { x: number, y: number } = { x: 0, y: 0 };
  clienteParaTooltip: any = null;

  Math = Math;

  @Input() tipo: string = '';
  @Input() placeholder: string = '';
  @Input() opciones: any[] = [];
  @Input() estaActivo: boolean = false;

  @Output() aplicarFiltro = new EventEmitter<any>();
  @Output() limpiarFiltro = new EventEmitter<void>();
  @Output() filtroClicked = new EventEmitter<void>();

  clientes: Cliente[] = [];
  clientesOriginal: ClienteConAcumulado[] = [];
  clientesFiltrados: ClienteConAcumulado[] = [];
  clientesPaginados: ClienteConAcumulado[] = [];

  integralesOriginal: ClienteConAcumulado[] = [];

  todosLosDatos: ClienteConAcumulado[] = [];

  facturas: FacturaOdoo[] = [];

  showClaveFilter: boolean = false;
  showEvacFilter: boolean = false;
  showClienteFilter: boolean = false;
  showEleccionNivelFilter: boolean = false;
  showCumplimientoFilter: boolean = false;

  opcionesClave: { value: string; selected: boolean }[] = [];
  opcionesEvac: { value: string; selected: boolean }[] = [];
  opcionesCliente: { value: string; selected: boolean }[] = [];
  opcionesEleccionNivel: { value: string; selected: boolean }[] = [];
  opcionesCumplimiento: { value: string; selected: boolean }[] = [];

  paginaActual = 1;
  paginaActualTemp = 1;
  itemsPorPagina = 100;
  totalPaginas = 0;
  cargando = true;

  filtros: {
    clave: string[];
    zona: string;
    nombre_cliente: string;
    nivel: string[];
    evac: string[];
    cliente: string[];
    cumplimiento: string[];
  } = {
      clave: [],
      zona: '',
      nombre_cliente: '',
      nivel: [],
      evac: [],
      cliente: [],
      cumplimiento: []
    };

  zonasUnicas: string[] = [];
  nivelesUnicos: string[] = [];
  filtrosCheckbox = {
    zonasSeleccionadas: new Set<string>(),
    nivelesSeleccionados: new Set<string>()
  };

  fechaEspecialClientes: Set<string> = new Set(['FA318', 'JC554', 'MD670', 'NE724']);

  integrales: ClienteConAcumulado[] = [];

  mostrarIntegrales: boolean = true;

  mensajeAlerta: string | null = null;
  tipoAlerta: 'exito' | 'error' = 'exito';

  filtroActivo: string | null = null;

  totales: {
    acumulado_anticipado: number;
    compra_minima_anual: number;
    compra_minima_inicial: number;
    avance_global: number;
    avance_global_scott: number;
    compromiso_scott: number;
    compromiso_jul_ago: number;
    avance_jul_ago: number;
    compromiso_sep_oct: number;
    avance_sep_oct: number;
    compromiso_nov_dic: number;
    avance_nov_dic: number;
    compromiso_apparel_syncros_vittoria: number;
    avance_global_apparel_syncros_vittoria: number;
    compromiso_jul_ago_app: number;
    avance_jul_ago_app: number;
    compromiso_sep_oct_app: number;
    avance_sep_oct_app: number;
    compromiso_nov_dic_app: number;
    avance_nov_dic_app: number;
    acumulado_syncros: number;
    acumulado_apparel: number;
    acumulado_vittoria: number;
    acumulado_bold: number;

    compromiso_ene_feb: number;
    avance_ene_feb: number;
    compromiso_mar_abr: number;
    avance_mar_abr: number;
    compromiso_may_jun: number;
    avance_may_jun: number;

    compromiso_ene_feb_app: number;
    avance_ene_feb_app: number;
    compromiso_mar_abr_app: number;
    avance_mar_abr_app: number;
    compromiso_may_jun_app: number;
    avance_may_jun_app: number;

  } = {
      acumulado_anticipado: 0,
      compra_minima_anual: 0,
      compra_minima_inicial: 0,
      avance_global: 0,
      avance_global_scott: 0,
      compromiso_scott: 0,
      compromiso_jul_ago: 0,
      avance_jul_ago: 0,
      compromiso_sep_oct: 0,
      avance_sep_oct: 0,
      compromiso_nov_dic: 0,
      avance_nov_dic: 0,
      compromiso_apparel_syncros_vittoria: 0,
      avance_global_apparel_syncros_vittoria: 0,
      compromiso_jul_ago_app: 0,
      avance_jul_ago_app: 0,
      compromiso_sep_oct_app: 0,
      avance_sep_oct_app: 0,
      compromiso_nov_dic_app: 0,
      avance_nov_dic_app: 0,
      acumulado_syncros: 0,
      acumulado_apparel: 0,
      acumulado_vittoria: 0,
      acumulado_bold: 0,

      compromiso_ene_feb: 0,
      avance_ene_feb: 0,
      compromiso_mar_abr: 0,
      avance_mar_abr: 0,
      compromiso_may_jun: 0,
      avance_may_jun: 0,

      compromiso_ene_feb_app: 0,
      avance_ene_feb_app: 0,
      compromiso_mar_abr_app: 0,
      avance_mar_abr_app: 0,
      compromiso_may_jun_app: 0,
      avance_may_jun_app: 0,
    };

  constructor(
    private clientesService: ClientesService,
    private previoService: PrevioService,
    private alertaService: AlertaService,
    private filtroService: FiltroService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.cargando = true;

    this.cargarDatosPrevio();

    this.filtroService.filtroAbierto$.subscribe(filtroId => {
      this.filtroActivo = filtroId;
    });
  }

  ngAfterViewInit(): void {
    this.sincronizarRenderTabla();
  }

  private sincronizarRenderTabla(): void {
    setTimeout(() => {
      if (!this.tabla?.nativeElement) {
        return;
      }

      const anchoTabla =
        this.tabla.nativeElement.scrollWidth ||
        this.tabla.nativeElement.offsetWidth ||
        0;

      this.tablaWidth = anchoTabla;

      if (this.tablaContainer?.nativeElement && this.dummyScroll?.nativeElement) {
        this.dummyScroll.nativeElement.scrollLeft = this.tablaContainer.nativeElement.scrollLeft;
      }

      this.cd.detectChanges();

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }, 100);
  }

  private cargarDatosPrevio(): void {
    this.cargando = true;
    this.tablaLista = false;

    this.previoService.obtenerPrevio(true).subscribe({
      next: (datosBackend) => {
        console.log('Datos recibidos de /obtener_previo:', datosBackend);
        console.log('Primer registro:', datosBackend?.[0]);

        const datos = this.procesarDatosDelEndpoint(datosBackend || []).map(c => ({
          ...c,
          esIntegral: c['es_integral'] === 1 || c['es_integral'] === true,
          grupoIntegral: c['grupo_integral']
        }));

        this.todosLosDatos = datos;
        this.clientesOriginal = datos.filter(c => !c.esIntegral);
        this.integralesOriginal = datos.filter(c => c.esIntegral);

        this.combinarDatos();
        this.inicializarOpcionesFiltro();
        this.aplicarFiltros();

        this.cargando = false;
        this.cd.detectChanges();

        setTimeout(() => {
          this.tablaLista = true;
          this.cd.detectChanges();

          setTimeout(() => {
            this.sincronizarRenderTabla();
          }, 50);
        }, 0);
      },
      error: (error) => {
        console.error('Error cargando previo:', error);
        this.cargando = false;
        this.tablaLista = false;
        this.cd.detectChanges();
      }
    });
  }

  private dispararRecalculoEnSegundoPlano(): void {
    this.previoService.recalcularPrevio().subscribe({
      next: (res) => {
        console.log('Recalculo iniciado en segundo plano:', res);

        // Opcional: recargar datos después de unos segundos
        setTimeout(() => {
          this.previoService.limpiarCachePrevio();
          this.cargarDatosPrevio();
        }, 15000);
      },
      error: (err) => {
        console.error('Error iniciando recalculo en segundo plano:', err);
      }
    });
  }

  guardarYRefrescar() {
    this.cargando = true;

    // Preparar datos con porcentajes calculados
    const datosParaGuardar = [...this.clientesOriginal, ...this.integralesOriginal].map(item =>
      this.calcularPorcentajes(item)
    );

    // 1. Enviar al backend
    this.previoService.actualizarPrevio(datosParaGuardar).subscribe({
      next: (res) => {

        // 2. AHORA SÍ: Pedir la versión oficial al backend para asegurar que vemos lo real
        this.previoService.obtenerPrevio().subscribe({
          next: (datosBackend) => {
            // Aquí podrías actualizar this.todosLosDatos con datosBackend si quisieras
            // pero lo más importante es apagar el loading de forma segura:

            this.cargando = false;
            this.cd.detectChanges(); // <--- ESTO ARREGLA EL ERROR NG0100
          },
          error: (err) => {
            console.error('Error recargando previo:', err);
            this.cargando = false;
          }
        });
      },
      error: (err) => {
        console.error('Error guardando:', err);
        this.cargando = false;
      }
    });
  }

  private convertirNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    if (typeof valor === 'number') {
      return isNaN(valor) ? 0 : valor;
    }

    if (typeof valor === 'string') {
      const limpio = valor
        .replace(/\$/g, '')
        .replace(/,/g, '')
        .trim();

      const numero = Number(limpio);
      return isNaN(numero) ? 0 : numero;
    }

    return 0;
  }

  procesarDatosDelEndpoint(datos: any[]): ClienteConAcumulado[] {
    const camposNumericos = [
      'acumulado_anticipado',
      'compra_minima_anual',
      'porcentaje_anual',
      'compra_minima_inicial',
      'avance_global',
      'porcentaje_global',

      'compromiso_scott',
      'avance_global_scott',
      'porcentaje_scott',

      'compromiso_jul_ago',
      'avance_jul_ago',
      'porcentaje_jul_ago',

      'compromiso_sep_oct',
      'avance_sep_oct',
      'porcentaje_sep_oct',

      'compromiso_nov_dic',
      'avance_nov_dic',
      'porcentaje_nov_dic',

      'compromiso_ene_feb',
      'avance_ene_feb',
      'porcentaje_ene_feb',

      'compromiso_mar_abr',
      'avance_mar_abr',
      'porcentaje_mar_abr',

      'compromiso_may_jun',
      'avance_may_jun',
      'porcentaje_may_jun',

      'compromiso_apparel_syncros_vittoria',
      'avance_global_apparel_syncros_vittoria',
      'porcentaje_apparel_syncros_vittoria',

      'compromiso_jul_ago_app',
      'avance_jul_ago_app',
      'porcentaje_jul_ago_app',

      'compromiso_sep_oct_app',
      'avance_sep_oct_app',
      'porcentaje_sep_oct_app',

      'compromiso_nov_dic_app',
      'avance_nov_dic_app',
      'porcentaje_nov_dic_app',

      'compromiso_ene_feb_app',
      'avance_ene_feb_app',
      'porcentaje_ene_feb_app',

      'compromiso_mar_abr_app',
      'avance_mar_abr_app',
      'porcentaje_mar_abr_app',

      'compromiso_may_jun_app',
      'avance_may_jun_app',
      'porcentaje_may_jun_app',

      'acumulado_syncros',
      'acumulado_apparel',
      'acumulado_vittoria',
      'acumulado_bold'
    ];

    return datos.map(item => {
      const convertido: any = { ...item };

      camposNumericos.forEach(campo => {
        convertido[campo] = this.convertirNumero(item[campo]);
      });

      convertido.es_integral = this.convertirNumero(item.es_integral);

      return convertido as ClienteConAcumulado;
    });
  }

  manejarClickFiltro(tipoFiltro: string) {
    const filtroId = `previo-${tipoFiltro}`;

    // Si el filtro ya está abierto, lo cerramos
    if (this.filtroActivo === filtroId) {
      this.filtroService.cerrarFiltros();
    } else {
      // Si no, abrimos este filtro (esto cerrará automáticamente cualquier otro abierto)
      this.filtroService.abrirFiltro(filtroId);
    }
  }

  mostrarFiltroClave() {
    this.manejarClickFiltro('clave');
  }

  mostrarFiltroEvac() {
    this.manejarClickFiltro('evac');
  }

  mostrarFiltroCliente() {
    this.manejarClickFiltro('cliente');
  }

  mostrarFiltroNivel() {
    this.manejarClickFiltro('nivel');
  }

  // Métodos para verificar si un filtro está activo
  esFiltroActivo(tipoFiltro: string): boolean {
    return this.filtroActivo === `previo-${tipoFiltro}`;
  }

  ngOnDestroy() {
    // Cerrar todos los filtros al salir del componente
    this.filtroService.cerrarFiltros();
  }

  toggleFiltro(tipoFiltro: string): void {
    const filtroId = `previo-${tipoFiltro}`;
    if (this.filtroActivo === filtroId) {
      this.filtroService.cerrarFiltros();
    } else {
      this.filtroService.abrirFiltro(filtroId);
    }
  }

  aplicarFiltros() {
    this.paginaActual = 1;
    this.filtrarClientes();
    this.calcularTotales();
  }

  filtrarClientes() {
    const filtroClave = this.filtros.clave;
    const filtroEvac = this.filtros.evac;
    const filtroCliente = this.filtros.cliente;
    const filtroNivel = this.filtros.nivel;
    const filtroCumplimiento = this.filtros.cumplimiento;

    const filtrar = (cliente: ClienteConAcumulado) => {
      // Si es un Integral (Clave empieza con "Integral"), lo mantenemos si no hay filtros o si coincide con nivel/cliente
      const esIntegral = cliente.esIntegral;

      const claveValida = !filtroClave.length || filtroClave.includes(cliente.clave);
      const evacValido = !filtroEvac.length || filtroEvac.includes(cliente.evac);
      const clienteValido = !filtroCliente.length || filtroCliente.includes(cliente.nombre_cliente);
      const nivelValido = !filtroNivel.length || filtroNivel.includes(cliente.nivel);

      const cumplimientoStatus = this.verificarCumplimientoCompraInicial(cliente);
      const cumplimientoValido = !filtroCumplimiento.length || filtroCumplimiento.includes(cumplimientoStatus);

      return claveValida && evacValido && clienteValido && nivelValido && cumplimientoValido;
    };

    // Filtramos sobre todos los datos (Clientes + Integrales)
    this.clientesFiltrados = this.todosLosDatos.filter(filtrar);

    this.totalPaginas = Math.ceil(this.clientesFiltrados.length / this.itemsPorPagina);
    this.actualizarPaginado();
    this.calcularTotales();
  }

  private combinarDatos(): void {
    // Combinar TODOS los clientes + integrales
    this.todosLosDatos = [...this.clientesOriginal, ...this.integralesOriginal];
  }

  private combinarDatosParaGuardar(): any[] {
    // Esta función es para GUARDAR los datos
    return [...this.clientesOriginal, ...this.integrales];
  }

  private inicializarOpcionesFiltro(): void {
    const clavesUnicas = Array.from(new Set(this.todosLosDatos.map(c => c.clave).filter(Boolean)));
    this.opcionesClave = clavesUnicas.map(clave => ({ value: clave, selected: false }));

    const evacsUnicos = Array.from(new Set(this.todosLosDatos.map(c => c.evac).filter(Boolean)));
    this.opcionesEvac = evacsUnicos.map(evac => ({ value: evac, selected: false }));

    const nombresUnicos = Array.from(new Set(this.todosLosDatos.map(c => c.nombre_cliente).filter(Boolean)));
    this.opcionesCliente = nombresUnicos.map(nombre => ({ value: nombre, selected: false }));

    const nivelesUnicos = Array.from(new Set(this.todosLosDatos.map(c => c.nivel).filter(Boolean)));
    this.opcionesEleccionNivel = nivelesUnicos.map(nivel => ({ value: nivel, selected: false }));

    this.opcionesCumplimiento = [
      { value: 'SI', selected: false },
      { value: 'NO', selected: false }
    ];
  }

  aplicarFiltroClave(clavesSeleccionadas: string[]): void {
    this.filtros.clave = clavesSeleccionadas;
    this.aplicarFiltros();
  }

  aplicarFiltroEvac(evacsSeleccionados: string[]): void {
    this.filtros.evac = evacsSeleccionados;
    this.aplicarFiltros();
  }

  aplicarFiltroCliente(clientesSeleccionados: string[]): void {
    this.filtros.cliente = clientesSeleccionados;
    this.aplicarFiltros();
  }

  limpiarFiltroClave(): void {
    this.filtros.clave = [];
    this.opcionesClave.forEach(opcion => opcion.selected = false);
    this.aplicarFiltros();

    this.calcularTotales();
  }

  limpiarFiltroEvac(): void {
    this.filtros.evac = [];
    this.opcionesEvac.forEach(opcion => opcion.selected = false);
    this.aplicarFiltros();

    this.calcularTotales();
  }

  limpiarFiltroCliente(): void {
    this.filtros.cliente = [];
    this.opcionesCliente.forEach(opcion => opcion.selected = false);
    this.aplicarFiltros();

    this.calcularTotales();
  }

  aplicarFiltroEleccionNivel(nivelesSeleccionados: string[]): void {
    this.filtros.nivel = nivelesSeleccionados;
    this.aplicarFiltros();
  }

  mostrarFiltroCumplimiento() {
    this.manejarClickFiltro('cumplimiento');
  }

  aplicarFiltroCumplimiento(cumplimientosSeleccionados: string[]): void {
    this.filtros.cumplimiento = cumplimientosSeleccionados;
    this.aplicarFiltros();
  }

  limpiarFiltroCumplimiento(): void {
    this.filtros.cumplimiento = [];
    this.opcionesCumplimiento.forEach(opcion => opcion.selected = false);
    this.aplicarFiltros();
    this.calcularTotales();
  }

  limpiarFiltroEleccionNivel(): void {
    this.filtros.nivel = [];
    this.opcionesEleccionNivel.forEach(opcion => opcion.selected = false);
    this.aplicarFiltros();

    this.calcularTotales();
  }

  actualizarPaginado() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.clientesPaginados = this.clientesFiltrados.slice(inicio, fin);

    if (!this.cargando && this.tablaLista) {
      this.sincronizarRenderTabla();
    }
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.paginaActualTemp = pagina;
    this.actualizarPaginado();
  }

  /* MY26 */

  private fechasEspeciales: { patrones: string[], fecha: string }[] = [
    {
      patrones: ['LIVING FOR BIKES', 'CHRISTIAN BOCCALETTI', 'ELITE CYCLERY',
        'VICTOR ALEJANDRO GARNIER MORGA', 'RODRIGO AMADOR RAMIREZ',
        'ALEXIS JASIEL CONCHA ESPIRITU', 'RAÚL MENA ORTIZ', 'ANA CECILIA LOPEZ LOPEZ',
        'RAUL INFANTE MIRANDA', 'ARTURO LUNA ROMERO', 'EDUARDO LUNA LOPEZ',
        'MIGUEL ANGEL ORTIZ CASTAÑEDA', 'OSIRIS ONDAL DELFIN', 'JOSE MANUEL VAZQUEZ PACHECO',
        'TUNING AUTOSPORT', 'ADÁN ORTEGA LEÓN', 'HUGO ALLAN GARCIA MACIAS',
        'ORIOIL MEDRANO CESPEDES', 'JOSÉ RICARDO GAMBOA MANRIQUE', 'PAULINA ÁLVAREZ FERNÁNDEZ',
        'JOSE ANGEL DIAZ CORTES', 'JORGE FLORES LIMA', 'BERTHA LIGIA LAMELAS DOMINGUEZ',
        'ATV MOTO POWERSPORTS', 'ROCIO CABALLERO CORONEL', 'GRAND MOTOR SPORTS',
        'ALBERTO DÍAZ DE LEÓN ALONSO', 'MARKETER AYV', 'FRANCISCO MACHUCA ROJAS',
        'BLANCA ISABEL DÍAZ ALDECO RODRÍGUEZ', 'EL PAJE TIENDAS DEPARTAMENTALES SA DE CV',
        'MARIA GUADALUPE GODINEZ FERNANDEZ', 'FERNANDO PONTON ROCHA',
        'ZIRANDA CAPINDA MADRIGAL ALVAREZ UGENA', 'BROTHERS BIKE',
        'VICTOR ALBERTO VILLASEÑOR RUIZ', 'RAMON DE JESUS MARTINEZ LOPEZ',
        'EDUARDO FRANCISCO MENDOZA NIETO', 'BIKES95CYCLINGCLUB', 'OPCIONES CREATIVAS',
        'DEPORTES TEXCOCO', 'ANGELICA OSORIO GASPERIN', 'DANIEL CRUZ ARRIETA',
        'JULIAN ERNESTO CURIEL JIMENEZ', 'GO LEMON', 'H & A BIKES MEXICO',
        'CHRISTOPHER WALTER BASSAM', 'MANUEL ALEJANDRO NAVARRO GONZALEZ',
        'IVAN MARTINEZ CARRILLO', 'JESSICA FERNANDA JURADO CUETO', 'RICARDO REYES GOMEZ',
        'MANUEL DE JESUS SOTO ACOSTA', 'CARLOS DOMINGUEZ TOLEDO', 'ADÁN JOSUE SUÁREZ HERNÁNDEZ',
        'CICLISMO EXTREMO', 'CARLOS ALBERTO CRUZ CALVA', 'JUAN JOSÉ DE RUEDA MUÑOZ',
        'JESÚS EUDON FLORES NOVOA', 'JUAN JOSÉ GARCÍA MEDRANO', 'MARCO ANTONIO GARCÍA VEJAR',
        'HABROS BICICLETAS', 'MARIA CRISTINA QUINTERO MILLAN', 'JORGE JUAN VILLA MARTÍNEZ',
        'VICTOR HUGO VILLANUEVA GUZMAN', 'ADVENTURE BIKE RIDER', 'BICICLETAS SCJM',
        'MARCO TULIO ANDRADE NAVARRO', 'SALUD MARTINEZ'],
      fecha: '2025-07-01'
    },
    {
      patrones: ['XAVIER JAMES LORD SANTOS', 'IVAN NIEVES AYALA', 'LUCIA SALAZAR LOPEZ',
        'JESUS MANUEL MEDRANO VELARDE'],
      fecha: '2025-06-11'
    },
    {
      patrones: ['CYCLING RIDING DE MEXICO'],
      fecha: '2025-06-10'
    },
    {
      patrones: ['FRANCISCO AGUILAR MORALES', 'RUTA 87 BIKE STORE'],
      fecha: '2025-06-16'
    },
    {
      patrones: ['BIKES MART'],
      fecha: '2025-06-21'
    },
    {
      patrones: ['GUADALUPE GONZALEZ REYES', 'GUADALUPE GONZÁLES REYES'],
      fecha: '2025-06-13'
    },
    {
      patrones: ['FRANCISCO DAVID FRAGOSO DEL RIO', 'JESÚS IVÁN PÉREZ CAVAZOS'],
      fecha: '2025-06-25'
    },
    {
      patrones: ['JUAN MANUEL RUACHO RANGEL', 'NARUCO'],
      fecha: '2025-06-17'
    }
  ];

  private obtenerFechaInicio(cliente: ClienteConAcumulado): Date {
    if (cliente.f_inicio) {
      return new Date(cliente.f_inicio);
    }

    if (cliente.fecha_inicio_calculo) {
      return new Date(cliente.fecha_inicio_calculo);
    }

    const nombreUpper = (cliente.nombre_cliente || '').toUpperCase();
    const claveUpper = (cliente.clave || '').toUpperCase();

    for (const grupo of this.fechasEspeciales) {
      const encontrado = grupo.patrones.some(patron =>
        nombreUpper.includes(patron.toUpperCase()) ||
        claveUpper.includes(patron.toUpperCase())
      );

      if (encontrado) {
        return new Date(grupo.fecha);
      }
    }

    return new Date('2025-07-01');
  }

  private procesarIntegrales(clientes: ClienteConAcumulado[]): ClienteConAcumulado[] {
    const gruposIntegrales = [
      {
        nombre: 'MARCO TULIO ANDRADE NAVARRO',
        claves: ['JC539', 'EC216'],
        nombreIntegral: 'Integral 1',
        nivel: 'Partner Elite Plus',
        compraMinimaAnual: 12200000,
        compraMinimaInicial: 6345000,
        compromisoScott: 9000000,
        compromisoJulAgo: 1930500,
        compromisoSepOct: 2047500,
        compromisoNovDic: 1872000,
        compromisoEneFeb: 1260000,
        compromisoMarAbr: 1422000,
        compromisoMayJun: 468000,
        compromisoSynApaVit: 990000,
        compromisoJulAgoApp: 163350,
        compromisoSepOctApp: 173250,
        compromisoNovDicApp: 158400,
        compromisoEneFebApp: 163350,
        compromisoMarAbrApp: 173250,
        compromisoMayJunApp: 158400
      },
      {
        nombre: 'VICTOR HUGO VILLANUEVA GUZMAN',
        claves: ['LC657', 'GC411', 'MC679', 'MC677'],
        nombreIntegral: 'Integral 2',
        nivel: 'Partner Elite Plus',
        compraMinimaAnual: 19980000,
        compraMinimaInicial: 12690000,
        compromisoScott: 18000000,
        compromisoJulAgo: 3861000,
        compromisoSepOct: 4095000,
        compromisoNovDic: 3744000,
        compromisoEneFeb: 2520000,
        compromisoMarAbr: 2844000,
        compromisoMayJun: 936000,
        compromisoSynApaVit: 1980000,
        compromisoJulAgoApp: 326700,
        compromisoSepOctApp: 346500,
        compromisoNovDicApp: 316800,
        compromisoEneFebApp: 326700,
        compromisoMarAbrApp: 346500,
        compromisoMayJunApp: 316800
      },
      {
        nombre: 'NARUCO',
        claves: ['LC625', 'LC626', 'LC627'],
        nombreIntegral: 'Integral 3',
        nivel: 'Partner Elite',
        compraMinimaAnual: 5700000,
        compraMinimaInicial: 3590000,
        compromisoScott: 4950000,
        compromisoJulAgo: 1064250,
        compromisoSepOct: 1128600,
        compromisoNovDic: 1029600,
        compromisoEneFeb: 693000,
        compromisoMarAbr: 782100,
        compromisoMayJun: 252450,
        compromisoSynApaVit: 750000,
        compromisoJulAgoApp: 123750,
        compromisoSepOctApp: 260750,
        compromisoNovDicApp: 238400,
        compromisoEneFebApp: 42366,
        compromisoMarAbrApp: 42366, // +1 peso para ajuste
        compromisoMayJunApp: 42368
      }
    ];

    // 1. Procesar TODOS los clientes individualmente (respetando sus claves únicas)
    const todosClientesProcesados = clientes.map(cliente => {
      // Verificar si el cliente es parte de un grupo integral
      const grupoIntegral = gruposIntegrales.find(grupo =>
        grupo.claves.includes(cliente.clave)
      );

      // CALCULAR ACUMULADOS INDIVIDUALES usando el método corregido
      const resultados = this.calcularAcumulados(cliente, this.facturas);

      const clienteConValores: ClienteConAcumulado = {
        ...cliente,
        // VALORES CALCULADOS INDIVIDUALMENTE (cada cliente con SUS propias facturas)
        acumulado_anticipado: resultados.acumulado,
        avance_global_scott: resultados.scott,
        avance_jul_ago: resultados.avance_jul_ago,
        avance_sep_oct: resultados.avance_sep_oct,
        avance_nov_dic: resultados.avance_nov_dic,
        avance_jul_ago_app: resultados.avance_jul_ago_app,
        avance_sep_oct_app: resultados.avance_sep_oct_app,
        avance_nov_dic_app: resultados.avance_nov_dic_app,

        avance_ene_feb: resultados.avance_ene_feb,
        avance_mar_abr: resultados.avance_mar_abr,
        avance_may_jun: resultados.avance_may_jun,

        avance_ene_feb_app: resultados.avance_ene_feb_app,
        avance_mar_abr_app: resultados.avance_mar_abr_app,
        avance_may_jun_app: resultados.avance_may_jun_app,

        // COMPROMISOS (Usando las funciones placeholder que creamos en paso 4)
        compromiso_ene_feb: this.calcularCompromisoEneFeb(cliente.nivel, cliente.nombre_cliente),
        compromiso_mar_abr: this.calcularCompromisoMarAbr(cliente.nivel, cliente.nombre_cliente),
        compromiso_may_jun: this.calcularCompromisoMayJun(cliente.nivel, cliente.nombre_cliente),

        compromiso_ene_feb_app: this.calcularCompromisoEneFebApp(cliente.nivel, cliente.nombre_cliente),
        compromiso_mar_abr_app: this.calcularCompromisoMarAbrApp(cliente.nivel, cliente.nombre_cliente),
        compromiso_may_jun_app: this.calcularCompromisoMayJunApp(cliente.nivel, cliente.nombre_cliente),

        acumulado_syncros: resultados.acumulado_syncros,
        acumulado_apparel: resultados.acumulado_apparel,
        acumulado_vittoria: resultados.acumulado_vittoria,
        acumulado_bold: resultados.acumulado_bold,
        avance_global: resultados.avance_global,
        avance_global_apparel_syncros_vittoria: resultados.avance_global_apparel_syncros_vittoria,

        // COMPROMISOS: Si es parte de integral, usar los del grupo, sino los individuales
        compra_minima_anual: grupoIntegral ? grupoIntegral.compraMinimaAnual : this.calcularCompraMinimaPorNivel(cliente.nivel),
        compra_minima_inicial: grupoIntegral ? grupoIntegral.compraMinimaInicial : this.calcularCompraMinimaInicial(cliente.nivel),
        compromiso_scott: grupoIntegral ? grupoIntegral.compromisoScott : this.calcularCompromisoScott(cliente.nivel),
        compromiso_jul_ago: grupoIntegral ? grupoIntegral.compromisoJulAgo : this.calcularCompromisoJulAgo(cliente.nivel, cliente.nombre_cliente),
        compromiso_sep_oct: grupoIntegral ? grupoIntegral.compromisoSepOct : this.calcularCompromisoSepOct(cliente.nivel, cliente.nombre_cliente),
        compromiso_nov_dic: grupoIntegral ? grupoIntegral.compromisoNovDic : this.calcularCompromisoNovDic(cliente.nivel, cliente.nombre_cliente),
        compromiso_apparel_syncros_vittoria: grupoIntegral ? grupoIntegral.compromisoSynApaVit : this.calcularCompromisoApparelSyncrosVittoria(cliente.nivel, cliente.nombre_cliente),
        compromiso_jul_ago_app: grupoIntegral ? grupoIntegral.compromisoJulAgoApp : this.calcularCompromisoJulAgoApp(cliente.nivel, cliente.nombre_cliente),
        compromiso_sep_oct_app: grupoIntegral ? grupoIntegral.compromisoSepOctApp : this.calcularCompromisoSepOctApp(cliente.nivel, cliente.nombre_cliente),
        compromiso_nov_dic_app: grupoIntegral ? grupoIntegral.compromisoNovDicApp : this.calcularCompromisoNovDicApp(cliente.nivel, cliente.nombre_cliente),

        fecha_inicio_calculo: cliente.f_inicio ? new Date(cliente.f_inicio).toISOString().split('T')[0] : this.obtenerFechaInicio(cliente).toISOString().split('T')[0],
        esParteDeIntegral: !!grupoIntegral,
        grupoIntegral: grupoIntegral ? gruposIntegrales.indexOf(grupoIntegral) + 1 : undefined
      };

      // Caso especial para CHRISTIAN BOCCALETTI
      if ((cliente.nombre_cliente || '').toUpperCase() === 'CHRISTIAN BOCCALETTI') {
        clienteConValores.compra_minima_anual = 3800000;
        clienteConValores.compra_minima_inicial = 2395000;
        clienteConValores.compromiso_scott = 3300000;
        clienteConValores.compromiso_jul_ago = 707850;
        clienteConValores.compromiso_sep_oct = 750750;
        clienteConValores.compromiso_nov_dic = 686400;
        clienteConValores.compromiso_ene_feb = 462000;
        clienteConValores.compromiso_mar_abr = 521400;
        clienteConValores.compromiso_may_jun = 171600;
        clienteConValores.compromiso_apparel_syncros_vittoria = 500000;
        clienteConValores.compromiso_jul_ago_app = 82500;
        clienteConValores.compromiso_sep_oct_app = 87500;
        clienteConValores.compromiso_nov_dic_app = 80000;
        clienteConValores.compromiso_ene_feb_app = 82500;
        clienteConValores.compromiso_mar_abr_app = 87500;
        clienteConValores.compromiso_may_jun_app = 80000;
      }

      return clienteConValores;
    });

    // 2. Crear registros de INTEGRALES CONSOLIDADOS (sumando los valores individuales)
    this.integralesOriginal = gruposIntegrales.map((grupo, index) => {
      // Obtener SOLO los clientes que pertenecen a este grupo integral
      const clientesGrupo = todosClientesProcesados.filter(cliente =>
        grupo.claves.includes(cliente.clave)
      );

      // SUMAR los valores que fueron calculados individualmente para cada cliente
      const sumaAcumulado = clientesGrupo.reduce((sum, c) => sum + (c.acumulado_anticipado || 0), 0);
      const sumaScott = clientesGrupo.reduce((sum, c) => sum + (c.avance_global_scott || 0), 0);
      const sumaJulAgo = clientesGrupo.reduce((sum, c) => sum + (c.avance_jul_ago || 0), 0);
      const sumaSepOct = clientesGrupo.reduce((sum, c) => sum + (c.avance_sep_oct || 0), 0);
      const sumaNovDic = clientesGrupo.reduce((sum, c) => sum + (c.avance_nov_dic || 0), 0);
      const sumaEneFeb = clientesGrupo.reduce((sum, c) => sum + (c.avance_ene_feb || 0), 0);
      const sumaMarAbr = clientesGrupo.reduce((sum, c) => sum + (c.avance_mar_abr || 0), 0);
      const sumaMayJun = clientesGrupo.reduce((sum, c) => sum + (c.avance_may_jun || 0), 0);

      const sumaJulAgoApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_jul_ago_app || 0), 0);
      const sumaSepOctApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_sep_oct_app || 0), 0);
      const sumaNovDicApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_nov_dic_app || 0), 0);
      const sumaEneFebApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_ene_feb_app || 0), 0);
      const sumaMarAbrApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_mar_abr_app || 0), 0);
      const sumaMayJunApp = clientesGrupo.reduce((sum, c) => sum + (c.avance_may_jun_app || 0), 0);

      const acumuladoSyncros = clientesGrupo.reduce((sum, c) => sum + (c.acumulado_syncros || 0), 0);
      const acumuladoApparel = clientesGrupo.reduce((sum, c) => sum + (c.acumulado_apparel || 0), 0);
      const acumuladoVittoria = clientesGrupo.reduce((sum, c) => sum + (c.acumulado_vittoria || 0), 0);
      const acumuladoBold = clientesGrupo.reduce((sum, c) => sum + (c.acumulado_bold || 0), 0);

      const avanceGlobal = sumaScott + acumuladoSyncros + acumuladoApparel + acumuladoVittoria + acumuladoBold;
      const avanceGlobalApparel = acumuladoSyncros + acumuladoApparel + acumuladoVittoria;

      return {
        clave: grupo.nombreIntegral,
        zona: clientesGrupo[0]?.zona || '',
        evac: clientesGrupo[0]?.evac,
        nombre_cliente: grupo.nombre,
        nivel: grupo.nivel,
        acumulado_anticipado: sumaAcumulado,
        avance_global_scott: sumaScott,
        compra_minima_anual: grupo.compraMinimaAnual,
        compra_minima_inicial: grupo.compraMinimaInicial,
        compromiso_scott: grupo.compromisoScott,
        compromiso_jul_ago: grupo.compromisoJulAgo,
        compromiso_sep_oct: grupo.compromisoSepOct,
        compromiso_nov_dic: grupo.compromisoNovDic,
        compromiso_ene_feb: grupo.compromisoEneFeb,
        compromiso_mar_abr: grupo.compromisoMarAbr,
        compromiso_may_jun: grupo.compromisoMayJun,
        compromiso_apparel_syncros_vittoria: grupo.compromisoSynApaVit,
        compromiso_jul_ago_app: grupo.compromisoJulAgoApp,
        compromiso_sep_oct_app: grupo.compromisoSepOctApp,
        compromiso_nov_dic_app: grupo.compromisoNovDicApp,
        compromiso_ene_feb_app: grupo.compromisoEneFebApp,
        compromiso_mar_abr_app: grupo.compromisoMarAbrApp,
        compromiso_may_jun_app: grupo.compromisoMayJunApp,
        esIntegral: true,
        esParteDeIntegral: false,
        avance_jul_ago: sumaJulAgo,
        avance_sep_oct: sumaSepOct,
        avance_nov_dic: sumaNovDic,
        avance_ene_feb: sumaEneFeb,
        avance_mar_abr: sumaMarAbr,
        avance_may_jun: sumaMayJun,
        avance_jul_ago_app: sumaJulAgoApp,
        avance_sep_oct_app: sumaSepOctApp,
        avance_nov_dic_app: sumaNovDicApp,
        avance_ene_feb_app: sumaEneFebApp,
        avance_mar_abr_app: sumaMarAbrApp,
        avance_may_jun_app: sumaMayJunApp,

        acumulado_syncros: acumuladoSyncros,
        acumulado_apparel: acumuladoApparel,
        acumulado_vittoria: acumuladoVittoria,
        acumulado_bold: acumuladoBold,
        avance_global: avanceGlobal,
        avance_global_apparel_syncros_vittoria: avanceGlobalApparel,
        grupoIntegral: index + 1
      };
    });

    return todosClientesProcesados;
  }

  // --- METAS 2026 BASADAS EN TABLAS ---
  calcularCompromisoEneFeb(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 840000;
    if (n === 'PARTNER ELITE') return 308000;
    if (n === 'PARTNER') return 210000;
    if (n === 'DISTRIBUIDOR') return 52500;
    return 0;
  }

  calcularCompromisoMarAbr(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 945000;
    if (n === 'PARTNER ELITE') return 346500;
    if (n === 'PARTNER') return 236250;
    if (n === 'DISTRIBUIDOR') return 52500;
    return 0;
  }

  calcularCompromisoMayJun(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 315000;
    if (n === 'PARTNER ELITE') return 115500;
    if (n === 'PARTNER') return 78750;
    if (n === 'DISTRIBUIDOR') return 0;
    return 0;
  }

  calcularCompromisoEneFebApp(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 108900;
    if (n === 'PARTNER ELITE') return 54450;
    if (n === 'PARTNER') return 37950;
    if (n === 'DISTRIBUIDOR') return 15000;
    return 0;
  }

  calcularCompromisoMarAbrApp(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 115500;
    if (n === 'PARTNER ELITE') return 57750;
    if (n === 'PARTNER') return 40250;
    if (n === 'DISTRIBUIDOR') return 15000;
    return 0;
  }

  calcularCompromisoMayJunApp(nivel: string, nombre: string): number {
    const n = nivel?.toUpperCase();
    if (n === 'PARTNER ELITE PLUS') return 105600;
    if (n === 'PARTNER ELITE') return 52800;
    if (n === 'PARTNER') return 36800;
    if (n === 'DISTRIBUIDOR') return 0;
    return 0;
  }

  calcularAvanceGlobal(cliente: any): number {
    return this.convertirNumero(cliente.avance_global_scott) +
      this.convertirNumero(cliente.avance_global_apparel_syncros_vittoria);
  }

  calcularCompraMinimaPorNivel(nivel: string): number {
    switch (nivel) {
      case 'Partner Elite Plus':
        return 6660000;
      case 'Partner Elite':
        return 2530000;
      case 'Partner':
        return 1730000;
      case 'Distribuidor':
        return 410000;
      default:
        return 0;
    }
  }

  calcularCompraMinimaInicial(nivel: string): number {
    if (!nivel) return 0;

    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 4230000;
      case 'PARTNER ELITE':
        return 1595000;
      case 'PARTNER':
        return 1090000;
      case 'DISTRIBUIDOR':
        return 205000;
      default:
        return 0;
    }
  }

  calcularCompromisoScott(nivel: string): number {
    if (!nivel) return 0;

    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 6000000;
      case 'PARTNER ELITE':
        return 2200000;
      case 'PARTNER':
        return 1500000;
      case 'DISTRIBUIDOR':
        return 350000;
      default:
        return 0;
    }
  }

  calcularCompromisoJulAgo(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 1287000;
      case 'PARTNER ELITE':
        return 471900;
      case 'PARTNER':
        return 321750;
      case 'DISTRIBUIDOR':
        return 87500;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  calcularCompromisoSepOct(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 1365000;
      case 'PARTNER ELITE':
        return 500500;
      case 'PARTNER':
        return 341250;
      case 'DISTRIBUIDOR':
        return 87500;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  calcularCompromisoNovDic(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 1248000;
      case 'PARTNER ELITE':
        return 457600;
      case 'PARTNER':
        return 312000;
      case 'DISTRIBUIDOR':
        return 70000;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  calcularCompromisoApparelSyncrosVittoria(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 660000;
      case 'PARTNER ELITE':
        return 330000;
      case 'PARTNER':
        return 230000;
      case 'DISTRIBUIDOR':
        return 60000;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  calcularCompromisoJulAgoApp(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 108900;
      case 'PARTNER ELITE':
        return 54450;
      case 'PARTNER':
        return 37950;
      case 'DISTRIBUIDOR':
        return 15000;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  private calcularCompromisoSepOctApp(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 115500;
      case 'PARTNER ELITE':
        return 57750;
      case 'PARTNER':
        return 40250;
      case 'DISTRIBUIDOR':
        return 15000;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  private calcularCompromisoNovDicApp(nivel: string, nombreCliente: string): number {
    switch ((nivel || '').toUpperCase()) {
      case 'PARTNER ELITE PLUS':
        return 105600;
      case 'PARTNER ELITE':
        return 52800;
      case 'PARTNER':
        return 36800;
      case 'DISTRIBUIDOR':
        return 0;
      case 'INTEGRAL': // Este caso se maneja en los grupos integrales
        return 0;
      default:
        return 0;
    }
  }

  private calcularAcumulados(cliente: Cliente, facturas: FacturaOdoo[]): {
    acumulado: number, scott: number, avance_jul_ago: number,
    avance_sep_oct: number, avance_nov_dic: number, avance_jul_ago_app: number,
    avance_sep_oct_app: number, avance_nov_dic_app: number,
    acumulado_syncros: number, acumulado_apparel: number, acumulado_vittoria: number,
    acumulado_bold: number, avance_global_apparel_syncros_vittoria: number, avance_global: number,
    avance_ene_feb: number, avance_mar_abr: number, avance_may_jun: number,
    avance_ene_feb_app: number, avance_mar_abr_app: number, avance_may_jun_app: number,
  } {
    const clave = cliente.clave;
    const nombreCliente = cliente.nombre_cliente?.toUpperCase() || '';
    const fechaInicio = cliente.f_inicio ? new Date(cliente.f_inicio) : new Date('2025-07-01');
    const fechaFin = cliente.f_fin ? new Date(cliente.f_fin) : new Date('2026-06-30');

    // Filtrado de facturas generales del cliente
    let facturasCliente = facturas.filter(factura => {
      const coincidePorClave = factura.contacto_referencia === clave || factura.contacto_referencia === `${clave}-CA`;
      const fechaFactura = new Date(factura.fecha_factura);
      return coincidePorClave && fechaFactura >= fechaInicio && fechaFactura <= fechaFin;
    });

    if (facturasCliente.length === 0) {
      facturasCliente = facturas.filter(factura => {
        const nombreFactura = factura.contacto_nombre?.toUpperCase() || '';
        const coincidePorNombre = nombreFactura === nombreCliente || (nombreCliente.length > 10 && nombreFactura.includes(nombreCliente));
        const fechaFactura = new Date(factura.fecha_factura);
        return coincidePorNombre && fechaFactura >= fechaInicio && fechaFactura <= fechaFin;
      });
    }

    // Cálculos de periodos específicos usando tus métodos individuales
    const avanceJulAgo = this.calcularAvanceJulAgo(cliente, facturas);
    const avanceSepOct = this.calcularAvanceSepOct(cliente, facturas);
    const avanceNovDic = this.calcularAvanceNovDic(cliente, facturas);
    const avanceEneFeb = this.calcularAvanceEneFeb(cliente, facturas);
    const avanceMarAbr = this.calcularAvanceMarAbr(cliente, facturas);
    const avanceMayJun = this.calcularAvanceMayJun(cliente, facturas);

    const avanceJulAgoApp = this.calcularAvanceJulAgoApp(cliente, facturas);
    const avanceSepOctApp = this.calcularAvanceSepOctApp(cliente, facturas);
    const avanceNovDicApp = this.calcularAvanceNovDicApp(cliente, facturas);
    const avanceEneFebApp = this.calcularAvanceEneFebApp(cliente, facturas);
    const avanceMarAbrApp = this.calcularAvanceMarAbrApp(cliente, facturas);
    const avanceMayJunApp = this.calcularAvanceMayJunApp(cliente, facturas);

    const acumuladoSyncros = this.calcularAcumuladoSyncros(cliente, facturas);
    const acumuladoApparel = this.calcularAcumuladoApparel(cliente, facturas);
    const acumuladoVittoria = this.calcularAcumuladoVittoria(cliente, facturas);
    const acumuladoBold = this.calcularAcumuladoBold(cliente, facturas);

    const acumulado = facturasCliente.reduce((total, factura) => total + (+factura.venta_total || 0), 0);
    const acumuladoScott = avanceJulAgo + avanceSepOct + avanceNovDic + avanceEneFeb + avanceMarAbr + avanceMayJun;

    const avance_global_apparel_syncros_vittoria = acumuladoSyncros + acumuladoApparel + acumuladoVittoria;
    const avance_global = acumuladoScott + avance_global_apparel_syncros_vittoria;

    return {
      acumulado,
      scott: acumuladoScott,
      avance_jul_ago: avanceJulAgo,
      avance_sep_oct: avanceSepOct,
      avance_nov_dic: avanceNovDic,
      avance_jul_ago_app: avanceJulAgoApp,
      avance_sep_oct_app: avanceSepOctApp,
      avance_nov_dic_app: avanceNovDicApp,
      avance_ene_feb: avanceEneFeb,
      avance_mar_abr: avanceMarAbr,
      avance_may_jun: avanceMayJun,
      avance_ene_feb_app: avanceEneFebApp,
      avance_mar_abr_app: avanceMarAbrApp,
      avance_may_jun_app: avanceMayJunApp,
      acumulado_syncros: acumuladoSyncros,
      acumulado_apparel: acumuladoApparel,
      acumulado_vittoria: acumuladoVittoria,
      acumulado_bold: acumuladoBold,
      avance_global_apparel_syncros_vittoria,
      avance_global
    };
  }

  private calcularAvanceJulAgo(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, cliente.f_inicio ? cliente.f_inicio : '2025-07-01', '2025-08-31', false);
  }

  private calcularAvanceSepOct(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2025-09-01', '2025-10-31', false);
  }

  private calcularAvanceNovDic(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2025-11-01', '2025-12-31', false);
  }

  private calcularAvanceJulAgoApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, cliente.f_inicio ? cliente.f_inicio : '2025-07-01', '2025-08-31', true);
  }

  private calcularAvanceSepOctApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2025-09-01', '2025-10-31', true);
  }

  private calcularAvanceNovDicApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2025-11-01', '2025-12-31', true);
  }

  private calcularAcumuladoSyncros(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvancePorMarca(cliente, facturas, 'SYNCROS');
  }

  private calcularAcumuladoApparel(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvancePorMarca(cliente, facturas, 'APPAREL');
  }

  private calcularAcumuladoVittoria(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvancePorMarca(cliente, facturas, 'VITTORIA');
  }

  private calcularAcumuladoBold(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvancePorMarca(cliente, facturas, 'BOLD');
  }

  private calcularAvancePorMarca(cliente: Cliente, facturas: FacturaOdoo[], tipoFiltro: string): number {
    const clave = cliente.clave;
    const nombreCliente = cliente.nombre_cliente?.toUpperCase() || '';
    const fechaInicio = cliente.f_inicio ? new Date(cliente.f_inicio) : new Date('2025-07-01');
    const fechaFin = cliente.f_fin ? new Date(cliente.f_fin) : new Date('2026-06-30');

    // Mantenemos TODOS tus casos especiales intactos
    const esCasoEspecial = nombreCliente.includes('BROTHERS BIKE') ||
      nombreCliente.includes('NARUCO') ||
      clave === 'KC612' || clave === 'FD324' ||
      nombreCliente.includes('MANUEL ALEJANDRO NAVARRO GONZALEZ') ||
      nombreCliente.includes('JOSE ANGEL DIAZ CORTES') ||
      nombreCliente.includes('JUAN MANUEL RUACHO RANGEL') ||
      clave === 'KA578';

    let facturasValidas;

    const filtroBase = (factura: FacturaOdoo) => {
      const fechaFactura = new Date(factura.fecha_factura);
      const enRango = fechaFactura >= fechaInicio && fechaFactura <= fechaFin;

      let esProductoValido = false;
      const marca = String(factura?.marca || '').toUpperCase();
      const esApparelSi = String(factura?.apparel || '').toUpperCase() === 'SI';

      // Aquí separamos exactamente qué marca queremos sumar
      if (tipoFiltro === 'SYNCROS') {
        esProductoValido = marca === 'SYNCROS';
      } else if (tipoFiltro === 'VITTORIA') {
        esProductoValido = marca === 'VITTORIA';
      } else if (tipoFiltro === 'APPAREL') {
        if (marca === 'SCOTT' && esApparelSi) {
          const nombreProducto = String(factura?.nombre_producto || '').toUpperCase();
          esProductoValido = !nombreProducto.includes('BICICLETA');
        }
      } else if (tipoFiltro === 'BOLD') {
        esProductoValido = marca === 'BOLD';
      }

      return enRango && esProductoValido;
    };

    if (esCasoEspecial) {
      facturasValidas = facturas.filter(factura => {
        const coincideClave = factura.contacto_referencia === clave || factura.contacto_referencia === `${clave}-CA`;

        let coincideNombre = false;
        if (nombreCliente.includes('BROTHERS BIKE')) {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes('BROTHERS BIKE');
        } else if (nombreCliente.includes('NARUCO') && !['LC625', 'LC626', 'LC627'].includes(clave)) {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
        } else {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
        }

        const baseValida = filtroBase(factura);

        if (nombreCliente.includes('BROTHERS BIKE')) return coincideNombre && baseValida;
        if (nombreCliente.includes('NARUCO') && ['LC625', 'LC626', 'LC627'].includes(clave)) return coincideClave && baseValida;
        return (coincideClave || coincideNombre) && baseValida;
      });
    } else {
      facturasValidas = facturas.filter(factura => {
        const coincideClave = factura.contacto_referencia === clave || factura.contacto_referencia === `${clave}-CA`;
        return coincideClave && filtroBase(factura);
      });

      if (facturasValidas.length === 0) {
        facturasValidas = facturas.filter(factura => {
          let coincideNombre = false;
          if (nombreCliente.includes('NARUCO') && !['LC625', 'LC626', 'LC627'].includes(clave)) {
            coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
          } else if (!nombreCliente.includes('NARUCO')) {
            coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
          }
          return coincideNombre && filtroBase(factura);
        });
      }
    }

    return this.redondearDecimales(
      facturasValidas.reduce((total, factura) => total + (+factura.venta_total || 0), 0)
    );
  }

  private redondearDecimales(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  getValoresIntegral(nombreCliente: string): any {
    if (!nombreCliente) return null;
    switch ((nombreCliente || '').toUpperCase()) {
      case 'MARCO TULIO ANDRADE NAVARRO':
        return {
          compraMinimaAnual: 12200000, compraMinimaInicial: 6345000, compromisoScott: 9000000,
          compromisoJulAgo: 1930500, compromisoSepOct: 2047500, compromisoNovDic: 1872000,
          compromisoEneFeb: 1260000, compromisoMarAbr: 1417500, compromisoMayJun: 472500, // 2026
          compromisoSynApaVit: 990000, compromisoJulAgoApp: 163350, compromisoSepOctApp: 173250,
          compromisoNovDicApp: 158400, compromisoEneFebApp: 163350, compromisoMarAbrApp: 173250, compromisoMayJunApp: 158400
        };
      case 'VICTOR HUGO VILLANUEVA GUZMAN':
        return {
          compraMinimaAnual: 19980000, compraMinimaInicial: 12690000, compromisoScott: 18000000,
          compromisoJulAgo: 3861000, compromisoSepOct: 4095000, compromisoNovDic: 3744000,
          compromisoEneFeb: 2520000, compromisoMarAbr: 2835000, compromisoMayJun: 945000, // 2026
          compromisoSynApaVit: 1980000, compromisoJulAgoApp: 326700, compromisoSepOctApp: 346500,
          compromisoNovDicApp: 316800, compromisoEneFebApp: 326700, compromisoMarAbrApp: 346500, compromisoMayJunApp: 316800
        };
      case 'NARUCO':
        return {
          compraMinimaAnual: 5700000, compraMinimaInicial: 3590000, compromisoScott: 4950000,
          compromisoJulAgo: 1064250, compromisoSepOct: 1128600, compromisoNovDic: 1029600,
          compromisoEneFeb: 693000, compromisoMarAbr: 779625, compromisoMayJun: 259875, // 2026
          compromisoSynApaVit: 750000, compromisoJulAgoApp: 123750, compromisoSepOctApp: 260750,
          compromisoNovDicApp: 238400, compromisoEneFebApp: 123750, compromisoMarAbrApp: 260750, compromisoMayJunApp: 238400
        };
      default: return null;
    }
  }

  calculoPorcentajeCompraAnual(integral: any): string {
    if (!integral || !integral.nombre_cliente) return '0%';

    const nombreCliente = (integral.nombre_cliente || '').toUpperCase();
    const valores = this.getValoresIntegral(nombreCliente);

    if (!valores || !valores.compraMinimaAnual || valores.compraMinimaAnual <= 0) {
      return '0%';
    }

    const suma = (integral.avance_global_scott || 0) +
      (integral.acumulado_syncros || 0) +
      (integral.acumulado_apparel || 0) +
      (integral.acumulado_vittoria || 0);

    const porcentaje = (suma / valores.compraMinimaAnual) * 100;
    return Math.round(porcentaje) + '%';
  }

  calculoPorcentajeCompraInicial(integral: any): string {
    if (!integral || !integral.nombre_cliente) return '0%';

    const nombreCliente = (integral.nombre_cliente || '').toUpperCase();
    const valores = this.getValoresIntegral(nombreCliente);

    if (!valores || !valores.compraMinimaInicial || valores.compraMinimaInicial <= 0) {
      return '0%';
    }

    const suma = (integral.avance_global_scott || 0) +
      (integral.acumulado_syncros || 0) +
      (integral.acumulado_apparel || 0) +
      (integral.acumulado_vittoria || 0);

    const porcentaje = (suma / valores.compraMinimaInicial) * 100;
    return Math.round(porcentaje) + '%';
  }

  calculoPorcentajeAvanceSynAppVit(integral: any): string {
    if (!integral || !integral.compromiso_apparel_syncros_vittoria || integral.compromiso_apparel_syncros_vittoria <= 0) {
      return '0%';
    }

    const suma = (integral.acumulado_syncros || 0) +
      (integral.acumulado_apparel || 0) +
      (integral.acumulado_vittoria || 0);

    const porcentaje = (suma / integral.compromiso_apparel_syncros_vittoria) * 100;
    return Math.round(porcentaje) + '%';
  }

  guardarDatosEnBackend() {
    this.cargando = true;

    const datosParaGuardar = [...this.clientesOriginal, ...this.integralesOriginal];

    const todosLosDatosConPorcentajes = datosParaGuardar.map(item => {
      return this.calcularPorcentajes(item);
    });

    this.previoService.actualizarPrevio(todosLosDatosConPorcentajes)
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.mensajeAlerta = 'Datos actualizados correctamente';
          this.tipoAlerta = 'exito';
        },
        error: (err) => {
          this.cargando = false;
          this.mensajeAlerta = 'Error al actualizar datos: ' + (err.error?.message || err.message || 'Error desconocido');
          this.tipoAlerta = 'error';
        }
      });
  }

  private calcularPorcentajes(cliente: any): any {
    const calcular = (avance: any, compromiso: any): number => {
      const avanceNum = this.convertirNumero(avance);
      const compromisoNum = this.convertirNumero(compromiso);

      if (!compromisoNum || compromisoNum === 0) return 0;
      return Math.round((avanceNum / compromisoNum) * 100);
    };

    // Mapeamos el objeto completo asegurando que TODOS los campos de 2026 viajen al Back
    return {
      ...cliente,
      // Porcentajes Globales
      porcentaje_anual: calcular(
        this.convertirNumero(cliente.avance_global_scott) + this.convertirNumero(cliente.avance_global_apparel_syncros_vittoria),
        cliente.compra_minima_anual
      ),
      porcentaje_global: calcular(
        this.convertirNumero(cliente.avance_global_scott) + this.convertirNumero(cliente.avance_global_apparel_syncros_vittoria),
        cliente.compra_minima_inicial
      ),

      // --- CAMPOS NUEVOS 2026 (SCOTT) ---
      compromiso_ene_feb: cliente.compromiso_ene_feb || 0,
      avance_ene_feb: cliente.avance_ene_feb || 0,
      porcentaje_ene_feb: calcular(cliente.avance_ene_feb, cliente.compromiso_ene_feb),

      compromiso_mar_abr: cliente.compromiso_mar_abr || 0,
      avance_mar_abr: cliente.avance_mar_abr || 0,
      porcentaje_mar_abr: calcular(cliente.avance_mar_abr, cliente.compromiso_mar_abr),

      compromiso_may_jun: cliente.compromiso_may_jun || 0,
      avance_may_jun: cliente.avance_may_jun || 0,
      porcentaje_may_jun: calcular(cliente.avance_may_jun, cliente.compromiso_may_jun),

      // --- CAMPOS NUEVOS 2026 (APPAREL) ---
      compromiso_ene_feb_app: cliente.compromiso_ene_feb_app || 0,
      avance_ene_feb_app: cliente.avance_ene_feb_app || 0,
      porcentaje_ene_feb_app: calcular(cliente.avance_ene_feb_app, cliente.compromiso_ene_feb_app),

      compromiso_mar_abr_app: cliente.compromiso_mar_abr_app || 0,
      avance_mar_abr_app: cliente.avance_mar_abr_app || 0,
      porcentaje_mar_abr_app: calcular(cliente.avance_mar_abr_app, cliente.compromiso_mar_abr_app),

      compromiso_may_jun_app: cliente.compromiso_may_jun_app || 0,
      avance_may_jun_app: cliente.avance_may_jun_app || 0,
      porcentaje_may_jun_app: calcular(cliente.avance_may_jun_app, cliente.compromiso_may_jun_app)
    };
  }

  exportarAExcel() {
    try {
      this.cargando = true;

      this.previoService.obtenerPrevio().subscribe({
        next: (datos) => {
          if (!datos || datos.length === 0) {
            this.mensajeAlerta = 'No hay datos para exportar';
            this.tipoAlerta = 'error';
            this.cargando = false;
            return;
          }

          // Función helper para formatear números con comas
          const formatearNumero = (valor: string | number): string => {
            const num = typeof valor === 'string' ? parseFloat(valor) : valor;
            return num.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          };

          // Función helper para formatear porcentajes
          const formatearPorcentaje = (valor: string | number): string => {
            const num = typeof valor === 'string' ? parseFloat(valor) : valor;
            return `${num}%`;
          };

          // Mapear los datos al formato deseado para Excel
          const datosParaExcel = datos.map(item => ({
            'Clave': item.clave || '',
            'EVAC': item.evac || '',
            'Cliente': item.nombre_cliente || '',
            'Acumulado Compra Anticipada': formatearNumero(item.acumulado_anticipado || 0),
            'Elección NIVEL': item.nivel || '',
            'Cumplimiento de compra minima inicial': this.verificarCumplimientoCompraInicial(item),
            'Compra Mínima ANUAL': formatearNumero(item.compra_minima_anual || 0),
            '% Compra Anual': formatearPorcentaje(item.porcentaje_anual || 0),
            'Compra Mínima INICIAL': formatearNumero(item.compra_minima_inicial || 0),
            'Avance GLOBAL': formatearNumero(item.avance_global || 0),
            '% Avance Global': formatearPorcentaje(item.porcentaje_global || 0),
            'Compromiso SCOTT': formatearNumero(item.compromiso_scott || 0),
            'Avance GLOBAL SCOTT': formatearNumero(item.avance_global_scott || 0),
            '% Scott': formatearPorcentaje(item.porcentaje_scott || 0),
            'Compromiso JUL-AGO': formatearNumero(item.compromiso_jul_ago || 0),
            'Avance Jul-Ago': formatearNumero(item.avance_jul_ago || 0),
            '% Jul-Ago': formatearPorcentaje(item.porcentaje_jul_ago || 0),
            'Compromiso SEPT-OCT': formatearNumero(item.compromiso_sep_oct || 0),
            'Avance Sep-Oct': formatearNumero(item.avance_sep_oct || 0),
            '% Sep-Oct': formatearPorcentaje(item.porcentaje_sep_oct || 0),
            'Compromiso NOV-DIC': formatearNumero(item.compromiso_nov_dic || 0),
            'Avance Nov-Dic': formatearNumero(item.avance_nov_dic || 0),
            '% Nov-Dic': formatearPorcentaje(item.porcentaje_nov_dic || 0),
            'Compromiso APPAREL, SYNCROS, VITTORIA': formatearNumero(item.compromiso_apparel_syncros_vittoria || 0),
            'Avance GLOBAL App/Syn/Vit': formatearNumero(item.avance_global_apparel_syncros_vittoria || 0),
            '% App/Syn/Vit': formatearPorcentaje(item.porcentaje_apparel_syncros_vittoria || 0),
            'Compromiso JUL-AGO App': formatearNumero(item.compromiso_jul_ago_app || 0),
            'Avance Jul-Ago App': formatearNumero(item.avance_jul_ago_app || 0),
            '% Jul-Ago App': formatearPorcentaje(item.porcentaje_jul_ago_app || 0),
            'Compromiso SEPT-OCT App': formatearNumero(item.compromiso_sep_oct_app || 0),
            'Avance Sep-Oct App': formatearNumero(item.avance_sep_oct_app || 0),
            '% Sep-Oct App': formatearPorcentaje(item.porcentaje_sep_oct_app || 0),
            'Compromiso NOV-DIC App': formatearNumero(item.compromiso_nov_dic_app || 0),
            'Avance Nov-Dic App': formatearNumero(item.avance_nov_dic_app || 0),
            '% Nov-Dic App': formatearPorcentaje(item.porcentaje_nov_dic_app || 0),
            'SYNCROS Acumulado': formatearNumero(item.acumulado_syncros || 0),
            'APPAREL Acumulado': formatearNumero(item.acumulado_apparel || 0),
            'VITTORIA Acumulado': formatearNumero(item.acumulado_vittoria || 0),
            'BOLD Acumulado': formatearNumero(item.acumulado_bold || 0)
          }));

          const ws = XLSX.utils.json_to_sheet(datosParaExcel);
          const wb = XLSX.utils.book_new();

          // ===> LÓGICA PARA CALCULAR ANCHOS DINÁMICOS <===
          const anchosDeColumna = Object.keys(datosParaExcel[0]).map(header => {
            const anchoMaximo = datosParaExcel.reduce((max, row) => {
              const valor = row[header as keyof typeof row];
              const longitud = String(valor).length;
              return Math.max(max, longitud);
            }, header.length); // Comienza con la longitud del encabezado
            return { wch: anchoMaximo + 2 }; // Añade un espacio extra
          });

          ws['!cols'] = anchosDeColumna;
          // ===> FIN DE LA LÓGICA DE ANCHOS DINÁMICOS <===

          XLSX.utils.book_append_sheet(wb, ws, 'Monitor Previo');

          const fecha = new Date();
          const fechaHora = fecha.getFullYear().toString() +
            ('0' + (fecha.getMonth() + 1)).slice(-2) +
            ('0' + fecha.getDate()).slice(-2);
          const nombreArchivo = `previo-${fechaHora}.xlsx`;

          XLSX.writeFile(wb, nombreArchivo);

          this.mensajeAlerta = `Datos exportados exitosamente`;
          this.tipoAlerta = 'exito';
          this.cargando = false;

        },
        error: (err) => {
          console.error('Error al obtener datos para exportar:', err);
          this.mensajeAlerta = 'Error al obtener los datos para exportar';
          this.tipoAlerta = 'error';
          this.cargando = false;
        }
      });

    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.mensajeAlerta = 'Error al exportar los datos a Excel';
      this.tipoAlerta = 'error';
      this.cargando = false;
    }
  }

  // Función auxiliar para evitar divisiones por cero y porcentajes infinitos
  private calcularPorcentajeSeguro(avance: number, meta: number): number {
    // Aseguramos que sean números
    const avanceNum = avance || 0;
    const metaNum = meta || 0;

    // Si la meta es 0
    if (metaNum === 0) {
      // Si hubo ventas sin tener meta, retornamos 100% (para que salga verde)
      // Si prefieres que salga 0%, cambia el 100 por 0.
      return avanceNum > 0 ? 100 : 0;
    }

    // Cálculo normal
    return (avanceNum / metaNum) * 100;
  }

  getPercentageValue(cliente: any, tipo: string): number {
    const totalGlobal = (cliente?.avance_global_scott || 0) +
      (cliente?.acumulado_syncros || 0) +
      (cliente?.acumulado_apparel || 0) +
      (cliente?.acumulado_vittoria || 0);

    const totalApparel = (cliente?.acumulado_syncros || 0) +
      (cliente?.acumulado_apparel || 0) +
      (cliente?.acumulado_vittoria || 0);

    switch (tipo) {
      case 'anual':
        return this.calcularPorcentajeSeguro(totalGlobal, cliente?.compra_minima_anual);

      case 'inicial':
        return this.calcularPorcentajeSeguro(totalGlobal, cliente?.compra_minima_inicial);

      case 'scott':
        return this.calcularPorcentajeSeguro(cliente?.avance_global_scott, cliente?.compromiso_scott);

      case 'scott_jul_ago':
        return this.calcularPorcentajeSeguro(cliente?.avance_jul_ago, cliente?.compromiso_jul_ago);

      case 'scott_sep_oct':
        return this.calcularPorcentajeSeguro(cliente?.avance_sep_oct, cliente?.compromiso_sep_oct);

      case 'scott_nov_dic':
        return this.calcularPorcentajeSeguro(cliente?.avance_nov_dic, cliente?.compromiso_nov_dic);

      case 'apparel_global':
        return this.calcularPorcentajeSeguro(totalApparel, cliente?.compromiso_apparel_syncros_vittoria);

      case 'apparel_jul_ago':
        return this.calcularPorcentajeSeguro(cliente?.avance_jul_ago_app, cliente?.compromiso_jul_ago_app);

      case 'apparel_sep_oct':
        return this.calcularPorcentajeSeguro(cliente?.avance_sep_oct_app, cliente?.compromiso_sep_oct_app);

      case 'apparel_nov_dic':
        return this.calcularPorcentajeSeguro(cliente?.avance_nov_dic_app, cliente?.compromiso_nov_dic_app);

      case 'scott_ene_feb': return this.calcularPorcentajeSeguro(cliente?.avance_ene_feb, cliente?.compromiso_ene_feb);
      case 'scott_mar_abr': return this.calcularPorcentajeSeguro(cliente?.avance_mar_abr, cliente?.compromiso_mar_abr);
      case 'scott_may_jun': return this.calcularPorcentajeSeguro(cliente?.avance_may_jun, cliente?.compromiso_may_jun);

      case 'apparel_ene_feb': return this.calcularPorcentajeSeguro(cliente?.avance_ene_feb_app, cliente?.compromiso_ene_feb_app);
      case 'apparel_mar_abr': return this.calcularPorcentajeSeguro(cliente?.avance_mar_abr_app, cliente?.compromiso_mar_abr_app);
      case 'apparel_may_jun': return this.calcularPorcentajeSeguro(cliente?.avance_may_jun_app, cliente?.compromiso_may_jun_app);

      default:
        return 0;
    }
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 100) return 'progress-excellent';
    if (percentage >= 80) return 'progress-very-good';
    if (percentage >= 60) return 'progress-good';
    if (percentage >= 40) return 'progress-warning';
    return 'progress-danger';
  }

  getTextClass(percentage: number): string {
    if (percentage >= 100) return 'text-excellent';
    if (percentage >= 80) return 'text-very-good';
    if (percentage >= 60) return 'text-good';
    if (percentage >= 40) return 'text-warning';
    return 'text-danger';
  }

  getStatusIcon(percentage: number): string {
    if (percentage >= 100) return 'fa-trophy status-icon';
    if (percentage >= 80) return 'fa-arrow-up status-icon';
    if (percentage >= 60) return 'fa-arrow-right status-icon';
    if (percentage >= 40) return 'fa-exclamation-triangle status-icon';
    return 'fa-exclamation-circle status-icon';
  }

  getTooltipText(cliente: any, tipo: string): string {
    const percentage = this.getPercentageValue(cliente, tipo);
    if (percentage >= 100) return 'Excelente cumplimiento';
    if (percentage >= 80) return 'Muy buen progreso';
    if (percentage >= 60) return 'Buen avance';
    if (percentage >= 40) return 'Requiere atención';
    return 'Crítico - necesita mejora';
  }

  mostrarTooltip(event: MouseEvent, cliente: any) {
    this.tooltipPosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Si es un integral, buscar las fechas del cliente de referencia
    if (cliente.esIntegral) {
      let claveReferencia = '';

      if (cliente.nombre_cliente.includes('MARCO TULIO ANDRADE NAVARRO')) {
        claveReferencia = 'JC539';
      } else if (cliente.nombre_cliente.includes('VICTOR HUGO VILLANUEVA GUZMAN')) {
        claveReferencia = 'LC657';
      } else if (cliente.nombre_cliente.includes('NARUCO')) {
        claveReferencia = 'LC625';
      }

      // Buscar el cliente con la clave de referencia en tus datos originales
      const clienteReferencia = this.clientesOriginal.find(c => c.clave === claveReferencia);

      if (clienteReferencia) {
        // Crear una copia del cliente integral con las fechas del cliente de referencia
        this.clienteParaTooltip = {
          ...cliente,
          f_inicio: clienteReferencia.f_inicio,
          f_fin: clienteReferencia.f_fin
        };
      } else {
        this.clienteParaTooltip = cliente;
      }
    } else {
      this.clienteParaTooltip = cliente;
    }
  }

  ocultarTooltip() {
    this.clienteParaTooltip = null;
  }

  // Agrega esta función al inicio de tu clase component
  limpiarNumero(valor: any): number {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
    if (typeof valor === 'string') {
      // Remover todo excepto números y el primer punto decimal
      let cleaned = valor.replace(/[^\d.]/g, '');

      // Manejar múltiples puntos decimales
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        // Si hay múltiples puntos, tomar solo la parte entera y la primera decimal
        cleaned = parts[0] + '.' + parts[1];
      } else if (parts.length === 1) {
        // Si no hay punto, es un número entero
        cleaned = parts[0];
      }

      const numero = parseFloat(cleaned);
      return isNaN(numero) ? 0 : numero;
    }
    return 0;
  }

  calcularTotales(): void {
    // 1. Resetear todos los totales a 0
    Object.keys(this.totales).forEach(key => {
      (this.totales as any)[key] = 0;
    });

    // 2. Llamar a los métodos de cálculo de 2025
    this.calcularTotalesAnticipado();
    this.calcularTotalesCompraMinimaAnual();
    this.calcularTotalesCompraMinimaInicial();
    this.calcularTotalesAvanceGlobal();
    this.calcularTotalCompromisoScott();
    this.calcularTotalesScott();
    this.calcularTotalCompromisoJulAgo();
    this.calcularTotalAvanceJulAgo();
    this.calcularTotalCompromisoSepOct();
    this.calcularTotalAvanceSepOct();
    this.calcularTotalCompromisoNovDic();
    this.calcularTotalAvanceNovDic();

    // 3. Totales de marcas individuales
    this.calcularTotalSyncros();
    this.calcularTotalApparel();
    this.calcularTotalVittoria();
    this.calcularTotalBold();

    // 4. Totales de Apparel 2025
    this.calcularTotalCompromisoAppSynVittoria();
    this.calcularTotalGlobalAppSynVittoria();
    this.calcularTotalCompromisoJulAgoApp();
    this.calcularTotalAvanceJulAgoApp();
    this.calcularTotalCompromisoSepOctApp();
    this.calcularTotalAvanceSepOctApp();
    this.calcularTotalCompromisoNovDicApp();
    this.calcularTotalAvanceNovDicApp();

    // 5. ¡IMPORTANTE! Llamar al nuevo método de 2026 para sumar las nuevas columnas
    this.calcularTotales2026();
  }

  private calcularTotales2026(): void {
    const clavesExcluidas = [
      'JC539', 'EC216',
      'LC657', 'GC411', 'MC679', 'MC677',
      'LC625', 'LC626', 'LC627'
    ];

    const datos = this.clientesFiltrados.filter(c => !clavesExcluidas.includes(c.clave));

    this.totales.compromiso_ene_feb = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_ene_feb),
      0
    );

    this.totales.avance_ene_feb = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_ene_feb),
      0
    );

    this.totales.compromiso_mar_abr = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_mar_abr),
      0
    );

    this.totales.avance_mar_abr = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_mar_abr),
      0
    );

    this.totales.compromiso_may_jun = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_may_jun),
      0
    );

    this.totales.avance_may_jun = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_may_jun),
      0
    );

    this.totales.compromiso_ene_feb_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_ene_feb_app),
      0
    );

    this.totales.avance_ene_feb_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_ene_feb_app),
      0
    );

    this.totales.compromiso_mar_abr_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_mar_abr_app),
      0
    );

    this.totales.avance_mar_abr_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_mar_abr_app),
      0
    );

    this.totales.compromiso_may_jun_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.compromiso_may_jun_app),
      0
    );

    this.totales.avance_may_jun_app = datos.reduce(
      (sum, c) => sum + this.convertirNumero(c.avance_may_jun_app),
      0
    );
  }

  // 1. Totales de anticipado - ejemplo: excluir integrales
  private calcularTotalesAnticipado(): void {
    // Excluir las claves individuales que forman parte de los integrales
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.acumulado_anticipado += this.convertirNumero(cliente.acumulado_anticipado);
    });
  }

  // 2. Totales de compra mínima - ejemplo: solo distribuidores
  private calcularTotalesCompraMinimaAnual(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    let sumaIntegrales = 0;
    let sumaClientesNormales = 0;

    clientesValidos.forEach(cliente => {
      const valor = this.convertirNumero(cliente.compra_minima_anual);

      if (['Integral 1', 'Integral 2', 'Integral 3'].includes(cliente.clave)) {
        sumaIntegrales += valor;
      } else {
        sumaClientesNormales += valor;
      }

      this.totales.compra_minima_anual += valor;
    });
  }

  private calcularTotalesCompraMinimaInicial(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    let sumaIntegrales = 0;
    let sumaClientesNormales = 0;

    clientesValidos.forEach(cliente => {
      const valor = this.convertirNumero(cliente.compra_minima_inicial);

      if (['Integral 1', 'Integral 2', 'Integral 3'].includes(cliente.clave)) {
        sumaIntegrales += valor;
      } else {
        sumaClientesNormales += valor;
      }

      this.totales.compra_minima_inicial += valor;
    });
  }

  private calcularTotalesAvanceGlobal(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    let sumaTotal = 0;
    clientesValidos.forEach(cliente => {
      const valorApparel = Number(cliente.avance_global_apparel_syncros_vittoria) || 0;
      const valorScott = Number(cliente.avance_global_scott) || 0;
      const sumaCliente = valorApparel + valorScott;

      sumaTotal += sumaCliente;
    });

    this.totales.avance_global = sumaTotal;
  }

  private calcularTotalCompromisoScott(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_scott += this.convertirNumero(cliente.compromiso_scott);
    });
  }

  private calcularTotalesScott(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_global_scott += this.convertirNumero(cliente.avance_global_scott);
    });
  }

  private calcularTotalCompromisoJulAgo(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_jul_ago += this.convertirNumero(cliente.compromiso_jul_ago);
    });
  }

  private calcularTotalAvanceJulAgo(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_jul_ago += this.convertirNumero(cliente.avance_jul_ago);
    });
  }

  // 6. Totales SEP-OCT
  private calcularTotalCompromisoSepOct(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_sep_oct += this.convertirNumero(cliente.compromiso_sep_oct);
    });
  }

  private calcularTotalAvanceSepOct(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_sep_oct += this.convertirNumero(cliente.avance_sep_oct);
    });
  }

  private calcularTotalCompromisoNovDic(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_nov_dic += this.convertirNumero(cliente.compromiso_nov_dic);
    });
  }

  private calcularTotalAvanceNovDic(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_nov_dic += this.convertirNumero(cliente.avance_nov_dic);
    });
  }

  private calcularTotalCompromisoAppSynVittoria(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_apparel_syncros_vittoria += this.convertirNumero(cliente.compromiso_apparel_syncros_vittoria);
    });
  }

  private calcularTotalGlobalAppSynVittoria(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_global_apparel_syncros_vittoria += this.convertirNumero(cliente.avance_global_apparel_syncros_vittoria);
    });
  }

  private calcularTotalCompromisoJulAgoApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_jul_ago_app += this.convertirNumero(cliente.compromiso_jul_ago_app);
    });
  }

  private calcularTotalAvanceJulAgoApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    const totalEvacA = clientesValidos
      .filter(cliente => cliente.evac === 'A')
      .reduce((total, cliente) => total + (cliente.avance_jul_ago_app || 0), 0);

    const totalEvacB = clientesValidos
      .filter(cliente => cliente.evac === 'B')
      .reduce((total, cliente) => total + (cliente.avance_jul_ago_app || 0), 0);

    const clavesIntegral = ['Integral 1', 'Integral 2', 'Integral 3'];
    const totalIntegral = clientesValidos
      .filter(cliente => clavesIntegral.includes(cliente.clave))
      .reduce((total, cliente) => total + (cliente.avance_jul_ago_app || 0), 0);

    const totalGeneral = clientesValidos
      .reduce((total, cliente) => total + (cliente.avance_jul_ago_app || 0), 0);

    clientesValidos.forEach(cliente => {
      this.totales.avance_jul_ago_app += this.convertirNumero(cliente.avance_jul_ago_app);
    });
  }

  private calcularTotalCompromisoSepOctApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_sep_oct_app += this.convertirNumero(cliente.compromiso_sep_oct_app);
    });
  }

  private calcularTotalAvanceSepOctApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_sep_oct_app += this.convertirNumero(cliente.avance_sep_oct_app);
    });
  }

  private calcularTotalCompromisoNovDicApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.compromiso_nov_dic_app += this.convertirNumero(cliente.compromiso_nov_dic_app);
    });
  }

  private calcularTotalAvanceNovDicApp(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.avance_nov_dic_app += this.convertirNumero(cliente.avance_nov_dic_app);
    });
  }

  private calcularTotalSyncros(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.acumulado_syncros += this.convertirNumero(cliente.acumulado_syncros);
    });
  }

  private calcularTotalApparel(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.acumulado_apparel += this.convertirNumero(cliente.acumulado_apparel);
    });
  }

  private calcularTotalVittoria(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.acumulado_vittoria += this.convertirNumero(cliente.acumulado_vittoria);
    });
  }

  private calcularTotalBold(): void {
    const clavesExcluidas = ['JC539', 'EC216', 'LC657', 'GC411', 'MC679', 'MC677', 'LC625', 'LC626', 'LC627'];

    const clientesValidos = this.clientesFiltrados.filter(cliente =>
      !clavesExcluidas.includes(cliente.clave)
    );

    clientesValidos.forEach(cliente => {
      this.totales.acumulado_bold += this.convertirNumero(cliente.acumulado_bold);
    });
  }

  limpiarValorNumerico(valor: any): number {
    if (typeof valor === 'number') {
      return valor;
    }

    if (typeof valor === 'string') {
      // Remover caracteres no numéricos excepto puntos y guiones
      let valorLimpio = valor.replace(/[^\d.-]/g, '');

      // Si hay múltiples puntos, mantener solo el primero
      const puntos = valorLimpio.split('.').length - 1;
      if (puntos > 1) {
        const partes = valorLimpio.split('.');
        valorLimpio = partes[0] + '.' + partes.slice(1).join('');
      }

      const numero = parseFloat(valorLimpio);
      return isNaN(numero) ? 0 : numero;
    }

    return 0;
  }

  verificarCumplimientoCompraInicial(cliente: ClienteConAcumulado): string {
    // 1. Obtener los valores de forma segura, convirtiendo a número y estableciendo 0 si no son válidos
    const avanceGlobal = this.limpiarNumero(cliente.avance_global);
    const compraMinima = this.limpiarNumero(cliente.compra_minima_inicial);

    // 2. Realizar la comparación estricta
    if (avanceGlobal >= compraMinima && compraMinima > 0) {
      return 'SI';
    }

    return 'NO';
  }

  // --- CALCULOS NORMALES (SCOTT) 2026 ---

  private calcularAvanceEneFeb(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-01-01', '2026-02-28', false);
  }

  private calcularAvanceMarAbr(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-03-01', '2026-04-30', false);
  }

  private calcularAvanceMayJun(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-05-01', '2026-06-30', false);
  }

  // --- CALCULOS APP (SYNCROS/APPAREL/VITTORIA) 2026 ---

  private calcularAvanceEneFebApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-01-01', '2026-02-28', true);
  }

  private calcularAvanceMarAbrApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-03-01', '2026-04-30', true);
  }

  private calcularAvanceMayJunApp(cliente: Cliente, facturas: FacturaOdoo[]): number {
    return this.calcularAvanceGenerico(cliente, facturas, '2026-05-01', '2026-06-30', true);
  }

  // He creado esta función genérica para no repetir tu código de "Casos Especiales" 6 veces nuevas
  // Si prefieres copiar y pegar tu código antiguo 6 veces, házmelo saber.
  private calcularAvanceGenerico(cliente: Cliente, facturas: FacturaOdoo[], fInicio: string, fFin: string, esApp: boolean): number {
    const clave = cliente.clave;
    const nombreCliente = cliente.nombre_cliente?.toUpperCase() || '';
    const fechaInicio = new Date(fInicio);
    const fechaFin = new Date(fFin);

    // Mantenemos TODOS tus casos especiales intactos
    const esCasoEspecial = nombreCliente.includes('BROTHERS BIKE') ||
      nombreCliente.includes('NARUCO') ||
      clave === 'KC612' || clave === 'FD324' ||
      nombreCliente.includes('MANUEL ALEJANDRO NAVARRO GONZALEZ') ||
      nombreCliente.includes('JOSE ANGEL DIAZ CORTES') ||
      nombreCliente.includes('JUAN MANUEL RUACHO RANGEL');

    let facturasValidas;

    const filtroBase = (factura: FacturaOdoo) => {
      const fechaFactura = new Date(factura.fecha_factura);
      const enRango = fechaFactura >= fechaInicio && fechaFactura <= fechaFin;

      let esProductoValido = false;
      const marca = String(factura?.marca || '').toUpperCase();

      if (esApp) {
        if (marca === 'SYNCROS') esProductoValido = true;
        else if (marca === 'VITTORIA') esProductoValido = true;
        else if (marca === 'SCOTT') {
          const esApparelSi = String(factura?.apparel || '').toUpperCase() === 'SI';
          if (esApparelSi) {
            const nombreProducto = String(factura?.nombre_producto || '').toUpperCase();
            esProductoValido = !nombreProducto.includes('BICICLETA');
          }
        }
      } else {
        const esMarcaValida = marca === 'SCOTT' || marca === 'MEGAMO';
        if (esMarcaValida) {
          const nombreProducto = String(factura?.nombre_producto || '').toUpperCase();
          const contieneBicicleta = nombreProducto.includes('BICICLETA');
          const subcategoria = String(factura?.subcategoria || '').toUpperCase();
          const esBicicleta = subcategoria === 'BICICLETA' || contieneBicicleta;
          const esApparelNo = String(factura?.apparel || '').toUpperCase() === 'NO' || contieneBicicleta;

          esProductoValido = esBicicleta && esApparelNo;
        }
      }
      return enRango && esProductoValido;
    };

    if (esCasoEspecial) {
      facturasValidas = facturas.filter(factura => {
        const coincideClave = factura.contacto_referencia === clave || factura.contacto_referencia === `${clave}-CA`;

        let coincideNombre = false;
        if (nombreCliente.includes('BROTHERS BIKE')) {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes('BROTHERS BIKE');
        } else if (nombreCliente.includes('NARUCO') && !['LC625', 'LC626', 'LC627'].includes(clave)) {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
        } else {
          coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
        }

        const baseValida = filtroBase(factura);

        if (nombreCliente.includes('BROTHERS BIKE')) return coincideNombre && baseValida;
        if (nombreCliente.includes('NARUCO') && ['LC625', 'LC626', 'LC627'].includes(clave)) return coincideClave && baseValida;
        return (coincideClave || coincideNombre) && baseValida;
      });
    } else {
      facturasValidas = facturas.filter(factura => {
        const coincideClave = factura.contacto_referencia === clave || factura.contacto_referencia === `${clave}-CA`;
        return coincideClave && filtroBase(factura);
      });

      if (facturasValidas.length === 0) {
        facturasValidas = facturas.filter(factura => {
          let coincideNombre = false;
          if (nombreCliente.includes('NARUCO') && !['LC625', 'LC626', 'LC627'].includes(clave)) {
            coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
          } else if (!nombreCliente.includes('NARUCO')) {
            coincideNombre = factura.contacto_nombre?.toUpperCase().includes(nombreCliente) || nombreCliente.includes(factura.contacto_nombre?.toUpperCase() || '');
          }
          return coincideNombre && filtroBase(factura);
        });
      }
    }

    return facturasValidas.reduce((total, factura) => total + (+factura.venta_total || 0), 0);
  }

  actualizarDatosPrevio(): void {
    this.cargando = true;

    this.previoService.recalcularPrevio().subscribe({
      next: (res) => {
        console.log('Recalculo iniciado:', res);

        alert('El recalculo de previo inició en segundo plano. Espera unos segundos y vuelve a cargar los datos.');

        this.cargando = false;
      },
      error: (err) => {
        console.error('Error iniciando recalculo:', err);
        alert('Error al iniciar el recalculo de previo.');
        this.cargando = false;
      }
    });
  }
}

