import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EstatusSolicitud = 'pendiente' | 'validado' | 'rechazado';
export type EstatusDocumento = 'pendiente' | 'valido' | 'rechazado';
// GUÍA: estatus de la nota de crédito, separado del estatus general del
// ticket -- BCYP la captura (queda 'pendiente'), Auditoría la valida con un
// código (ver POST /nota-credito/<id>/validar). null = todavía no capturada.
export type EstatusNotaCredito = 'pendiente' | 'validada' | null;

export interface ArchivoSolicitud {
  key: string;
  url: string | null;
  estatus?: EstatusDocumento;
}

// GUÍA: log de auditoría -- ver _entrada_historial en el backend
// (routes/solicitud_retroactivo.py). Columna JSON, no una tabla aparte.
export interface ItemHistorial {
  fecha: string;
  tipo: 'creacion' | 'validacion' | 'precio' | 'nota_credito' | 'reenvio';
  descripcion: string;
  usuario?: string;
}

export interface SolicitudRetroactivo {
  id: number;
  id_usuario?: number;
  usuario_registro?: string;
  id_formulario: number;
  nombre_formulario: string;
  id_marca_bicicleta: number | null;
  id_msi: number;
  plazo_meses?: number;
  nombre_sucursal: string;
  correo_electronico: string;
  nombre_completo: string;
  fecha_venta: string;
  modelo_bicicleta: string;
  numero_serie: string;
  precio_publico: string;
  porcentaje?: string;
  monto_pagar: string;
  monto_aplicar?: string;
  // GUÍA: el estatus general se deriva de validacion_docs (cualquier archivo
  // rechazado -> solicitud completa 'rechazado'; los 4 en 'valido' -> 'validado').
  estatus: EstatusSolicitud;
  validacion_docs?: Record<string, EstatusDocumento>;
  anio_modelo?: string;
  archivos?: Record<string, ArchivoSolicitud>;
  historial?: ItemHistorial[];
  nota_credito: string
  nota_credito_estatus?: EstatusNotaCredito;
  fecha_registro: string;
}

export interface TotalesGenerales {
  total_solicitudes: number;
  monto_total_pagar: string;
  monto_total_aplicar: string;
  pendientes: number;
  validados: number;
  rechazados: number;
}

export interface GrupoDashboard {
  total_solicitudes: number;
  monto_total?: string;
  monto_total_pagar?: string;
  monto_total_aplicar?: string;
  [key: string]: unknown;
}

export interface DashboardSolicitudRetroactivo {
  totales_generales: TotalesGenerales;
  por_campana: GrupoDashboard[];
  por_cliente: GrupoDashboard[];
  por_anio_modelo: GrupoDashboard[];
  por_producto: GrupoDashboard[];
}

export interface RazonSocial {
  id: number;
  nombre_cliente: string;
  clave?: string;
}

export interface Tienda {
  id: number;
  nombre: string;
  cliente_id: number;
}

export interface FormularioRetroactivo {
  id: number;
  nombre: string;
}

export interface MarcaCampania {
  id: number;
  nombre: string;
}

// GUÍA: producto detalle (variante/SKU) ligado a una campaña -- lo que
// puede elegirse como "Modelo" en el formulario de venta una vez elegida
// la campaña. Mismo shape que ProductoDetalle del catálogo de campañas.
export interface ProductoCampania {
  id: number;
  sku: string;
  modelo: string;
  codigo: string;
  talla: string;
  color: string;
  marca: string | null;
  marca_id: number | null;
}

export interface TotalesDashboardDistribuidor {
  total_solicitudes: number;
  pendientes: number;
  validadas: number;
  rechazadas: number;
  notas_credito_capturadas: number;
  notas_credito_validadas: number;
  bicicletas_aplicadas: number;
  monto_total_estimado?: string;
  monto_total_aplicado?: string;
}

