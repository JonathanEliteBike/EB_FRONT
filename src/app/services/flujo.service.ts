import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// --- INTERFACES ---

// 1. Para el Tablero Mensual (Edición celda a celda)
export interface RenglonDashboard {
  id: number;
  concepto: string;
  categoria: string;
  orden: number;
  col_proyectado: number;
  col_real: number;
  col_diferencia: number;
  alerta: string;
}

export interface RespuestaDashboard {
  mes_reporte: string;
  datos: RenglonDashboard[];
}

// 2. Para la Proyección Anual (La vista tipo Excel con Toggle)
// [CAMBIO IMPORTANTE]: Antes 'datos' era number[], ahora es un objeto complejo
export interface DatoCeldaAnual {
  proyectado: number;
  real: number;
  diferencia: number;
}

export interface ProyeccionResponse {
  columnas: string[]; // Fechas ['2025-03-01', ...]
  filas: {
    concepto: string;
    categoria: string;
    datos: DatoCeldaAnual[]; // <--- AQUÍ ESTÁ EL CAMBIO CLAVE
  }[];
}

export interface AuditoriaLog {
  id_auditoria: number;
  nombre_usuario: string;
  accion: string;
  tabla_afectada: string;
  categoria: string;
  descripcion: string;
  fecha_hora: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlujoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/flujo`;

  // ==============================================================
  // 1. LECTURA: TABLERO MENSUAL (Mes específico)
  // ==============================================================
  obtenerTableroMensual(fecha: string): Observable<RespuestaDashboard> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<RespuestaDashboard>(`${this.apiUrl}/tablero-mensual`, { params });
  }

  // ==============================================================
  // 2. LECTURA: PROYECCIÓN ANUAL (Matriz completa)
  // ==============================================================
  obtenerProyeccionAnual(): Observable<ProyeccionResponse> {
    return this.http.get<ProyeccionResponse>(`${this.apiUrl}/proyeccion-anual`);
  }

  // ==============================================================
  // 3. ESCRITURA: GUARDAR VALOR (Con Auditoría automática en Backend)
  // ==============================================================
  guardarValor(idConcepto: number, fecha: string, monto: number, tipo: 'real' | 'proyectado'): Observable<any> {
    const payload = {
      id_concepto: idConcepto,
      fecha: fecha,
      monto: monto,
      tipo: tipo
    };
    return this.http.post(`${this.apiUrl}/guardar-valor`, payload);
  }

  // ==============================================================
  // 4. ESCRITURA: CREAR CONCEPTO (Con Auditoría automática)
  // ==============================================================
  crearConcepto(nombre: string, categoria: string, orden: number): Observable<any> {
    const payload = { nombre, categoria, orden };
    return this.http.post(`${this.apiUrl}/conceptos`, payload);
  }

  obtenerAuditoria(): Observable<AuditoriaLog[]> {
    return this.http.get<AuditoriaLog[]>(`${this.apiUrl}/auditoria`);
  }

  sincronizarOdoo(anio: number, mes: number): Observable<any> {
    const payload = { anio, mes };
    return this.http.post(`${this.apiUrl}/sincronizar-odoo`, payload);
  }

  descargarReporteExcel(inicio?: string, fin?: string): Observable<Blob> {
    let params = '';
    if (inicio && fin) {
      params = `?inicio=${inicio}&fin=${fin}`;
    }
    return this.http.get(`${this.apiUrl}/reporte-excel${params}`, {
      responseType: 'blob'
    });
  }

  verificarPermiso(idUsuario: number): Observable<{ permiso: number, error?: string }> {
    return this.http.get<{ permiso: number, error?: string }>(
      `${this.apiUrl}/verificar-permiso/${idUsuario}`
    );
  }









  // ==================================================================================================================================================================

  // ==============================================================
  // 1. ÓRDENES DE COMPRA (CRUD)
  // ==============================================================
  crearOrden(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ordenes`, data);
  }

  obtenerOrdenes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ordenes`);
  }

  actualizarOrden(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ordenes/${id}`, data);
  }

  eliminarOrden(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ordenes/${id}`);
  }

  // ==============================================================
  // 2. LOGÍSTICA Y EMBARQUES (CRUD)
  // ==============================================================
  crearEmbarque(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/embarques`, data);
  }

  obtenerEmbarques(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/embarques`);
  }

  actualizarEmbarque(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/embarques/${id}`, data);
  }

  eliminarEmbarque(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/embarques/${id}`);
  }

  // ==============================================================
  // 3. GASTOS OPERATIVOS (CRUD)
  // ==============================================================
  crearGasto(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/gastos-operativos`, data);
  }

  obtenerGastos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gastos-operativos`);
  }

  actualizarGasto(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/gastos-operativos/${id}`, data);
  }

  eliminarGasto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/gastos-operativos/${id}`);
  }

  // ==============================================================
  // 4. INGRESOS Y COBRANZA (CRUD)
  // ==============================================================
  crearIngreso(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ingresos`, data);
  }

  obtenerIngresos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ingresos`);
  }

  // Función especial para marcar como "COBRADO"
  marcarIngresoCobrado(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/ingresos/${id}/pagar`, {});
  }

  eliminarIngreso(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ingresos/${id}`);
  }
}
