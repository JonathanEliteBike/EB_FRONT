import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { GarantiasService, GarantiaFormulario, GarantiaComentario } from '../../../services/garantias.service';
import { environment } from '../../../../environments/environment';

const DOC_LABELS: Record<string, string> = {
  bici_doc1: 'Fotografía del Daño',
  bici_doc2: 'Fotografía del Número de Serie',
  bici_doc3: 'Fotografía del Producto Completo',
  bici_doc4: 'Factura de Compra y Factura de Venta',
  bici_doc5: 'Hojas del Historial de Servicio',
  scott_doc1: 'Fotografía del Daño',
  scott_doc2: 'Fotografía del Año de Fabricación / Número de Serie',
  scott_doc3: 'Fotografía del Producto',
  scott_doc4: 'Factura de Compra y Factura de Venta',
  vittoria_doc1: 'Fotografía del Daño',
  vittoria_doc2: 'Fotografía del Año de Fabricación / Número de Serie',
  vittoria_doc3: 'Fotografía del Producto',
  vittoria_doc4: 'Factura de Compra y Factura de Venta',
};

const COLOR_ESTATUS: Record<string, string> = {
  enviado:       '#f0ad4e',
  'en revisión': '#5c9bd6',
  aprobado:      '#4caf50',
  rechazado:     '#e53935',
  cerrado:       '#555',
};

const COLOR_PIEZA: Record<string, string> = {
  'sin pieza':          '#444',
  'solicitada':         '#f0ad4e',
  'en tránsito':        '#5c9bd6',
  'en almacén':         '#9b59b6',
  'enviada al cliente': '#4caf50',
  'rechazada':          '#e53935',
};

