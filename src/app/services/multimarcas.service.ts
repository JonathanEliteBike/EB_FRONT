import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MultimarcasService {

  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getMultimarcas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clientes_multimarcas`);
  }

  actualizarMultimarcas(datos: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/actualizar_multimarcas`, { datos });
  }

  getMultimarcasTodo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/obtener_multimarcas`);
  }

  agregarCliente(cliente: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/agregar_cliente`, cliente);
  }

  editarCliente(id: number, cliente: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/editar_cliente/${id}`, cliente);
  }

  eliminarCliente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/eliminar_cliente/${id}`);
  }

  // En tu multimarcas.service.ts
  obtenerMultimarcasClaves(clave?: string): Observable<any> {
    const params: any = {};
    if (clave) {
      params.clave = clave;
    }

    return this.http.get<any>(`${this.apiUrl}/clientes_multimarcas_claves`, { params });
  }

  buscarClienteMultimarcas(termino: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clientes_multimarcas_buscar?q=${encodeURIComponent(termino)}`);
  }

  getTemporadas(): Observable<{ etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string }[]> {
    return this.http.get<any>(`${this.apiUrl}/temporadas`);
  }

  getTemporadasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/temporadas_disponibles`);
  }

  getDatosMultimarcasHistorico(temporada: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/datos_multimarcas_historico`, { params: { temporada } });
  }

}
