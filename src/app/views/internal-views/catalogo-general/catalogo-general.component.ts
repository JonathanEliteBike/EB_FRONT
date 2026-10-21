import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminSistemaService, ModuloItem, AccionBase, ModuloPayload, AreaItem, PermisoInternoEndpointItem, PermisoInternoEndpointPayload } from '../../../services/admin-sistema.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { routes } from '../../../app.routes';
import { AlertaService } from '../../../services/alerta.service';

export interface RutaDetectada {
  path: string;
  nombreSugerido: string;
  identificador: string;
  registrado: boolean;
  tipo: 'Usuario' | 'Sistema';
  moduloExistente?: ModuloItem;
}

interface GrupoModuloArea {
  clave: string;
  nombre: string;
  areaId: number | null;
  modulos: ModuloItem[];
}

@Component({
  selector: 'app-catalogo-general',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HomeBarComponent],
  templateUrl: './catalogo-general.component.html',
  styleUrl: './catalogo-general.component.css'
})
export class CatalogoGeneralComponent implements OnInit {
  private static readonly MODULOS_USUARIOS_HIJO = new Set([
    'usuarios_creacion_usuarios',
    'usuarios_proyeccion_compras',
    'usuarios_garantias',
    'usuarios_caratula',
    'usuarios_retroactivos',
    'usuarios_caratula_retroactivos',
    'usuarios_calculadora_retroactivos',
    'usuarios_solicitudes_retroactivos'
  ]);

  private readonly adminService = inject(AdminSistemaService);
  private readonly alertaService = inject(AlertaService);
  private readonly route = inject(ActivatedRoute);
  readonly esCatalogoDistribuidores = this.route.snapshot.data['catalogoHistoricoDistribuidores'] === true;

  constructor(private location: Location) {} goBack() { this.location.back(); }

  cargando: boolean = false;

  modulos: ModuloItem[] = [];
  accionesGlobales: AccionBase[] = [];
  areas: AreaItem[] = [];
  rutasDetectadasLista: RutaDetectada[] = [];

  pestanaActiva: 'modulos' | 'acciones' | 'rutas' | 'areas' = 'modulos';

  // ── VARIABLES Y CONFIGURACIÓN DE PAGINACIÓN ──────────────────────────────
  itemsPerPage: number = 10;
  opcionesPorPagina: number[] = [10, 25, 50, 100];

  pageModulos: number = 1;
  pageAcciones: number = 1;

  // Paginación Unificada para Permisos Generales / Rutas
  pageRutas: number = 1;
  filtroTipoRuta: 'todas' | 'usuario' | 'sistema' = 'todas';

  // Formulario Módulo
  modalModuloVisible: boolean = false;
  editandoModuloId: number | null = null;
  formNombreModulo: string = '';
  formNombreBloqueado: boolean = false;
  formIdentificadorModulo: string = '';
  formRutaModulo: string | null = null;
  rutaAsociadaModulo: string = '';
  filtroRutasModal: string = '';
  listaRutasAbierta: boolean = false;
  formPadreIdModulo: number | null = null;
  tipoJerarquiaModulo: 'raiz' | 'submodulo' = 'raiz';
  formDelegableAHijos = true;
  filtroPadresModulo = '';
  moduloTecnicoReutilizado: ModuloItem | null = null;
  formAreaId: number | null = null;
  formModuloExistenteId: number | null = null;
  filtroModulosArea: string = '';
  crearModuloNuevo = true;
  formAccionesIds: number[] = [];
  reglasEndpoint: PermisoInternoEndpointItem[] = [];
  reglaEditandoId: number | null = null;
  formReglaRuta = '';
  formReglaMetodo = 'GET';
  formReglaAccionId: number | null = null;
  formReglaActiva = true;

  // Formulario Acción Base
  modalAccionVisible: boolean = false;
  formNombreAccion: string = '';
  formIdentificadorAccion: string = '';
  modalAreaVisible = false;
  areaEditando: AreaItem | null = null;
  formNombreArea = '';
  eliminacionForzadaPendiente: { modulo: ModuloItem; areaId: number; areaNombre: string; permisos: number } | null = null;

