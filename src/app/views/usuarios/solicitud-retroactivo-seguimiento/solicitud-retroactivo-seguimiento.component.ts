import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { AuthService } from '../../../services/auth.service';
import {
  SolicitudRetroactivoService,
  SolicitudRetroactivo,
  EstatusNotaCredito,
  ItemHistorial
} from '../../../services/solicitud-retroactivo.service';

const COLOR_ESTATUS: Record<string, string> = {
  pendiente: '#f0ad4e',
  validado:  '#4caf50',
  rechazado: '#e53935',
};

@Component({
  selector: 'app-solicitud-retroactivo-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopBarUsuariosComponent],
  templateUrl: './solicitud-retroactivo-seguimiento.component.html',
  styleUrl: './solicitud-retroactivo-seguimiento.component.css'
})
export class SolicitudRetroactivoSeguimientoComponent implements OnInit {
  cargando = true;
  error = '';
  solicitudes: SolicitudRetroactivo[] = [];

  // Ampliamos el control de vistas para incluir la tabla de mis productos
  vista: 'lista' | 'detalle' | 'productos' = 'lista';
  seleccionada: SolicitudRetroactivo | null = null;

  archivosNuevos: { [key: string]: File } = {};
  reenviando = false;
  errorReenvio = '';
  mensajeReenvioExito = '';

  // ── Filtros y paginación de lista ──
  busqueda = '';
  filtroEstatus = '';
  filtroCampana = '';
  paginaActual = 1;
  readonly tamPagina = 15;

  camposArchivos = [
    { key: 'ticket_compra', label: 'Ticket de compra', accept: 'image/*,.pdf' },
    { key: 'voucher', label: 'Voucher de pago', accept: 'image/*,.pdf' },
    { key: 'factura_pdf', label: 'Factura (PDF)', accept: '.pdf' },
    { key: 'factura_xml', label: 'Factura (XML)', accept: '.xml' }
  ];

  constructor(private service: SolicitudRetroactivoService, private authService: AuthService) {}

  get puedeVerMontos(): boolean {
    return !this.authService.debeOcultarMontos('retroactivos');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.misSolicitudes().subscribe({
      next: (res) => {
        this.solicitudes = res;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus solicitudes.';
        this.cargando = false;
      }
    });
  }

  private docsRechazados(s: SolicitudRetroactivo): string[] {
    return Object.entries(s.validacion_docs ?? {})
      .filter(([, estatus]) => estatus === 'rechazado')
      .map(([doc]) => doc);
  }

  colorEstatus(estatus: string): string {
    return COLOR_ESTATUS[estatus?.toLowerCase()] ?? '#888';
  }

  // GUÍA: mismo fix que en el Gestor -- 'validacion' cubre validar,
  // rechazar Y deshacer, antes salían las 3 idénticas (mismo check verde).
  iconoHistorial(item: ItemHistorial): { icono: string; clase: string } {
    const desc = (item.descripcion || '').toLowerCase();

    if (item.tipo === 'creacion') return { icono: 'fa-plus', clase: 'tl-naranja' };
    if (item.tipo === 'reenvio') return { icono: 'fa-redo', clase: 'tl-ambar' };
    if (item.tipo === 'precio') return { icono: 'fa-dollar-sign', clase: 'tl-azul' };

    if (item.tipo === 'nota_credito') {
      if (desc.includes('validada')) return { icono: 'fa-shield-halved', clase: 'tl-verde' };
      return { icono: 'fa-file-invoice-dollar', clase: 'tl-morado' };
    }

    if (item.tipo === 'validacion') {
      if (desc.includes('deshecho')) return { icono: 'fa-rotate-left', clase: 'tl-gris' };
      if (desc.includes('rechazado')) return { icono: 'fa-times', clase: 'tl-rojo' };
      return { icono: 'fa-check', clase: 'tl-verde' };
    }

    return { icono: 'fa-circle', clase: 'tl-gris' };
  }

  // GUÍA: se guarda en orden cronológico (cada mutación hace .append en el
  // backend), pero se muestra más reciente arriba -- mismo criterio que en
  // el Gestor, para no ver primero lo más viejo al abrir el historial.
  historialOrdenado(historial: ItemHistorial[] | undefined): ItemHistorial[] {
    return historial ? [...historial].reverse() : [];
  }

  // GUÍA: BCYP captura la nota de crédito, pero Auditoría es quien la
  // valida -- mostrar "Emitida" apenas se captura (antes de que Auditoría
  // la revise) le hacía creer al cliente que ya estaba lista de verdad.
  // "Emitida" ahora solo aparece cuando nota_credito_estatus === 'validada'.
  estatusNotaCredito(nota: string | undefined, notaEstatus?: EstatusNotaCredito): { texto: string; clase: string } {
    if (!nota || nota.trim() === '' || nota.trim() === '0') {
      return { texto: 'En proceso', clase: 'badge-pendiente' };
    }
    if (notaEstatus === 'validada') {
      return { texto: `Emitida (#${nota})`, clase: 'badge-validado' };
    }
    return { texto: `En validación (#${nota})`, clase: 'badge-pendiente' };
  }

