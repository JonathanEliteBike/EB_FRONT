import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MesData {
  cantidad: number;
  disponible: boolean;
}

export interface DesgloseDist {
  clave_cliente: string;
  nombre_cliente: string;
  total: number;
  meses: Record<string, number>;
}

export interface ArticuloMY27 {
  sku: string;
  producto: string;
  marca: string;
  modelo: string;
  color: string;
  talla: string;
  precio_dist: number | null;
  costo_unitario: number | null;
  costo_total: number | null;
  costos_mes: Record<string, number | null>;
  num_distribuidores: number;
  total_anual: number;
  meses: Record<string, MesData>;
  desglose: DesgloseDist[];
}

export interface KpisMY27 {
  total_articulos: number;
  articulos_con_pedido: number;
  articulos_sin_pedido: number;
  total_unidades: number;
  distribuidores_activos: number;
  skus_con_costo: number;
  inversion_total: number | null;
  inversion_promedio: number | null;
}

export interface ProyeccionesMY27Response {
  articulos: ArticuloMY27[];
  totales_mes: Record<string, number>;
  total_general: number;
  total_costo_mes: Record<string, number | null>;
  total_costo_general: number | null;
  kpis: KpisMY27;
  meses: string[];
  meses_labels: string[];
  periodo: string;
  generado_en: string;
}

// --- Tipos para inventario entrante y cobertura FIFO ---
export interface InventarioMegamoItem {
  sku: string;
  cantidad: number;
  descripcion: string | null;
  subido_en: string;
}

export interface CoberturaItem {
  mes: string;
  proyectado: number;
  cubierto: number;
  deficit: number;
  estado: 'completo' | 'parcial' | 'sin_cobertura' | 'sin_demanda';
}

export interface CoberturaSku {
  sku: string;
  producto: string;
  cantidad_entrante: number;
  odoo_disponible: number;
  total_disponible: number;
  total_proyectado: number;
  total_cubierto: number;
  total_deficit: number;
  sobrante: number;
  cobertura: CoberturaItem[];
}

export interface DetalleDistMes {
  mes: string;
  demanda: number;
  asignado: number;
  pendiente: number;
  pasado?: boolean;
}

export interface DistribucionCliente {
  clave_cliente: string;
  nombre_cliente: string;
  prioridad: number;
  total_demanda: number;
  asignado: number;
  pendiente: number;
  detalle_meses: DetalleDistMes[];
}

export interface DistribucionSku {
  sku: string;
  producto: string;
  odoo_disponible: number;
  cantidad_entrante: number;
  total_disponible: number;
  total_proyectado: number;
  stock_restante: number;
  distribuciones: DistribucionCliente[];
}

export interface DistribucionResponse {
  periodo: string;
  distribuciones: DistribucionSku[];
}

@Injectable({ providedIn: 'root' })
export class ProyeccionesMY27Service {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDatos(periodo = '2026-2027', refresh = false): Observable<ProyeccionesMY27Response> {
    let params = new HttpParams().set('periodo', periodo);
    if (refresh) params = params.set('refresh', '1');
    return this.http.get<ProyeccionesMY27Response>(`${this.api}/proyecciones-my27`, { params });
  }

  exportar(periodo = '2026-2027', marca = ''): Observable<Blob> {
    let params = new HttpParams().set('periodo', periodo);
    if (marca) params = params.set('marca', marca);
    return this.http.get(`${this.api}/proyecciones-my27/exportar`, {
      params,
      responseType: 'blob',
    });
  }

  subirInventarioMegamo(file: File, periodo: string = '2026-2027'): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('periodo', periodo);
    return this.http.post(`${this.api}/proyecciones-my27/inventario-megamo`, form);
  }

  getInventarioMegamo(periodo: string = '2026-2027'): Observable<{ periodo: string; inventario: InventarioMegamoItem[] }> {
    return this.http.get<any>(`${this.api}/proyecciones-my27/inventario-megamo`, {
      params: { periodo }
    });
  }

  getCoberturaMegamo(periodo: string = '2026-2027', refresh = false): Observable<{ periodo: string; cobertura: CoberturaSku[] }> {
    let params: any = { periodo };
    if (refresh) params['refresh'] = '1';
    return this.http.get<any>(`${this.api}/proyecciones-my27/cobertura-megamo`, { params });
  }

  exportarCobertura(periodo = '2026-2027'): Observable<Blob> {
    return this.http.get(`${this.api}/proyecciones-my27/exportar-cobertura`, {
      params: { periodo },
      responseType: 'blob',
    });
  }

  getDistribucionPrioritaria(periodo = '2026-2027'): Observable<DistribucionResponse> {
    return this.http.get<DistribucionResponse>(
      `${this.api}/proyecciones-my27/distribucion-prioritaria`,
      { params: { periodo } }
    );
  }

  generarOrdenOdoo(body: {
    clave_cliente: string;
    mes: string;
    lineas: { sku: string; cantidad: number }[];
  }): Observable<{
    order_id: number;
    order_name: string;
    partner_name: string;
    lineas_creadas: number;
    skus_no_encontrados: string[];
  }> {
    return this.http.post<any>(`${this.api}/proyecciones-my27/generar-orden-odoo`, body);
  }
}
