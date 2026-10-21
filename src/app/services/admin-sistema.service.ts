import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ========================================================================
   MODELOS E INTERFACES DEL MÓDULO DE PERMISOS
   ======================================================================== */

export interface ApiResponse<T = any> {
  respuesta?: boolean;
  mensaje?: string;
  datos?: T;
  id?: number;
  error?: string;
}

export interface AdminClienteItem {
  id: number;
  nombre: string;
  correo: string;
  usuario: string;
  activo: number;
  max_hijos: number;
  hijos_activos?: number;
}

export interface AccionBase {
  id: number;
  nombre: string;
  identificador: string;
  activo: number;
}

export interface AreaItem {
  id: number;
  nombre: string;
  activo: number | boolean;
}

export interface ModuloItem {
  id: number;
  nombre: string;
  identificador: string;
  ruta?: string | null;
  padre_id?: number | null;
  activo: number;
  delegable_a_hijos?: boolean | number;
  area_id?: number | null;
  area_nombre?: string | null;
  areas?: (Pick<AreaItem, 'id' | 'nombre'> & { acciones?: AccionBase[] })[];
  acciones?: AccionBase[];
}

export interface ModuloPayload {
  configurar_area?: boolean;
  crear_asociacion?: boolean;
  actualizar_modulo_global?: boolean;
  nombre: string;
  identificador: string;
  ruta?: string | null;
  padre_id?: number | null;
  delegable_a_hijos?: boolean;
  catalogo_historico_distribuidores?: boolean;
  area_id?: number | null;
  areas_ids?: number[];
  areas_acciones?: Record<string, number[]>;
  acciones_ids?: number[];
}

export interface PermisoInternoEndpointItem {
  id: number;
  ruta_patron: string;
  metodo_http: string;
  modulo_id: number;
  accion_id: number;
  activo: number | boolean;
  modulo_nombre?: string;
  modulo_identificador?: string;
  accion_nombre?: string;
  accion_identificador?: string;
}

export interface PermisoInternoEndpointPayload {
  ruta_patron: string;
  metodo_http: string;
  modulo_id: number;
  accion_id: number;
  activo: boolean;
}

export interface UsuarioInternoItem {
  id: number;
  nombre: string;
  correo: string;
  usuario: string;
  activo: number | boolean;
  area_id?: number | null;
  area_nombre?: string | null;
}

export interface PermisoInternoItem {
  usuario_id: number;
  modulo_id: number;
  accion_id: number;
  area_id?: number | null;
}

export interface PermisosInternosUsuarioResponse {
  permisos: PermisoInternoItem[];
  area: AreaItem | null;
}

export interface UsuarioHijoItem {
  id: number;
  nombre: string;
  correo: string;
  usuario: string;
  activo: number;
  cliente_id?: number;
}

export interface CrearHijoPayload {
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface SiguienteUsuarioHijoResponse {
  usuario: string;
}

export interface PermisoUsuarioItem {
  modulo_id: number;
  modulo: string;
  accion_id: number;
  accion: string;
  identificador?: string;
}

export interface ModuloAccesoItem {
  modulo_id: number;
  modulo: string;
  identificador: string;
  padre_id?: number | null;
}

export interface AmbitoMontosItem {
  id: number;
  identificador: string;
  nombre: string;
  ocultar_montos: boolean | number;
}

export interface ConfiguracionMontosHijo {
  ocultar_montos_global: boolean | number;
  ambitos: AmbitoMontosItem[];
}

export interface CupoResponse {
  tiene_cupo: boolean;
  max_hijos: number;
  hijos_activos: number;
  disponibles: number;
  correo?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminSistemaService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /* ========================================================================
     1. ENDPOINTS DEL ADMINISTRADOR DEL SISTEMA (NIVEL 0)
     ======================================================================== */

  /**
   * Obtiene la lista de Administradores Cliente junto con su estado y cupo de usuarios.
   * GET /api/admin-sistema/administradores
   */
  getAdministradores(): Observable<{ administradores: AdminClienteItem[] }> {
    return this.http.get<{ administradores: AdminClienteItem[] }>(`${this.apiUrl}/admin-sistema/administradores`);
  }

