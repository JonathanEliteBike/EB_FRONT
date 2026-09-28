import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SolicitudRetroactivoCampaniasService } from '../../../services/solicitud-retroactivo-campanias.service';
import { CampaniaItem, CampaniaMsiItem, MsiOption, CrearCampaniaPayload } from './models/solicitud-campania.model';
import { ProductoDetalle } from '../../../components/producto-catalogo-modal/models/producto-catalogo.model';
import { ProductoCatalogoModalComponent } from '../../../components/producto-catalogo-modal/producto-catalogo-modal/producto-catalogo-modal.component';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-solicitud-retroactivo-campanias',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TopBarUsuariosComponent, ProductoCatalogoModalComponent, DatePickerComponent],
  templateUrl: './solicitud-retroactivo-campanias.component.html',
  styleUrl: './solicitud-retroactivo-campanias.component.css'
})
export class SolicitudRetroactivoCampaniasComponent implements OnInit {
  private readonly campaniasService = inject(SolicitudRetroactivoCampaniasService);
  private readonly authService = inject(AuthService);

  get puedeCrear(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('solicitud_retroactivo_campanias', 'crear');
  }

  get puedeEditar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('solicitud_retroactivo_campanias', 'editar');
  }

  get puedeEliminar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('solicitud_retroactivo_campanias', 'eliminar');
  }

  // Estados de vista
  modoFormulario: boolean = false;
  editandoId: number | null = null;
  guardando: boolean = false;

  // Mensajes de alerta
  alertMsj: string | null = null;
  alertTipo: 'success' | 'error' = 'success';

  // Catálogos y Datos
  campanias: CampaniaItem[] = [];
  msiList: MsiOption[] = [];
  selectedProductos: ProductoDetalle[] = [];

  // Control del Modal de Catálogo
  modalCatalogoVisible: boolean = false;

  // Carga masiva de productos por SKU (para cuando MKT ya tiene la lista de
  // SKUs de la campaña y no quiere buscarlos uno por uno en el catálogo).
  mostrarCargaSku: boolean = false;
  textoSkusMasivos: string = '';
  cargandoSkus: boolean = false;
  skusNoEncontrados: string[] = [];

  // Filtros del Listado
  filtroTexto: string = '';
  filtroEstado: string = 'TODOS';

  // Formulario
  formNombre: string = '';
  formFechaInicio: string = '';
  formFechaFin: string = '';
  formActiva: boolean = true;

  // GUÍA: una campaña liga VARIOS plazos MSI, cada uno con su propio % --
  // ya no es un msi_id único con el % fijo del catálogo global.
  formMsiSeleccionados: CampaniaMsiItem[] = [];

  // Alta de un plazo nuevo al catálogo global (cuando MKT necesita uno que
  // no existe, ej. 24 meses), sin salir del formulario de campaña.
  mostrarNuevoPlazo: boolean = false;
  nuevoPlazoMeses: number | null = null;
  nuevoPlazoPorcentajeBase: number | null = null;
  creandoPlazo: boolean = false;

  ngOnInit(): void {
    this.cargarMsi();
    this.cargarCampanias();
  }

  // --- MÉTODOS DE CARGA DE DATOS ---
  cargarMsi(): void {
    this.campaniasService.getMsi().subscribe({
      next: (res) => (this.msiList = res),
      error: (err) => console.error('Error al cargar MSI:', err)
    });
  }

  cargarCampanias(): void {
    this.campaniasService.getCampanias().subscribe({
      next: (res) => (this.campanias = res),
      error: () => this.mostrarAlerta('Error al cargar la lista de campañas.', 'error')
    });
  }

  // --- FILTRADO EN LISTADO ---
  get campaniasFiltradas(): CampaniaItem[] {
    return this.campanias.filter((c) => {
      const cumpleTexto =
        !this.filtroTexto.trim() ||
        c.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase());

      let cumpleEstado = true;
      if (this.filtroEstado === 'ACTIVAS') cumpleEstado = !!c.activa;
      if (this.filtroEstado === 'INACTIVAS') cumpleEstado = !c.activa;

      return cumpleTexto && cumpleEstado;
    });
  }

  // --- NAVEGACIÓN Y ACCIONES DEL FORMULARIO ---
  nuevaCampania(): void {
    if (!this.puedeCrear) return;
    this.limpiarFormulario();
    this.modoFormulario = true;
  }

  cancelarFormulario(): void {
    this.limpiarFormulario();
    this.modoFormulario = false;
  }

  limpiarFormulario(): void {
    this.formNombre = '';
    this.formFechaInicio = '';
    this.formFechaFin = '';
    this.formActiva = true;
    this.formMsiSeleccionados = [];
    this.mostrarNuevoPlazo = false;
    this.nuevoPlazoMeses = null;
    this.nuevoPlazoPorcentajeBase = null;
    this.selectedProductos = [];
    this.mostrarCargaSku = false;
    this.textoSkusMasivos = '';
    this.skusNoEncontrados = [];
    this.editandoId = null;
  }

  editarCampania(c: CampaniaItem): void {
    if (!this.puedeEditar) return;
    this.editandoId = c.id;
    this.formNombre = c.nombre;
    this.formFechaInicio = this.normalizarFecha(c.fecha_inicio);
    this.formFechaFin = this.normalizarFecha(c.fecha_fin);
    this.formMsiSeleccionados = Array.isArray(c.msi) ? [...c.msi] : [];
    this.formActiva = !!c.activa;

    // Procesar la lista de productos asociando los datos completos desde la API
    if (Array.isArray(c.productos)) {
      this.selectedProductos = c.productos
        .map((p: any) => {
          if (typeof p === 'string') {
            try {
              return JSON.parse(p);
            } catch {
              return null;
            }
          }
          return p;
        })
        .filter((p: any) => p !== null && typeof p === 'object');
    } else {
      this.selectedProductos = [];
    }

    this.modoFormulario = true;
  }

  guardarCampania(): void {
    if ((this.editandoId && !this.puedeEditar) || (!this.editandoId && !this.puedeCrear)) {
      this.mostrarAlerta('No cuenta con permiso para guardar esta campaña.', 'error');
      return;
    }
    if (!this.formNombre.trim()) {
      this.mostrarAlerta('El nombre de la campaña es obligatorio.', 'error');
      return;
    }
    if (!this.formFechaInicio || !this.formFechaFin) {
      this.mostrarAlerta('Las fechas de inicio y fin son obligatorias.', 'error');
      return;
    }
    if (this.formMsiSeleccionados.length === 0) {
      this.mostrarAlerta('Debe ligar al menos un plazo MSI con su % a la campaña.', 'error');
      return;
    }
    const porcentajeInvalido = this.formMsiSeleccionados.some(
      (m) => m.porcentaje === null || m.porcentaje === undefined || m.porcentaje < 0 || m.porcentaje > 100
    );
    if (porcentajeInvalido) {
      this.mostrarAlerta('Revisa los % capturados: deben ser un número entre 0 y 100.', 'error');
      return;
    }

    this.guardando = true;

    const payload: CrearCampaniaPayload = {
      nombre: this.formNombre.trim(),
      fecha_inicio: this.formFechaInicio,
      fecha_fin: this.formFechaFin,
      activa: this.formActiva ? 1 : 0,
      msi: this.formMsiSeleccionados.map((m) => ({ msi_id: m.msi_id, porcentaje: m.porcentaje })),
      productos: this.selectedProductos.map((p) => p.id)
    };

    const peticion$ = this.editandoId
      ? this.campaniasService.updateCampania(this.editandoId, payload)
      : this.campaniasService.createCampania(payload);

    peticion$.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarAlerta(
          this.editandoId ? 'Campaña actualizada correctamente.' : 'Campaña creada correctamente.',
          'success'
        );
        this.cargarCampanias();
        this.modoFormulario = false;
      },
      error: (err) => {
        this.guardando = false;
        this.mostrarAlerta(err.error?.error || 'Error al guardar la campaña.', 'error');
      }
    });
  }

  // --- GESTIÓN DE MSI LIGADOS A LA CAMPAÑA (cada uno con su % propio) ---
  // Cada plazo del catálogo se activa/desactiva con un check; al activarse se
  // liga de inmediato con el % base del catálogo como punto de partida
  // editable, sin pasos ni botones intermedios.
  estaMsiSeleccionado(msiId: number): boolean {
    return this.formMsiSeleccionados.some((m) => m.msi_id === msiId);
  }

  obtenerPorcentajeSeleccionado(msiId: number): number | null {
    const item = this.formMsiSeleccionados.find((m) => m.msi_id === msiId);
    return item ? item.porcentaje : null;
  }

  toggleMsiSeleccionado(msi: MsiOption, activo: boolean): void {
    if (activo) {
      if (this.estaMsiSeleccionado(msi.id)) return;
      this.formMsiSeleccionados = [
        ...this.formMsiSeleccionados,
        { msi_id: msi.id, plazo_meses: msi.plazo_meses, porcentaje: msi.porcentaje }
      ];
    } else {
      this.quitarMsiSeleccionado(msi.id);
    }
  }

  actualizarPorcentajeSeleccionado(msiId: number, porcentaje: number | null): void {
    this.formMsiSeleccionados = this.formMsiSeleccionados.map((m) =>
      m.msi_id === msiId ? { ...m, porcentaje: porcentaje as number } : m
    );
  }

  quitarMsiSeleccionado(msiId: number): void {
    this.formMsiSeleccionados = this.formMsiSeleccionados.filter((m) => m.msi_id !== msiId);
  }

  // --- ALTA DE UN PLAZO NUEVO AL CATÁLOGO GLOBAL (cuando MKT necesita uno
  // que no existe todavía, ej. 24 meses) ---
  crearNuevoPlazo(): void {
    if (!this.nuevoPlazoMeses || this.nuevoPlazoMeses <= 0) {
      this.mostrarAlerta('El plazo en meses debe ser un entero positivo.', 'error');
      return;
    }
    if (
      this.nuevoPlazoPorcentajeBase === null ||
      this.nuevoPlazoPorcentajeBase < 0 ||
      this.nuevoPlazoPorcentajeBase > 100
    ) {
      this.mostrarAlerta('El % base debe ser un número entre 0 y 100.', 'error');
      return;
    }

    this.creandoPlazo = true;
    this.campaniasService.crearMsi(this.nuevoPlazoMeses, this.nuevoPlazoPorcentajeBase).subscribe({
      next: (res) => {
        this.creandoPlazo = false;
        const nuevo = res.datos as MsiOption;
        this.msiList = [...this.msiList, nuevo].sort((a, b) => a.plazo_meses - b.plazo_meses);
        this.toggleMsiSeleccionado(nuevo, true);
        this.mostrarNuevoPlazo = false;
        this.nuevoPlazoMeses = null;
        this.nuevoPlazoPorcentajeBase = null;
        this.mostrarAlerta(`Plazo de ${nuevo.plazo_meses} meses creado y ligado a la campaña.`, 'success');
      },
      error: (err) => {
        this.creandoPlazo = false;
        this.mostrarAlerta(err.error?.error || 'Error al crear el plazo MSI.', 'error');
      }
    });
  }

  eliminarCampania(id: number): void {
    if (!this.puedeEliminar) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) return;

    this.campaniasService.deleteCampania(id).subscribe({
      next: () => {
        this.mostrarAlerta('Campaña eliminada correctamente.', 'success');
        this.cargarCampanias();
      },
      error: () => this.mostrarAlerta('Error al eliminar la campaña.', 'error')
    });
  }

  // --- GESTIÓN DEL MODAL DE CATÁLOGO DE PRODUCTOS ---
  abrirModalCatalogo(): void {
    this.modalCatalogoVisible = true;
  }

  cerrarModalCatalogo(): void {
    this.modalCatalogoVisible = false;
  }

  onProductosSeleccionados(productos: ProductoDetalle[]): void {
    const idsExistentes = new Set(this.selectedProductos.map((p) => p.id));
    const nuevosUnicos = productos.filter((p) => !idsExistentes.has(p.id));

    this.selectedProductos = [...this.selectedProductos, ...nuevosUnicos];
  }

  quitarProducto(id: number): void {
    this.selectedProductos = this.selectedProductos.filter((p) => p.id !== id);
  }

  // --- CARGA MASIVA DE PRODUCTOS POR SKU ---
  cargarProductosPorSku(): void {
    // Acepta SKUs separados por salto de línea, coma o espacio.
    const skus = Array.from(
      new Set(
        this.textoSkusMasivos
          .split(/[\n,\s]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    if (skus.length === 0) {
      this.mostrarAlerta('Pega al menos un SKU.', 'error');
      return;
    }

    this.cargandoSkus = true;
    this.skusNoEncontrados = [];

    this.campaniasService.buscarProductosPorSku(skus).subscribe({
      next: (res) => {
        this.cargandoSkus = false;
        this.skusNoEncontrados = res.no_encontrados || [];

        const idsExistentes = new Set(this.selectedProductos.map((p) => p.id));
        const encontrados = res.encontrados || [];
        const nuevosUnicos = encontrados.filter((p) => !idsExistentes.has(p.id));
        const yaExistian = encontrados.length - nuevosUnicos.length;

        this.selectedProductos = [...this.selectedProductos, ...nuevosUnicos];

        const partes: string[] = [];
        if (nuevosUnicos.length > 0) partes.push(`${nuevosUnicos.length} agregado(s)`);
        if (yaExistian > 0) partes.push(`${yaExistian} ya estaba(n) en la lista`);
        if (this.skusNoEncontrados.length > 0) partes.push(`${this.skusNoEncontrados.length} no encontrado(s)`);

        this.mostrarAlerta(
          partes.length > 0 ? partes.join(', ') + '.' : 'No se encontró ningún producto con esos SKUs.',
          this.skusNoEncontrados.length > 0 ? 'error' : 'success'
        );

        if (this.skusNoEncontrados.length === 0) {
          this.textoSkusMasivos = '';
        }
      },
      error: (err) => {
        this.cargandoSkus = false;
        this.mostrarAlerta(err.error?.error || 'Error al buscar los productos por SKU.', 'error');
      }
    });
  }

  // --- HELPERS DE RENDERIZADO Y FECHAS ---
  obtenerNombreProducto(prod: any): string {
    if (!prod) return '-';
    if (typeof prod === 'string') return prod;
    return prod.modelo || prod.codigo || prod.sku || '-';
  }

  obtenerSkuProducto(prod: any): string {
    if (!prod) return '-';
    return typeof prod === 'object' && prod.sku ? prod.sku : '-';
  }

  obtenerVarianteProducto(prod: any): string {
    if (!prod || typeof prod !== 'object') return '';
    const detalles: string[] = [];
    if (prod.talla && prod.talla !== '-') detalles.push(`Talla: ${prod.talla}`);
    if (prod.color && prod.color !== '-') detalles.push(`Color: ${prod.color}`);
    return detalles.length > 0 ? detalles.join(' | ') : '-';
  }

  /**
   * Normaliza cualquier formato de fecha devuelto por la API a 'YYYY-MM-DD'
   * para que sea compatible con <input type="date">.
   */
  normalizarFecha(fecha: any): string {
    if (!fecha) return '';

    const fechaStr = String(fecha).trim();

    // 1. Si ya viene en formato ISO (ej. "2026-08-14" o "2026-08-14T00:00:00")
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      return fechaStr.substring(0, 10);
    }

    // 2. Si viene como objeto Date o RFC 1123 de Flask (ej. "Fri, 14 Aug 2026 00:00:00 GMT")
    const d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  }

  // GUÍA: el flag `activa` en BD es un interruptor administrativo aparte de
  // las fechas -- una campaña puede seguir "activa=1" mucho después de que
  // fecha_fin ya pasó. El formulario de venta ya filtra por vigencia real
  // (ver listar_campanias_activas en el backend), así que el badge de este
  // listado tiene que reflejar lo mismo o parece un error ("dice Activa
  // pero ya no aparece para vender").
  estadoCampania(c: CampaniaItem): { texto: string; clase: string } {
    if (!c.activa) return { texto: 'Inactiva', clase: 'badge-inactive' };

    const hoy = this.normalizarFecha(new Date().toISOString());
    const inicio = this.normalizarFecha(c.fecha_inicio);
    const fin = this.normalizarFecha(c.fecha_fin);

    if (fin && hoy > fin) return { texto: 'Vencida', clase: 'badge-vencida' };
    if (inicio && hoy < inicio) return { texto: 'Próxima', clase: 'badge-proxima' };
    return { texto: 'Activa', clase: 'badge-active' };
  }

  mostrarAlerta(msj: string, tipo: 'success' | 'error'): void {
    this.alertMsj = msj;
    this.alertTipo = tipo;
    setTimeout(() => (this.alertMsj = null), 4000);
  }
}
