import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AdminSistemaService, UsuarioHijoItem, CupoResponse } from '../../../services/admin-sistema.service';
import { AuthService } from '../../../services/auth.service';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { AccesoRestringidoComponent } from '../../../components/acceso-restringido/acceso-restringido.component';

export interface AccionNodo {
  accion_id: number;
  nombre: string;
  asignado: boolean;
}

export interface ModuloNodo {
  modulo_id: number;
  padre_id?: number | null;
  nombre: string;
  identificador: string;
  es_raiz: boolean;
  acciones: AccionNodo[];
}

@Component({
  selector: 'app-creacion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, AccesoRestringidoComponent, TopBarUsuariosComponent],
  templateUrl: './creacion-usuarios.component.html',
  styleUrl: './creacion-usuarios.component.css'
})
export class CreacionUsuariosComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);
  private readonly authService = inject(AuthService);

  modulo = "Gestión de usuarios";
  permisoNombre = "usuarios_creacion_usuarios/ver";

  cargando: boolean = false;
  alertMsj: string | null = null;
  alertTipo: 'success' | 'error' = 'success';

  cupo: CupoResponse | null = null;
  usuariosHijos: UsuarioHijoItem[] = [];

  // Modal Crear Usuario
  modalCrearVisible: boolean = false;
  formNombre: string = '';
  formCorreo: string = '';
  formUsuario: string = '';
  formContrasena: string = '';

  // Modal Cambiar Contraseña
  modalPassVisible: boolean = false;
  usuarioSeleccionadoId: number | null = null;
  formNuevaContrasena: string = '';

  // Modal Confirmación de Eliminación
  mostrarConfirmacion: boolean = false;
  usuarioAEliminar: UsuarioHijoItem | null = null;

  // Modal Asignación de Permisos (Árbol)
  modalPermisosVisible: boolean = false;
  cargandoPermisos: boolean = false;
  guardandoPermisos: boolean = false;
  hijoSeleccionado: UsuarioHijoItem | null = null;
  treePermisos: ModuloNodo[] = [];
  modulosExpandidos = new Set<number>();
  private estadoInicial: Map<string, boolean> = new Map();

  ngOnInit(): void {
    if (this.tieneAcceso) {
      this.cargarDatos();
    }
  }

  get tieneAcceso(): boolean {
    return this.authService.tienePermiso(this.permisoNombre);
  }

  get puedeCrear(): boolean {
    if (!this.cupo) return false;
    return Boolean(this.cupo.tiene_cupo) && this.cupo.disponibles > 0;
  }

  cargarDatos(): void {
    this.cargando = true;

    this.adminService.getCupoPadre().subscribe({
      next: (resCupo) => {
        this.cupo = resCupo;
        this.adminService.getUsuariosHijos().subscribe({
          next: (resHijos) => {
            this.usuariosHijos = resHijos.usuarios || [];
            this.cargando = false;
          },
          error: () => {
            this.cargando = false;
            this.mostrarAlerta('Error al obtener el listado de usuarios.', 'error');
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.mostrarAlerta('Error al consultar disponibilidad de cupo.', 'error');
      }
    });
  }

  // --- CONTROL DE ÁRBOL JERÁRQUICO ---
  toggleExpandir(id: number): void {
    if (this.modulosExpandidos.has(id)) {
      this.modulosExpandidos.delete(id);
    } else {
      this.modulosExpandidos.add(id);
    }
  }

  isExpandido(id: number): boolean {
    return this.modulosExpandidos.has(id);
  }

  get modulosRaiz(): ModuloNodo[] {
    return this.treePermisos.filter(m => m.es_raiz);
  }

  getSubmodulos(padreId: number): ModuloNodo[] {
    return this.treePermisos.filter(m => !m.es_raiz && (m.padre_id === padreId || (padreId === 7 && m.modulo_id === 8)));
  }

  abrirModalCrear(): void {
    if (!this.puedeCrear) {
      this.mostrarAlerta('Has alcanzado el límite máximo de usuarios permitidos o no tienes cupos asignados.', 'error');
      return;
    }

    this.limpiarFormularioCrear();
    this.modalCrearVisible = true;
  }

  cerrarModal(): void {
    this.modalCrearVisible = false;
    this.limpiarFormularioCrear();
  }

  guardarNuevoUsuario(): void {
    if (!this.puedeCrear) {
      this.mostrarAlerta('No tienes cupos disponibles para crear más usuarios.', 'error');
      return;
    }

    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formUsuario.trim() || !this.formContrasena.trim()) {
      this.mostrarAlerta('Todos los campos son obligatorios.', 'error');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.formCorreo.trim())) {
      this.mostrarAlerta('Ingresa un correo electrónico válido para el usuario hijo.', 'error');
      return;
    }

    this.adminService.crearUsuarioHijo({
      nombre: this.formNombre.trim(),
      correo: this.formCorreo.trim(),
      usuario: this.formUsuario.trim(),
      contrasena: this.formContrasena.trim()
    }).subscribe({
      next: () => {
        this.mostrarAlerta('Usuario hijo creado exitosamente.', 'success');
        this.cerrarModal();
        this.cargarDatos();
      },
      error: (err) => this.mostrarAlerta(this.obtenerMensajeErrorCreacion(err), 'error')
    });
  }

  private limpiarFormularioCrear(): void {
    this.formNombre = '';
    this.formCorreo = '';
    this.formUsuario = '';
    this.formContrasena = '';
  }

  private obtenerMensajeErrorCreacion(err: any): string {
    const mensaje = err?.error?.error;
    if (mensaje) return mensaje;
    if (err?.status >= 500) return 'Ocurrió un error del servidor al crear el usuario hijo.';
    return 'Los datos del usuario hijo no son válidos.';
  }

  cambiarEstado(hijo: UsuarioHijoItem, nuevoEstado: number): void {
    this.adminService.cambiarEstadoHijo(hijo.id, nuevoEstado).subscribe({
      next: () => {
        hijo.activo = nuevoEstado;
        this.mostrarAlerta(`Usuario ${nuevoEstado === 1 ? 'activado' : 'desactivado'}.`, 'success');
        this.cargarDatos();
      },
      error: (err) => this.mostrarAlerta(err.error?.error || 'Error al cambiar estado.', 'error')
    });
  }

  // --- ELIMINACIÓN DE USUARIO HIJO ---
  confirmarEliminacion(hijo: UsuarioHijoItem): void {
    this.usuarioAEliminar = hijo;
    this.mostrarConfirmacion = true;
  }

  cancelarEliminacion(): void {
    this.usuarioAEliminar = null;
    this.mostrarConfirmacion = false;
  }

  eliminarUsuarioHijo(): void {
    if (!this.usuarioAEliminar) return;

    this.adminService.eliminarUsuarioHijo(this.usuarioAEliminar.id).subscribe({
      next: () => {
        this.mostrarAlerta('Usuario eliminado permanentemente.', 'success');
        this.cancelarEliminacion();
        this.cargarDatos();
      },
      error: (err) => {
        this.mostrarAlerta(err.error?.error || 'Error al eliminar el usuario.', 'error');
      }
    });
  }

  // --- MODAL CAMBIAR CONTRASEÑA ---
  abrirModalContrasena(hijoId: number): void {
    this.usuarioSeleccionadoId = hijoId;
    this.formNuevaContrasena = '';
    this.modalPassVisible = true;
  }

  cerrarModalContrasena(): void {
    this.modalPassVisible = false;
    this.usuarioSeleccionadoId = null;
  }

  guardarNuevaContrasena(): void {
    if (!this.usuarioSeleccionadoId) return;
    if (!this.formNuevaContrasena.trim()) {
      this.mostrarAlerta('Ingresa la nueva contraseña.', 'error');
      return;
    }

    this.adminService.cambiarContrasenaHijo(this.usuarioSeleccionadoId, this.formNuevaContrasena.trim()).subscribe({
      next: () => {
        this.mostrarAlerta('Contraseña actualizada correctamente.', 'success');
        this.cerrarModalContrasena();
      },
      error: () => this.mostrarAlerta('Error al cambiar contraseña.', 'error')
    });
  }

  // --- MODAL ASIGNACIÓN DE PERMISOS ---
  abrirModalPermisos(hijo: UsuarioHijoItem): void {
    this.hijoSeleccionado = hijo;
    this.modalPermisosVisible = true;
    this.cargarPermisosHijo();
  }

  cerrarModalPermisos(): void {
    this.modalPermisosVisible = false;
    this.hijoSeleccionado = null;
    this.treePermisos = [];
    this.modulosExpandidos.clear();
    this.estadoInicial.clear();
  }

  cargarPermisosHijo(): void {
    if (!this.hijoSeleccionado) return;
    this.cargandoPermisos = true;
    this.modulosExpandidos.clear();

    this.adminService.getMisPermisosDelegables().subscribe({
      next: (resDelegables: any) => {
        const rawDelegables = resDelegables.permisos_delegables || [];

        // Filtro de seguridad: Excluir módulos de creación o administración de usuarios para los hijos (Rol 3)
        const delegables = rawDelegables.filter((item: any) => {
          const modIdentificador = (item.identificador || '').toLowerCase();
          const modNombre = (item.modulo || item.nombre || '').toLowerCase();
          return !modIdentificador.includes('creacion_usuarios') &&
                 !modIdentificador.includes('usuarios_creacion_usuarios') &&
                 !modNombre.includes('creacion usuarios') &&
                 !modNombre.includes('gestión de usuarios');
        });

        this.adminService.getPermisosUsuarioHijo(this.hijoSeleccionado!.id).subscribe({
          next: (resHijo: any) => {
            this.cargandoPermisos = false;
            const asignadosHijo = resHijo.permisos || [];
            const modMap = new Map<number, ModuloNodo>();
            this.estadoInicial.clear();

            delegables.forEach((item: any) => {
              const modId = item.modulo_id || item.id;
              const modNombre = item.modulo || item.nombre;
              const modIdentificador = item.identificador || modNombre.toLowerCase().trim().replace(/\s+de\s+/g, '_').replace(/\s+/g, '_');
              const padreIdNode = item.padre_id ? Number(item.padre_id) : (modId === 8 ? 7 : null);

              let esRaiz = true;
              if (item.es_raiz !== undefined && item.es_raiz !== null) {
                esRaiz = Boolean(item.es_raiz);
              } else if (padreIdNode && padreIdNode > 0) {
                esRaiz = false;
              }

              if (!modMap.has(modId)) {
                modMap.set(modId, {
                  modulo_id: modId,
                  padre_id: padreIdNode,
                  nombre: modNombre,
                  identificador: modIdentificador,
                  es_raiz: esRaiz,
                  acciones: []
                });

                if (esRaiz) {
                  this.modulosExpandidos.add(modId);
                }
              }

              const moduloObj = modMap.get(modId)!;
              const actId = item.accion_id;
              const actNombre = item.accion;

              if (actId) {
                const estaAsignado = asignadosHijo.some((h: any) =>
                  (h.modulo_id === modId || h.id === modId) &&
                  (h.accion_id === actId || h.accion === actNombre)
                );

                this.estadoInicial.set(`${modId}_${actId}`, estaAsignado);

                if (!moduloObj.acciones.some(a => a.accion_id === actId)) {
                  moduloObj.acciones.push({
                    accion_id: actId,
                    nombre: actNombre,
                    asignado: estaAsignado
                  });
                }
              }
            });

            this.treePermisos = Array.from(modMap.values());
          },
          error: () => {
            this.cargandoPermisos = false;
            this.mostrarAlerta('Error al consultar permisos del usuario hijo.', 'error');
          }
        });
      },
      error: () => {
        this.cargandoPermisos = false;
        this.mostrarAlerta('Error al obtener la bolsa delegable del administrador.', 'error');
      }
    });
  }

  guardarPermisos(): void {
    if (!this.hijoSeleccionado) return;
    this.guardandoPermisos = true;

    const peticiones: Observable<any>[] = [];

    this.treePermisos.forEach(m => {
      m.acciones.forEach(a => {
        const key = `${m.modulo_id}_${a.accion_id}`;
        const estadoOriginal = !!this.estadoInicial.get(key);

        if (a.asignado !== estadoOriginal) {
          if (a.asignado) {
            peticiones.push(
              this.adminService.asignarPermisoHijo(this.hijoSeleccionado!.id, m.modulo_id, a.accion_id)
            );
          } else {
            peticiones.push(
              this.adminService.revocarPermisoHijo(this.hijoSeleccionado!.id, m.modulo_id, a.accion_id)
            );
          }
        }
      });
    });

    if (peticiones.length === 0) {
      this.mostrarAlerta('No se realizaron cambios en los permisos.', 'success');
      this.guardandoPermisos = false;
      this.cerrarModalPermisos();
      return;
    }

    forkJoin(peticiones).subscribe({
      next: () => {
        this.guardandoPermisos = false;
        this.mostrarAlerta('Permisos actualizados correctamente.', 'success');
        this.cerrarModalPermisos();
      },
      error: () => {
        this.guardandoPermisos = false;
        this.mostrarAlerta('Error al guardar algunos permisos.', 'error');
      }
    });
  }

  mostrarAlerta(msj: string, tipo: 'success' | 'error'): void {
    this.alertMsj = msj;
    this.alertTipo = tipo;
    setTimeout(() => (this.alertMsj = null), 4000);
  }

  regresar(): void {
    window.history.back();
  }
}