  /**
   * Ajusta el límite máximo de usuarios hijos (max_hijos) para un Administrador Cliente.
   * PUT /api/admin-sistema/administradores/:admin_id/cupo
   */
  actualizarCupoAdmin(adminId: number, maxHijos: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin-sistema/administradores/${adminId}/cupo`, {
      max_hijos: maxHijos
    });
  }

  /**
   * Activa (1) o desactiva (0) el estado de cualquier usuario en el sistema.
   * PATCH /api/admin-sistema/usuarios/:usuario_id/estado
   */
  cambiarEstadoUsuarioGlobal(usuarioId: number, activo: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin-sistema/usuarios/${usuarioId}/estado`, {
      activo
    });
  }

  /**
   * Asigna un permiso a la bolsa delegable de un Administrador Cliente.
   * POST /api/admin-sistema/permisos-delegables/asignar
   */
  asignarPermisoDelegable(administradorId: number, moduloId: number, accionId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-sistema/permisos-delegables/asignar`, {
      administrador_id: administradorId,
      modulo_id: moduloId,
      accion_id: accionId
    });
  }

  /**
   * Retira un permiso de la bolsa delegable de un Administrador Cliente.
   * DELETE /api/admin-sistema/permisos-delegables/revocar
   */
  revocarPermisoDelegable(administradorId: number, moduloId: number, accionId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-sistema/permisos-delegables/revocar`, {
      body: {
        administrador_id: administradorId,
        modulo_id: moduloId,
        accion_id: accionId
      }
    });
  }

  getModulosDelegablesAdministrador(adminId: number): Observable<{ modulos: ModuloAccesoItem[] }> {
    return this.http.get<{ modulos: ModuloAccesoItem[] }>(`${this.apiUrl}/admin-sistema/administradores/${adminId}/modulos-delegables`);
  }
  getModulosHistoricosRol2(): Observable<{ modulos: ModuloItem[] }> {
    return this.http.get<{ modulos: ModuloItem[] }>(`${this.apiUrl}/admin-sistema/modulos-historicos-rol2`);
  }
  getCatalogoModulosDelegables(): Observable<{ modulos: ModuloItem[] }> {
    return this.http.get<{ modulos: ModuloItem[] }>(`${this.apiUrl}/admin-sistema/modulos-delegables/catalogo`);
  }

  actualizarModuloDelegable(moduloId: number, delegableAHijos: boolean): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/admin-sistema/modulos/${moduloId}/delegable-a-hijos`, {
      delegable_a_hijos: delegableAHijos
    });
  }

  asignarModuloDelegable(administradorId: number, moduloId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-sistema/modulos-delegables/asignar`, {
      administrador_id: administradorId, modulo_id: moduloId
    });
  }

  revocarModuloDelegable(administradorId: number, moduloId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-sistema/modulos-delegables/revocar`, {
      body: { administrador_id: administradorId, modulo_id: moduloId }
    });
  }

  getCapacidadesDelegablesAdministrador(adminId: number): Observable<{ capacidades: { capacidad: string }[] }> {
    return this.http.get<{ capacidades: { capacidad: string }[] }>(`${this.apiUrl}/admin-sistema/administradores/${adminId}/capacidades-delegables`);
  }

  asignarCapacidadDelegable(administradorId: number, capacidad: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-sistema/capacidades-delegables/asignar`, { administrador_id: administradorId, capacidad });
  }

  revocarCapacidadDelegable(administradorId: number, capacidad: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-sistema/capacidades-delegables/revocar`, {
      body: { administrador_id: administradorId, capacidad }
    });
  }

  /* ========================================================================
     2. ENDPOINTS DE MÓDULOS Y ACCIONES (CATÁLOGO UNIFICADO 2 EN 1)
     ======================================================================== */

  /**
   * Obtiene el catálogo completo de módulos, submódulos y sus acciones vinculadas.
   * GET /api/modulos
   */
  getModulos(): Observable<{ modulos: ModuloItem[] }> {
    return this.http.get<{ modulos: ModuloItem[] }>(`${this.apiUrl}/modulos`);
  }

  /** Obtiene las áreas disponibles para clasificar módulos internos. */
  getAreasPermisosInternos(): Observable<{ areas: AreaItem[] }> {
    return this.http.get<{ areas: AreaItem[] }>(`${this.apiUrl}/permisos-internos/areas`);
  }

  crearAreaPermisosInternos(nombre: string): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/permisos-internos/areas`, { nombre });
  }

  actualizarAreaPermisosInternos(areaId: number, nombre: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/permisos-internos/areas/${areaId}`, { nombre });
  }

  cambiarEstadoAreaPermisosInternos(areaId: number, activo: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/permisos-internos/areas/${areaId}/estado`, { activo });
  }

  getUsuariosInternos(): Observable<{ usuarios: UsuarioInternoItem[] }> {
    return this.http.get<{ usuarios: UsuarioInternoItem[] }>(`${this.apiUrl}/permisos-internos/usuarios`);
  }

  getPermisosInternosUsuario(usuarioId: number): Observable<PermisosInternosUsuarioResponse> {
    return this.http.get<PermisosInternosUsuarioResponse>(`${this.apiUrl}/permisos-internos/usuario/${usuarioId}`);
  }

  asignarPermisoInterno(usuarioId: number, moduloId: number, areaId: number, accionId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/permisos-internos/asignar`, {
      usuario_id: usuarioId,
      modulo_id: moduloId,
      area_id: areaId,
      accion_id: accionId
    });
  }

  revocarPermisoInterno(usuarioId: number, moduloId: number, areaId: number, accionId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/permisos-internos/revocar`, {
      body: {
        usuario_id: usuarioId,
        modulo_id: moduloId,
        area_id: areaId,
        accion_id: accionId
      }
    });
  }

  getReglasEndpointsInternos(moduloId: number): Observable<{ endpoints: PermisoInternoEndpointItem[] }> {
    return this.http.get<{ endpoints: PermisoInternoEndpointItem[] }>(
      `${this.apiUrl}/permisos-internos/endpoints?modulo_id=${moduloId}`
    );
  }

  crearReglaEndpointInterno(payload: PermisoInternoEndpointPayload): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/permisos-internos/endpoints`, payload);
  }

  actualizarReglaEndpointInterno(reglaId: number, payload: PermisoInternoEndpointPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/permisos-internos/endpoints/${reglaId}`, payload);
  }

  eliminarReglaEndpointInterno(reglaId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/permisos-internos/endpoints/${reglaId}`);
  }

  /**
   * Crea un módulo o submódulo y le asigna sus acciones permitidas.
   * POST /api/modulos
   */
  crearModulo(payload: ModuloPayload): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/modulos`, payload);
  }

  /**
   * Actualiza los datos base de un módulo y reconfigura sus acciones vinculadas.
   * PUT /api/modulos/:modulo_id
   */
  actualizarModulo(moduloId: number, payload: ModuloPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/modulos/${moduloId}`, payload);
  }

  /**
   * Activa (1) o desactiva (0) un módulo (borrado lógico).
   * PATCH /api/modulos/:modulo_id/estado
   */
  cambiarEstadoModulo(moduloId: number, activo: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/modulos/${moduloId}/estado`, { activo });
  }

  /**
   * Elimina permanentemente un módulo y limpia sus relaciones en la BD.
   * DELETE /api/modulos/:modulo_id
   */
  eliminarModulo(moduloId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/modulos/${moduloId}`);
  }

  /** Quita un módulo de una sola área sin eliminar su fila técnica global. */
  eliminarModuloDeArea(moduloId: number, areaId: number, eliminarPermisosAsignados = false): Observable<ApiResponse> {
    const opciones = eliminarPermisosAsignados
      ? { body: { eliminar_permisos_asignados: true } }
      : undefined;
    return this.http.delete<ApiResponse>(`${this.apiUrl}/modulos/${moduloId}/areas/${areaId}`, opciones);
  }

  /**
   * Obtiene la lista global de acciones base (Ver, Crear, Editar, Eliminar, etc.).
   * GET /api/acciones
   */
  getAcciones(): Observable<{ acciones: AccionBase[] }> {
    return this.http.get<{ acciones: AccionBase[] }>(`${this.apiUrl}/acciones`);
  }

  /**
   * Crea una nueva acción base global.
   * POST /api/acciones
   */
  crearAccion(nombre: string, identificador: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/acciones`, { nombre, identificador });
  }

  /**
   * Activa (1) o desactiva (0) una acción base.
   * PATCH /api/acciones/:accion_id/estado
   */
  cambiarEstadoAccion(id: number, activo: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/acciones/${id}/estado`, { activo });
  }

  /**
   * Elimina permanentemente una acción base.
   * DELETE /api/acciones/:accion_id
   */
  eliminarAccion(accionId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/acciones/${accionId}`);
  }

  /* ========================================================================
     3. ENDPOINTS DE ADMINISTRADOR CLIENTE / DISTRIBUIDOR (NIVEL 1)
     ======================================================================== */

  /**
   * Consulta la disponibilidad de cupos de un Administrador Cliente.
   * GET /api/usuarios-hijos/cupo
   */
  getCupoPadre(): Observable<CupoResponse> {
    return this.http.get<CupoResponse>(`${this.apiUrl}/usuarios-hijos/cupo`);
  }

  /**
   * Obtiene la lista de usuarios hijos creados por un distribuidor.
   * GET /api/usuarios-hijos
   */
  getUsuariosHijos(): Observable<{ usuarios: UsuarioHijoItem[] }> {
    return this.http.get<{ usuarios: UsuarioHijoItem[] }>(`${this.apiUrl}/usuarios-hijos`);
  }

  /**
   * Crea un usuario hijo verificando disponibilidad de cupo e heredando el cliente_id.
   * POST /api/usuarios-hijos
   */
  crearUsuarioHijo(payload: CrearHijoPayload): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/usuarios-hijos`, payload);
  }

  /** Previsualización no reservada; el backend vuelve a calcular al crear. */
  getSiguienteUsuarioHijo(): Observable<SiguienteUsuarioHijoResponse> {
    return this.http.get<SiguienteUsuarioHijoResponse>(`${this.apiUrl}/usuarios-hijos/siguiente-usuario`);
  }

  /**
   * Activa o desactiva un usuario hijo.
   * PATCH /api/usuarios-hijos/:hijo_id/estado
   */
  cambiarEstadoHijo(hijoId: number, activo: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/usuarios-hijos/${hijoId}/estado`, {
      activo
    });
  }

  /**
   * Reestablece la contraseña de un usuario hijo.
   * PATCH /api/usuarios-hijos/:hijo_id/contrasena
   */
  cambiarContrasenaHijo(hijoId: number, contrasena: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/usuarios-hijos/${hijoId}/contrasena`, {
      contrasena
    });
  }

  /**
   * Consulta, como rol 1, la bolsa delegable del Administrador Cliente seleccionado.
   * GET /api/admin-sistema/administradores/:admin_id/permisos-delegables
   */
  getPermisosDelegablesAdministrador(adminId: number): Observable<{ permisos_delegables: PermisoUsuarioItem[] }> {
    return this.http.get<{ permisos_delegables: PermisoUsuarioItem[] }>(
      `${this.apiUrl}/admin-sistema/administradores/${adminId}/permisos-delegables`
    );
  }

  /**
   * Consulta la bolsa delegable del distribuidor autenticado.
   * GET /api/permisos/delegables
   */
  getMisPermisosDelegables(): Observable<{ permisos_delegables: PermisoUsuarioItem[] }> {
    return this.http.get<{ permisos_delegables: PermisoUsuarioItem[] }>(`${this.apiUrl}/permisos/delegables`);
  }

  getMisModulosDelegables(): Observable<{ modulos: ModuloAccesoItem[] }> {
    return this.http.get<{ modulos: ModuloAccesoItem[] }>(`${this.apiUrl}/permisos/modulos-delegables`);
  }

  getModulosUsuarioHijo(hijoId: number): Observable<{ modulos: ModuloAccesoItem[] }> {
    return this.http.get<{ modulos: ModuloAccesoItem[] }>(`${this.apiUrl}/permisos/modulos/usuario/${hijoId}`);
  }

  asignarModuloHijo(hijoId: number, moduloId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/permisos/modulos/asignar`, { hijo_id: hijoId, modulo_id: moduloId });
  }

  revocarModuloHijo(hijoId: number, moduloId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/permisos/modulos/revocar`, { body: { hijo_id: hijoId, modulo_id: moduloId } });
  }

  getMisCapacidadesDelegables(): Observable<{ capacidades: { capacidad: string }[] }> {
    return this.http.get<{ capacidades: { capacidad: string }[] }>(`${this.apiUrl}/permisos/capacidades-delegables`);
  }

  getCapacidadesUsuarioHijo(hijoId: number): Observable<{ capacidades: { capacidad: string }[] }> {
    return this.http.get<{ capacidades: { capacidad: string }[] }>(`${this.apiUrl}/permisos/capacidades/usuario/${hijoId}`);
  }

  asignarCapacidadHijo(hijoId: number, capacidad: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/permisos/capacidades/asignar`, { hijo_id: hijoId, capacidad });
  }

  revocarCapacidadHijo(hijoId: number, capacidad: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/permisos/capacidades/revocar`, { body: { hijo_id: hijoId, capacidad } });
  }

  getConfiguracionMontosHijo(hijoId: number): Observable<ConfiguracionMontosHijo> {
    return this.http.get<ConfiguracionMontosHijo>(`${this.apiUrl}/permisos/montos/usuario/${hijoId}`);
  }

  actualizarOcultarMontosGlobalHijo(hijoId: number, ocultarMontosGlobal: boolean): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/permisos/montos/usuario/${hijoId}/global`, {
      ocultar_montos_global: ocultarMontosGlobal
    });
  }

  actualizarOcultarMontosAmbitoHijo(hijoId: number, ambitoIdentificador: string, ocultarMontos: boolean): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/permisos/montos/usuario/${hijoId}/ambito`, {
      ambito_identificador: ambitoIdentificador,
      ocultar_montos: ocultarMontos
    });
  }

  /**
   * Consulta los permisos asignados actualmente a un usuario hijo.
   * GET /api/permisos/usuario/:hijo_id
   */
  getPermisosUsuarioHijo(hijoId: number): Observable<{ permisos: PermisoUsuarioItem[] }> {
    return this.http.get<{ permisos: PermisoUsuarioItem[] }>(`${this.apiUrl}/permisos/usuario/${hijoId}`);
  }

  /**
   * Asigna un permiso de la bolsa delegable a un usuario hijo.
   * POST /api/permisos/asignar
   */
  asignarPermisoHijo(hijoId: number, moduloId: number, accionId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/permisos/asignar`, {
      hijo_id: hijoId,
      modulo_id: moduloId,
      accion_id: accionId
    });
  }

  /**
   * Revoca un permiso previamente asignado a un usuario hijo.
   * DELETE /api/permisos/revocar
   */
  revocarPermisoHijo(hijoId: number, moduloId: number, accionId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/permisos/revocar`, {
      body: {
        hijo_id: hijoId,
        modulo_id: moduloId,
        accion_id: accionId
      }
    });
  }

  /**
   * Elimina un usuario hijo (Rol 3)
   */
  eliminarUsuarioHijo(hijoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios-hijos/${hijoId}`);
  }

  /**
   * Consulta el correo electrónico del administrador directamente desde la BD
   */
  getCorreoPadre(padreId: number): Observable<{ correo: string }> {
    return this.http.get<{ correo: string }>(`${this.apiUrl}/usuarios-hijos/correo-padre/${padreId}`);
  }
}
