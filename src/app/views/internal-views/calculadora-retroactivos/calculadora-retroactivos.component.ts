import { Component, computed, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";

//Modelos
import { Poligono, LISTA_POLIGONOS } from './models/poligono.model';
import { Clasificacion, LISTA_CLASIFICACIONES } from './models/clasificacion-model';
import { ClasificacionAnualPorNivel } from './models/clasificacion-anual-por-nivel.mode';
import { Sucursal, SUCURSAL} from './models/sucursal.model';
import { CalculoMargenesRetroactivos } from './models/calculo-margen-retroactivo.model';
import { CalculoAnualAdicionalPorNivel } from './models/calculo-anual-adicional-por-nivel.model';
import { AnualAdicionalPorNivelCantidad } from './models/anual-adicional-por-nivel-cantidad.model';
import { AnualPorCumplimiento } from './models/anual-por-cumplimiento.model';
import { LISTA_PROGRAMA_ESPECIAL_IMPULSO} from './models/programa-especial-impulso.model';
import { LISTA_RESTRICCIONES_PROGRAMA } from './models/restriccion-programa.model';
import { SimuladorRetroactivo } from './models/simulador-retroactivo.model';

const clasificacionVacia = (): Clasificacion => ({
  id: 0,
  descripcion: '',
  valor: 0,
  descuento_retroactivo_por_logro: 0,
  importe_compra_minimo_anual_adicional_iva_incluido: 0,
  importe_compra_al_minimo_anual_adicional_iva_incluido: 0, 
  margen_inicial_adicional_distribuidor: 0,
  bicicleta_porcentaje_compra_inicial: 0,
  multimarca_porcentaje_compra_inicial: 0,
  bicicleta_compra_minima_anual: 0,
  multimarca_compra_minima_anual: 0,
  bicicleta_compra_minima_anual_multiplo: 0,
  multimarca_compra_minima_anual_multiplo: 0,
  precio_actual_bici_cn: 0, 
  precio_actual_bici_tw: 0, 
  precio_actual_ebike: 0,
  precio_actual_caja_acc: 0,
  porcentaje_subsidio: 0,
  precio_pagar_temporada_bici_cn: 0,
  precio_pagar_temporada_bici_tw: 0,
  precio_pagar_temporada_ebike: 0,
  precio_pagar_temporada_caja_acc: 0,
  seguro_transporte_bici_cn: 0,
  seguro_transporte_bici_tw: 0,
  seguro_transporte_ebike: 0,
  seguro_transporte_caja_acc: 0,
  poligono_exclusivo: '',
  plazo_pago: '',
  beneficios_dinamicos: []
});

const sucursalVacia = (): Sucursal => ({
  id: 0,
  cantidad: 0,
  multiplo: 0
});

const poligonoVacio = (): Poligono => ({
  ciudad: "",
  nivel_poligono: "",
  descripcion: "",
  clasificacionId: 0
});

const anualAdicionalPorNivelCantidadVacio = (): AnualAdicionalPorNivelCantidad => ({
  valor: 0,
  valor_calculado: 0,
  descuento_retroactivo: 0
});

const anualPorCumpimientoVacio = (): AnualPorCumplimiento => ({
  id: 0,
  descripcion: "",
  descuento: 0,
  seleccionado: false
});

const anualAdicionalPorNivelCantidadBase = (): AnualAdicionalPorNivelCantidad[] => [
  { valor: 920000, valor_calculado: 0, descuento_retroactivo: 1,}, 
  { valor: 2300000, valor_calculado: 0, descuento_retroactivo: 2 }, 
  { valor: 5750000, valor_calculado: 0, descuento_retroactivo: 4.5 }, 
  { valor: 0, valor_calculado: 0, descuento_retroactivo: 0 },
];

const calculoMargenesRetroactivosBase = (): CalculoMargenesRetroactivos[] => [
  { id: 1, descripcion: "BICICLETAS", margen_precio_distribuidor: 24, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
  { id: 2, descripcion: "BICICLETAS MATCH POINT", margen_precio_distribuidor: 19, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
  { id: 3, descripcion: "ACCESORIOS Y COMPONENTES", margen_precio_distribuidor: 30, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
  { id: 4, descripcion: "APPAREL", margen_precio_distribuidor: 30, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0}
]

@Component({
  selector: 'app-calculadora-retroactivos',
  imports: [CommonModule, FormsModule, HomeBarComponent, RouterModule],
  templateUrl: './calculadora-retroactivos.component.html',
  styleUrl: './calculadora-retroactivos.component.css'
})
export class CalculadoraRetroactivosComponent {

  listaPoligonos = LISTA_POLIGONOS;
  listaSucursales = SUCURSAL;
  listaProgramaEspecialImpulso = LISTA_PROGRAMA_ESPECIAL_IMPULSO;
  listaRestriccionesPrograma = LISTA_RESTRICCIONES_PROGRAMA;
  listaClasificaciones = LISTA_CLASIFICACIONES;
  listaClasificacionesSimulador = LISTA_CLASIFICACIONES;

  listaAnualAdicional: ClasificacionAnualPorNivel[] = [
    { clasifiacionId: 1, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 },
    { clasifiacionId: 2, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 },
    { clasifiacionId: 3, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 }
  ];

  listaCalculoAnualAdicionalPorNivel = signal<CalculoAnualAdicionalPorNivel[]>([
    { importe_minimo_total_anual_con_iva: 0, importe_total_compra_adicional_con_iva: 0, descuento_retroactivo_por_logro: 0}
  ]);
  
  listaSimuladorRetroactivo = signal<SimuladorRetroactivo[]>([
    { id: 1, descripcion: "BICICLETAS", cantidadIngresada: 0, cantidadAMostrar: "", compraMinima: 0, totalCompraConDescuento: 0, porcentaje: 0, totalMargenConDescuento: 0, totalMargenConPorcentaje: 0, totalMargenCalculado: 0, totalBeneficios: 0 },
    { id: 2, descripcion: "APPAREL Y SYNCROS", cantidadIngresada: 0, cantidadAMostrar: "", compraMinima: 0, totalCompraConDescuento: 0, porcentaje: 0, totalMargenConDescuento: 0, totalMargenConPorcentaje: 0, totalMargenCalculado: 0, totalBeneficios: 0 },
  ]);
  
  listaAnualPorCumplimiento: AnualPorCumplimiento[] = [
    { id: 1, descripcion: "Compra Minima de Apparel, Syncros y Vittoria (Niveles Partner Elite y Partner Elite Plus)", descuento: 2.5, seleccionado: false},
    { id: 2, descripcion: "Compra Minima de Apparel, Syncros y Vittoria (Nivel Partner)", descuento: 2.5, seleccionado: false},
    { id: 3, descripcion: "Pre-Pago o pago de Contado****", descuento: 2.0, seleccionado: false},
  ]
  
  listaAnualAdicionalPorNivelCantidad = signal<AnualAdicionalPorNivelCantidad[]>(anualAdicionalPorNivelCantidadBase());
  listaAnualAdicionalPorNivelCantidadSimulador = signal<AnualAdicionalPorNivelCantidad[]>(anualAdicionalPorNivelCantidadBase());

  listaCalculoMargenesRetroactivos = signal<CalculoMargenesRetroactivos[]>(calculoMargenesRetroactivosBase());
  listaCalculoMargenesRetroActivosSimulador = signal<CalculoMargenesRetroactivos[]>(calculoMargenesRetroactivosBase());

  //Inicializacion de objetos
  poligonoSeleccionado: Poligono = poligonoVacio();
  sucursalSeleccionada: Sucursal = sucursalVacia();
  clasificacionSeleccionada: Clasificacion = clasificacionVacia();
  anualAdicionalPorNivel: AnualAdicionalPorNivelCantidad = anualAdicionalPorNivelCantidadVacio();
  anualPorCumplimiento: AnualPorCumplimiento[] = [anualPorCumpimientoVacio()];

  clasificacionSeleccionadaSimulador: Clasificacion = clasificacionVacia();
  sucursalSeleccionadaSimulador: Sucursal = sucursalVacia();
  
  clasificacionSugerida = signal<Clasificacion>(clasificacionVacia());
  
  readonly porcentajeSemestreJulAgo: number = 33;
  readonly porcentajeSemestreSepOct: number = 35;
  readonly porcentajeSemestreNovDic: number = 32;
  readonly porcentajeSemestreEneFeb: number = 40;
  readonly porcentajeSemestreMarzAbr: number = 45;
  readonly porcentajeSemestreMayJun: number = 15;

  // PARAMETROS DE CALCULO
  bicicletaPorcentajeInicial: number = 0;
  bicicletaMinimaCompraInicialLinea: number = 0;
  bicicletaMinimaCompraInicial: number = 0;

  multimarcaPorcentajeInicial: number = 0;
  multimarcaMinimaCompraInicialLinea: number = 0;
  multimarcaMinimaCompraInicial: number = 0;

  segundoSemestreMinimaBicicletaPorcentajeInicial: number = 0;
  segundoSemestreMinimaBicicletaCompraInicial: number = 0;

  totalCompraMinimaAnualPrimerSemestre: number = 0;
  totalCompraMinimaAnualSegundoSemestre: number = 0;
  totalCompraMontoInicial: number = 0;

  // Variables de primer semestre detalle
  detallePorcentajePrimerSemestreJulAgo = 0;
  detallePorcentajePrimerSemestreSepOct = 0;
  detallePorcentajePrimerSemestreNovDic = 0;
  detallePorcentajeSegundoSemestreEneFeb = 0;
  detallePorcentajeSegundoSemestreMarAbr = 0;
  detallePorcentajeSegundoSemestreMayJun = 0;

  detalleBiciCompraJulAgo = 0;
  detalleBiciCompraSepOct = 0;
  detalleBiciCompraNovDic = 0;
  detalleBiciCompraEneFeb = 0;
  detalleBiciCompraMarAbr = 0;
  detalleBiciCompraMayJun = 0;

  detalleMultimarcaCompraJulAgo = 0;
  detalleMultimarcaCompraSepOct = 0;
  detalleMultimarcaCompraNovDic = 0;

  detalleTotalCompraInicialPrimerSemestre = 0;

  //SIMULADOR
  totalMargenConDescuentoSimulador = computed(() => {
    return this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.totalMargenConDescuento, 0);
  });

  totalMargenConPorcentajeSimulador = computed(() => {
    return this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.totalMargenConPorcentaje, 0);
  });

  totalMargenCalculadoSimulador = computed(() => {
    return this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.totalMargenCalculado, 0);
  });

  totalBeneficiosSimulador = computed(() => {
    return this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.totalBeneficios, 0);
  });

  ngOnInit(): void {
    this.obtenerMultimarcaCompraMinimaAnual();
    this.obtenerBeneficios();
    this.filtrarListaClasificacionSimulador();
  };
  
  calcularSimuladorRetroactivo() {
    this.filtrarCantidadIngresadaSimulador();

    if ((this.clasificacionSeleccionadaSimulador.id > 0) && (this.sucursalSeleccionadaSimulador.id > 0)){
      this.obtenerCompraMinimaSimulador();
      this.obtenerCalculoMargenRetroactivo();
      this.actualizarAnualAdicionalPorNivelCantidad(this.listaAnualAdicionalPorNivelCantidadSimulador, this.sucursalSeleccionadaSimulador);
      this.obtenerPorcentajesSimulador();
      this.obtenerTotalMargenCalculado();
    }
  }

  validarCantidad(e: any, item: SimuladorRetroactivo) {
    const input = e.target;
    const valorOriginal = input.value;
    const numeroLimpio = valorOriginal.replace(/[^0-9]/g, '');
    const valorFormateado = numeroLimpio.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const posicionCursor = input.selectionStart;
    
    input.value = valorFormateado;

    const diferenciaLongitud = valorFormateado.length - valorOriginal.length;
    const nuevaPosicion = posicionCursor + diferenciaLongitud;
    input.setSelectionRange(nuevaPosicion, nuevaPosicion);

    item.cantidadAMostrar = valorFormateado;
    item.cantidadIngresada = Number(numeroLimpio || 0);
  }

  filtrarListaClasificacionSimulador(){
    this.listaClasificacionesSimulador = [...this.listaClasificaciones];
    this.listaClasificacionesSimulador.pop();
  };

  filtrarCantidadIngresadaSimulador(){
    this.listaSimuladorRetroactivo.update(listaActual => 
      listaActual.map(item => {
        let cantidadNumerica = item.cantidadIngresada;
        return {
          ...item,
          cantidadIngresada: cantidadNumerica,
        };
      })
    );
  }

  obtenerTotalMargenCalculado() {            
    let margenBicicleta = this.listaCalculoMargenesRetroActivosSimulador().find(item => item.id === 1) //margn de bicicletas   
    let margenAparel = this.listaCalculoMargenesRetroActivosSimulador().find(item => item.id === 4); //margn de apparel
    // let sumaPorcentajes = this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.porcentaje, 0);
    let sumaCantidadIngresada = this.listaSimuladorRetroactivo().reduce((acc, item) => acc + item.cantidadIngresada, 0);
    
    if ((margenBicicleta) && (margenAparel)){
        this.listaSimuladorRetroactivo.update(listaActual => 
        listaActual.map(item => {
          let totalConDescuento = 0;
          let totalConPorcentaje = 0;
          let totalMargenCalculado = 0;
          let totalBeneficios = (item.cantidadIngresada * this.clasificacionSeleccionadaSimulador.margen_inicial_adicional_distribuidor) / 100;

          if (item.cantidadIngresada >= item.compraMinima){
            totalConDescuento = item.id === 1 ? (item.cantidadIngresada * margenBicicleta.margen_inicio_temporada) : (item.cantidadIngresada * margenAparel.margen_inicio_temporada);
            totalConDescuento = totalConDescuento / 100;
            totalConPorcentaje = (sumaCantidadIngresada * item.porcentaje ) / 100;
          }
          
          totalMargenCalculado = totalConDescuento + totalConPorcentaje + totalBeneficios;
          
          return {
              ...item,
              totalMargenConDescuento: totalConDescuento,
              totalMargenConPorcentaje: totalConPorcentaje,
              totalBeneficios: totalBeneficios,
              totalMargenCalculado: totalMargenCalculado
            };
        })
      );
    }
  }

  obtenerCalculoMargenRetroactivo(){
    this.listaCalculoMargenesRetroActivosSimulador.update(listaActual => 
    listaActual.map(item => {
    let margenTemporada = item.margen_precio_distribuidor + this.clasificacionSeleccionadaSimulador.margen_inicial_adicional_distribuidor;
        return {
          ...item,
          nivel_elegido: this.clasificacionSeleccionada.descripcion,
          margen_inicio_temporada: margenTemporada
        };
      })
    );
  }

  obtenerCompraMinimaSimulador(){
    let redondeoBiciMinimaCompraLinea = this.clasificacionSeleccionadaSimulador.id === 2 ? 5000 : 10000;
    let totalCompraMiminaMultimarca = Math.ceil((this.clasificacionSeleccionadaSimulador.multimarca_compra_minima_anual * (this.sucursalSeleccionadaSimulador?.multiplo)) / 10000) * 10000;
    let totalCompraMinimaBici = (Math.ceil((this.clasificacionSeleccionadaSimulador.bicicleta_compra_minima_anual * (this.sucursalSeleccionadaSimulador?.multiplo)) / redondeoBiciMinimaCompraLinea) * redondeoBiciMinimaCompraLinea);
    
    this.listaSimuladorRetroactivo.update(listaActual => 
    listaActual.map(item => {
      let cantidad = item.cantidadIngresada !== null ? item.cantidadIngresada : 0;
      let compraMinimaAnual = item.id === 1 ? totalCompraMinimaBici : totalCompraMiminaMultimarca;
      let totalCompra = cantidad > 0 ? (cantidad - compraMinimaAnual) : 0;
      return {
          ...item,
          compraMinima: compraMinimaAnual,
          totalCompraConDescuento: totalCompra,
        };
      })
    );
  };

  obtenerPorcentajesSimulador() {
    const listaNiveles = this.listaAnualAdicionalPorNivelCantidadSimulador();
    let idAnualPorCumplimiento = [3, 4].includes(this.clasificacionSeleccionadaSimulador.id) ? 1 : 2;
    let anualPorCumplimiento = this.listaAnualPorCumplimiento.find(item => item.id === idAnualPorCumplimiento);

    this.listaSimuladorRetroactivo.update(listaActual => 
      listaActual.map(item => {
        let porcentaje = 0;

        if (item.id === 1){
          let diferenciaCantidad = listaNiveles.find(n => n.valor_calculado === 0) || listaNiveles[0];

          for (const itemNivel of listaNiveles) {
            // Si el dinero del usuario es mayor o igual al requisito del nivel...
            // Y además este nivel requiere más dinero que diferenciaCantidad actual...
            if (item.totalCompraConDescuento >= itemNivel.valor_calculado && itemNivel.valor_calculado > diferenciaCantidad.valor_calculado) {
              diferenciaCantidad = itemNivel; // Escalamos la nueva diferenciaCantidad alcanzada
              porcentaje = diferenciaCantidad.descuento_retroactivo;
            }
          }
        }
        else if (item.id === 2){
          if ((item.cantidadIngresada > 0) && (item.cantidadIngresada >= item.compraMinima) && (anualPorCumplimiento)){
            porcentaje = anualPorCumplimiento.descuento;
          }
        }
        else {
          return item;
        }

        return {
          ...item,
          porcentaje: porcentaje
        };
      })
    );  
  }

  calcularDetalleRetroActivo(){
    if (this.validarDatos()){
      
      let redondeoBiciMinimaCompraLinea = this.clasificacionSeleccionada.id === 2 ? 5000 : 10000; //Nivel Patner
      //let redondeoBiciMultimarcaCompraInicial = this.clasificacionSeleccionada.id === 4 ? 500 : 5000;

      //Detalle Retroactivo resumen
      this.bicicletaPorcentajeInicial = this.clasificacionSeleccionada.bicicleta_porcentaje_compra_inicial;
      this.bicicletaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.bicicleta_compra_minima_anual * (this.sucursalSeleccionada?.multiplo)) / redondeoBiciMinimaCompraLinea) * redondeoBiciMinimaCompraLinea;
      this.bicicletaMinimaCompraInicial = Math.floor(((this.bicicletaPorcentajeInicial * this.bicicletaMinimaCompraInicialLinea) / 100))
      
      this.multimarcaPorcentajeInicial = this.clasificacionSeleccionada.multimarca_porcentaje_compra_inicial;
      this.multimarcaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.multimarca_compra_minima_anual * (this.sucursalSeleccionada.multiplo)) / 10000) * 10000;
      this.multimarcaMinimaCompraInicial = Math.floor((this.multimarcaPorcentajeInicial * this.multimarcaMinimaCompraInicialLinea) / 100);

      this.segundoSemestreMinimaBicicletaPorcentajeInicial = Math.round((1 - (this.bicicletaPorcentajeInicial / 100)) * 100);
      this.segundoSemestreMinimaBicicletaCompraInicial = (this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100;
      this.segundoSemestreMinimaBicicletaCompraInicial = this.clasificacionSeleccionada.id === 4 ? this.segundoSemestreMinimaBicicletaCompraInicial : Math.ceil((this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100);

      this.totalCompraMinimaAnualPrimerSemestre = this.bicicletaMinimaCompraInicialLinea + this.multimarcaMinimaCompraInicialLinea;
      this.totalCompraMontoInicial = this.bicicletaMinimaCompraInicial + this.multimarcaMinimaCompraInicial;
      this.totalCompraMinimaAnualSegundoSemestre = this.segundoSemestreMinimaBicicletaCompraInicial + this.multimarcaMinimaCompraInicial

      // Detalle retroactivos
      this.detallePorcentajePrimerSemestreJulAgo = (this.porcentajeSemestreJulAgo * this.bicicletaPorcentajeInicial) / 100;
      this.detalleBiciCompraJulAgo = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajePrimerSemestreJulAgo) / 100;
      
      this.detallePorcentajePrimerSemestreSepOct = (this.porcentajeSemestreSepOct * this.bicicletaPorcentajeInicial) / 100;
      this.detalleBiciCompraSepOct = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajePrimerSemestreSepOct) / 100;
      
      this.detallePorcentajePrimerSemestreNovDic = (this.porcentajeSemestreNovDic * this.bicicletaPorcentajeInicial) / 100;
      this.detalleBiciCompraNovDic = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajePrimerSemestreNovDic) / 100;
      
      this.detallePorcentajeSegundoSemestreEneFeb = (this.porcentajeSemestreEneFeb * (1 - (this.bicicletaPorcentajeInicial / 100)));
      this.detalleBiciCompraEneFeb = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajeSegundoSemestreEneFeb) / 100;
      
      this.detallePorcentajeSegundoSemestreMarAbr = (this.porcentajeSemestreMarzAbr * (1 - (this.bicicletaPorcentajeInicial / 100)));
      this.detalleBiciCompraMarAbr = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajeSegundoSemestreMarAbr) / 100;
      
      this.detallePorcentajeSegundoSemestreMayJun = (this.porcentajeSemestreMayJun * (1 - (this.bicicletaPorcentajeInicial / 100)));
      this.detalleBiciCompraMayJun = (this.bicicletaMinimaCompraInicialLinea * this.detallePorcentajeSegundoSemestreMayJun) / 100;
      
      this.detalleMultimarcaCompraJulAgo = (this.porcentajeSemestreJulAgo * this.multimarcaMinimaCompraInicial) / 100;
      this.detalleMultimarcaCompraSepOct = (this.porcentajeSemestreSepOct * this.multimarcaMinimaCompraInicial) / 100;
      this.detalleMultimarcaCompraNovDic = (this.porcentajeSemestreNovDic * this.multimarcaMinimaCompraInicial) / 100;
      
      this.detalleTotalCompraInicialPrimerSemestre = (this.bicicletaMinimaCompraInicial + this.multimarcaMinimaCompraInicial);

      this.actualizarMargenRetroactivo()
      this.actualizarAnualAdicionalPorNivelCantidad(this.listaAnualAdicionalPorNivelCantidad, this.sucursalSeleccionada);
      this.actualizarAnualAdicionalPorNivel();
    }
  }
  
  actualizarMargenRetroactivo() {
    let descuentoRetroActivo = 0;
    let bonoPorCumplimiento = null;

    if (this.clasificacionSeleccionada.valor >= 3){
      descuentoRetroActivo = this.anualAdicionalPorNivel.descuento_retroactivo;
      bonoPorCumplimiento = this.anualPorCumplimiento
      .filter(item => item.id === 1 || item.id === 3)
      .map(item => ({ ...item }));

      if (bonoPorCumplimiento){
        bonoPorCumplimiento = bonoPorCumplimiento.filter(item => item.seleccionado === true);
        bonoPorCumplimiento.map(item => {
          if (item.id === 1){
            item.descuento = this.clasificacionSugerida().valor < this.clasificacionSeleccionada.valor ? 1.5 : item.descuento;
          }

          descuentoRetroActivo += item.descuento 
        });
      }
    }
    
    if ((this.clasificacionSeleccionada.valor === 2)){
      bonoPorCumplimiento = this.anualPorCumplimiento
      .filter(item => item.id === 2 || item.id === 3)
      .map(item => ({ ...item }));

      if (bonoPorCumplimiento){
        bonoPorCumplimiento = bonoPorCumplimiento.filter(item => item.seleccionado === true);
        bonoPorCumplimiento.map(item => { 
           if (item.id === 1){
            descuentoRetroActivo = this.clasificacionSugerida().valor < this.clasificacionSeleccionada.valor ? 1.5 : item.descuento;
          }
          descuentoRetroActivo += item.descuento 
        });
      }
    }

    if (this.clasificacionSeleccionada.valor === 1){
      bonoPorCumplimiento = this.anualPorCumplimiento.find(item => item.id === 3);
      if (bonoPorCumplimiento?.seleccionado){
        descuentoRetroActivo += bonoPorCumplimiento.descuento
      }
    }


    this.listaCalculoMargenesRetroactivos.update(listaActual => 
    listaActual.map(item => {
    let margen_temporada = item.margen_precio_distribuidor + this.clasificacionSeleccionada.margen_inicial_adicional_distribuidor;
        return {
          ...item,
          nivel_elegido: this.clasificacionSeleccionada.descripcion,
          margen_inicio_temporada: margen_temporada,
          suma_descuento_retroactivo: descuentoRetroActivo,
          margen_con_descuento_retroactivo: (margen_temporada + descuentoRetroActivo)
        };
      })
    );
  }

  actualizarAnualAdicionalPorNivelCantidad(listaSignal: WritableSignal<AnualAdicionalPorNivelCantidad[]>, sucursal: Sucursal) {
    listaSignal.update(listaActual => 
      listaActual.map(item => {
        return {
          ...item,
          valor_calculado: (item.valor * sucursal.multiplo)
        };
      })
    );
  }

  actualizarAnualAdicionalPorNivel(){ 
    this.listaCalculoAnualAdicionalPorNivel.update(listaActual => 
    listaActual.map(item => {
        return {
          ...item,
          importe_minimo_total_anual_con_iva: (this.bicicletaMinimaCompraInicialLinea + this.multimarcaMinimaCompraInicialLinea),
          // importe_total_compra_adicional_con_iva: Math.ceil((this.clasificacionSeleccionada.importe_compra_minimo_anual_adicional_iva_incluido * this.sucursalSeleccionada.multiplo) / 10000 ) * 10000,
          importe_total_compra_adicional_con_iva: (this.anualAdicionalPorNivel.valor * this.sucursalSeleccionada.multiplo),
          descuento_retroactivo_por_logro: this.anualAdicionalPorNivel.descuento_retroactivo
        };
      })
    );
  }

  compararAnualAdicionalPorNivel(objetoUno: AnualAdicionalPorNivelCantidad, objetoDos: AnualAdicionalPorNivelCantidad){
    return objetoUno && objetoDos ? objetoUno.valor === objetoDos.valor : objetoUno === objetoDos;
  }

  validarDatos(){
    return (this.clasificacionSeleccionada.id > 0 && this.clasificacionSugerida().id > 0 && this.sucursalSeleccionada.cantidad > 0) ? true : false;
  }

  obtenerAnualPorCumplimiento(){
    this.anualPorCumplimiento = this.listaAnualPorCumplimiento.filter(item => item.seleccionado);
    this.actualizarMargenRetroactivo();
  }

  obtenerClasificacionSugerida() {
    if (this.poligonoSeleccionado){
      let clasificacionSugerida = this.listaClasificaciones.find( item => item.id === this.poligonoSeleccionado?.clasificacionId) || clasificacionVacia();
      if (clasificacionSugerida) {
        this.clasificacionSugerida.set(clasificacionSugerida);
        this.calcularDetalleRetroActivo();
      }
    } 
  }

  buscarPoligonoExclusivoPorNivel(){
    if (this.clasificacionSugerida().valor >0 ){
      //let valorPoligonoExclusivo = this.clasificacionSugerida().valor === this.clasificacionSeleccionada.valor ? "SI" : "NO"
      let poligonExclusivo = this.clasificacionSeleccionada.valor >= 2 ? "SI" : "NO";

      this.clasificacionSeleccionada.beneficios_dinamicos = [
        ...this.clasificacionSeleccionada.beneficios_dinamicos.filter(item => item.descripcion != "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO"),
        { descripcion: "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO", valor: poligonExclusivo }
      ];
    }
    
    this.calcularDetalleRetroActivo();
  }

  obtenerBeneficios(){
    this.listaClasificaciones = this.listaClasificaciones.map( item => {
      return {
        ...item,
        precio_pagar_temporada_bici_cn: (item.precio_actual_bici_cn - (item.precio_actual_bici_cn * item.porcentaje_subsidio) / 100),
        precio_pagar_temporada_bici_tw: (item.precio_actual_bici_tw - (item.precio_actual_bici_tw * item.porcentaje_subsidio) / 100),
        precio_pagar_temporada_ebike: (item.precio_actual_ebike - (item.precio_actual_ebike * item.porcentaje_subsidio) / 100),
        precio_pagar_temporada_caja_acc: (item.precio_actual_caja_acc - (item.precio_actual_caja_acc * item.porcentaje_subsidio) / 100)
      }
    })
  }

  obtenerMultimarcaCompraMinimaAnual(){
    this.listaClasificaciones = this.listaClasificaciones.map( item => {
      //const factorPorcentaje = (item.valor === 4) ? 0.11 : 0.15;
      let bicicletaCompraMinimaAnual = Math.ceil(item.bicicleta_compra_minima_anual * item.bicicleta_compra_minima_anual_multiplo);
      let compraMinimaAnual = Math.ceil((bicicletaCompraMinimaAnual * item.multimarca_compra_minima_anual_multiplo) / 5000) * 5000;

      return {
        ...item,
        bicicleta_compra_minima_anual: bicicletaCompraMinimaAnual,
        multimarca_compra_minima_anual: compraMinimaAnual
      };
    })
  }
}