import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  obtenerUsuarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios`);
  }

  crearUsuario(usuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, usuario);
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  actualizarUsuario(id: number, usuarioData: {
    usuario?: string;
    contrasena?: string;
    nombre: string;
    correo?: string;
    rol: 'Administrador' | 'Usuario';
  }): Observable<any> {
    console.log('Datos para actualizar:', usuarioData);
    return this.http.put(`${this.apiUrl}/usuarios/${id}`, usuarioData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  getGruposIntegrales(): Observable<{ id: number; nombre_grupo: string }[]> {
    return this.http.get<{ id: number; nombre_grupo: string }[]>(`${this.apiUrl}/integrales/grupos`);
  }

  getClientesPorGrupo(idGrupo: number): Observable<{ id: number; clave: string; nombre_cliente: string }[]> {
    return this.http.get<{ id: number; clave: string; nombre_cliente: string }[]>(
      `${this.apiUrl}/clientes/por-grupo/${idGrupo}`
    );
  }

  /** Devuelve todos los usuarios enriquecidos con clave, id_grupo y nombre_grupo
   *  para el Monitor de Pedidos (solo admins). */
  getUsuariosParaMonitor(): Observable<{
    id: number | null; id_cliente: number | null; nombre: string; usuario: string | null; rol: string;
    activo: boolean; clave: string | null; id_grupo: number | null; nombre_grupo: string | null;
    tiene_proyeccion: boolean;
  }[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/para-monitor`);
  }

  /** Sincroniza partners de Odoo a la tabla local clientes. */
  syncClientesOdoo(): Observable<{ agregados: number; ya_existian: number; total_odoo: number; total_monitor: number; enlazados: number; sin_match: number }> {
    return this.http.post<{ agregados: number; ya_existian: number; total_odoo: number; total_monitor: number; enlazados: number; sin_match: number }>(
      `${this.apiUrl}/usuarios/sync-odoo`, {}
    );
  }
}