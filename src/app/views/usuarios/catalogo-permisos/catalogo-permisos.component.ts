import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AdminSistemaService, UsuarioHijoItem } from '../../../services/admin-sistema.service';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';

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
  selector: 'app-catalogo-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBarUsuariosComponent],
  templateUrl: './catalogo-permisos.component.html',
  styleUrl: './catalogo-permisos.component.css'
})
export class CatalogoPermisosComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);

  cargando: boolean = false;
  cargandoPermisos: boolean = false;
  guardandoPermisos: boolean = false;
  alertMsj: string | null = null;
  alertTipo: 'success' | 'error' = 'success';

  usuariosHijos: UsuarioHijoItem[] = [];
  hijoSeleccionadoId: number | null = null;
  treePermisos: ModuloNodo[] = [];

  modulosExpandidos = new Set<number>();
  private estadoInicial: Map<string, boolean> = new Map();

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

    this.adminService.getMisPermisosDelegables().subscribe({
      next: (resDelegables: any) => {
        const delegables = resDelegables.permisos_delegables || [];

        this.adminService.getPermisosUsuarioHijo(this.hijoSeleccionadoId!).subscribe({
          next: (resHijo: any) => {
            this.cargandoPermisos = false;
            const asignadosHijo = resHijo.permisos || [];
            const modMap = new Map<number, ModuloNodo>();
            this.estadoInicial.clear();
            this.modulosExpandidos.clear();

            delegables.forEach((item: any) => {
              const modId = item.modulo_id;
              const modNombre = item.modulo;
              const modIdentificador = item.identificador || modNombre.toLowerCase().trim().replace(/\s+/g, '_');
              
              const padreId = item.padre_id ? Number(item.padre_id) : null;
              const esRaiz = item.es_raiz !== undefined 
                ? Boolean(item.es_raiz) 
                : (!padreId || padreId === 0);

              if (!modMap.has(modId)) {
                modMap.set(modId, {
                  modulo_id: modId,
                  padre_id: padreId,
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
    return this.treePermisos.filter(m => !m.es_raiz && m.padre_id === padreId);
  }

  guardarPermisos(): void {
    if (!this.hijoSeleccionadoId) return;

    this.guardandoPermisos = true;
    const peticiones: Observable<any>[] = [];

    this.treePermisos.forEach(m => {
      m.acciones.forEach(a => {
        const key = `${m.modulo_id}_${a.accion_id}`;
        const estadoOriginal = !!this.estadoInicial.get(key);

        if (a.asignado !== estadoOriginal) {
          if (a.asignado) {
            peticiones.push(
              this.adminService.asignarPermisoHijo(this.hijoSeleccionadoId!, m.modulo_id, a.accion_id)
            );
          } else {
            peticiones.push(
              this.adminService.revocarPermisoHijo(this.hijoSeleccionadoId!, m.modulo_id, a.accion_id)
            );
          }
        }
      });
    });

    if (peticiones.length === 0) {
      this.guardandoPermisos = false;
      this.mostrarAlerta('No se realizaron cambios en los permisos.', 'success');
      return;
    }

    forkJoin(peticiones).subscribe({
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
    this.alertMsj = msj;
    this.alertTipo = tipo;
    setTimeout(() => (this.alertMsj = null), 4000);
  }

  regresar(): void {
    window.history.back();
  }
}
