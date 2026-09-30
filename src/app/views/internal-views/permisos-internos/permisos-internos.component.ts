import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { AlertaService } from '../../../services/alerta.service';
import {
  AccionBase,
  AdminSistemaService,
  ModuloItem,
  UsuarioInternoItem
} from '../../../services/admin-sistema.service';

interface ModuloConAcciones {
  modulo: ModuloItem;
  acciones: AccionBase[];
  hijos: ModuloConAcciones[];
}

interface GrupoArea {
  clave: string;
  areaId: number | null;
  nombre: string;
  modulos: ModuloConAcciones[];
}

interface AreaPrincipal {
  id: number | null;
  nombre: string | null;
}

@Component({
  selector: 'app-permisos-internos',
  standalone: true,
  imports: [CommonModule, HomeBarComponent],
  templateUrl: './permisos-internos.component.html',
  styleUrl: './permisos-internos.component.css'
})
export class PermisosInternosComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);
  private readonly alertaService = inject(AlertaService);

  usuarios: UsuarioInternoItem[] = [];
  gruposArea: GrupoArea[] = [];
  usuarioSeleccionadoId: number | null = null;
  usuarioSeleccionado: UsuarioInternoItem | null = null;
  areaPrincipal: AreaPrincipal | null = null;
  permisosOriginales = new Set<string>();
  permisosSeleccionados = new Set<string>();
  cargando = false;
  cargandoPermisos = false;
  guardando = false;
  mostrarAdvertenciaArea = false;
  areasFueraDePrincipal: string[] = [];
  paginaActual = 1;
  elementosPorPagina = 10;
  readonly opcionesPorPagina = [10, 25, 50, 100];
  areasAbiertas = new Set<string>();

  constructor(private readonly location: Location) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  regresar(): void {
    if (this.usuarioSeleccionadoId) {
      this.volverALista();
      return;
    }
    this.location.back();
  }

  cargarCatalogos(): void {
    this.cargando = true;
    forkJoin({
      usuarios: this.adminService.getUsuariosInternos(),
      modulos: this.adminService.getModulos()
    }).subscribe({
      next: ({ usuarios, modulos }) => {
        this.usuarios = usuarios.usuarios || [];
        this.gruposArea = this.agruparModulos(modulos.modulos || []);
        this.paginaActual = 1;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.mostrarError(error, 'No fue posible cargar los usuarios internos o el catálogo de módulos.');
      }
    });
  }

  seleccionarUsuario(): void {
    this.usuarioSeleccionado = this.usuarios.find(usuario => usuario.id === this.usuarioSeleccionadoId) || null;
    this.areaPrincipal = null;
    this.permisosOriginales = new Set<string>();
    this.permisosSeleccionados = new Set<string>();

    if (!this.usuarioSeleccionadoId) return;

    this.cargandoPermisos = true;
    this.adminService.getPermisosInternosUsuario(this.usuarioSeleccionadoId).subscribe({
      next: respuesta => {
        this.areaPrincipal = respuesta.area
          ? { id: respuesta.area.id ?? null, nombre: respuesta.area.nombre ?? null }
          : null;
        this.permisosOriginales = new Set(
          (respuesta.permisos || []).filter(permiso => permiso.area_id != null).map(permiso => this.clavePermiso(permiso.modulo_id, permiso.area_id!, permiso.accion_id))
        );
        this.permisosSeleccionados = new Set(this.permisosOriginales);
        this.abrirAreaPrincipal();
        this.cargandoPermisos = false;
      },
      error: error => {
        this.cargandoPermisos = false;
        this.mostrarError(error, 'No fue posible cargar los permisos internos del usuario.');
      }
    });
  }

  gestionarPermisos(usuario: UsuarioInternoItem): void {
    this.usuarioSeleccionadoId = usuario.id;
    this.seleccionarUsuario();
  }

  volverALista(): void {
    this.usuarioSeleccionadoId = null;
    this.usuarioSeleccionado = null;
    this.areaPrincipal = null;
    this.permisosOriginales = new Set<string>();
    this.permisosSeleccionados = new Set<string>();
    this.mostrarAdvertenciaArea = false;
    this.areasAbiertas.clear();
  }

  usuariosPaginados(): UsuarioInternoItem[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    return this.usuarios.slice(inicio, inicio + this.elementosPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.usuarios.length / this.elementosPorPagina) || 1;
  }

  cambiarElementosPorPagina(cantidad: number): void {
    this.elementosPorPagina = cantidad;
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) this.paginaActual -= 1;
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) this.paginaActual += 1;
  }

  obtenerRangoPaginas(): number[] {
    const delta = 2;
    const rango: number[] = [];
    for (let pagina = Math.max(2, this.paginaActual - delta); pagina <= Math.min(this.totalPaginas - 1, this.paginaActual + delta); pagina += 1) {
      rango.push(pagina);
    }
    if (this.paginaActual - delta > 2) rango.unshift(-1);
    if (this.paginaActual + delta < this.totalPaginas - 1) rango.push(-1);
    rango.unshift(1);
    if (this.totalPaginas > 1) rango.push(this.totalPaginas);
    return rango.filter((pagina, indice, paginas) => pagina !== -1 || paginas[indice - 1] !== -1);
  }

  permisoSeleccionado(moduloId: number, areaId: number | null, accionId: number): boolean {
    if (areaId === null) return false;
    return this.permisosSeleccionados.has(this.clavePermiso(moduloId, areaId, accionId));
  }

  cambiarPermiso(moduloId: number, areaId: number | null, accionId: number, seleccionado: boolean): void {
    if (areaId === null) return;
    const clave = this.clavePermiso(moduloId, areaId, accionId);
    if (seleccionado) this.permisosSeleccionados.add(clave);
    else this.permisosSeleccionados.delete(clave);
    this.permisosSeleccionados = new Set(this.permisosSeleccionados);
  }

  areaAbierta(grupo: GrupoArea): boolean {
    return this.areasAbiertas.has(grupo.clave);
  }

  alternarArea(grupo: GrupoArea): void {
    const areas = new Set(this.areasAbiertas);
    if (areas.has(grupo.clave)) areas.delete(grupo.clave);
    else areas.add(grupo.clave);
    this.areasAbiertas = areas;
  }

  todasAccionesModuloSeleccionadas(item: ModuloConAcciones, areaId: number | null): boolean {
    return areaId !== null && item.acciones.length > 0
      && item.acciones.every(accion => this.permisoSeleccionado(item.modulo.id, areaId, accion.id));
  }

  cambiarTodasAccionesModulo(item: ModuloConAcciones, areaId: number | null, seleccionado: boolean): void {
    if (areaId === null) return;
    const permisos = new Set(this.permisosSeleccionados);
    item.acciones.forEach(accion => {
      const clave = this.clavePermiso(item.modulo.id, areaId, accion.id);
      if (seleccionado) permisos.add(clave);
      else permisos.delete(clave);
    });
    this.permisosSeleccionados = permisos;
  }

  todosPermisosAreaSeleccionados(grupo: GrupoArea): boolean {
    const permisos = this.obtenerPermisosGrupo(grupo);
    return permisos.length > 0 && permisos.every(permiso => this.permisosSeleccionados.has(permiso.clave));
  }

  cambiarTodosPermisosArea(grupo: GrupoArea, seleccionado: boolean): void {
    const permisos = new Set(this.permisosSeleccionados);
    this.obtenerPermisosGrupo(grupo).forEach(permiso => {
      if (seleccionado) permisos.add(permiso.clave);
      else permisos.delete(permiso.clave);
    });
    this.permisosSeleccionados = permisos;
  }

  guardarPermisos(): void {
    if (!this.usuarioSeleccionadoId || this.guardando) return;

    this.areasFueraDePrincipal = this.obtenerAreasFueraDePrincipal();
    if (this.areasFueraDePrincipal.length > 0) {
      this.mostrarAdvertenciaArea = true;
      return;
    }
    this.enviarCambios();
  }

  cancelarAdvertencia(): void {
    this.mostrarAdvertenciaArea = false;
  }

  asignarDeTodosModos(): void {
    this.mostrarAdvertenciaArea = false;
    this.enviarCambios();
  }

  private enviarCambios(): void {
    if (!this.usuarioSeleccionadoId) return;

    const disponibles = this.permisosVisibles();
    const nuevos = disponibles.filter(permiso =>
      this.permisosSeleccionados.has(permiso.clave) && !this.permisosOriginales.has(permiso.clave)
    );
    const removidos = disponibles.filter(permiso =>
      !this.permisosSeleccionados.has(permiso.clave) && this.permisosOriginales.has(permiso.clave)
    );

    if (nuevos.length === 0 && removidos.length === 0) {
      this.alertaService.mostrarExito('No se realizaron cambios en los permisos internos.');
      return;
    }

    this.guardando = true;
    const solicitudes = [
      ...nuevos.map(permiso => this.adminService.asignarPermisoInterno(
        this.usuarioSeleccionadoId!, permiso.moduloId, permiso.areaId!, permiso.accionId
      )),
      ...removidos.map(permiso => this.adminService.revocarPermisoInterno(
        this.usuarioSeleccionadoId!, permiso.moduloId, permiso.areaId!, permiso.accionId
      ))
    ];

    forkJoin(solicitudes).subscribe({
      next: () => {
        this.permisosOriginales = new Set(this.permisosSeleccionados);
        this.guardando = false;
        this.alertaService.mostrarExito('Permisos internos actualizados correctamente.');
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No fue posible guardar los permisos internos.');
      }
    });
  }

  private agruparModulos(modulos: ModuloItem[]): GrupoArea[] {
    const grupos = new Map<string, GrupoArea>();
    modulos
      .filter(modulo => this.estaActivo(modulo.activo))
      .forEach(modulo => {
        this.obtenerAreasModulo(modulo).forEach(area => {
          const acciones = area.acciones || [];
          if (acciones.length === 0) return;
          if (!grupos.has(area.clave)) {
            grupos.set(area.clave, {
              clave: area.clave,
              areaId: area.areaId,
              nombre: area.nombre,
              modulos: []
            });
          }
          grupos.get(area.clave)!.modulos.push({
            modulo,
            acciones,
            hijos: []
          });
        });
      });

    return Array.from(grupos.values())
      .map(grupo => ({
        ...grupo,
        modulos: this.organizarJerarquia(grupo.modulos)
      }))
      .sort((a, b) => {
        const orden = (grupo: GrupoArea): number => {
          if (grupo.clave === 'usuarios-hijo') return 1;
          if (grupo.clave === 'sin-area') return 2;
          return 0;
        };
        if (orden(a) !== orden(b)) return orden(a) - orden(b);
        return a.nombre.localeCompare(b.nombre);
      });
  }

  private abrirAreaPrincipal(): void {
    const grupoPrincipal = this.areaPrincipal?.id === null || this.areaPrincipal?.id === undefined
      ? null
      : this.gruposArea.find(grupo => grupo.areaId === this.areaPrincipal!.id);
    this.areasAbiertas = grupoPrincipal ? new Set([grupoPrincipal.clave]) : new Set<string>();
  }

  private permisosVisibles(): { clave: string; moduloId: number; accionId: number; areaId: number | null; areaNombre: string }[] {
    const permisos = new Map<string, { clave: string; moduloId: number; accionId: number; areaId: number | null; areaNombre: string }>();
    this.gruposArea.forEach(grupo => this.modulosDelGrupo(grupo).forEach(({ modulo, acciones }) => acciones.forEach(accion => {
      const clave = grupo.areaId === null ? '' : this.clavePermiso(modulo.id, grupo.areaId, accion.id);
      if (!clave) return;
      permisos.set(clave, {
        clave,
        moduloId: modulo.id,
        accionId: accion.id,
        areaId: grupo.areaId,
        areaNombre: grupo.nombre
      });
    })));
    return Array.from(permisos.values());
  }

  private obtenerPermisosGrupo(grupo: GrupoArea): { clave: string; moduloId: number; accionId: number }[] {
    if (grupo.areaId === null) return [];
    return this.modulosDelGrupo(grupo).flatMap(item => item.acciones.map(accion => ({
      clave: this.clavePermiso(item.modulo.id, grupo.areaId!, accion.id),
      moduloId: item.modulo.id,
      accionId: accion.id
    })));
  }

  private modulosDelGrupo(grupo: GrupoArea): ModuloConAcciones[] {
    const resultado: ModuloConAcciones[] = [];
    const recorrer = (item: ModuloConAcciones): void => {
      resultado.push(item);
      item.hijos.forEach(recorrer);
    };
    grupo.modulos.forEach(recorrer);
    return resultado;
  }

  private organizarJerarquia(modulos: ModuloConAcciones[]): ModuloConAcciones[] {
    const porId = new Map<number, ModuloConAcciones>(
      modulos.map(item => [item.modulo.id, { ...item, hijos: [] }])
    );
    const raices: ModuloConAcciones[] = [];
    porId.forEach(item => {
      const padreId = item.modulo.padre_id;
      if (padreId === null || padreId === undefined) {
        raices.push(item);
        return;
      }
      const padre = porId.get(Number(padreId));
      if (padre) padre.hijos.push(item);
    });
    const ordenar = (items: ModuloConAcciones[]): ModuloConAcciones[] => items
      .sort((a, b) => a.modulo.nombre.localeCompare(b.modulo.nombre))
      .map(item => ({ ...item, hijos: ordenar(item.hijos) }));
    return ordenar(raices);
  }

  cantidadModulos(grupo: GrupoArea): number {
    return this.modulosDelGrupo(grupo).length;
  }

  private obtenerAreasFueraDePrincipal(): string[] {
    if (!this.areaPrincipal) return [];
    const areas = new Set<string>();
    this.permisosVisibles().forEach(permiso => {
      if (this.permisosSeleccionados.has(permiso.clave) && permiso.areaId !== this.areaPrincipal!.id) areas.add(permiso.areaNombre);
    });
    return Array.from(areas).sort((a, b) => a.localeCompare(b));
  }

  private obtenerAreasModulo(modulo: ModuloItem): { clave: string; areaId: number | null; nombre: string; acciones?: AccionBase[] }[] {
    return (modulo.areas || []).map(area => ({
      clave: `area-${area.id}`,
      areaId: area.id,
      nombre: area.nombre,
      acciones: area.acciones || []
    }));
  }

  private clavePermiso(moduloId: number, areaId: number, accionId: number): string {
    return `${moduloId}:${areaId}:${accionId}`;
  }

  private estaActivo(valor: number | boolean): boolean {
    return valor === 1 || valor === true;
  }

  private mostrarError(error: any, mensajePredeterminado: string): void {
    this.alertaService.mostrarError(error?.error?.error || mensajePredeterminado);
  }
}
