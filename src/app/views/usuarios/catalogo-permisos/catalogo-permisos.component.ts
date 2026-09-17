import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concat, forkJoin, last, Observable } from 'rxjs';
import { AdminSistemaService, UsuarioHijoItem, AmbitoMontosItem } from '../../../services/admin-sistema.service';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { AlertaService } from '../../../services/alerta.service';

export interface AccionNodo {
  accion_id: number;
  nombre: string;
  identificador: string;
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
  selector: 'app-catalogo-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBarUsuariosComponent],
  templateUrl: './catalogo-permisos.component.html',
  styleUrl: './catalogo-permisos.component.css'
})
export class CatalogoPermisosComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);
  private readonly alertaService = inject(AlertaService);

  cargando: boolean = false;
  cargandoPermisos: boolean = false;
  guardandoPermisos: boolean = false;

  usuariosHijos: UsuarioHijoItem[] = [];
  hijoSeleccionadoId: number | null = null;
  treePermisos: ModuloNodo[] = [];

  modulosExpandidos = new Set<number>();
  private estadoInicial: Map<string, boolean> = new Map();
  ocultarMontosGlobal = true;
  ambitosMontos: AmbitoMontosItem[] = [];
  private ocultarMontosGlobalInicial = true;
  private estadosAmbitosIniciales = new Map<string, boolean>();

  private esModuloVisibleEnGestion(identificador: string): boolean {
    return identificador !== 'usuarios_caratula_retroactivos';
  }

  ngOnInit(): void {
    this.cargarUsuariosHijos();
  }

  cargarUsuariosHijos(): void {
    this.cargando = true;
    this.adminService.getUsuariosHijos().subscribe({
      next: (res) => {
        this.usuariosHijos = res.usuarios || [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.mostrarAlerta('Error al cargar la lista de usuarios.', 'error');
      }
    });
  }

  onSeleccionarHijo(): void {
    if (!this.hijoSeleccionadoId) {
      this.treePermisos = [];
      this.modulosExpandidos.clear();
      return;
    }

    this.cargandoPermisos = true;

    const hijoId = this.hijoSeleccionadoId;
    forkJoin({
      delegablesAntiguos: this.adminService.getMisPermisosDelegables(),
      permisosAntiguosHijo: this.adminService.getPermisosUsuarioHijo(hijoId),
      modulosDelegables: this.adminService.getMisModulosDelegables(),
      modulosHijo: this.adminService.getModulosUsuarioHijo(hijoId),
      configuracionMontos: this.adminService.getConfiguracionMontosHijo(hijoId)
    }).subscribe({
      next: (respuesta: any) => this.construirMatriz(respuesta),
      error: () => {
        this.cargandoPermisos = false;
        this.treePermisos = [];
        this.mostrarAlerta('No se pudieron cargar los accesos del usuario hijo.', 'error');
      }
    });
  }

  private construirMatriz(respuesta: any): void {
    const asignadosHijo = respuesta.permisosAntiguosHijo.permisos || [];
    const modMap = new Map<number, ModuloNodo>();
    this.estadoInicial.clear();
    this.modulosExpandidos.clear();
    const modulosDelegables = (respuesta.modulosDelegables.modulos || [])
      .filter((modulo: any) => this.esModuloVisibleEnGestion(modulo.identificador));
    const idsDeModulosNuevos = new Set<number>(
      modulosDelegables.map((modulo: any) => modulo.modulo_id)
    );

    // Los módulos presentes en la bolsa nueva se administran únicamente por
    // módulo. La matriz heredada queda para lo que aún no migra.
    (respuesta.delegablesAntiguos.permisos_delegables || [])
      .filter((item: any) => this.esModuloVisibleEnGestion(item.identificador || '') &&
        !idsDeModulosNuevos.has(item.modulo_id))
      .forEach((item: any) => {
        const modId = item.modulo_id;
        const padreId = item.padre_id ? Number(item.padre_id) : null;
        if (!modMap.has(modId)) {
          modMap.set(modId, {
            modulo_id: modId, padre_id: padreId, nombre: item.modulo,
            identificador: item.identificador || '',
            es_raiz: !padreId, acciones: []
          });
          this.modulosExpandidos.add(modId);
        }
        const estaAsignado = asignadosHijo.some((h: any) =>
          h.modulo_id === modId && h.accion_id === item.accion_id
        );
        this.estadoInicial.set(`${modId}_${item.accion_id}`, estaAsignado);
        modMap.get(modId)!.acciones.push({
          accion_id: item.accion_id, nombre: item.accion,
          identificador: item.accion_id_texto || '', asignado: estaAsignado
        });
      });

    modulosDelegables.forEach((modulo: any) => {
      const asignado = (respuesta.modulosHijo.modulos || [])
        .some((m: any) => m.modulo_id === modulo.modulo_id);
      this.estadoInicial.set(`modulo_${modulo.modulo_id}`, asignado);
      modMap.set(modulo.modulo_id, {
        modulo_id: modulo.modulo_id, padre_id: modulo.padre_id || null,
        nombre: modulo.modulo, identificador: modulo.identificador,
        es_raiz: !modulo.padre_id, acciones: [], esAccesoModulo: true, asignado
      });
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
    this.treePermisos
      .filter(modulo => modulo.esAccesoModulo && modulo.padre_id && !this.puedeModificarModulo(modulo))
      .forEach(modulo => this.cambiarAsignacionModulo(modulo, false));
    this.cargandoPermisos = false;
  }

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

    // Los permisos se delegan de forma independiente. Si el padre no forma
    // parte de la bolsa, el módulo debe seguir visible como inicio del árbol.
    return this.treePermisos.filter(m => !m.padre_id || !modulosDisponibles.has(m.padre_id));
  }

  getSubmodulos(padreId: number): ModuloNodo[] {
    return this.treePermisos.filter(m => !m.es_raiz && m.padre_id === padreId);
  }

  puedeModificarModulo(modulo: ModuloNodo): boolean {
    if (!modulo.esAccesoModulo || !modulo.padre_id) return true;
    const padre = this.treePermisos.find(item => item.modulo_id === modulo.padre_id);
    return !!padre?.esAccesoModulo && !!padre.asignado;
  }

  cambiarAsignacionModulo(modulo: ModuloNodo, asignado: boolean): void {
    modulo.asignado = asignado;
    if (!asignado) {
      this.desmarcarDescendientes(modulo.modulo_id);
    }
  }

  private desmarcarDescendientes(padreId: number): void {
    this.getSubmodulos(padreId).forEach(hijo => {
      hijo.asignado = false;
      this.desmarcarDescendientes(hijo.modulo_id);
    });
  }

  private obtenerNivelModulo(modulo: ModuloNodo): number {
    let nivel = 0;
    let padreId = modulo.padre_id;
    const visitados = new Set<number>();
    while (padreId && !visitados.has(padreId)) {
      visitados.add(padreId);
      nivel += 1;
      padreId = this.treePermisos.find(item => item.modulo_id === padreId)?.padre_id;
    }
    return nivel;
  }

  guardarPermisos(): void {
    if (!this.hijoSeleccionadoId) return;

    this.guardandoPermisos = true;
    const cambios: { peticion: Observable<any>, prioridad: number }[] = [];

    this.treePermisos.forEach(m => {
      if (m.esAccesoModulo) {
        const estadoOriginal = !!this.estadoInicial.get(`modulo_${m.modulo_id}`);
        if (m.asignado !== estadoOriginal) {
          cambios.push({
            peticion: m.asignado
              ? this.adminService.asignarModuloHijo(this.hijoSeleccionadoId!, m.modulo_id)
              : this.adminService.revocarModuloHijo(this.hijoSeleccionadoId!, m.modulo_id),
            prioridad: m.asignado
              ? this.obtenerNivelModulo(m)
              : 100 - this.obtenerNivelModulo(m)
          });
        }
        return;
      }
      m.acciones.forEach(a => {
        const key = `${m.modulo_id}_${a.accion_id}`;
        const estadoOriginal = !!this.estadoInicial.get(key);

        if (a.asignado !== estadoOriginal) {
          if (a.asignado) {
            cambios.push({
              peticion: this.adminService.asignarPermisoHijo(this.hijoSeleccionadoId!, m.modulo_id, a.accion_id),
              prioridad: 2
            });
          } else {
            cambios.push({
              peticion: this.adminService.revocarPermisoHijo(this.hijoSeleccionadoId!, m.modulo_id, a.accion_id),
              prioridad: 2
            });
          }
        }
      });
    });

    if (this.ocultarMontosGlobal !== this.ocultarMontosGlobalInicial) {
      cambios.push({
        peticion: this.adminService.actualizarOcultarMontosGlobalHijo(
          this.hijoSeleccionadoId!, this.ocultarMontosGlobal
        ),
        prioridad: 1
      });
    }

    this.ambitosMontos.forEach(ambito => {
      const estadoOriginal = this.estadosAmbitosIniciales.get(ambito.identificador) || false;
      if (!!ambito.ocultar_montos !== estadoOriginal) {
        cambios.push({
          peticion: this.adminService.actualizarOcultarMontosAmbitoHijo(
            this.hijoSeleccionadoId!, ambito.identificador, !!ambito.ocultar_montos
          ),
          prioridad: 1
        });
      }
    });

    if (cambios.length === 0) {
      this.guardandoPermisos = false;
      this.mostrarAlerta('No se realizaron cambios en los permisos.', 'success');
      return;
    }

    const peticionesOrdenadas = cambios
      .sort((a, b) => a.prioridad - b.prioridad)
      .map(cambio => cambio.peticion);

    concat(...peticionesOrdenadas).pipe(last()).subscribe({
      next: () => {
        this.guardandoPermisos = false;
        this.mostrarAlerta('Permisos actualizados correctamente.', 'success');
        this.onSeleccionarHijo();
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
