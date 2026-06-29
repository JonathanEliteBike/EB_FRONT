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