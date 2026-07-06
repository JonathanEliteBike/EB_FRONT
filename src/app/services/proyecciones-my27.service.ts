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
  precio_dist: number;
  costo_unitario: number;
  costo_total: number;
  costos_mes: Record<string, number>;
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
  inversion_total: number;
  inversion_promedio: number;
}

export interface ProyeccionesMY27Response {
  articulos: ArticuloMY27[];
  totales_mes: Record<string, number>;
  total_general: number;
  total_costo_mes: Record<string, number>;
  total_costo_general: number;
  kpis: KpisMY27;
  meses: string[];
  meses_labels: string[];
  periodo: string;
  generado_en: string;
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

  getExportUrl(periodo = '2026-2027', marca = ''): string {
    const m = marca ? `&marca=${marca}` : '';
    return `${this.api}/proyecciones-my27/exportar?periodo=${periodo}${m}`;
  }
}
