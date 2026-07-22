import { AtributoDinamico } from "./atributo-dinamico.model";

export interface Clasificacion {
  id: number;
  descripcion: string;
  valor: number;
  descuento_retroactivo_por_logro: number;
  importe_compra_minimo_anual_adicional_iva_incluido: number;
  importe_compra_al_minimo_anual_adicional_iva_incluido: number, 
  margen_inicial_adicional_distribuidor: number;
  bicicleta_porcentaje_compra_inicial: number;
  multimarca_porcentaje_compra_inicial: number;
  bicicleta_compra_minima_anual: number;
  multimarca_compra_minima_anual: number;
  bicicleta_compra_minima_anual_multiplo: number;
  multimarca_compra_minima_anual_multiplo: number;
  precio_actual_bici_cn: number; 
  precio_actual_bici_tw: number; 
  precio_actual_ebike: number;
  precio_actual_caja_acc: number;
  porcentaje_subsidio: number;
  precio_pagar_temporada_bici_cn: number;
  precio_pagar_temporada_bici_tw: number;
  precio_pagar_temporada_ebike: number;
  precio_pagar_temporada_caja_acc: number;
  seguro_transporte_bici_cn: number;
  seguro_transporte_bici_tw: number;
  seguro_transporte_ebike: number;
  seguro_transporte_caja_acc: number;
  poligono_exclusivo: string;
  plazo_pago: string;
  beneficios_dinamicos: AtributoDinamico[];
}