  modulosExpandidos = new Set<number>();
  areasModulosAbiertas = new Set<string>();

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  cargarCatalogo(areasAReabrir: string[] = []): void {
    const areasAbiertasAntesDeRecargar = new Set(this.areasModulosAbiertas);
    this.cargando = true;
    const catalogo$ = this.esCatalogoDistribuidores
      ? this.adminService.getModulosHistoricosRol2()
      : this.adminService.getModulos();
    const areas$ = this.esCatalogoDistribuidores
      ? null
      : this.adminService.getAreasPermisosInternos();

    (areas$
      ? forkJoin({ acciones: this.adminService.getAcciones(), modulos: catalogo$, areas: areas$ })
      : forkJoin({ acciones: this.adminService.getAcciones(), modulos: catalogo$ })
    ).subscribe({
      next: (respuesta: any) => {
        this.accionesGlobales = respuesta.acciones.acciones || [];
        this.modulos = respuesta.modulos.modulos || [];
        this.areas = respuesta.areas?.areas || [];
        this.modulosExpandidos = new Set(
          this.modulos.filter(m => this.getSubmodulos(m.id).length > 0).map(m => m.id)
        );
        const areasDisponibles = new Set(this.gruposModulosPaginados.map(grupo => grupo.clave));
        this.areasModulosAbiertas = new Set(
          [...areasAbiertasAntesDeRecargar].filter(clave => areasDisponibles.has(clave))
        );
        areasAReabrir.filter(clave => areasDisponibles.has(clave))
          .forEach(clave => this.areasModulosAbiertas.add(clave));
        this.generarListaRutas();

        this.pageModulos = 1;
        this.pageAcciones = 1;
        this.pageRutas = 1;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.mostrarAlerta('Error al cargar el catálogo de módulos, acciones o áreas.', 'error');
      }
    });
  }

  generarListaRutas(): void {
    const rutasIgnoradas = [
      '', 'login', 'home', '**',
      'recuperacion/enviar-correo',
      'recuperacion/verificar-codigo',
      'recuperacion/restablecer-contrasena'
    ];

    const resultado: RutaDetectada[] = [];

    const procesarRuta = (path: string) => {
      if (!path || rutasIgnoradas.includes(path)) return;

      const identificador = this.generarIdentificadorDesdeRuta(path);
      const existe = this.modulos.find(m =>
        m.ruta === `/${path}` ||
        m.identificador === identificador ||
        m.identificador === path ||
        m.identificador === path.replace(/^usuarios\//, '')
      );

      const partes = path.split('/');
      const ultimaParte = partes[partes.length - 1];
      const nombreSugerido = ultimaParte
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letra => letra.toUpperCase());

      const tipo: 'Usuario' | 'Sistema' = path.toLowerCase().startsWith('usuario') ? 'Usuario' : 'Sistema';

      resultado.push({
        path,
        nombreSugerido,
        identificador,
        registrado: !!existe,
        tipo,
        moduloExistente: existe
      });
    };

    routes.forEach(r => {
      if (r.path !== undefined) procesarRuta(r.path);
    });

    this.rutasDetectadasLista = resultado;
  }

