import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concat, forkJoin, last, Observable } from 'rxjs';
import { AdminSistemaService, UsuarioHijoItem, CupoResponse, AmbitoMontosItem } from '../../../services/admin-sistema.service';
import { AuthService } from '../../../services/auth.service';
import { AlertaService } from '../../../services/alerta.service';
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
  esAccesoModulo?: boolean;
  asignado?: boolean;
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
  private readonly alertaService = inject(AlertaService);

  modulo = "Gestión de usuarios";
  permisoNombre = "usuarios_creacion_usuarios/ver";

  cargando: boolean = false;

  cupo: CupoResponse | null = null;
  usuariosHijos: UsuarioHijoItem[] = [];

  // Modal Crear Usuario
  modalCrearVisible: boolean = false;
  formNombre: string = '';
  formCorreo: string = '';
  formUsuario: string = '';
  formContrasena: string = '';
  cargandoSiguienteUsuario = false;
  errorSiguienteUsuario: string | null = null;

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
  ocultarMontosGlobal = true;
  ambitosMontos: AmbitoMontosItem[] = [];
  private ocultarMontosGlobalInicial = true;
  private estadosAmbitosIniciales = new Map<string, boolean>();
  private cargaPermisosId = 0;

  ngOnInit(): void {
    if (this.tieneAcceso) {
      this.cargarDatos();
    }
  }

  get tieneAcceso(): boolean {
    return this.authService.tieneModulo('usuarios_creacion_usuarios');
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
    const modulosDisponibles = new Set(this.treePermisos.map(m => m.modulo_id));
    return this.treePermisos.filter(m => !m.padre_id || !modulosDisponibles.has(m.padre_id));
  }

  get puedeGuardarNuevoUsuario(): boolean {
    return this.puedeCrear && !this.cargandoSiguienteUsuario && !this.errorSiguienteUsuario && Boolean(this.formUsuario);
  }

  getSubmodulos(padreId: number): ModuloNodo[] {
    return this.treePermisos.filter(m => m.padre_id === padreId);
  }

  abrirModalCrear(): void {
    if (!this.puedeCrear) {
      this.mostrarAlerta('Has alcanzado el límite máximo de usuarios permitidos o no tienes cupos asignados.', 'error');
      return;
    }

    this.limpiarFormularioCrear();
    this.modalCrearVisible = true;
    this.cargandoSiguienteUsuario = true;
    this.adminService.getSiguienteUsuarioHijo().subscribe({
      next: ({ usuario }) => {
        this.formUsuario = usuario;
        this.cargandoSiguienteUsuario = false;
      },
      error: (err) => {
        this.cargandoSiguienteUsuario = false;
        const mensaje = err?.error?.error || 'No fue posible generar el usuario automático.';
        this.errorSiguienteUsuario = mensaje;
        this.mostrarAlerta(mensaje, 'error');
      }
    });
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

    if (!this.puedeGuardarNuevoUsuario) {
      this.mostrarAlerta(this.errorSiguienteUsuario || 'Espera a que se genere el usuario automático.', 'error');
      return;
    }

    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formContrasena.trim()) {
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
    this.cargandoSiguienteUsuario = false;
    this.errorSiguienteUsuario = null;
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
    this.reiniciarEstadoPermisos();
    this.modalPermisosVisible = true;
    this.cargarPermisosHijo();
  }

  cerrarModalPermisos(): void {
    this.cargaPermisosId++;
    this.modalPermisosVisible = false;
    this.hijoSeleccionado = null;
    this.reiniciarEstadoPermisos();
  }

  private reiniciarEstadoPermisos(): void {
    this.treePermisos = [];
    this.modulosExpandidos.clear();
    this.estadoInicial.clear();
    this.ocultarMontosGlobal = true;
    this.ocultarMontosGlobalInicial = true;
    this.ambitosMontos = [];
    this.estadosAmbitosIniciales.clear();
  }

  cargarPermisosHijo(): void {
    if (!this.hijoSeleccionado) return;
    const hijoId = this.hijoSeleccionado.id;
    const cargaActual = ++this.cargaPermisosId;
    this.cargandoPermisos = true;

    forkJoin({
      delegablesAntiguos: this.adminService.getMisPermisosDelegables(),
      permisosAntiguosHijo: this.adminService.getPermisosUsuarioHijo(hijoId),
      modulosDelegables: this.adminService.getMisModulosDelegables(),
      modulosHijo: this.adminService.getModulosUsuarioHijo(hijoId),
      configuracionMontos: this.adminService.getConfiguracionMontosHijo(hijoId)
    }).subscribe({
      next: (respuesta: any) => {
        if (cargaActual !== this.cargaPermisosId || this.hijoSeleccionado?.id !== hijoId) return;
        this.construirMatrizPermisos(respuesta);
      },
      error: (err) => {
        if (cargaActual !== this.cargaPermisosId || this.hijoSeleccionado?.id !== hijoId) return;
        this.cargandoPermisos = false;
        this.treePermisos = [];
        this.mostrarAlerta(err.error?.error || 'No se pudieron cargar los accesos del usuario hijo.', 'error');
      }
    });
  }

  private construirMatrizPermisos(respuesta: any): void {
    const asignadosHijo = respuesta.permisosAntiguosHijo.permisos || [];
    const modMap = new Map<number, ModuloNodo>();
    this.estadoInicial.clear();
    const modulosDelegables = respuesta.modulosDelegables.modulos || [];
    const idsDeModulosNuevos = new Set<number>(
      modulosDelegables.map((modulo: any) => modulo.modulo_id)
    );

    // La matriz heredada queda sólo para módulos aún no migrados al acceso por módulo.
    (respuesta.delegablesAntiguos.permisos_delegables || [])
      .filter((item: any) => {
        return !idsDeModulosNuevos.has(item.modulo_id);
      })
      .forEach((item: any) => {
        const moduloId = item.modulo_id;
        const padreId = item.padre_id ? Number(item.padre_id) : null;
        if (!modMap.has(moduloId)) {
          modMap.set(moduloId, {
            modulo_id: moduloId,
            padre_id: padreId,
            nombre: item.modulo,
            identificador: item.identificador || '',
            es_raiz: !padreId,
            acciones: []
          });
          this.modulosExpandidos.add(moduloId);
        }

        const asignado = asignadosHijo.some((permiso: any) =>
          permiso.modulo_id === moduloId && permiso.accion_id === item.accion_id
        );
        this.estadoInicial.set(`${moduloId}_${item.accion_id}`, asignado);
        modMap.get(moduloId)!.acciones.push({
          accion_id: item.accion_id,
          nombre: item.accion,
          asignado
        });
      });

    modulosDelegables.forEach((modulo: any) => {
      const asignado = (respuesta.modulosHijo.modulos || [])
        .some((moduloHijo: any) => moduloHijo.modulo_id === modulo.modulo_id);
      this.estadoInicial.set(`modulo_${modulo.modulo_id}`, asignado);
      modMap.set(modulo.modulo_id, {
        modulo_id: modulo.modulo_id,
        padre_id: modulo.padre_id || null,
        nombre: modulo.modulo,
        identificador: modulo.identificador,
        es_raiz: !modulo.padre_id,
        acciones: [],
        esAccesoModulo: true,
        asignado
      });
      this.modulosExpandidos.add(modulo.modulo_id);
    });

    const configuracionMontos = respuesta.configuracionMontos || {};
    this.ocultarMontosGlobal = !!configuracionMontos.ocultar_montos_global;
    this.ocultarMontosGlobalInicial = this.ocultarMontosGlobal;
    this.ambitosMontos = (configuracionMontos.ambitos || []).map((ambito: AmbitoMontosItem) => ({
      ...ambito,
      ocultar_montos: !!ambito.ocultar_montos
    }));
    this.estadosAmbitosIniciales = new Map(
      this.ambitosMontos.map(ambito => [ambito.identificador, !!ambito.ocultar_montos])
    );
    this.treePermisos = Array.from(modMap.values());
    this.cargandoPermisos = false;
  }

  puedeModificarModulo(modulo: ModuloNodo): boolean {
    if (!modulo.esAccesoModulo || !modulo.padre_id) return true;
    const padre = this.treePermisos.find(item => item.modulo_id === modulo.padre_id);
    return !padre?.esAccesoModulo || !!padre.asignado;
  }

  guardarPermisos(): void {
    if (!this.hijoSeleccionado) return;
    this.guardandoPermisos = true;

    const cambios: { peticion: Observable<any>, prioridad: number }[] = [];

    this.treePermisos.forEach(m => {
      if (m.esAccesoModulo) {
        const estadoOriginal = !!this.estadoInicial.get(`modulo_${m.modulo_id}`);
        if (m.asignado !== estadoOriginal) {
          cambios.push({
            peticion: m.asignado
              ? this.adminService.asignarModuloHijo(this.hijoSeleccionado!.id, m.modulo_id)
              : this.adminService.revocarModuloHijo(this.hijoSeleccionado!.id, m.modulo_id),
            prioridad: 0
          });
        }
        return;
      }

      m.acciones.forEach(a => {
        const key = `${m.modulo_id}_${a.accion_id}`;
        const estadoOriginal = !!this.estadoInicial.get(key);

        if (a.asignado !== estadoOriginal) {
          if (a.asignado) {
            cambios.push({ peticion: this.adminService.asignarPermisoHijo(this.hijoSeleccionado!.id, m.modulo_id, a.accion_id), prioridad: 2 });
          } else {
            cambios.push({ peticion: this.adminService.revocarPermisoHijo(this.hijoSeleccionado!.id, m.modulo_id, a.accion_id), prioridad: 2 });
          }
        }
      });
    });

    if (this.ocultarMontosGlobal !== this.ocultarMontosGlobalInicial) {
      cambios.push({
        peticion: this.adminService.actualizarOcultarMontosGlobalHijo(
          this.hijoSeleccionado.id, this.ocultarMontosGlobal
        ),
        prioridad: 1
      });
    }

    this.ambitosMontos.forEach(ambito => {
      const estadoOriginal = this.estadosAmbitosIniciales.get(ambito.identificador) || false;
      if (!!ambito.ocultar_montos !== estadoOriginal) {
        cambios.push({
          peticion: this.adminService.actualizarOcultarMontosAmbitoHijo(
            this.hijoSeleccionado!.id, ambito.identificador, !!ambito.ocultar_montos
          ),
          prioridad: 1
        });
      }
    });

    if (cambios.length === 0) {
      this.mostrarAlerta('No se realizaron cambios en los permisos.', 'success');
      this.guardandoPermisos = false;
      this.cerrarModalPermisos();
      return;
    }

    const peticionesOrdenadas = cambios
      .sort((a, b) => a.prioridad - b.prioridad)
      .map(cambio => cambio.peticion);

    concat(...peticionesOrdenadas).pipe(last()).subscribe({
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
    if (tipo === 'success') {
      this.alertaService.mostrarExito(msj);
      return;
    }

    this.alertaService.mostrarError(msj);
  }

  regresar(): void {
    window.history.back();
  }
}
