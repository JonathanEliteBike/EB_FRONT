import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 1. Import this

import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";

//Modelos
import { Poligono } from './models/Poligono.model';
import { Clasificacion } from './models/clasificacion-model';
import { ClasificacionAnualPorNivel } from './models/clasificacion-anual-por-nivel.mode';
import { Sucursal } from './models/sucursal.model';
import { CalculoMargenesRetroactivos } from './models/calculo-margen-retroactivo.model';
import { CalculoAnualAdicionalPorNivel } from './models/calculo-anual-adicional-por-nivel.model';
import { AnualAdicionalPorNivelCantidad } from './models/anual-adicional-por-nivel-cantidad.model';
import { AnualPorCumplimiento } from './models/anual-por-cumplimiento.model';

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
  descripcion: "",
  clasificacionId: 0
})

const anualAdicionalPorNivelCantidadVacio = (): AnualAdicionalPorNivelCantidad => ({
  valor: 0,
  descuento_retroactivo: 0
})

const anualPorCumpimientoVacio = (): AnualPorCumplimiento => ({
  id: 0,
  descripcion: "",
  descuento: 0,
  seleccionado: false
})

@Component({
  selector: 'app-calculadora-retroactivos',
  imports: [CommonModule, FormsModule, HomeBarComponent],
  templateUrl: './calculadora-retroactivos.component.html',
  styleUrl: './calculadora-retroactivos.component.css'
})
export class CalculadoraRetroactivosComponent {