export interface NotaCreditoDistribuidor {
  numero_nota_credito: string;
  estado: 'pendiente' | 'validada';
  cantidad_solicitudes_relacionadas: number;
  monto_asociado_estimado?: string;
}

export interface DashboardDistribuidor {
  totales: TotalesDashboardDistribuidor;
  notas_credito: NotaCreditoDistribuidor[];
  solicitudes: SolicitudRetroactivo[];
}

export interface SerieDisponible {
  numero_serie: string;
  product_id_odoo: number;
  sku: string;
  nombre_producto: string;
  sale_order: string;
  picking: string;
  fecha_entrega: string;
  cantidad_realizada: number;
}

export interface SeriesDisponiblesResponse {
  estado: string;
  series: SerieDisponible[];
}

// GUÍA: HttpClient ya manda el JWT solo (interceptors/auth.interceptor.ts),
// no hace falta armar headers de Authorization a mano aquí.
@Injectable({ providedIn: 'root' })
export class SolicitudRetroactivoService {
  private base = `${environment.apiUrl}/api/solicitud-retroactivo`;

  constructor(private http: HttpClient) {}

  listar(): Observable<SolicitudRetroactivo[]> {
    return this.http.get<SolicitudRetroactivo[]>(`${this.base}/listar`);
  }

  dashboard(): Observable<DashboardSolicitudRetroactivo> {
    return this.http.get<DashboardSolicitudRetroactivo>(`${this.base}/dashboard`);
  }

  validarDocumento(id: number, documento: string, estatus: 'valido' | 'rechazado'): Observable<any> {
    return this.http.post(`${this.base}/validar-documento/${id}`, { documento, estatus });
  }

  corregirPrecio(id: number, precioPublico: number): Observable<any> {
    return this.http.post(`${this.base}/precio/${id}`, { precio_publico: precioPublico });
  }

  corregirNotaCredito(id: number, notaCredito: string): Observable<any> {
    return this.http.post(`${this.base}/nota-credito/${id}`, { nota_credito: notaCredito });
  }

  validarNotaCredito(id: number, codigo: string): Observable<any> {
    return this.http.post(`${this.base}/nota-credito/${id}/validar`, { codigo });
  }

  misSolicitudes(): Observable<SolicitudRetroactivo[]> {
    return this.http.get<SolicitudRetroactivo[]>(`${this.base}/mis-solicitudes`);
  }

  dashboardDistribuidor(): Observable<DashboardDistribuidor> {
    return this.http.get<DashboardDistribuidor>(`${this.base}/dashboard-distribuidor`);
  }

  actualizarVenta(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.base}/venta/${id}`, formData);
  }

  buscarRazonesSociales(): Observable<RazonSocial[]> {
    return this.http.get<RazonSocial[]>(`${this.base}/razones-sociales`);
  }

  buscarTiendas(clienteId: number): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(`${this.base}/tiendas/${clienteId}`);
  }

  buscarFormularios(): Observable<FormularioRetroactivo[]> {
    return this.http.get<FormularioRetroactivo[]>(`${this.base}/formulario`);
  }

  buscarMsiPorCampania(idCampania: number): Observable<{ id: number; plazo_meses: number; porcentaje?: number }[]> {
    return this.http.get<{ id: number; plazo_meses: number; porcentaje?: number }[]>(`${this.base}/campania/${idCampania}/msi`);
  }

  marcasPorCampania(idCampania: number): Observable<MarcaCampania[]> {
    return this.http.get<MarcaCampania[]>(`${this.base}/campania/${idCampania}/marcas`);
  }

  productosPorCampania(idCampania: number): Observable<ProductoCampania[]> {
    return this.http.get<ProductoCampania[]>(`${this.base}/campania/${idCampania}/productos`);
  }

  seriesDisponibles(sku: string): Observable<SeriesDisponiblesResponse> {
    const params = new HttpParams().set('sku', sku);
    return this.http.get<SeriesDisponiblesResponse>(`${this.base}/series-disponibles`, { params });
  }
}