export const LISTA_CLASIFICACIONES: Clasificacion[] = 
[{
    id: 4,
    descripcion: "Partner Elite Plus",
    valor: 4,
    descuento_retroactivo_por_logro: 1,
    importe_compra_minimo_anual_adicional_iva_incluido: 920000,
    importe_compra_al_minimo_anual_adicional_iva_incluido: 0,//Calculado
    margen_inicial_adicional_distribuidor: 6.5,
    bicicleta_porcentaje_compra_inicial: 65,
    multimarca_porcentaje_compra_inicial: 50,
    bicicleta_compra_minima_anual: 6000000,
    multimarca_compra_minima_anual: 0,
    bicicleta_compra_minima_anual_multiplo: 1.15,
    multimarca_compra_minima_anual_multiplo: 0.089,
    precio_actual_bici_cn: 488,
    precio_actual_bici_tw: 750,
    precio_actual_ebike: 960,
    precio_actual_caja_acc: 270,
    porcentaje_subsidio: 50,
    precio_pagar_temporada_bici_cn: 0, //Calculado
    precio_pagar_temporada_bici_tw: 0, //Calculado
    precio_pagar_temporada_ebike: 0, //Calculado
    precio_pagar_temporada_caja_acc: 0, //Calculado
    seguro_transporte_bici_cn: 0,
    seguro_transporte_bici_tw: 0,
    seguro_transporte_ebike: 0,
    seguro_transporte_caja_acc: 0,
    poligono_exclusivo: "SI",
    plazo_pago: "90 Días",
    beneficios_dinamicos: [
      { descripcion: "ACCESO A PEDIDOS EN TRANSITO", valor: "SI" },
      { descripcion: "Politica de Garantía de Buena Voluntad", valor: "SI"},
    ],
  },
  {
    id: 3,
    descripcion: "Partner Elite",
    valor: 3,
    descuento_retroactivo_por_logro: 2,
    importe_compra_minimo_anual_adicional_iva_incluido: 2300000,
    importe_compra_al_minimo_anual_adicional_iva_incluido: 0, //Calculado
    margen_inicial_adicional_distribuidor: 4.5,
    bicicleta_porcentaje_compra_inicial: 65,
    multimarca_porcentaje_compra_inicial: 50,
    bicicleta_compra_minima_anual: 2200000,
    multimarca_compra_minima_anual: 0,
    bicicleta_compra_minima_anual_multiplo: 1.1,
    multimarca_compra_minima_anual_multiplo: 0.133,
    precio_actual_bici_cn: 488,
    precio_actual_bici_tw: 750,
    precio_actual_ebike: 960,
    precio_actual_caja_acc: 270,
    porcentaje_subsidio: 30,
    precio_pagar_temporada_bici_cn: 0, //Calculado
    precio_pagar_temporada_bici_tw: 0, //Calculado
    precio_pagar_temporada_ebike: 0, //Calculado
    precio_pagar_temporada_caja_acc: 0, //Calculado
    seguro_transporte_bici_cn: 0,
    seguro_transporte_bici_tw: 0,
    seguro_transporte_ebike: 0,
    seguro_transporte_caja_acc: 0,
    poligono_exclusivo: "SI",
    plazo_pago: "60 Días",

    beneficios_dinamicos: [
      { descripcion: "ACCESO A PEDIDOS EN TRANSITO", valor: "SI" },
      { descripcion: "Politica de Garantía de Buena Voluntad", valor: "SI" },
    ],
  },
  {
    id: 2,
    descripcion: "Partner",
    valor: 2,
    descuento_retroactivo_por_logro: 4.5,
    importe_compra_minimo_anual_adicional_iva_incluido: 5750000,
    importe_compra_al_minimo_anual_adicional_iva_incluido: 0, //Calculado
    margen_inicial_adicional_distribuidor: 2.0,
    bicicleta_porcentaje_compra_inicial: 65,
    multimarca_porcentaje_compra_inicial: 50,
    bicicleta_compra_minima_anual: 1500000,
    multimarca_compra_minima_anual: 0,
    bicicleta_compra_minima_anual_multiplo: 1.05,
    multimarca_compra_minima_anual_multiplo: 0.12,
    precio_actual_bici_cn: 488,
    precio_actual_bici_tw: 750,
    precio_actual_ebike: 960,
    precio_actual_caja_acc: 270,
    porcentaje_subsidio: 0,
    precio_pagar_temporada_bici_cn: 0, //Calculado
    precio_pagar_temporada_bici_tw: 0, //Calculado
    precio_pagar_temporada_ebike: 0, //Calculado
    precio_pagar_temporada_caja_acc: 0, //Calculado
    seguro_transporte_bici_cn: 0,
    seguro_transporte_bici_tw: 0,
    seguro_transporte_ebike: 0,
    seguro_transporte_caja_acc: 0,
    poligono_exclusivo: "",
    plazo_pago: "45 Días",
  
    beneficios_dinamicos: [
      { descripcion: "SEGURO DE INVERSION (Descuento retroactivo en caso de disminución de precios***)", valor: "0%" },
      { descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI" },
    ],
  },
  {
    id: 1,
    descripcion: "Distribuidor",
    valor: 1,
    descuento_retroactivo_por_logro: 0,
    importe_compra_minimo_anual_adicional_iva_incluido: 0,
    importe_compra_al_minimo_anual_adicional_iva_incluido: 0, //Calculado
    margen_inicial_adicional_distribuidor: 0,
    bicicleta_porcentaje_compra_inicial: 65,
    multimarca_porcentaje_compra_inicial: 55,
    bicicleta_compra_minima_anual: 450000,
    multimarca_compra_minima_anual: 0,
    bicicleta_compra_minima_anual_multiplo: 1, //el valor original es 0 pero se multplica por uno para evitar el cero
    multimarca_compra_minima_anual_multiplo: 0.13,
    precio_actual_bici_cn: 488,
    precio_actual_bici_tw: 750,
    precio_actual_ebike: 960,
    precio_actual_caja_acc: 270,
    porcentaje_subsidio: 0,
    precio_pagar_temporada_bici_cn: 0,  //Calculado
    precio_pagar_temporada_bici_tw: 0, //Calculado
    precio_pagar_temporada_ebike: 0, //Calculado
    precio_pagar_temporada_caja_acc: 0, //Calculado
    seguro_transporte_bici_cn: 0,
    seguro_transporte_bici_tw: 0,
    seguro_transporte_ebike: 0,
    seguro_transporte_caja_acc: 0,
    poligono_exclusivo: "",
    plazo_pago: "30 Días",

    beneficios_dinamicos: [
      { descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI" },
    ],
  },
];