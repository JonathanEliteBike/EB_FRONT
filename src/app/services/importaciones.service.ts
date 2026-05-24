import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProgresoSeccion {
  total: number;
  completados: number;
  pct: number;
}

export interface ProgresoEmbarque {
  logistica: ProgresoSeccion;
  importacion: ProgresoSeccion;
  despacho: ProgresoSeccion;
  odoo: ProgresoSeccion;
  almacen: ProgresoSeccion;
  recepcion: ProgresoSeccion;
  cierre: ProgresoSeccion;
}

export interface Importacion {
  id: number;
  referencia: string;
  nombre: string;
  estado: string;
  via_transporte?: 'MARITIMO' | 'AEREO';
  created_at: string;
  updated_at: string;
  progreso?: ProgresoEmbarque;

  // Logística
  log_fecha_notificacion?: string;
  log_fecha_entrega?: string;
  log_titulo_correo_salida?: string;
  log_titulo_correo_2?: string;
  log_confirmacion_enterado?: string;
  log_origen?: string;
  log_tipo_productos?: string;
  log_fecha_solicitud_cotizaciones?: string;
  log_confirmacion_cotizacion?: string;
  log_costo_flete?: string;
  log_fecha_shipping_instructions?: string;
  log_confirmacion_booking?: string;
  log_fecha_booking?: string;
  log_eta_puerto?: string;
  log_buque?: string;
  log_no_viaje?: string;
  log_puerto_salida?: string;
  log_contenedor?: string;
  log_recepcion_bl_co?: string;
  log_confirmacion_bl_co?: string;
  log_envio_certificado?: string;
  log_certificado_seguro?: string;
  log_recepcion_documentos?: string;
  log_dias_salida_tras_entrega?: number;
  log_dias_transito_maritimo?: number;

  // Importación
  imp_fecha_traduccion?: string;
  imp_fecha_numeros_serie?: string;
  imp_bl_guia?: string;
  imp_co?: string;
  imp_facturas?: string;
  imp_series?: string;
  imp_solicitud_pago_forwarder?: string;
  imp_llegada_contenedor_puerto?: string;
  imp_fecha_limite_cruce?: string;
  imp_dias_libres_almacenaje?: number;
  imp_dias_despacho_aduanero?: number;
  imp_terminal?: string;
  imp_bl_endosado?: string;
  imp_bl_revalidado?: string;
  imp_carta_porte?: string;
  imp_entrega_facturas_aa?: string;
  imp_traduccion_aa?: string;
  imp_entrega_certificado_origen?: string;
  imp_relacion_numeros_serie?: string;
  imp_relacion_incrementables?: string;
  imp_recepcion_draft_pedimento?: string;
  imp_fecha_entrega_docs_aa?: string;
  imp_pedimento_revisado?: string;
  imp_pedimento?: string;
  imp_coves_aa?: string;
  imp_revision_coves?: string;
  imp_aplica_verificacion?: string;
  imp_layout_verificacion?: string;
  imp_envio_layout?: string;
  imp_carta_318?: string;
  imp_carta_incrementables?: string;
  imp_carta_no_previo?: string;
  imp_carta_declaracion_marca?: string;
  imp_carta_aplicacion_uva?: string;
  imp_articulos_verificar?: string;
  imp_liberacion_folios?: string;
  imp_fecha_pago_pedimento?: string;

  // Despacho
  des_solicitud_cita_cruce?: string;
  des_cita_cruce?: string;
  des_fecha_cruce_real?: string;
  des_solicitud_pase_maniobras?: string;
  des_carta_maniobras?: string;
  des_fecha_carta_porte?: string;
  des_fecha_entrega_almacen_prog?: string;
  des_lugar_destino?: string;
  des_llegada_almacen?: string;
  des_dias_transito_terrestre?: number;
  des_solicitud_carta_vacio?: string;
  des_fecha_lavado?: string;
  des_entrega_contenedor_naviera?: string;
  des_dias_sin_demoras?: number;
  des_fecha_limite_naviera?: string;
  des_recepcion_eir?: string;

  // Odoo
  odoo_codificacion?: string;
  odoo_alta_catalogo?: string;
  odoo_alta_precios?: string;
  odoo_alta_orden_compra?: string;
  odoo_folio_orden?: string;

  // Almacén
  alm_base_datos_etiquetas?: string;
  alm_base_datos_verificacion?: string;
  alm_liberacion_etiquetado?: string;
  alm_envio_info_uva?: string;
  alm_liberacion_uva?: string;
  alm_fecha_limite_etiquetado?: string;

  // Recepción
  rec_cedula_costeo?: string;
  rec_recepcion_odoo?: string;
  rec_folio_compra?: string;
  rec_liberacion_verificacion?: string;
  rec_liberacion_final?: string;

  // Cierre
  cie_recepcion_cuenta_gastos?: string;
  cie_saldo_favor_elite?: string;
  cie_liquidado_elite?: string;
  cie_fecha_pago_elite?: string;
  cie_saldo_favor_aa?: string;
  cie_liquidado_aa?: string;
  cie_fecha_pago_aa?: string;

  // Costos
  cos_tipo_cambio_pedimento?: number;
  cos_valor_factura?: number;
  cos_cantidad_bicicletas?: number;
  cos_flete_internacional_usd?: number;
  cos_gastos_forwarder_pesos?: number;
  cos_seguro_pesos?: number;
  cos_custodia_pesos?: number;
  cos_maniobras_pesos?: number;
  cos_cargos_adicionales_pesos?: number;
  cos_honorarios_pesos?: number;
  cos_flete_terrestre_usd?: number;
  cos_pernoctas_usd?: number;
  cos_paquetexpress_usd?: number;
  cos_demoras_usd?: number;
  cos_verificacion_pesos?: number;
  cos_lavado_contenedor_pesos?: number;
  cos_monitoreo_pesos?: number;
  cos_impuestos_pagados_pesos?: number;
  cos_reconocimiento_aduanero?: number;

  notas?: string;
  borradores?: Record<string, Record<string, any>>;
}

@Injectable({ providedIn: 'root' })
export class ImportacionesService {
  private base = `${environment.apiUrl}/importaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Importacion[]> {
    return this.http.get<Importacion[]>(this.base);
  }

  obtener(id: number): Observable<Importacion> {
    return this.http.get<Importacion>(`${this.base}/${id}`);
  }

  crear(data: Partial<Importacion>): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(this.base, data);
  }

  actualizar(id: number, data: Partial<Importacion>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  progresoPct(imp: Importacion): number {
    if (!imp.progreso) return 0;
    const secciones = Object.values(imp.progreso);
    const total = secciones.reduce((s, p) => s + p.total, 0);
    const hechos = secciones.reduce((s, p) => s + p.completados, 0);
    return total ? Math.round((hechos / total) * 100) : 0;
  }
}
