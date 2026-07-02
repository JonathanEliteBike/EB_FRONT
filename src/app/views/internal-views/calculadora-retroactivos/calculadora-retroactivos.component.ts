import { Component, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";

//Modelos
import { Poligono, LISTA_POLIGONOS } from './models/poligono.model';
import { Clasificacion } from './models/clasificacion-model';
import { ClasificacionAnualPorNivel } from './models/clasificacion-anual-por-nivel.mode';
import { Sucursal, SUCURSAL} from './models/sucursal.model';
import { CalculoMargenesRetroactivos } from './models/calculo-margen-retroactivo.model';
import { CalculoAnualAdicionalPorNivel } from './models/calculo-anual-adicional-por-nivel.model';
import { AnualAdicionalPorNivelCantidad } from './models/anual-adicional-por-nivel-cantidad.model';
import { AnualPorCumplimiento } from './models/anual-por-cumplimiento.model';
import { LISTA_PROGRAMA_ESPECIAL_IMPULSO} from './models/programa-especial-impulso.model';
import { LISTA_RESTRICCIONES_PROGRAMA } from './models/restriccion-programa.model';

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

  listaClasificaciones: Clasificacion[] = [
    { id: 4, descripcion: "Partner Elite Plus", valor: 4, descuento_retroactivo_por_logro: 1, importe_compra_minimo_anual_adicional_iva_incluido: 800000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 6.5, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 6000000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 60, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "SI", plazo_pago: "90 y 120 Días", beneficios_dinamicos: [{descripcion: "Politica de Garantía de Buena Voluntad	", valor: "SI" }]},
    { id: 3, descripcion: "Partner Elite", valor: 3, descuento_retroactivo_por_logro: 2, importe_compra_minimo_anual_adicional_iva_incluido: 2000000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 4.5, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 2200000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 30, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "SI", plazo_pago: "90 Días", beneficios_dinamicos: [{ descripcion: "ACCESO A PEDIDOS EN TRANSITO", valor: "SI"}, { descripcion: "GARANTIA DE CONFIANZA", valor: "SI" }]},
    { id: 2, descripcion: "Partner", valor: 2, descuento_retroactivo_por_logro: 4.5, importe_compra_minimo_anual_adicional_iva_incluido: 5000000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 2.0, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 1500000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 0, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0,poligono_exclusivo: "", plazo_pago: "60 Días", beneficios_dinamicos: [{ descripcion: "SEGURO DE INVERSION (Descuento retroactivo en caso de disminución de precios***)", valor: "0" }, { descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI"}]},
    { id: 1, descripcion: "Distribuidor", valor: 1, descuento_retroactivo_por_logro: 0, importe_compra_minimo_anual_adicional_iva_incluido: 0, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 0, bicicleta_porcentaje_compra_inicial: 70, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 350000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 0, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "", plazo_pago: "30 Días", beneficios_dinamicos: [{ descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI" }]}
  ];

  listaAnualAdicional: ClasificacionAnualPorNivel[] = [
    { clasifiacionId: 1, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 },
    { clasifiacionId: 2, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 },
    { clasifiacionId: 3, adicional_minimo_total_anual_iva: 0, adicional_total_compra_anual_minimo_iva: 0 }
  ];

  listaCalculoMargenesRetroactivos = signal<CalculoMargenesRetroactivos[]>([
    { descripcion: "BICICLETAS", margen_precio_distribuidor: 24, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
    { descripcion: "BICICLETAS ELECTRICAS", margen_precio_distribuidor: 24, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
    { descripcion: "BOLD BICI Y CUADROS", margen_precio_distribuidor: 24, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
    { descripcion: "ACCESORIOS Y COMPONENTES", margen_precio_distribuidor: 30, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0},
    { descripcion: "APPAREL", margen_precio_distribuidor: 30, margen_inicio_temporada: 0, nivel_elegido: "", suma_descuento_retroactivo: 0, margen_con_descuento_retroactivo: 0}
  ]);

  listaCalculoAnualAdicionalPorNivel = signal<CalculoAnualAdicionalPorNivel[]>([
    { importe_minimo_total_anual_con_iva: 0, importe_total_compra_adicional_con_iva: 0, descuento_retroactivo_por_logro: 0}
  ]);

  listaAnualAdicionalPorNivelCantidad = signal<AnualAdicionalPorNivelCantidad[]>([
    { valor: 800000, valor_calculado: 0, descuento_retroactivo: 1,}, { valor: 2000000, valor_calculado: 0, descuento_retroactivo:2 }, { valor: 5000000, valor_calculado: 0, descuento_retroactivo: 4.5 }, { valor: 0, valor_calculado: 0, descuento_retroactivo: 0 },
  ]);

  listaAnualPorCumplimiento: AnualPorCumplimiento[] = [
    { id: 1, descripcion: "Compra Minima de Apparel Y Syncros y (Niveles Partner Elite y Partner Elite Plus)", descuento: 2.5, seleccionado: false},
    { id: 2, descripcion: "Compra Minima de Apparel Y Syncros y (Nivel Partner)", descuento: 1.5, seleccionado: false},
    { id: 3, descripcion: "Pre-Pago o pago de Contado***", descuento: 2.0, seleccionado: false},
  ]

  //Inicializacion de objetos
  poligonoSeleccionado: Poligono = poligonoVacio();
  sucursalSeleccionada: Sucursal = sucursalVacia();
  clasificacionSeleccionada: Clasificacion = clasificacionVacia();
  anualAdicionalPorNivel: AnualAdicionalPorNivelCantidad = anualAdicionalPorNivelCantidadVacio();
  anualPorCumplimiento: AnualPorCumplimiento[] = [anualPorCumpimientoVacio()];
  
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


  ngOnInit(): void {
    this.obtenerMultimarcaCompraMinimaAnual();
    this.obtenerBeneficios();
  }
  
  calcularDetalleRetroActivo(){
    if (this.validarDatos()){
      
      let redondeoBiciMinimaCompraLinea = this.clasificacionSeleccionada.id === 2 ? 5000 : 10000;
      let redondeoBiciMultimarcaCompraInicial = this.clasificacionSeleccionada.id === 4 ? 500 : 5000;

      //Detalle Retroactivo resumen
      this.bicicletaPorcentajeInicial = this.clasificacionSeleccionada.bicicleta_porcentaje_compra_inicial;
      this.bicicletaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.bicicleta_compra_minima_anual * (this.sucursalSeleccionada?.multiplo)) / redondeoBiciMinimaCompraLinea) * redondeoBiciMinimaCompraLinea;
      this.bicicletaMinimaCompraInicial = Math.floor(((this.bicicletaPorcentajeInicial * this.bicicletaMinimaCompraInicialLinea) / 100) / redondeoBiciMultimarcaCompraInicial) * redondeoBiciMultimarcaCompraInicial;
      this.multimarcaPorcentajeInicial = this.clasificacionSeleccionada.multimarca_porcentaje_compra_inicial;
      this.multimarcaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.multimarca_compra_minima_anual * (this.sucursalSeleccionada.multiplo)) / 10000) * 10000;
      this.multimarcaMinimaCompraInicial = Math.floor(((this.multimarcaPorcentajeInicial * this.multimarcaMinimaCompraInicialLinea) / 100) / 5000) * 5000;
      this.segundoSemestreMinimaBicicletaPorcentajeInicial = Math.round((1 - (this.bicicletaPorcentajeInicial / 100)) * 100);
      this.segundoSemestreMinimaBicicletaCompraInicial = (this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100;
      this.segundoSemestreMinimaBicicletaCompraInicial = this.clasificacionSeleccionada.id === 3 ? this.segundoSemestreMinimaBicicletaCompraInicial : Math.ceil(((this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100) / 10000) * 10000;
      this.totalCompraMinimaAnualPrimerSemestre = this.bicicletaMinimaCompraInicialLinea + this.multimarcaMinimaCompraInicialLinea;
      this.totalCompraMinimaAnualSegundoSemestre = this.bicicletaMinimaCompraInicial + this.multimarcaMinimaCompraInicial;

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
      this.actualizarAnualAdicionalPorNivelCantidad();
      this.actualizarAnualAdicionalPorNivel();
    }
  }
  
  actualizarMargenRetroactivo() {
    let descuentoRetroActivo = 0;
    let bonoPorCumplimiento = null;

    if (this.clasificacionSeleccionada.valor >= 2){
      descuentoRetroActivo = this.anualAdicionalPorNivel.descuento_retroactivo;
      bonoPorCumplimiento = this.anualPorCumplimiento
      .filter(item => item.id === 1 || item.id === 3)
      .map(item => ({ ...item }));

      if (bonoPorCumplimiento){
        bonoPorCumplimiento = bonoPorCumplimiento.filter(item => item.seleccionado === true);
        bonoPorCumplimiento.map(item => {
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

    if ((this.clasificacionSeleccionada.valor === 2)){
      bonoPorCumplimiento = this.anualPorCumplimiento
      .filter(item => item.id === 2 || item.id === 3)
      .map(item => ({ ...item }));

      if (bonoPorCumplimiento){
        bonoPorCumplimiento = bonoPorCumplimiento.filter(item => item.seleccionado === true);
        bonoPorCumplimiento.map(item => {
          descuentoRetroActivo += item.descuento
        });
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

  actualizarAnualAdicionalPorNivelCantidad(){
    this.listaAnualAdicionalPorNivelCantidad.update(listaActual => 
      listaActual.map(item => {
        return {
          ...item,
          valor_calculado: (item.valor * this.sucursalSeleccionada.multiplo)
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
          importe_total_compra_adicional_con_iva: Math.ceil((this.clasificacionSeleccionada.importe_compra_minimo_anual_adicional_iva_incluido * this.sucursalSeleccionada.multiplo) / 10000 ) * 10000,
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
      let valorPoligonoExclusivo = this.clasificacionSugerida().valor <= this.clasificacionSeleccionada.valor ? "SI" : "NO"
      this.clasificacionSeleccionada.beneficios_dinamicos = [
        ...this.clasificacionSeleccionada.beneficios_dinamicos.filter(item => item.descripcion != "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO"),
        { descripcion: "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO", valor: valorPoligonoExclusivo }
      ];
    }

    if (this.validarDatos()){
      this.calcularDetalleRetroActivo();
    }
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
      const factorPorcentaje = (item.valor === 4) ? 0.11 : 0.15;
      return {
        ...item,
        multimarca_compra_minima_anual: Math.ceil((item.bicicleta_compra_minima_anual * factorPorcentaje) / 5000) * 5000
      };
    })
  }
}
