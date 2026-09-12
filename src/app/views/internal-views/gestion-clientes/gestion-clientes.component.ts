import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concat, forkJoin, last, Observable } from 'rxjs';
import { AdminSistemaService, AdminClienteItem, AccionBase, ModuloItem } from '../../../services/admin-sistema.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';

export interface PermisoDelegableFila {
  modulo_id: number;
  modulo: string;
  identificador: string;
  accion_id: number;
  accion: string;
  asignado: boolean;
}

@Component({
  selector: 'app-gestion-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, HomeBarComponent],
  templateUrl: './gestion-clientes.component.html',
  styleUrl: './gestion-clientes.component.css'
})
export class GestionClientesComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);

  constructor(private location: Location) {} goBack() { this.location.back(); }

  cargando: boolean = false;
  cargandoModal: boolean = false;
  guardandoPermisos: boolean = false;
  alertMsj: string | null = null;
  alertTipo: 'success' | 'error' = 'success';

  administradores: AdminClienteItem[] = [];
  modulos: ModuloItem[] = [];
  catalogoModulosAcciones: PermisoDelegableFila[] = [];
  
  estadoInicial: { [key: string]: boolean } = {};
  modulosAcceso: { [key: number]: boolean } = {};
  estadoInicialModulos: { [key: number]: boolean } = {};

  modalBolsaVisible: boolean = false;
  clienteSeleccionado: AdminClienteItem | null = null;
  filtroTexto: string = '';

  modulosExpandidos = new Set<number>();

  // ── PAGINACIÓN TABLA PRINCIPAL ──────────────────────────────────────────
  paginaActual: number = 1;
  elementosPorPagina: number = 25;
  opcionesPorPagina: number[] = [10, 25, 50, 100];

  // ── BÚSQUEDA Y PAGINACIÓN DEL MODAL ─────────────────────────────────────
  filtroBusquedaModal: string = '';
  paginaModal: number = 1;
  itemsPorPaginaModal: number = 10;
  opcionesPorPaginaModal: number[] = [10, 25, 50, 100];

  ngOnInit(): void {
    this.cargarAdministradores();
  }

  get administradoresFiltrados(): AdminClienteItem[] {
    if (!this.filtroTexto.trim()) return this.administradores;
    const txt = this.filtroTexto.toLowerCase();
    return this.administradores.filter(a =>
      a.nombre.toLowerCase().includes(txt) ||
      a.usuario.toLowerCase().includes(txt) ||
      a.correo.toLowerCase().includes(txt)
    );
  }

  // ── LÓGICA DE PAGINACIÓN TABLA PRINCIPAL ──────────────────────────────
  get totalPaginas(): number {
    return Math.ceil(this.administradoresFiltrados.length / this.elementosPorPagina) || 1;
  }

  administradoresPaginados(): AdminClienteItem[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    return this.administradoresFiltrados.slice(inicio, inicio + this.elementosPorPagina);
  }

  cambiarElementosPorPagina(cant: number): void {
    this.elementosPorPagina = cant;
    this.paginaActual = 1;
  }

  obtenerRangoPaginas(): number[] {
    const totalPages = this.totalPaginas;
    const currentPage = this.paginaActual;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      if (i > 0 && i <= totalPages) range.push(i);
    }

    if (currentPage - delta > 2) range.unshift(-1);
    if (currentPage + delta < totalPages - 1) range.push(-1);

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range.filter((page, index, array) => page !== -1 || array[index - 1] !== -1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina > 0 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) this.paginaActual--;
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) this.paginaActual++;
  }

  // ── LÓGICA DEL MODAL (BÚSQUEDA Y JERARQUÍA) ─────────────────────────────
  get modulosModalFiltrados(): ModuloItem[] {
    let lista = (this.modulos || []).filter(m => !m.padre_id);

    if (this.filtroBusquedaModal.trim()) {
      const q = this.filtroBusquedaModal.toLowerCase().trim();
      lista = lista.filter(m => this.moduloCoincideBusqueda(m, q));
    }

    return lista;
  }

  get modulosModalPaginados(): ModuloItem[] {
    const inicio = (this.paginaModal - 1) * this.itemsPorPaginaModal;
    return this.modulosModalFiltrados.slice(inicio, inicio + this.itemsPorPaginaModal);
  }

  get totalPaginasModal(): number {
    return Math.ceil(this.modulosModalFiltrados.length / this.itemsPorPaginaModal) || 1;
  }

  onBusquedaModalChange(): void {
    this.paginaModal = 1;
  }

  cambiarItemsPorPaginaModal(cant: number): void {
    this.itemsPorPaginaModal = cant;
    this.paginaModal = 1;
  }

  cambiarPaginaModal(delta: number): void {
    const nueva = this.paginaModal + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasModal) {
      this.paginaModal = nueva;
    }
  }

  cambiarPaginaDirectaModal(p: number): void {
    if (p !== -1 && p >= 1 && p <= this.totalPaginasModal) {
      this.paginaModal = p;
    }
  }

  obtenerRangoPaginasModal(): number[] {
    const total = this.totalPaginasModal;
    const actual = this.paginaModal;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, actual - delta); i <= Math.min(total - 1, actual + delta); i++) {
      range.push(i);
    }

    if (actual - delta > 2) range.unshift(-1);
    if (actual + delta < total - 1) range.push(-1);

    range.unshift(1);
    if (total > 1) range.push(total);

    return range.filter((page, index, array) => page !== -1 || array[index - 1] !== -1);
  }

  tieneAlgunPermiso(moduloId: number): boolean {
    if (this.esModuloMigrado(moduloId)) return !!this.modulosAcceso[moduloId];
    const todosIds = [moduloId, ...this.getDescendientes(moduloId).map(s => s.id)];
    return this.catalogoModulosAcciones.some(p => todosIds.includes(p.modulo_id) && p.asignado);
  }

  cargarAdministradores(): void {
    this.cargando = true;
    this.adminService.getAdministradores().subscribe({
      next: (res) => {
        this.administradores = res.administradores || [];
        this.cargando = false;
        this.paginaActual = 1;
      },
      error: () => {
        this.cargando = false;
        this.mostrarAlerta('Error al cargar la lista de administradores cliente.', 'error');
      }
    });
  }

  actualizarCupo(admin: AdminClienteItem, nuevoLimite: number | string): void {
    const limiteNum = Number(nuevoLimite);
    if (!Number.isInteger(limiteNum) || limiteNum < 0) {
      this.mostrarAlerta('El cupo debe ser un número entero mayor o igual a 0.', 'error');
      return;
    }

    this.adminService.actualizarCupoAdmin(admin.id, limiteNum).subscribe({
      next: () => {
        admin.max_hijos = limiteNum;
        this.mostrarAlerta(`Cupo actualizado a ${limiteNum} para ${admin.nombre}.`, 'success');
      },
      error: () => this.mostrarAlerta('Error al actualizar el límite de cupo.', 'error')
    });
  }

  cambiarEstadoUsuario(admin: AdminClienteItem, nuevoEstado: number): void {
    this.adminService.cambiarEstadoUsuarioGlobal(admin.id, nuevoEstado).subscribe({
      next: () => {
        admin.activo = nuevoEstado;
        const txt = nuevoEstado === 1 ? 'activado' : 'desactivado';
        this.mostrarAlerta(`Administrador ${admin.nombre} ${txt} correctamente.`, 'success');
      },
      error: () => this.mostrarAlerta('Error al cambiar el estado del usuario.', 'error')
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

  getSubmodulos(padreId: number): ModuloItem[] {
    return (this.modulos || []).filter(m => m.padre_id === padreId);
  }

  esModuloMigrado(moduloId: number): boolean {
    const identificador = this.modulos.find(m => m.id === moduloId)?.identificador;
    return identificador === 'usuarios_proyeccion_compras' ||
      identificador === 'usuarios_garantias' ||
      identificador === 'usuarios_caratula' ||
      identificador === 'usuarios_retroactivos' ||
      identificador === 'usuarios_caratula_retroactivos' ||
      identificador === 'usuarios_calculadora_retroactivos' ||
      identificador === 'usuarios_solicitudes_retroactivos';
  }

  getDescendientes(padreId: number): ModuloItem[] {
    const descendientes: ModuloItem[] = [];
    const visitados = new Set<number>();
    const recorrer = (id: number): void => {
      this.getSubmodulos(id).forEach(hijo => {
        if (visitados.has(hijo.id)) return;
        visitados.add(hijo.id);
        descendientes.push(hijo);
        recorrer(hijo.id);
      });
    };
    recorrer(padreId);
    return descendientes;
  }

  private moduloCoincideBusqueda(modulo: ModuloItem, termino: string): boolean {
    const coincideActual = modulo.nombre.toLowerCase().includes(termino)
      || (modulo.acciones || []).some(accion => accion.nombre.toLowerCase().includes(termino));
    return coincideActual || this.getSubmodulos(modulo.id)
      .some(hijo => this.moduloCoincideBusqueda(hijo, termino));
  }

  isPermisoAsignado(moduloId: number, accionId: number): boolean {
    const item = this.catalogoModulosAcciones.find(
      p => p.modulo_id === moduloId && p.accion_id === accionId
    );
    return item ? item.asignado : false;
  }

  abrirModalBolsaDelegable(admin: AdminClienteItem): void {
    this.clienteSeleccionado = admin;
    this.modalBolsaVisible = true;
    this.paginaModal = 1;
    this.filtroBusquedaModal = '';
    this.cargarPermisosDelegables(admin.id);
  }

  cerrarModalBolsa(): void {
    this.modalBolsaVisible = false;
    this.clienteSeleccionado = null;
    this.catalogoModulosAcciones = [];
    this.modulos = [];
    this.estadoInicial = {};
    this.modulosAcceso = {};
    this.estadoInicialModulos = {};
    this.filtroBusquedaModal = '';
    this.modulosExpandidos.clear();
  }

  /**
   * Carga estrictamente los módulos dados de alta en la base de datos (getModulos)
   * garantizando que solo existan ítems con ID real y persistente.
   */
  cargarPermisosDelegables(adminId: number, mostrarCarga = true): void {
    if (mostrarCarga) {
      this.cargandoModal = true;
    }

    forkJoin({
      modulosRes: this.adminService.getModulos(),
      delegablesRes: this.adminService.getPermisosDelegablesAdministrador(adminId),
      modulosDelegablesRes: this.adminService.getModulosDelegablesAdministrador(adminId)
    }).subscribe({
      next: ({ modulosRes, delegablesRes, modulosDelegablesRes }: any) => {
        if (mostrarCarga) {
          this.cargandoModal = false;
        }

        // Módulos reales y registrados en BD
        const listaModulos: ModuloItem[] = (modulosRes.modulos || []).filter(
          (m: any) => m && m.id && Number(m.activo) === 1
        );
        this.modulos = listaModulos;
        this.modulosExpandidos = new Set(
          this.modulos.filter(m => this.getSubmodulos(m.id).length > 0).map(m => m.id)
        );

        // Crear lista plana sólo con combinaciones reales de modulo_acciones.
        const listaPlana: PermisoDelegableFila[] = [];
        this.modulos.forEach(m => {
          if (this.esModuloMigrado(m.id)) return;
          (m.acciones || []).forEach((a: AccionBase) => {
            listaPlana.push({
              modulo_id: m.id,
              modulo: m.nombre,
              identificador: m.identificador,
              accion_id: a.id,
              accion: a.nombre,
              asignado: false
            });
          });
        });

        // Cruzar con los permisos delegables actuales del administrador
        const asignados = delegablesRes.permisos_delegables || delegablesRes.permisos || [];
        this.estadoInicial = {};

        listaPlana.forEach(item => {
          const estaAsignado = asignados.some(
            (d: any) => d.modulo_id === item.modulo_id && d.accion_id === item.accion_id
          );
          item.asignado = estaAsignado;
          this.estadoInicial[`${item.modulo_id}_${item.accion_id}`] = estaAsignado;
        });

        this.catalogoModulosAcciones = listaPlana;

        this.modulos.filter(m => this.esModuloMigrado(m.id)).forEach(modulo => {
          const asignado = (modulosDelegablesRes.modulos || []).some(
            (m: any) => m.modulo_id === modulo.id
          );
          this.modulosAcceso[modulo.id] = asignado;
          this.estadoInicialModulos[modulo.id] = asignado;
        });
      },
      error: (err) => {
        if (mostrarCarga) {
          this.cargandoModal = false;
        }
        this.mostrarAlerta(err.error?.error || 'Error al obtener la bolsa de permisos.', 'error');
      }
    });
  }

  togglePermiso(moduloId: number, accionId: number): void {
    const item = this.catalogoModulosAcciones.find(
      p => p.modulo_id === moduloId && p.accion_id === accionId
    );
    if (!item) return;

    item.asignado = !item.asignado;
  }

  puedeSeleccionarPermiso(moduloId: number, accionId: number): boolean {
    const item = this.catalogoModulosAcciones.find(
      p => p.modulo_id === moduloId && p.accion_id === accionId
    );
    return !!item;
  }

  guardarPermisos(): void {
    if (!this.clienteSeleccionado) return;
    this.guardandoPermisos = true;

    const cambios: { peticion: Observable<any>, prioridad: number }[] = [];

    this.modulos.filter(m => this.esModuloMigrado(m.id)).forEach(modulo => {
      if (this.modulosAcceso[modulo.id] === this.estadoInicialModulos[modulo.id]) return;
      cambios.push({
        peticion: this.modulosAcceso[modulo.id]
          ? this.adminService.asignarModuloDelegable(this.clienteSeleccionado!.id, modulo.id)
          : this.adminService.revocarModuloDelegable(this.clienteSeleccionado!.id, modulo.id),
        prioridad: 0
      });
    });


    this.catalogoModulosAcciones.forEach(item => {
      const key = `${item.modulo_id}_${item.accion_id}`;
      const estadoOriginal = !!this.estadoInicial[key];

      if (item.asignado !== estadoOriginal) {
        if (item.asignado) {
          cambios.push({
            peticion: this.adminService.asignarPermisoDelegable(this.clienteSeleccionado!.id, item.modulo_id, item.accion_id),
            prioridad: 2
          });
        } else {
          cambios.push({
            peticion: this.adminService.revocarPermisoDelegable(this.clienteSeleccionado!.id, item.modulo_id, item.accion_id),
            prioridad: 2
          });
        }
      }
    });

    if (cambios.length === 0) {
      this.mostrarAlerta('No se realizaron cambios en los permisos.', 'success');
      this.guardandoPermisos = false;
      return;
    }

    const peticionesOrdenadas = cambios
      .sort((a, b) => a.prioridad - b.prioridad)
      .map(cambio => cambio.peticion);

    concat(...peticionesOrdenadas).pipe(last()).subscribe({
      next: () => {
        this.guardandoPermisos = false;
        this.sincronizarEstadoGuardado();
        this.mostrarAlerta('Permisos actualizados correctamente.', 'success');
      },
      error: () => {
        this.guardandoPermisos = false;
        this.mostrarAlerta('Error al guardar algunos permisos.', 'error');
        // Puede haber cambios parciales: se recarga sin desmontar el contenido.
        this.cargarPermisosDelegables(this.clienteSeleccionado!.id, false);
      }
    });
  }

  /** Actualiza el punto de comparación sin reconstruir el modal. */
  private sincronizarEstadoGuardado(): void {
    this.catalogoModulosAcciones.forEach(item => {
      this.estadoInicial[`${item.modulo_id}_${item.accion_id}`] = item.asignado;
    });

    this.modulos.filter(modulo => this.esModuloMigrado(modulo.id)).forEach(modulo => {
      this.estadoInicialModulos[modulo.id] = !!this.modulosAcceso[modulo.id];
    });
  }

  mostrarAlerta(msj: string, tipo: 'success' | 'error'): void {
    this.alertMsj = msj;
    this.alertTipo = tipo;
    setTimeout(() => (this.alertMsj = null), 4000);
  }
}