  // ── Navegación de Vistas ───────────────────────────────────────────

  verMisProductos(): void {
    this.vista = 'productos';
  }

  volverALista(): void {
    this.vista = 'lista';
    this.seleccionada = null;
  }

  // ── Filtrado y paginación ───────────────────────────────────────────

  get campanasDisponibles(): string[] {
    const set = new Set(this.solicitudes.map(s => s.nombre_formulario).filter(Boolean));
    return Array.from(set).sort();
  }

  get estatusDisponibles(): string[] {
    const set = new Set(this.solicitudes.map(s => s.estatus).filter(Boolean));
    return Array.from(set).sort();
  }

  get solicitudesFiltradas(): SolicitudRetroactivo[] {
    const q = this.busqueda.toLowerCase().trim();
    return this.solicitudes.filter(s => {
      if (q && !s.modelo_bicicleta?.toLowerCase().includes(q) && !s.numero_serie?.toLowerCase().includes(q)) return false;
      if (this.filtroEstatus && s.estatus !== this.filtroEstatus) return false;
      if (this.filtroCampana && s.nombre_formulario !== this.filtroCampana) return false;
      return true;
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.solicitudesFiltradas.length / this.tamPagina));
  }

  get solicitudesPaginadas(): SolicitudRetroactivo[] {
    const inicio = (this.paginaActual - 1) * this.tamPagina;
    return this.solicitudesFiltradas.slice(inicio, inicio + this.tamPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  resetFiltros(): void {
    this.busqueda = '';
    this.filtroEstatus = '';
    this.filtroCampana = '';
    this.paginaActual = 1;
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
  }

  onFiltroChange(): void {
    this.paginaActual = 1;
  }

  // ── Vista de detalle ──────────────────────────────────────────────────

  verDetalle(s: SolicitudRetroactivo): void {
    this.seleccionada = s;
    this.vista = 'detalle';
    this.archivosNuevos = {};
    this.errorReenvio = '';
    this.mensajeReenvioExito = '';
  }

  documentos(s: SolicitudRetroactivo) {
    return this.camposArchivos.map(c => ({
      ...c,
      url: s.archivos?.[c.key]?.url ?? null,
      estatus: s.archivos?.[c.key]?.estatus ?? s.validacion_docs?.[c.key] ?? 'pendiente'
    }));
  }

  private formatFechaISO(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  onFileSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivosNuevos[key] = input.files[0];
    }
  }

  faltanArchivosPorSeleccionar(s: SolicitudRetroactivo): boolean {
    return this.docsRechazados(s).some(key => !this.archivosNuevos[key]);
  }

  reenviar(s: SolicitudRetroactivo): void {
    this.errorReenvio = '';
    if (this.faltanArchivosPorSeleccionar(s)) {
      this.errorReenvio = 'Selecciona todos los archivos rechazados antes de reenviar.';
      return;
    }

    const formData = new FormData();
    formData.append('id_formulario', String(s.id_formulario));
    formData.append('id_msi', String(s.id_msi));
    formData.append('nombre_sucursal', s.nombre_sucursal);
    formData.append('correo_electronico', s.correo_electronico);
    formData.append('nombre_completo', s.nombre_completo);
    formData.append('fecha_venta', this.formatFechaISO(s.fecha_venta));
    formData.append('modelo_bicicleta', s.modelo_bicicleta);
    formData.append('numero_serie', s.numero_serie);
    formData.append('precio_publico', s.precio_publico);
    if (s.id_marca_bicicleta) formData.append('id_marca_bicicleta', String(s.id_marca_bicicleta));

    this.docsRechazados(s).forEach(key => {
      formData.append(key, this.archivosNuevos[key], this.archivosNuevos[key].name);
    });

    this.reenviando = true;
    this.service.actualizarVenta(s.id, formData).subscribe({
      next: () => {
        this.reenviando = false;
        this.mensajeReenvioExito = '¡Solicitud actualizada y enviada de nuevo a revisión!';
        this.archivosNuevos = {};
        this.recargarSeleccionada(s.id);
      },
      error: (err) => {
        this.reenviando = false;
        this.errorReenvio = err.error?.error || 'Ocurrió un error al reenviar la solicitud.';
      }
    });
  }

  private recargarSeleccionada(id: number): void {
    this.service.misSolicitudes().subscribe({
      next: (res) => {
        this.solicitudes = res;
        this.seleccionada = res.find(s => s.id === id) ?? null;
      }
    });
  }
}