@Component({
  selector: 'app-garantias-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopBarUsuariosComponent],
  templateUrl: './garantias-usuario.component.html',
  styleUrl: './garantias-usuario.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarantiasUsuarioComponent implements OnInit {
  vista: 'hub' | 'tickets' | 'detalle' = 'hub';

  // Lista
  tickets: GarantiaFormulario[] = [];
  cargando = false;
  error = '';

  // Filtros de lista
  busqueda = '';
  filtroEstatus = '';
  filtroMarca = '';
  paginaActual = 1;
  readonly tamPagina = 15;

  // Detalle
  ticketSeleccionado: GarantiaFormulario | null = null;
  cargandoDetalle = false;
  validacionDocs: Record<string, string> = {};

  // Comentarios y historial
  todosComentarios: GarantiaComentario[] = [];
  cargandoComentarios = false;
  nuevoComentario = '';
  enviandoComentario = false;

  // Re-subida / re-entrada
  resubiendo: Record<string, boolean> = {};
  nuevaSerie = '';
  actualizandoSerie = false;

  constructor(private svc: GarantiasService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  // ── Navegación ──────────────────────────────────────────────────────────────

  verMisTickets(): void {
    this.vista = 'tickets';
    this.cargar();
    this.cdr.markForCheck();
  }

  volverAlHub(): void {
    this.vista = 'hub';
    this.cdr.markForCheck();
  }

  volverATickets(): void {
    this.vista = 'tickets';
    this.ticketSeleccionado = null;
    this.cdr.markForCheck();
  }

  verDetalle(t: GarantiaFormulario): void {
    this.ticketSeleccionado = t;
    this.validacionDocs = { ...(t.validacion_docs_json ?? {}) };
    this.nuevaSerie = '';
    this.todosComentarios = [];
    this.resubiendo = {};
    this.vista = 'detalle';
    this.cdr.markForCheck();
    this.cargarDetalleCompleto(t.id);
    this.cargarComentarios(t.id);
  }

  // ── Carga de datos ───────────────────────────────────────────────────────────

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();
    this.svc.getMisTickets().subscribe({
      next: (t) => { this.tickets = t; this.cargando = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Error al cargar tus tickets.'; this.cargando = false; this.cdr.markForCheck(); },
    });
  }

  private cargarDetalleCompleto(id: number): void {
    this.cargandoDetalle = true;
    this.cdr.markForCheck();
    this.svc.obtenerFormulario(id).subscribe({
      next: (f) => {
        this.ticketSeleccionado = f;
        this.validacionDocs = { ...(f.validacion_docs_json ?? {}) };
        this.nuevaSerie = f.datos?.['bici_serie'] ?? '';
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
      },
      error: () => { this.cargandoDetalle = false; this.cdr.markForCheck(); },
    });
  }

  private cargarComentarios(id: number): void {
    this.cargandoComentarios = true;
    this.cdr.markForCheck();
    this.svc.getComentarios(id).subscribe({
      next: (c) => { this.todosComentarios = c; this.cargandoComentarios = false; this.cdr.markForCheck(); },
      error: () => { this.cargandoComentarios = false; this.cdr.markForCheck(); },
    });
  }

  // ── Comentarios ──────────────────────────────────────────────────────────────

  get comentarios(): GarantiaComentario[] {
    return this.todosComentarios.filter(c => c.tipo === 'comentario');
  }

  get historial(): GarantiaComentario[] {
    return this.todosComentarios.filter(c => c.tipo !== 'comentario');
  }

  enviarComentario(): void {
    if (!this.ticketSeleccionado || !this.nuevoComentario.trim() || this.enviandoComentario) return;
    this.enviandoComentario = true;
    this.cdr.markForCheck();
    const autor = this.getNombreUsuario();
    this.svc.addComentario(this.ticketSeleccionado.id, autor, this.nuevoComentario.trim()).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.enviandoComentario = false;
        this.cargarComentarios(this.ticketSeleccionado!.id);
      },
      error: () => { this.enviandoComentario = false; this.cdr.markForCheck(); },
    });
  }

  // ── Re-subida de documentos ───────────────────────────────────────────────────

  onReupload(event: Event, campo: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.ticketSeleccionado) return;
    const file = input.files[0];
    this.resubiendo[campo] = true;
    this.cdr.markForCheck();
    this.svc.subirArchivo(file).subscribe({
      next: (res) => {
        this.svc.actualizarDato(this.ticketSeleccionado!.id, campo, res.nombre).subscribe({
          next: (r) => {
            this.validacionDocs = { ...(r.validacion_docs_json ?? {}) };
            if (this.ticketSeleccionado) {
              if (!this.ticketSeleccionado.datos) this.ticketSeleccionado.datos = {};
              this.ticketSeleccionado.datos[campo] = res.nombre;
              this.ticketSeleccionado.validacion_docs_json = this.validacionDocs;
            }
            this.resubiendo[campo] = false;
            this.cargarComentarios(this.ticketSeleccionado!.id);
          },
          error: () => { this.resubiendo[campo] = false; this.cdr.markForCheck(); },
        });
      },
      error: () => { this.resubiendo[campo] = false; this.cdr.markForCheck(); },
    });
  }

  // ── Re-entrada de número de serie ─────────────────────────────────────────────

  actualizarSerie(): void {
    if (!this.ticketSeleccionado || !this.nuevaSerie.trim() || this.actualizandoSerie) return;
    this.actualizandoSerie = true;
    this.cdr.markForCheck();
    this.svc.actualizarDato(this.ticketSeleccionado.id, 'bici_serie', this.nuevaSerie.trim()).subscribe({
      next: (r) => {
        this.validacionDocs = { ...(r.validacion_docs_json ?? {}) };
        if (this.ticketSeleccionado) {
          if (!this.ticketSeleccionado.datos) this.ticketSeleccionado.datos = {};
          this.ticketSeleccionado.datos['bici_serie'] = this.nuevaSerie.trim();
          this.ticketSeleccionado.validacion_docs_json = this.validacionDocs;
        }
        this.actualizandoSerie = false;
        this.cargarComentarios(this.ticketSeleccionado!.id);
      },
      error: () => { this.actualizandoSerie = false; this.cdr.markForCheck(); },
    });
  }

  // ── Filtrado y paginación de lista ───────────────────────────────────────────

  get marcasDisponibles(): string[] {
    const set = new Set(this.tickets.map(t => t.marca).filter(Boolean));
    return Array.from(set).sort();
  }

  get estatusDisponibles(): string[] {
    const set = new Set(this.tickets.map(t => t.estatus).filter(Boolean));
    return Array.from(set).sort();
  }

  get ticketsFiltrados(): GarantiaFormulario[] {
    const q = this.busqueda.toLowerCase().trim();
    return this.tickets.filter(t => {
      if (q && !t.folio?.toLowerCase().includes(q) && !t.distribuidor?.toLowerCase().includes(q)) return false;
      if (this.filtroEstatus && t.estatus !== this.filtroEstatus) return false;
      if (this.filtroMarca && t.marca !== this.filtroMarca) return false;
      return true;
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.ticketsFiltrados.length / this.tamPagina));
  }

  get ticketsPaginados(): GarantiaFormulario[] {
    const inicio = (this.paginaActual - 1) * this.tamPagina;
    return this.ticketsFiltrados.slice(inicio, inicio + this.tamPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  resetFiltros(): void {
    this.busqueda = '';
    this.filtroEstatus = '';
    this.filtroMarca = '';
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    this.cdr.markForCheck();
  }

  onFiltroChange(): void {
    this.paginaActual = 1;
    this.cdr.markForCheck();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  get documentosTicket(): Array<{ key: string; nombre: string; legible: string; label: string }> {
    if (!this.ticketSeleccionado?.datos) return [];
    return Object.entries(this.ticketSeleccionado.datos)
      .filter(([k, v]) => /^(bici_doc|scott_doc|vittoria_doc)\d+$/.test(k) && v)
      .map(([k, v]) => ({
        key: k,
        nombre: String(v),
        legible: this.nombreLegible(String(v)),
        label: DOC_LABELS[k] ?? k,
      }));
  }

  get serieTicket(): string | null {
    const s = this.ticketSeleccionado?.datos?.['bici_serie'];
    return s ? String(s) : null;
  }

  archivoVerUrl(nombre: string): string {
    return `${environment.apiUrl}/garantias/archivo/${nombre}`;
  }

  esImagen(nombre: string): boolean {
    return /\.(png|jpg|jpeg|gif|webp)$/i.test(nombre);
  }

  esPDF(nombre: string): boolean {
    return /\.pdf$/i.test(nombre);
  }

  nombreLegible(nombre: string): string {
    return nombre.replace(/^[0-9a-f]{32}_/i, '');
  }

  iconoArchivo(nombre: string): string {
    if (this.esImagen(nombre)) return 'fa-image';
    if (this.esPDF(nombre)) return 'fa-file-pdf';
    return 'fa-file-alt';
  }

  colorEstatus(estatus: string): string {
    return COLOR_ESTATUS[estatus?.toLowerCase()] ?? '#888';
  }

  colorPieza(estatus: string): string {
    return COLOR_PIEZA[estatus?.toLowerCase()] ?? '#444';
  }

  iconoHistorial(tipo: string): string {
    switch (tipo) {
      case 'estatus':    return 'fa-exchange-alt';
      case 'pieza':      return 'fa-tools';
      case 'validacion': return 'fa-shield-alt';
      default:           return 'fa-circle';
    }
  }

  private getNombreUsuario(): string {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 'Cliente';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.nombre || 'Cliente';
    } catch { return 'Cliente'; }
  }
}
