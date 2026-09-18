import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSistemaService, ModuloItem, AccionBase, ModuloPayload } from '../../../services/admin-sistema.service';
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

@Component({
  selector: 'app-catalogo-general',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HomeBarComponent],
  templateUrl: './catalogo-general.component.html',
  styleUrl: './catalogo-general.component.css'
})
export class CatalogoGeneralComponent implements OnInit {
  private readonly adminService = inject(AdminSistemaService);
  private readonly alertaService = inject(AlertaService);

  constructor(private location: Location) {} goBack() { this.location.back(); }

  cargando: boolean = false;

  modulos: ModuloItem[] = [];
  accionesGlobales: AccionBase[] = [];
  rutasDetectadasLista: RutaDetectada[] = [];

  pestanaActiva: 'modulos' | 'acciones' | 'rutas' = 'modulos';

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
  rutaAsociadaModulo: string = '';
  filtroRutasModal: string = '';
  listaRutasAbierta: boolean = false;
  formPadreIdModulo: number | null = null;
  formDelegableAHijos: boolean = true;

  // Formulario Acción Base
  modalAccionVisible: boolean = false;
  formNombreAccion: string = '';
  formIdentificadorAccion: string = '';

  modulosExpandidos = new Set<number>();

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  cargarCatalogo(): void {
    this.cargando = true;
    this.adminService.getAcciones().subscribe({
      next: (resAcciones) => {
        this.accionesGlobales = resAcciones.acciones || [];

        this.adminService.getModulos().subscribe({
          next: (resModulos) => {
            this.modulos = resModulos.modulos || [];
            this.modulosExpandidos = new Set(
              this.modulos.filter(m => this.getSubmodulos(m.id).length > 0).map(m => m.id)
            );
            this.generarListaRutas();

            this.pageModulos = 1;
            this.pageAcciones = 1;
            this.pageRutas = 1;

            this.cargando = false;
          },
          error: () => {
            this.cargando = false;
            this.mostrarAlerta('Error al cargar módulos.', 'error');
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.mostrarAlerta('Error al cargar catálogo de acciones base.', 'error');
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
      if (!path || rutasIgnoradas.includes(path) || path.includes(':')) return;

      const identificador = this.generarIdentificadorDesdeRuta(path);
      const existe = this.modulos.find(m =>
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
  get modulosRaizTotales(): ModuloItem[] { return this.modulos.filter(m => !m.padre_id); }
  get modulosRaizPaginados(): ModuloItem[] {
    const s = (this.pageModulos - 1) * this.itemsPerPage;
    return this.modulosRaizTotales.slice(s, s + this.itemsPerPage);
  }
  get totalPagesModulos(): number { return Math.ceil(this.modulosRaizTotales.length / this.itemsPerPage) || 1; }

  // 2. Acciones
  get accionesPaginadas(): AccionBase[] {
    const s = (this.pageAcciones - 1) * this.itemsPerPage;
    return this.accionesGlobales.slice(s, s + this.itemsPerPage);
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

  /** Completa datos técnicos desde la ruta, sin imponer acciones ni jerarquía. */
  aplicarRutaAsociada(): void {
    if (!this.rutaAsociadaModulo) return;

    const ruta = this.rutasDetectadasLista.find(item => item.path === this.rutaAsociadaModulo);
    if (!ruta) return;

    this.formIdentificadorModulo = ruta.identificador;
    this.formNombreModulo = ruta.nombreSugerido;
    this.formNombreBloqueado = false;
  }

  seleccionarRutaAsociada(ruta?: RutaDetectada): void {
    if (ruta && !this.esRutaDisponibleParaModulo(ruta)) return;

    this.rutaAsociadaModulo = ruta?.path ?? '';
    this.aplicarRutaAsociada();
    this.listaRutasAbierta = false;
  }

  esRutaDisponibleParaModulo(ruta: RutaDetectada): boolean {
    return !ruta.registrado || ruta.moduloExistente?.id === this.editandoModuloId;
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

  getSubmodulos(padreId: number): any[] { return (this.modulos || []).filter(m => m.padre_id === padreId); }

  abrirModalModulo(m?: ModuloItem): void {
    if (m) this.abrirModalEditarModulo(m);
    else this.abrirModalNuevoModulo();
  }

  abrirModalNuevoModulo(): void {
    this.editandoModuloId = null;
    this.formNombreModulo = '';
    this.formNombreBloqueado = false;
    this.formIdentificadorModulo = '';
    this.rutaAsociadaModulo = '';
    this.filtroRutasModal = '';
    this.listaRutasAbierta = false;
    this.formPadreIdModulo = null;
    this.formDelegableAHijos = true;
    this.modalModuloVisible = true;
  }

  abrirModalEditarModulo(m: ModuloItem): void {
    this.editandoModuloId = m.id;
    this.formNombreModulo = m.nombre;
    this.formNombreBloqueado = false;
    this.formIdentificadorModulo = m.identificador;
    this.rutaAsociadaModulo = this.rutasDetectadasLista.find(
      ruta => ruta.identificador === m.identificador
    )?.path ?? '';
    this.filtroRutasModal = '';
    this.listaRutasAbierta = false;
    this.formPadreIdModulo = m.padre_id || null;
    this.formDelegableAHijos = m.delegable_a_hijos !== 0 && m.delegable_a_hijos !== false;
    this.modalModuloVisible = true;
  }

  cerrarModalModulo(): void { this.modalModuloVisible = false; }

  guardarModulo(): void {
    if (!this.formNombreModulo.trim() || !this.formIdentificadorModulo.trim()) {
      this.mostrarAlerta('Nombre e Identificador son obligatorios.', 'error');
      return;
    }

    const payload: ModuloPayload = {
      nombre: this.formNombreModulo.trim(),
      identificador: this.formIdentificadorModulo.trim(),
      padre_id: this.formPadreIdModulo,
      delegable_a_hijos: this.formDelegableAHijos
    };

    const peticion$ = this.editandoModuloId
      ? this.adminService.actualizarModulo(this.editandoModuloId, payload)
      : this.adminService.crearModulo(payload);

    peticion$.subscribe({
      next: () => {
        this.mostrarAlerta(this.editandoModuloId ? 'Módulo actualizado.' : 'Módulo creado.', 'success');
        this.cerrarModalModulo();
        this.cargarCatalogo();
      },
      error: (err) => this.mostrarAlerta(err.error?.error || 'Error al guardar el módulo.', 'error')
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

  eliminarModulo(target: ModuloItem | number): void {
    const m = typeof target === 'number' ? this.modulos.find(item => item.id === target) : target;
    if (!m) return;
    if (!confirm(`¿Eliminar permanentemente el módulo "${m.nombre}" y sus relaciones?`)) return;

    this.adminService.eliminarModulo(m.id).subscribe({
      next: () => {
        this.mostrarAlerta('Módulo eliminado correctamente.', 'success');
        this.cargarCatalogo();
      },
      error: (err) => this.mostrarAlerta(
        err.error?.error || err.error?.mensaje || 'Error al eliminar el módulo.',
        'error'
      )
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