  /** Convierte una ruta Angular en el identificador técnico del módulo. */
  private generarIdentificadorDesdeRuta(path: string): string {
    return path.toLowerCase().replace(/\//g, '_').replace(/-/g, '_');
  }

  // ── GETTERS Y MÉTODOS DE PAGINACIÓN UNIFICADA ─────────────────────────────

  cambiarItemsPorPagina(cant: number): void {
    this.itemsPerPage = cant;
    this.pageModulos = 1;
    this.pageAcciones = 1;
    this.pageRutas = 1;
  }

  setFiltroTipoRuta(tipo: 'todas' | 'usuario' | 'sistema'): void {
    this.filtroTipoRuta = tipo;
    this.pageRutas = 1;
  }

  get rutasUsuariosTotales(): RutaDetectada[] {
    return this.rutasDetectadasLista.filter(r => r.tipo === 'Usuario');
  }

  get rutasAdminTotales(): RutaDetectada[] {
    return this.rutasDetectadasLista.filter(r => r.tipo === 'Sistema');
  }

  get rutasFiltradasTotales(): RutaDetectada[] {
    if (this.filtroTipoRuta === 'usuario') return this.rutasUsuariosTotales;
    if (this.filtroTipoRuta === 'sistema') return this.rutasAdminTotales;
    return this.rutasDetectadasLista;
  }

  get rutasPaginadas(): RutaDetectada[] {
    const s = (this.pageRutas - 1) * this.itemsPerPage;
    return this.rutasFiltradasTotales.slice(s, s + this.itemsPerPage);
  }

  get totalPagesRutas(): number {
    return Math.ceil(this.rutasFiltradasTotales.length / this.itemsPerPage) || 1;
  }

  // 1. Módulos
  get modulosRaizTotales(): ModuloItem[] {
    return this.modulos.filter(m => (m.padre_id === null || m.padre_id === undefined) && (
      this.esCatalogoDistribuidores || !CatalogoGeneralComponent.MODULOS_USUARIOS_HIJO.has(m.identificador)
    ));
  }
  get modulosRaizPaginados(): ModuloItem[] {
    const s = (this.pageModulos - 1) * this.itemsPerPage;
    return this.modulosRaizTotales.slice(s, s + this.itemsPerPage);
  }
  get totalPagesModulos(): number { return Math.ceil(this.modulosRaizTotales.length / this.itemsPerPage) || 1; }

  get gruposModulosPaginados(): GrupoModuloArea[] {
    const grupos = new Map<string, GrupoModuloArea>();
    this.areasActivas.forEach(area => {
      grupos.set(`area-${area.id}`, {
        clave: `area-${area.id}`,
        nombre: area.nombre,
        areaId: area.id,
        modulos: []
      });
    });
    this.modulosRaizPaginados.forEach(modulo => {
      this.obtenerGruposModulo(modulo).forEach(({ clave, nombre, areaId }) => {
        if (!grupos.has(clave)) grupos.set(clave, { clave, nombre, areaId, modulos: [] });
        grupos.get(clave)!.modulos.push(modulo);
      });
    });

    const orden = (grupo: GrupoModuloArea): number => {
      if (grupo.clave === 'usuarios-hijo') return 1;
      if (grupo.clave === 'sin-area') return 2;
      return 0;
    };

    return Array.from(grupos.values()).sort((a, b) =>
      orden(a) !== orden(b) ? orden(a) - orden(b) : a.nombre.localeCompare(b.nombre)
    );
  }

  private obtenerGruposModulo(modulo: Pick<ModuloItem, 'area_id' | 'area_nombre' | 'areas' | 'identificador'>): Pick<GrupoModuloArea, 'clave' | 'nombre' | 'areaId'>[] {
    const areas = modulo.areas || [];
    return areas.length
      ? areas.map(area => ({ clave: `area-${area.id}`, nombre: area.nombre, areaId: area.id }))
      : modulo.area_id === null || modulo.area_id === undefined
        ? [{ clave: 'sin-area', nombre: 'Sin área', areaId: null }]
        : [];
  }

  areaModuloAbierta(grupo: GrupoModuloArea): boolean {
    return this.areasModulosAbiertas.has(grupo.clave);
  }

  alternarAreaModulo(grupo: GrupoModuloArea): void {
    const areas = new Set(this.areasModulosAbiertas);
    if (areas.has(grupo.clave)) areas.delete(grupo.clave);
    else areas.add(grupo.clave);
    this.areasModulosAbiertas = areas;
  }

  // 2. Acciones
  get accionesPaginadas(): AccionBase[] {
    const s = (this.pageAcciones - 1) * this.itemsPerPage;
    return this.accionesGlobales.slice(s, s + this.itemsPerPage);
  }
  get accionesActivas(): AccionBase[] {
    return this.accionesGlobales.filter(accion => accion.activo === 1);
  }
  get accionesDisponiblesParaRegla(): AccionBase[] {
    const modulo = this.moduloSeleccionado;
    const accionesDelModulo = new Set([
      ...(modulo?.acciones || []).map(accion => accion.id),
      ...(modulo?.areas || []).flatMap(area => area.acciones || []).map(accion => accion.id)
    ]);
    return this.accionesActivas.filter(accion => accionesDelModulo.has(accion.id));
  }
  get areasActivas(): AreaItem[] {
    return this.areas.filter(area => area.activo === 1 || area.activo === true);
  }

  abrirAdministracionAreas(): void {
    this.pestanaActiva = 'areas';
  }

  abrirModalNuevaArea(): void {
    this.areaEditando = null;
    this.formNombreArea = '';
    this.modalAreaVisible = true;
  }

  abrirModalEditarArea(area: AreaItem): void {
    this.areaEditando = area;
    this.formNombreArea = area.nombre;
    this.modalAreaVisible = true;
  }

  cerrarModalArea(): void {
    this.modalAreaVisible = false;
    this.areaEditando = null;
    this.formNombreArea = '';
  }

  guardarArea(): void {
    const nombre = this.formNombreArea.trim();
    if (!nombre) {
      this.mostrarAlerta('El nombre del área es obligatorio.', 'error');
      return;
    }

    const peticion$ = this.areaEditando
      ? this.adminService.actualizarAreaPermisosInternos(this.areaEditando.id, nombre)
      : this.adminService.crearAreaPermisosInternos(nombre);
    const fueEdicion = !!this.areaEditando;

    peticion$.subscribe({
      next: respuesta => {
        this.mostrarAlerta(respuesta.mensaje || `Área ${fueEdicion ? 'actualizada' : 'creada'} correctamente.`, 'success');
        this.cerrarModalArea();
        this.cargarCatalogo();
      },
      error: err => this.mostrarAlerta(err.error?.error || 'No fue posible guardar el área.', 'error')
    });
  }

  cambiarEstadoArea(area: AreaItem): void {
    const estaActiva = area.activo === 1 || area.activo === true;
    if (estaActiva && !confirm(`¿Desactivar el área "${area.nombre}"? Las relaciones existentes no se modificarán.`)) return;

    this.adminService.cambiarEstadoAreaPermisosInternos(area.id, estaActiva ? 0 : 1).subscribe({
      next: respuesta => {
        this.mostrarAlerta(respuesta.mensaje || `Área ${estaActiva ? 'desactivada' : 'activada'} correctamente.`, 'success');
        this.cargarCatalogo();
      },
      error: err => this.mostrarAlerta(err.error?.error || 'No fue posible cambiar el estado del área.', 'error')
    });
  }
  get totalPagesAcciones(): number { return Math.ceil(this.accionesGlobales.length / this.itemsPerPage) || 1; }

  obtenerRangoPaginas(currentPage: number, totalPages: number): number[] {
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      if (i > 0 && i <= totalPages) {
        range.push(i);
      }
    }

    if (currentPage - delta > 2) {
      range.unshift(-1);
    }
    if (currentPage + delta < totalPages - 1) {
      range.push(-1);
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range.filter((page, index, array) =>
      page !== -1 || array[index - 1] !== -1
    );
  }

  cambiarPagina(tipo: 'modulos' | 'acciones' | 'rutas', delta: number): void {
    if (tipo === 'modulos') this.pageModulos += delta;
    if (tipo === 'acciones') this.pageAcciones += delta;
    if (tipo === 'rutas') this.pageRutas += delta;
  }

  cambiarPaginaDirecta(tipo: 'modulos' | 'acciones' | 'rutas', pagina: number): void {
    if (pagina === -1) return;
    if (tipo === 'modulos' && pagina >= 1 && pagina <= this.totalPagesModulos) this.pageModulos = pagina;
    if (tipo === 'acciones' && pagina >= 1 && pagina <= this.totalPagesAcciones) this.pageAcciones = pagina;
    if (tipo === 'rutas' && pagina >= 1 && pagina <= this.totalPagesRutas) this.pageRutas = pagina;
  }

  // ── MÉTODOS DE NEGOCIO ──────────────────────────────────────────────────

  registrarModuloDesdeRuta(ruta: RutaDetectada): void {
    this.abrirModalNuevoModulo();
    this.rutaAsociadaModulo = ruta.path;
    this.aplicarRutaAsociada();
  }

  get identificadorAutomatico(): boolean {
    return Boolean(this.rutaAsociadaModulo);
  }

  get moduloGlobalBloqueado(): boolean {
    return this.editandoModuloId === null && this.moduloTecnicoReutilizado !== null;
  }

  /** Completa datos técnicos desde la ruta, sin imponer acciones ni jerarquía. */
  aplicarRutaAsociada(): void {
    if (!this.rutaAsociadaModulo) return;

    const ruta = this.rutasDetectadasLista.find(item => item.path === this.rutaAsociadaModulo);
    if (!ruta) return;

    const moduloExistente = ruta.moduloExistente || null;
    this.moduloTecnicoReutilizado = moduloExistente;
    this.formRutaModulo = `/${ruta.path}`;
    if (moduloExistente) {
      this.formNombreModulo = moduloExistente.nombre;
      this.formIdentificadorModulo = moduloExistente.identificador;
      this.formNombreBloqueado = true;
      this.formPadreIdModulo = moduloExistente.padre_id ?? null;
      this.tipoJerarquiaModulo = this.formPadreIdModulo === null ? 'raiz' : 'submodulo';
      return;
    }

    this.formIdentificadorModulo = ruta.identificador;
    this.formNombreBloqueado = false;
  }

  seleccionarRutaAsociada(ruta?: RutaDetectada): void {
    if (ruta && this.rutaYaAgregadaEnArea(ruta)) {
      this.mostrarAlerta('El módulo de esta ruta ya está agregado al área seleccionada.', 'error');
      return;
    }
    if (ruta?.moduloExistente && this.editandoModuloId !== null && ruta.moduloExistente.id !== this.editandoModuloId) {
      this.mostrarAlerta('La ruta seleccionada ya pertenece a otro módulo técnico.', 'error');
      return;
    }
    if (!ruta) {
      this.moduloTecnicoReutilizado = null;
      this.formNombreBloqueado = false;
      this.formNombreModulo = '';
      this.formIdentificadorModulo = '';
    } else if (!ruta.moduloExistente && this.moduloTecnicoReutilizado) {
      this.formNombreModulo = '';
    }
    this.rutaAsociadaModulo = ruta?.path ?? '';
    this.formRutaModulo = ruta ? `/${ruta.path}` : null;
    this.aplicarRutaAsociada();
    this.listaRutasAbierta = false;
  }

  get rutasFiltradasParaSelector(): RutaDetectada[] {
    const filtro = this.filtroRutasModal.trim().toLowerCase();
    if (!filtro) return this.rutasDetectadasLista;

    return this.rutasDetectadasLista.filter(ruta =>
      ruta.path.toLowerCase().includes(filtro) ||
      ruta.nombreSugerido.toLowerCase().includes(filtro) ||
      ruta.identificador.toLowerCase().includes(filtro)
    );
  }

  toggleExpandir(id: number): void {
    if (this.modulosExpandidos.has(id)) this.modulosExpandidos.delete(id);
    else this.modulosExpandidos.add(id);
  }

  isExpandido(id: number): boolean { return this.modulosExpandidos.has(id); }

  getSubmodulos(padreId: number, areaId: number | null = null): ModuloItem[] {
    return this.modulos.filter(modulo => {
      if (Number(modulo.padre_id) !== padreId) return false;
      return areaId === null || this.moduloYaAgregadoEnArea(modulo, areaId);
    });
  }

  abrirModalModulo(m?: ModuloItem, areaId: number | null = null): void {
    if (m) this.abrirModalEditarModulo(m, areaId);
    else this.abrirModalNuevoModulo();
  }

  abrirModalNuevoModulo(): void {
    this.editandoModuloId = null;
    this.formNombreModulo = '';
    this.formNombreBloqueado = false;
    this.formIdentificadorModulo = '';
    this.formRutaModulo = null;
    this.rutaAsociadaModulo = '';
    this.filtroRutasModal = '';
    this.listaRutasAbierta = false;
    this.formPadreIdModulo = null;
    this.tipoJerarquiaModulo = 'raiz';
    this.formDelegableAHijos = true;
    this.filtroPadresModulo = '';
    this.moduloTecnicoReutilizado = null;
    this.formAreaId = null;
    this.formModuloExistenteId = null;
    this.filtroModulosArea = '';
    this.crearModuloNuevo = true;
    this.formAccionesIds = [];
    this.reglasEndpoint = [];
    this.limpiarFormularioRegla();
    this.modalModuloVisible = true;
  }

  abrirModalEditarModulo(m: ModuloItem, areaId: number | null): void {
    this.editandoModuloId = m.id;
    this.formModuloExistenteId = m.id;
    this.crearModuloNuevo = false;
    this.formNombreModulo = m.nombre;
    this.formNombreBloqueado = false;
    this.formIdentificadorModulo = m.identificador;
    this.rutaAsociadaModulo = this.rutasDetectadasLista.find(
      ruta => `/${ruta.path}` === m.ruta
    )?.path ?? '';
    this.formRutaModulo = m.ruta ?? null;
    this.filtroRutasModal = '';
    this.listaRutasAbierta = false;
    this.formPadreIdModulo = m.padre_id ?? null;
    this.tipoJerarquiaModulo = this.formPadreIdModulo === null ? 'raiz' : 'submodulo';
    this.formDelegableAHijos = m.delegable_a_hijos !== 0 && m.delegable_a_hijos !== false;
    this.filtroPadresModulo = '';
    this.moduloTecnicoReutilizado = null;
    const areaConfigurada = this.esCatalogoDistribuidores
      ? null
      : areaId && m.areas?.some(area => area.id === areaId)
        ? areaId
        : m.areas?.[0]?.id ?? m.area_id ?? null;
    this.formAreaId = areaConfigurada;
    this.filtroModulosArea = '';
    this.formAccionesIds = (this.esCatalogoDistribuidores
      ? m.acciones || []
      : m.areas?.find(area => area.id === areaConfigurada)?.acciones || [])
      .map(accion => accion.id);
    this.limpiarFormularioRegla();
    if (!this.esCatalogoDistribuidores) this.cargarReglasEndpoint(m.id);
    this.modalModuloVisible = true;
  }

  cerrarModalModulo(): void { this.modalModuloVisible = false; }

  guardarModulo(): void {
    if (!this.esCatalogoDistribuidores && !this.formAreaId) {
      this.mostrarAlerta('Selecciona un área.', 'error');
      return;
    }
    if ((!this.formNombreModulo.trim() || !this.formIdentificadorModulo.trim())) {
      this.mostrarAlerta('Nombre e Identificador son obligatorios.', 'error');
      return;
    }
    if (this.tipoJerarquiaModulo === 'submodulo' && !this.formPadreIdModulo) {
      this.mostrarAlerta('Selecciona el módulo padre para el submódulo.', 'error');
      return;
    }

    const moduloExistente = this.moduloSeleccionado;
    if (!this.crearModuloNuevo && !moduloExistente) {
      this.mostrarAlerta('Selecciona un módulo existente.', 'error');
      return;
    }

    const payload: ModuloPayload = {
      nombre: this.formNombreModulo.trim(),
      identificador: this.formIdentificadorModulo.trim(),
      ruta: this.formRutaModulo,
      padre_id: this.tipoJerarquiaModulo === 'raiz' ? null : this.formPadreIdModulo,
      ...(this.esCatalogoDistribuidores ? {
        delegable_a_hijos: this.formDelegableAHijos,
        catalogo_historico_distribuidores: true
      } : {
        acciones_ids: this.formAccionesIds,
        area_id: this.formAreaId,
        configurar_area: !this.crearModuloNuevo,
        actualizar_modulo_global: this.editandoModuloId !== null || this.moduloTecnicoReutilizado !== null,
        crear_asociacion: !this.crearModuloNuevo && !this.moduloYaAgregadoEnArea(moduloExistente!, this.formAreaId)
      })
    };

    const peticion$ = this.crearModuloNuevo
      ? this.adminService.crearModulo(payload)
      : this.adminService.actualizarModulo(moduloExistente!.id, payload);
    const areasAReabrir = this.esCatalogoDistribuidores ? [] : this.obtenerGruposModulo({
      area_id: payload.area_id,
      areas: this.areasActivas.filter(area => area.id === this.formAreaId),
      identificador: payload.identificador
    }).map(grupo => grupo.clave);

    peticion$.subscribe({
      next: respuesta => {
        this.mostrarAlerta(
          respuesta.mensaje || (this.crearModuloNuevo ? 'Módulo creado.' : 'Configuración del área actualizada.'),
          'success'
        );
        this.cerrarModalModulo();
        this.cargarCatalogo(areasAReabrir);
      },
      error: (err) => this.mostrarAlerta(err.error?.error || 'Error al guardar el módulo.', 'error')
    });
  }

  accionSeleccionada(accionId: number): boolean {
    return this.formAccionesIds.includes(accionId);
  }

  cambiarAccionSeleccionada(accionId: number, seleccionada: boolean): void {
    if (seleccionada) {
      if (!this.accionSeleccionada(accionId)) this.formAccionesIds.push(accionId);
      return;
    }
    this.formAccionesIds = this.formAccionesIds.filter(id => id !== accionId);
  }

  get moduloSeleccionado(): ModuloItem | null {
    const id = this.formModuloExistenteId ?? this.editandoModuloId;
    return id ? this.modulos.find(modulo => modulo.id === id) || null : null;
  }

  moduloYaAgregadoEnArea(modulo: ModuloItem, areaId: number | null): boolean {
    return !!areaId && !!modulo.areas?.some(area => area.id === areaId);
  }

  rutaYaAgregadaEnArea(ruta: RutaDetectada): boolean {
    return !!this.formAreaId
      && !!ruta.moduloExistente
      && ruta.moduloExistente.id !== this.editandoModuloId
      && this.moduloYaAgregadoEnArea(ruta.moduloExistente, this.formAreaId);
  }

  cambiarTipoJerarquia(): void {
    if (this.tipoJerarquiaModulo === 'raiz') this.formPadreIdModulo = null;
  }

  get modulosPadreDisponibles(): ModuloItem[] {
    const moduloEditadoId = this.editandoModuloId;
    const filtro = this.filtroPadresModulo.trim().toLowerCase();
    const candidatos = this.formAreaId
      ? this.modulos.filter(modulo => this.moduloYaAgregadoEnArea(modulo, this.formAreaId))
      : this.modulos;
    const padreActual = this.formPadreIdModulo;
    return this.modulos.filter(modulo => {
      const asociadoAlArea = candidatos.some(candidato => candidato.id === modulo.id);
      if (!asociadoAlArea && modulo.id !== padreActual) return false;
      if (modulo.id === moduloEditadoId || this.esDescendienteDe(modulo, moduloEditadoId)) return false;
      if (modulo.padre_id !== null && modulo.padre_id !== undefined) return false;
      return !filtro || `${modulo.nombre} ${modulo.identificador}`.toLowerCase().includes(filtro);
    });
  }

  private esDescendienteDe(modulo: ModuloItem, posibleAncestroId: number | null): boolean {
    if (!posibleAncestroId) return false;
    let padreId = modulo.padre_id ?? null;
    const visitados = new Set<number>();
    while (padreId !== null && !visitados.has(Number(padreId))) {
      if (Number(padreId) === posibleAncestroId) return true;
      visitados.add(Number(padreId));
      padreId = this.modulos.find(item => item.id === Number(padreId))?.padre_id ?? null;
    }
    return false;
  }

  get modulosDelAreaSeleccionada(): ModuloItem[] {
    if (!this.formAreaId) return [];

    const filtro = this.filtroModulosArea.trim().toLowerCase();
    return this.modulos.filter(modulo => {
      const asociadoAlArea = modulo.areas?.some(area => area.id === this.formAreaId);
      if (!asociadoAlArea) return false;
      if (!filtro) return true;
      return [modulo.nombre, modulo.identificador, modulo.ruta || '']
        .some(valor => valor.toLowerCase().includes(filtro));
    });
  }

  cambiarAreaSeleccionada(): void {
    if (this.editandoModuloId !== null) return;
    this.filtroModulosArea = '';
    this.elegirModuloNuevo();
  }

  seleccionarModuloExistente(): void {
    const modulo = this.moduloSeleccionado;
    if (!modulo || !this.formAreaId) {
      this.crearModuloNuevo = true;
      this.formAccionesIds = [];
      return;
    }
    this.crearModuloNuevo = false;
    this.formNombreModulo = modulo.nombre;
    this.formIdentificadorModulo = modulo.identificador;
    this.formRutaModulo = modulo.ruta ?? null;
    this.formPadreIdModulo = modulo.padre_id ?? null;
    this.tipoJerarquiaModulo = this.formPadreIdModulo === null ? 'raiz' : 'submodulo';
    this.moduloTecnicoReutilizado = modulo;
    this.formAccionesIds = (modulo.areas?.find(area => area.id === this.formAreaId)?.acciones || [])
      .map(accion => accion.id);
  }

  elegirModuloNuevo(): void {
    if (this.editandoModuloId !== null) return;
    this.crearModuloNuevo = true;
    this.formModuloExistenteId = null;
    this.formNombreModulo = '';
    this.formNombreBloqueado = false;
    this.formIdentificadorModulo = '';
    this.formRutaModulo = null;
    this.rutaAsociadaModulo = '';
    this.formPadreIdModulo = null;
    this.tipoJerarquiaModulo = 'raiz';
    this.formDelegableAHijos = true;
    this.filtroPadresModulo = '';
    this.moduloTecnicoReutilizado = null;
    this.formAccionesIds = [];
  }

  cargarReglasEndpoint(moduloId: number): void {
    this.adminService.getReglasEndpointsInternos(moduloId).subscribe({
      next: ({ endpoints }) => this.reglasEndpoint = endpoints || [],
      error: err => this.mostrarAlerta(err.error?.error || 'No fue posible cargar las reglas de backend.', 'error')
    });
  }

  limpiarFormularioRegla(): void {
    this.reglaEditandoId = null;
    this.formReglaRuta = '';
    this.formReglaMetodo = 'GET';
    this.formReglaAccionId = null;
    this.formReglaActiva = true;
  }

  editarReglaEndpoint(regla: PermisoInternoEndpointItem): void {
    this.reglaEditandoId = regla.id;
    this.formReglaRuta = regla.ruta_patron;
    this.formReglaMetodo = regla.metodo_http;
    this.formReglaAccionId = regla.accion_id;
    this.formReglaActiva = regla.activo === 1 || regla.activo === true;
  }

  guardarReglaEndpoint(): void {
    if (!this.editandoModuloId || !this.formReglaRuta.trim() || !this.formReglaAccionId) {
      this.mostrarAlerta('Ruta endpoint y acción son obligatorias.', 'error');
      return;
    }
    const payload: PermisoInternoEndpointPayload = {
      ruta_patron: this.formReglaRuta.trim(),
      metodo_http: this.formReglaMetodo,
      modulo_id: this.editandoModuloId,
      accion_id: this.formReglaAccionId,
      activo: this.formReglaActiva
    };
    const solicitud$ = this.reglaEditandoId
      ? this.adminService.actualizarReglaEndpointInterno(this.reglaEditandoId, payload)
      : this.adminService.crearReglaEndpointInterno(payload);
    solicitud$.subscribe({
      next: () => {
        this.mostrarAlerta('Regla de backend guardada.', 'success');
        this.limpiarFormularioRegla();
        this.cargarReglasEndpoint(this.editandoModuloId!);
      },
      error: err => this.mostrarAlerta(err.error?.error || 'No fue posible guardar la regla de backend.', 'error')
    });
  }

  eliminarReglaEndpoint(regla: PermisoInternoEndpointItem): void {
    if (!confirm(`¿Eliminar la regla ${regla.metodo_http} ${regla.ruta_patron}?`)) return;
    this.adminService.eliminarReglaEndpointInterno(regla.id).subscribe({
      next: () => {
        this.mostrarAlerta('Regla de backend eliminada.', 'success');
        this.cargarReglasEndpoint(regla.modulo_id);
      },
      error: err => this.mostrarAlerta(err.error?.error || 'No fue posible eliminar la regla de backend.', 'error')
    });
  }

  toggleEstadoModulo(m: ModuloItem): void {
    if (!m) return;
    const estaActivo = m.activo === 1 || (m as any).activo === true;
    const nuevoEstado = estaActivo ? 0 : 1;
    this.cambiarEstadoModulo(m, nuevoEstado);
  }

  cambiarEstadoModulo(m: ModuloItem, activo: number): void {
    this.adminService.cambiarEstadoModulo(m.id, activo).subscribe({
      next: () => {
        m.activo = activo;
        this.mostrarAlerta(`Módulo ${activo === 1 ? 'activado' : 'desactivado'}.`, 'success');
      },
      error: (err) => {
        const msj = err.error?.error || err.error?.mensaje || err.message || 'Error al cambiar el estado.';
        this.mostrarAlerta(msj, 'error');
      }
    });
  }

  eliminarModulo(target: ModuloItem | number, areaId: number | null): void {
    const m = typeof target === 'number' ? this.modulos.find(item => item.id === target) : target;
    if (!m) return;
    if (this.esCatalogoDistribuidores) {
      if (!confirm(`¿Eliminar permanentemente el módulo histórico "${m.nombre}"?`)) return;
      this.adminService.eliminarModulo(m.id).subscribe({
        next: () => {
          this.mostrarAlerta('Módulo histórico eliminado.', 'success');
          this.cargarCatalogo();
        },
        error: err => this.mostrarAlerta(err.error?.error || 'No se pudo eliminar el módulo histórico.', 'error')
      });
      return;
    }
    if (!areaId) return;
    const areaNombre = this.areas.find(area => area.id === areaId)?.nombre || 'el área seleccionada';
    if (!confirm(`¿Quitar el módulo "${m.nombre}" de ${areaNombre}? Sus acciones solo se eliminarán de esa área.`)) return;

    this.ejecutarEliminacionDeArea(m, areaId, areaNombre);
  }

  cancelarEliminacionForzada(): void {
    this.eliminacionForzadaPendiente = null;
  }

  confirmarEliminacionForzada(): void {
    const pendiente = this.eliminacionForzadaPendiente;
    if (!pendiente) return;
    this.eliminacionForzadaPendiente = null;
    this.ejecutarEliminacionDeArea(pendiente.modulo, pendiente.areaId, pendiente.areaNombre, true);
  }

  private ejecutarEliminacionDeArea(
    modulo: ModuloItem,
    areaId: number,
    areaNombre: string,
    eliminarPermisosAsignados = false
  ): void {
    this.adminService.eliminarModuloDeArea(modulo.id, areaId, eliminarPermisosAsignados).subscribe({
      next: () => {
        this.mostrarAlerta('Módulo quitado del área correctamente.', 'success');
        this.cargarCatalogo([`area-${areaId}`]);
      },
      error: err => {
        if (!eliminarPermisosAsignados
          && areaNombre.trim().toLocaleLowerCase() === 'contabilidad'
          && err.status === 409
          && err.error?.codigo === 'permisos_internos_area_asignados') {
          this.eliminacionForzadaPendiente = {
            modulo,
            areaId,
            areaNombre,
            permisos: Number(err.error?.permisos || 0)
          };
          return;
        }
        this.mostrarAlerta(
          err.error?.error || err.error?.mensaje || 'No se pudo quitar el módulo del área.',
          'error'
        );
      }
    });
  }

  abrirModalNuevaAccion(): void {
    this.formNombreAccion = '';
    this.formIdentificadorAccion = '';
    this.modalAccionVisible = true;
  }

  cerrarModalAccion(): void { this.modalAccionVisible = false; }

  guardarAccion(): void {
    if (!this.formNombreAccion.trim() || !this.formIdentificadorAccion.trim()) {
      this.mostrarAlerta('Nombre e Identificador son obligatorios.', 'error');
      return;
    }

    this.adminService.crearAccion(this.formNombreAccion.trim(), this.formIdentificadorAccion.trim()).subscribe({
      next: () => {
        this.mostrarAlerta('Acción base creada correctamente.', 'success');
        this.cerrarModalAccion();
        this.cargarCatalogo();
      },
      error: (err) => this.mostrarAlerta(err.error?.error || 'Error al crear la acción.', 'error')
    });
  }

  cambiarEstadoAccion(a: AccionBase, activo: number): void {
    this.adminService.cambiarEstadoAccion(a.id, activo).subscribe({
      next: () => {
        a.activo = activo;
        this.mostrarAlerta(`Acción ${activo === 1 ? 'activada' : 'desactivada'}.`, 'success');
      },
      error: (err) => {
        const msj = err.error?.error || err.error?.mensaje || err.message || 'Error al cambiar estado.';
        this.mostrarAlerta(msj, 'error');
      }
    });
  }

  eliminarAccion(a: AccionBase): void {
    if (!confirm(`¿Eliminar permanentemente la acción "${a.nombre}"?`)) return;

    this.adminService.eliminarAccion(a.id).subscribe({
      next: () => {
        this.mostrarAlerta('Acción eliminada correctamente.', 'success');
        this.cargarCatalogo();
      },
      error: () => this.mostrarAlerta('Error al eliminar acción.', 'error')
    });
  }

  copiarTexto(texto: string): void {
    if (!navigator.clipboard) {
      this.mostrarAlerta('El navegador no permite copiar al portapapeles.', 'error');
      return;
    }

    navigator.clipboard.writeText(texto)
      .then(() => this.mostrarAlerta('Identificador copiado al portapapeles.', 'success'))
      .catch(() => this.mostrarAlerta('No fue posible copiar el identificador.', 'error'));
  }

  mostrarAlerta(msj: string, tipo: 'success' | 'error'): void {
    if (tipo === 'success') {
      this.alertaService.mostrarExito(msj);
      return;
    }

    this.alertaService.mostrarError(msj);
  }
}