  listaPoligonos: Poligono[] = [
    { ciudad: "Acapulco.", descripcion: "Acapulco Norte.", clasificacionId: 3 },
    { ciudad: "Acapulco.", descripcion: "Acapulco Sur.", clasificacionId: 3 },
    { ciudad: "Aguascalientes.", descripcion: "Aguascalientes   Sur.", clasificacionId: 2 },
    { ciudad: "Aguascalientes.", descripcion: "Aguascalientes Este.", clasificacionId: 2 },
    { ciudad: "Aguascalientes.", descripcion: "Aguascalientes Norte.", clasificacionId: 3 },
    { ciudad: "Ahome.", descripcion: "Ahome.", clasificacionId: 2 },
    { ciudad: "Arandas.", descripcion: "Arandas", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Azcapotzalgo,Cdmx.", clasificacionId: 2 },
    { ciudad: "Ensenada.", descripcion: "Baja Norte Ensenada.", clasificacionId: 3 },
    { ciudad: "San José del Cabo.", descripcion: "Baja sur  Norte San José del Cabo.", clasificacionId: 2 },
    { ciudad: "Cabo San Lucas.", descripcion: "Baja Sur Cabo San Lucas Centro.", clasificacionId: 1 },
    { ciudad: "Cabo San Lucas.", descripcion: "Baja Sur Cabo San Lucas Este.", clasificacionId: 2 },
    { ciudad: "Cabo San Lucas.", descripcion: "Baja Sur Cabo San Lucas Norte.", clasificacionId: 2 },
    { ciudad: "Cabo San Lucas.", descripcion: "Baja Sur Cabo San Lucas Sur.", clasificacionId: 3 },
    { ciudad: "San José del Cabo.", descripcion: "Baja sur Centro San José del Cabo.", clasificacionId: 1 },
    { ciudad: "Loreto.", descripcion: "Baja Sur Loreto.", clasificacionId: 2 },
    { ciudad: "San José del Cabo.", descripcion: "Baja sur Sur San Jose del Cabo.", clasificacionId: 2 },
    { ciudad: "Boca del rio.", descripcion: "Boca del rio.", clasificacionId: 3 },
    { ciudad: "Campeche.", descripcion: "Campeche.", clasificacionId: 2 },
    { ciudad: "Cancún.", descripcion: "Cancún", clasificacionId: 3 },
    { ciudad: "Cd. Juárez.", descripcion: "CD. JUAREZ.", clasificacionId: 2 },
    { ciudad: "Cd. Madero.", descripcion: "Cd. Madero.", clasificacionId: 2 },
    { ciudad: "Cd. Victoria.", descripcion: "Cd. Victoria", clasificacionId: 2 },
    { ciudad: "Celaya.", descripcion: "Celaya  Centro", clasificacionId: 2 },
    { ciudad: "Celaya.", descripcion: "Celaya Este", clasificacionId: 2 },
    { ciudad: "Celaya.", descripcion: "Celaya Noroeste", clasificacionId: 2 },
    { ciudad: "Celaya.", descripcion: "Celaya Norte", clasificacionId: 2 },
    { ciudad: "Celaya.", descripcion: "Celaya Sur", clasificacionId: 2 },
    { ciudad: "Chetumal.", descripcion: "Chetumal", clasificacionId: 2 },
    { ciudad: "Chihuahua.", descripcion: "Chihuahua Centro.", clasificacionId: 4 },
    { ciudad: "Chihuahua.", descripcion: "Chihuahua Norte.", clasificacionId: 2 },
    { ciudad: "Chihuahua.", descripcion: "Chihuahua Sur.", clasificacionId: 1 },
    { ciudad: "Chilpancingo.", descripcion: "Chilpancingo.", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Coapa Oriente,Cdmx.", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Coapa Poniente,Cdmx.", clasificacionId: 3 },
    { ciudad: "Coatepec.", descripcion: "Coatepec.", clasificacionId: 1 },
    { ciudad: "Coatzacoalcos.", descripcion: "Coatzacoalcos.", clasificacionId: 2 },
    { ciudad: "Colima.", descripcion: "Colima Polígono Este", clasificacionId: 3 },
    { ciudad: "Colima.", descripcion: "colima Polígono Oeste", clasificacionId: 2 },
    { ciudad: "Comitan.", descripcion: "Comitan.", clasificacionId: 2 },
    { ciudad: "Cordova.", descripcion: "Cordova.", clasificacionId: 2 },
    { ciudad: "Cuauhtémoc.", descripcion: "Cuauhtémoc.", clasificacionId: 2 },
    { ciudad: "Culiacán", descripcion: "Culiacán Norte", clasificacionId: 3 },
    { ciudad: "Culiacán", descripcion: "Culiacán Sur", clasificacionId: 2 },
    { ciudad: "Delicias.", descripcion: "Delicias.", clasificacionId: 1 },
    { ciudad: "Durango.", descripcion: "Durango Cap. Oriente.", clasificacionId: 2 },
    { ciudad: "Durango.", descripcion: "Durango Cap. Poniente.", clasificacionId: 3 },
    { ciudad: "Fresnillo.", descripcion: "Fresnillo.", clasificacionId: 2 },
    { ciudad: "Gomez Palacio.", descripcion: "Goméz Palacio.", clasificacionId: 2 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara Centro", clasificacionId: 4 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara Este", clasificacionId: 3 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara Este", clasificacionId: 4 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara Noreste", clasificacionId: 3 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara Norte", clasificacionId: 4 },
    { ciudad: "Guadalajara.", descripcion: "Guadalajara sur", clasificacionId: 3 },
    { ciudad: "Guadalupe.", descripcion: "Guadalupe.", clasificacionId: 2 },
    { ciudad: "Guasave.", descripcion: "Guasave.", clasificacionId: 1 },
    { ciudad: "Hermosillo.", descripcion: "Hermosillo Norte", clasificacionId: 2 },
    { ciudad: "Hermosillo.", descripcion: "Hermosillo Sur", clasificacionId: 2 },
    { ciudad: "Heroica Cárdenas", descripcion: "Heroica Cárdenas", clasificacionId: 1 },
    { ciudad: "Huejutla", descripcion: "Huejutla", clasificacionId: 1 },
    { ciudad: "Irapuato.", descripcion: "Irapuato  Sur", clasificacionId: 2 },
    { ciudad: "Irapuato.", descripcion: "Irapuato Este", clasificacionId: 2 },
    { ciudad: "Irapuato.", descripcion: "Irapuato Noroeste", clasificacionId: 2 },
    { ciudad: "Irapuato.", descripcion: "Irapuato Norte", clasificacionId: 2 },
    { ciudad: "Irapuato.", descripcion: "Irapuato Sureste", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Iztapalapa,Cdmx.", clasificacionId: 2 },
    { ciudad: "Jeréz.", descripcion: "Jeréz.", clasificacionId: 1 },
    { ciudad: "Juchitán", descripcion: "Juchitán", clasificacionId: 2 },
    { ciudad: "León.", descripcion: "Leon Polígono  Centro Sur", clasificacionId: 2 },
    { ciudad: "León.", descripcion: "Leon Polígono  Oeste", clasificacionId: 2 },
    { ciudad: "León.", descripcion: "Leon Polígono Bronce Sureste", clasificacionId: 1 },
    { ciudad: "León.", descripcion: "Leon Polígono Centro Norte", clasificacionId: 3 },
    { ciudad: "León.", descripcion: "Leon Polígono Este", clasificacionId: 2 },
    { ciudad: "León.", descripcion: "Leon Polígono Norte", clasificacionId: 4 },
    { ciudad: "León.", descripcion: "Leon Polígono Sur", clasificacionId: 3 },
    { ciudad: "León.", descripcion: "Leon Polígono Suroeste", clasificacionId: 1 },
    { ciudad: "Loreto Zac.", descripcion: "Loreto Zac.", clasificacionId: 1 },
    { ciudad: "Matamoros", descripcion: "Matamoros", clasificacionId: 1 },
    { ciudad: "Mazatlán.", descripcion: "Mazatlán.", clasificacionId: 3 },
    { ciudad: "Merida Norte.", descripcion: "Merida Norte.", clasificacionId: 3 },
    { ciudad: "Merida Sur.", descripcion: "Merida Sur.", clasificacionId: 2 },
    { ciudad: "Metepec ", descripcion: "Metepec ", clasificacionId: 4 },
    { ciudad: "Minatitlan.", descripcion: "Minatitlan.", clasificacionId: 1 },
    { ciudad: "Monclova", descripcion: "Monclova", clasificacionId: 2 },
    { ciudad: "Morelia.", descripcion: "Morelia Centro Oeste", clasificacionId: 3 },
    { ciudad: "Morelia.", descripcion: "Morelia Este", clasificacionId: 4 },
    { ciudad: "Morelia.", descripcion: "Morelia Noreste", clasificacionId: 2 },
    { ciudad: "Morelia.", descripcion: "Morelia Noroeste", clasificacionId: 3 },
    { ciudad: "Morelia.", descripcion: "Morelia Sur   ", clasificacionId: 2 },
    { ciudad: "Morelia.", descripcion: "Morelia Sureste", clasificacionId: 3 },
    { ciudad: "Cuautla.", descripcion: "Morelos Cuautla.", clasificacionId: 1 },
    { ciudad: "Cuernavaca.", descripcion: "Morelos Norte.", clasificacionId: 3 },
    { ciudad: "Cuernavaca.", descripcion: "Morelos Sur.", clasificacionId: 2 },
    { ciudad: "Allende.", descripcion: "N.L. Allende.", clasificacionId: 2 },
    { ciudad: "Apodaca.", descripcion: "N.L. Apodaca.", clasificacionId: 3 },
    { ciudad: "Monterrey.", descripcion: "N.L. Carretera Nac.", clasificacionId: 3 },
    { ciudad: "Monterrey.", descripcion: "N.L. Country.", clasificacionId: 3 },
    { ciudad: "Monterrey.", descripcion: "N.L. Cumbres.", clasificacionId: 3 },
    { ciudad: "San Nicolás.", descripcion: "N.L. San Nicolás.", clasificacionId: 2 },
    { ciudad: "San Pedro.", descripcion: "N.L. San Pedro.", clasificacionId: 4 },
    { ciudad: "Monterrey.", descripcion: "N.L. Santa Catarina.", clasificacionId: 2 },
    { ciudad: "Monterrey.", descripcion: "N.L.Monterrey.", clasificacionId: 4 },
    { ciudad: "CDMX.", descripcion: "Narvarte Oriente,Cdmx.", clasificacionId: 3 },
    { ciudad: "CDMX.", descripcion: "Narvarte Poniente,Cdmx.", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Naucalpan Poniente,Cdmx.", clasificacionId: 2 },
    { ciudad: "Navojoa", descripcion: "Navojoa", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Nucalpan Oriente,Cdmx.", clasificacionId: 2 },
    { ciudad: "Oaxaca.", descripcion: "Oaxaca Cap. Norte", clasificacionId: 3 },
    { ciudad: "Oaxaca.", descripcion: "Oaxaca Cap. Sur.", clasificacionId: 2 },
    { ciudad: "Obregón", descripcion: "Obregón", clasificacionId: 1 },
    { ciudad: "Obregón ", descripcion: "Obregón ", clasificacionId: 2 },
    { ciudad: "Orizaba.", descripcion: "Orizaba Norte.", clasificacionId: 2 },
    { ciudad: "Orizaba.", descripcion: "Orizaba Sur.", clasificacionId: 3 },
    { ciudad: "Pachuca.", descripcion: "Pachuca Este", clasificacionId: 3 },
    { ciudad: "Pachuca.", descripcion: "Pachuca Norte", clasificacionId: 2 },
    { ciudad: "Pachuca.", descripcion: "Pachuca Oeste", clasificacionId: 2 },
    { ciudad: "Pachuca.", descripcion: "Pachuca sur", clasificacionId: 2 },
    { ciudad: "Playa del Carmen.", descripcion: "Playa del Carmen.", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Polanco,Cdmx.", clasificacionId: 4 },
    { ciudad: "Poza Rica.", descripcion: "Poza Rica.", clasificacionId: 2 },
    { ciudad: "Puebla.", descripcion: "Puebla Centro  ", clasificacionId: 3 },
    { ciudad: "Puebla.", descripcion: "Puebla Centroeste", clasificacionId: 3 },
    { ciudad: "Puebla.", descripcion: "Puebla Este", clasificacionId: 2 },
    { ciudad: "Puebla.", descripcion: "Puebla Norte", clasificacionId: 3 },
    { ciudad: "Puebla.", descripcion: "Puebla Sur", clasificacionId: 4 },
    { ciudad: "Puebla.", descripcion: "Puebla Sureste", clasificacionId: 2 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Centro", clasificacionId: 4 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Centro/Norte", clasificacionId: 2 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Diamante Este", clasificacionId: 4 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Noroeste", clasificacionId: 4 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Norte", clasificacionId: 2 },
    { ciudad: "Querétaro.", descripcion: "Querétaro Sur", clasificacionId: 3 },
    { ciudad: "Reynosa.", descripcion: "Reynosa", clasificacionId: 1 },
    { ciudad: "Rio Verde", descripcion: "Rio Verde", clasificacionId: 1 },
    { ciudad: "CDMX.", descripcion: "Roma,Cdmx.", clasificacionId: 3 },
    { ciudad: "Salina Cruz.", descripcion: "Salina Cruz.", clasificacionId: 2 },
    { ciudad: "Saltillo.", descripcion: "Saltillo Norte.", clasificacionId: 3 },
    { ciudad: "Saltillo.", descripcion: "Saltillo Sur.", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "San Angel Cdmx.", clasificacionId: 3 },
    { ciudad: "San Cristobal.", descripcion: "San Cristobal Norte.", clasificacionId: 2 },
    { ciudad: "Tapachula.", descripcion: "San cristobal Sur.", clasificacionId: 2 },
    { ciudad: "San Juan de los Lagos.", descripcion: "San Juan de los Lagos ", clasificacionId: 2 },
    { ciudad: "San Juan del Rio.", descripcion: "San Juan del Rio", clasificacionId: 2 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 3 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 3 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 3 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 2 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 2 },
    { ciudad: "San Luis Potosí", descripcion: "San Luis Potosí", clasificacionId: 2 },
    { ciudad: "San Luis Potosi", descripcion: "San Luis Potosí", clasificacionId: 4 },
    { ciudad: "San Miguel Allende.", descripcion: "San Miguel Allende Centro", clasificacionId: 2 },
    { ciudad: "San Miguel Allende.", descripcion: "San Miguel Allende Noreste", clasificacionId: 2 },
    { ciudad: "San Miguel Allende.", descripcion: "San Miguel Allende Norte", clasificacionId: 2 },
    { ciudad: "San Miguel Allende.", descripcion: "San Miguel Allende Sur", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Santa Fé Norte.", clasificacionId: 4 },
    { ciudad: "CDMX.", descripcion: "Santa Fé Sur.", clasificacionId: 4 },
    { ciudad: "Tampico.", descripcion: "Tampico.", clasificacionId: 2 },
    { ciudad: "Comitan.", descripcion: "Tapachula", clasificacionId: 2 },
    { ciudad: "Tepatitlan.", descripcion: "Tepatitlan", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Tepeyac,Cdmx.", clasificacionId: 2 },
    { ciudad: "Tepic.", descripcion: "Tepic Este", clasificacionId: 1 },
    { ciudad: "Tepic.", descripcion: "Tepic Norte", clasificacionId: 2 },
    { ciudad: "Tepic.", descripcion: "Tepic Oeste", clasificacionId: 2 },
    { ciudad: "Tepic.", descripcion: "Tepic Sur", clasificacionId: 2 },
    { ciudad: "Tepic.", descripcion: "Tepic Sureste", clasificacionId: 2 },
    { ciudad: "Edo. Mex", descripcion: "Tequixquiac, Edo.Méx.", clasificacionId: 2 },
    { ciudad: "Tezontepec.", descripcion: "Tezontepec", clasificacionId: 1 },
    { ciudad: "Tlaxiaco.", descripcion: "Tlaxiaco", clasificacionId: 2 },
    { ciudad: "Torreón.", descripcion: "Torreón Oriente.", clasificacionId: 3 },
    { ciudad: "Torreón.", descripcion: "Torreón Poniente.", clasificacionId: 2 },
    { ciudad: "Tula.", descripcion: "Tula ", clasificacionId: 2 },
    { ciudad: "Tuxpan.", descripcion: "Tuxpan Guerrero.", clasificacionId: 1 },
    { ciudad: "Tuxtla Gutierrez.", descripcion: "Tuxtla Norte.", clasificacionId: 2 },
    { ciudad: "Tuxtla Gutierrez.", descripcion: "Tuxtla Sur.", clasificacionId: 2 },
    { ciudad: "Tuxtla Ver.", descripcion: "Tuxtla Ver.", clasificacionId: 1 },
    { ciudad: "CDMX.", descripcion: "Universidad,Cdmx.", clasificacionId: 3 },
    { ciudad: "Vallarta.", descripcion: "Vallarta Centro", clasificacionId: 2 },
    { ciudad: "Vallarta.", descripcion: "Vallarta Este", clasificacionId: 2 },
    { ciudad: "Vallarta.", descripcion: "Vallarta Norte ", clasificacionId: 2 },
    { ciudad: "CDMX.", descripcion: "Valle de Bravo, Oriente.", clasificacionId: 3 },
    { ciudad: "CDMX.", descripcion: "Valle de Bravo, Poniente.", clasificacionId: 3 },
    { ciudad: "Veracruz Pto.", descripcion: "Veracruz Pto.", clasificacionId: 2 },
    { ciudad: "Villahermosa.", descripcion: "Villahermosa.", clasificacionId: 3 },
    { ciudad: "Xalapa.", descripcion: "Xalapa Norte.", clasificacionId: 2 },
    { ciudad: "Xalapa.", descripcion: "Xalapa Sur.", clasificacionId: 3 },
    { ciudad: "Zacatecas.", descripcion: "Zacatecas", clasificacionId: 2 },
    { ciudad: "Zamora.", descripcion: "Zamora Norte", clasificacionId: 2 },
    { ciudad: "Zamora.", descripcion: "Zamora Sur", clasificacionId: 2 },
    { ciudad: "Zihuatanejo.", descripcion: "Zihuatanejo", clasificacionId: 1 }
  ];

  listaClasificaciones: Clasificacion[] = [
    { id: 1, descripcion: "Partner Elite Plus", valor: 4, descuento_retroactivo_por_logro: 1, importe_compra_minimo_anual_adicional_iva_incluido: 800000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 6.5, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 6000000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 60, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "SI", plazo_pago: "90 y 120 Días", beneficios_dinamicos: [{descripcion: "Politica de Garantía de Buena Voluntad	", valor: "SI" }]},
    { id: 2, descripcion: "Partner Elite", valor: 3, descuento_retroactivo_por_logro: 2, importe_compra_minimo_anual_adicional_iva_incluido: 2000000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 4.5, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 2200000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 30, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "SI", plazo_pago: "90 Días", beneficios_dinamicos: [{ descripcion: "ACCESO A PEDIDOS EN TRANSITO", valor: "SI"}, { descripcion: "GARANTIA DE CONFIANZA", valor: "SI" }]},
    { id: 3, descripcion: "Partner", valor: 2, descuento_retroactivo_por_logro: 4.5, importe_compra_minimo_anual_adicional_iva_incluido: 5000000, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 2.0, bicicleta_porcentaje_compra_inicial: 65, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 1500000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 0, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0,poligono_exclusivo: "", plazo_pago: "60 Días", beneficios_dinamicos: [{ descripcion: "SEGURO DE INVERSION (Descuento retroactivo en caso de disminución de precios***)", valor: "0" }, { descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI"}]},
    { id: 4, descripcion: "Distribuidor", valor: 1, descuento_retroactivo_por_logro: 0, importe_compra_minimo_anual_adicional_iva_incluido: 0, importe_compra_al_minimo_anual_adicional_iva_incluido: 0, margen_inicial_adicional_distribuidor: 0, bicicleta_porcentaje_compra_inicial: 70, multimarca_porcentaje_compra_inicial: 50, bicicleta_compra_minima_anual: 350000, multimarca_compra_minima_anual: 0, precio_actual_bici_cn: 355, precio_actual_bici_tw: 520, precio_actual_ebike: 810, precio_actual_caja_acc: 255, porcentaje_subsidio: 0, precio_pagar_temporada_bici_cn: 0, precio_pagar_temporada_bici_tw: 0, precio_pagar_temporada_ebike: 0, precio_pagar_temporada_caja_acc: 0, seguro_transporte_bici_cn: 0, seguro_transporte_bici_tw: 0, seguro_transporte_ebike: 0, seguro_transporte_caja_acc: 0, poligono_exclusivo: "", plazo_pago: "30 Días", beneficios_dinamicos: [{ descripcion: "ACCESO TIENDAS ELITE (Pedidos en Transito Con preferencia de acceso nuevo producto)", valor: "SI" }]}
  ];

  listaSucursales: Sucursal[] = [
    { id: 1, cantidad: 1, multiplo: 1 },
    { id: 2, cantidad: 2, multiplo: 1.5 },
    { id: 3, cantidad: 3, multiplo: 2.25 },
    { id: 4, cantidad: 4, multiplo: 3 },
    { id: 5, cantidad: 5, multiplo: 3.75 },
    { id: 6, cantidad: 6, multiplo: 4.5 },
  ]

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

  listaAnualAdicionalPorNivelCantidad: AnualAdicionalPorNivelCantidad[] = [
    { valor: 800000, descuento_retroactivo: 1 }, { valor: 2000000, descuento_retroactivo:2 }, { valor: 5000000, descuento_retroactivo: 4.5 }, { valor: 0, descuento_retroactivo: 0 },
  ]

  listaAnualPorCumplimiento: AnualPorCumplimiento[] = [
    { id: 1, descripcion: "Compra Minima de Apparel, Syncros y Vittoria (Niveles Partner Elite y Partner Elite Plus)", descuento: 2.5, seleccionado: false},
    { id: 2, descripcion: "Compra Minima de Apparel, Syncros y Vittoria (Nivel Partner)", descuento: 1.5, seleccionado: false},
    { id: 3, descripcion: "Pre-Pago o pago de Contado***", descuento: 2.0, seleccionado: false},
  ]
  
  //Inicializacion de objetos
  poligonoSeleccionado: Poligono = poligonoVacio();
  sucursalSeleccionada: Sucursal = sucursalVacia();
  clasificacionSeleccionada: Clasificacion = clasificacionVacia();
  clasificacionSugerida: Clasificacion = clasificacionVacia();
  anualAdicionalPorNivel: AnualAdicionalPorNivelCantidad = anualAdicionalPorNivelCantidadVacio();
  anualPorCumplimiento: AnualPorCumplimiento[] = [anualPorCumpimientoVacio()];

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

  totalCompraMinimaAnual: number = 0;

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

  detalleTotalCompraInicial = 0;


  ngOnInit(): void {
    this.inicializarDatosClasificacionDinamica();
  }

  validarDatos(){
    return (this.clasificacionSeleccionada.id > 0 && this.clasificacionSugerida.id > 0 && this.sucursalSeleccionada.cantidad > 0) ? true : false;
  }

  obtenerAnualPorCumplimiento(){
    this.anualPorCumplimiento = this.listaAnualPorCumplimiento.filter(item => item.seleccionado);

    this.actualizarMargenRetroactivo();
  }

  actualizarMargenRetroactivo(){
    let descuentoRetroActivo = 0;
    let bonoPorCumplimiento = null;

    if (this.clasificacionSeleccionada.valor === 3 || this.clasificacionSeleccionada.valor === 4){
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
        return {
          ...item,
          nivel_elegido: this.clasificacionSeleccionada.descripcion,
          margen_inicio_temporada: (item.margen_precio_distribuidor + this.clasificacionSeleccionada.margen_inicial_adicional_distribuidor),
          suma_descuento_retroactivo: descuentoRetroActivo
          //suma_descuento_retroactivo: this.anualAdicionalPorNivel.descuento_retroactivo
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
          descuento_retroactivo_por_logro: this.clasificacionSeleccionada.descuento_retroactivo_por_logro
        };
      })
    );
  }

  obtenerClasificacionSugerida() {
    this.clasificacionSugerida = this.listaClasificaciones.find( item => item.id === this.poligonoSeleccionado?.clasificacionId) || clasificacionVacia();
  }

  calcularDetalleRetroActivo(){
    if (this.validarDatos()){
      let redondeoBiciMinimaCompraLinea = this.clasificacionSeleccionada.id === 2 ? 5000 : 10000;
      let redondeoBiciMultimarcaCompraInicial = this.clasificacionSeleccionada.id === 4 ? 500 : 5000;

      this.bicicletaPorcentajeInicial = this.clasificacionSeleccionada.bicicleta_porcentaje_compra_inicial;
      this.bicicletaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.bicicleta_compra_minima_anual * (this.sucursalSeleccionada?.multiplo)) / redondeoBiciMinimaCompraLinea) * redondeoBiciMinimaCompraLinea;
      this.bicicletaMinimaCompraInicial = Math.floor(((this.bicicletaPorcentajeInicial * this.bicicletaMinimaCompraInicialLinea) / 100) / redondeoBiciMultimarcaCompraInicial) * redondeoBiciMultimarcaCompraInicial;

      this.multimarcaPorcentajeInicial = this.clasificacionSeleccionada.multimarca_porcentaje_compra_inicial;
      this.multimarcaMinimaCompraInicialLinea = Math.ceil((this.clasificacionSeleccionada.multimarca_compra_minima_anual * (this.sucursalSeleccionada.multiplo)) / 10000) * 10000;
      this.multimarcaMinimaCompraInicial = Math.floor(((this.multimarcaPorcentajeInicial * this.multimarcaMinimaCompraInicialLinea) / 100) / 5000) * 5000;

      this.segundoSemestreMinimaBicicletaPorcentajeInicial = Math.round((1 - (this.bicicletaPorcentajeInicial / 100)) * 100);
      this.segundoSemestreMinimaBicicletaCompraInicial = (this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100;
      this.segundoSemestreMinimaBicicletaCompraInicial = this.clasificacionSeleccionada.id === 3 ? this.segundoSemestreMinimaBicicletaCompraInicial : Math.ceil(((this.bicicletaMinimaCompraInicialLinea * this.segundoSemestreMinimaBicicletaPorcentajeInicial) / 100) / 10000) * 10000;

      this.totalCompraMinimaAnual = this.bicicletaMinimaCompraInicialLinea + this.multimarcaMinimaCompraInicialLinea;

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

      this.detalleTotalCompraInicial = (this.bicicletaMinimaCompraInicial + this.multimarcaMinimaCompraInicial);

      this.actualizarMargenRetroactivo()
      this.actualizarAnualAdicionalPorNivel();
    }
  }

  buscarPoligonoExclusivoPorNivel(){
    if (this.validarDatos()){
      this.calcularDetalleRetroActivo();
    }

    let valorPoligonoExclusivo = this.clasificacionSugerida.valor <= this.clasificacionSeleccionada.valor ? "SI" : "NO"
      this.clasificacionSeleccionada.beneficios_dinamicos = [
        ...this.clasificacionSeleccionada.beneficios_dinamicos.filter(item => item.descripcion != "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO"),
        { descripcion: "EXCLUSIVIDAD EN POLIGONO GEOGRAFICO DESIGNADO", valor: valorPoligonoExclusivo }
      ];
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
      const factorPorcentaje = (item.id === 1) ? 0.11 : 0.15;
      return {
        ...item,
        multimarca_compra_minima_anual: Math.ceil((item.bicicleta_compra_minima_anual * factorPorcentaje) / 5000) * 5000
      };
    })
  }

  inicializarDatosClasificacionDinamica(){
    this.obtenerMultimarcaCompraMinimaAnual();
    this.obtenerBeneficios();
  }
}
