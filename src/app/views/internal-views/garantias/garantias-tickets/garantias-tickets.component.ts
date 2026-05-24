import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import {
  GarantiasService,
  GarantiaFormulario,
  GarantiaComentario,
} from '../../../../services/garantias.service';
import { environment } from '../../../../../environments/environment';

const ESTATUSES = ['Todos', 'Enviado', 'En revisión', 'Aprobado', 'Rechazado', 'Cerrado'];

const COLOR_ESTATUS: Record<string, string> = {
  enviado:      '#f0ad4e',
  'en revisión':'#5c9bd6',
  aprobado:     '#4caf50',
  rechazado:    '#e53935',
  cerrado:      '#555',
};

const ESTATUSES_PIEZA = ['Sin pieza', 'Solicitada', 'En tránsito', 'En almacén', 'Enviada al cliente', 'Rechazada'];

const PIEZAS_REEMPLAZO = [
  'N/A',
  'ASIENTO', 'BATERIA', 'CUADRO', 'DROPPER', 'DROPPER POST',
  'FRENOS', 'GUANTES', 'HANGER', 'LLANTA', 'MANDO E-BIKE',
  'MAUBRIO', 'POTENCIA', 'RINES', 'SUSPENSION', 'TRANSMISION',
  'TWINLOCK', 'UNIDAD MOTRIZ', 'ZAPATOS',
];

const DOC_LABELS: Record<string, string> = {
  // Bicicletas (Scott / Megamo)
  bici_doc1: 'Fotografía del Daño',
  bici_doc2: 'Fotografía del Número de Serie',
  bici_doc3: 'Fotografía del Producto Completo',
  bici_doc4: 'Factura de Compra y Factura de Venta',
  bici_doc5: 'Hojas del Historial de Servicio',
  // Scott no-bicicletas (cascos, zapatos, protecciones, componentes)
  scott_doc1: 'Fotografía del Daño',
  scott_doc2: 'Fotografía del Año de Fabricación / Número de Serie',
  scott_doc3: 'Fotografía del Producto',
  scott_doc4: 'Factura de Compra y Factura de Venta',
  // Vittoria (llantas, zapatos, accesorios)
  vittoria_doc1: 'Fotografía del Daño',
  vittoria_doc2: 'Fotografía del Año de Fabricación / Número de Serie',
  vittoria_doc3: 'Fotografía del Producto',
  vittoria_doc4: 'Factura de Compra y Factura de Venta',
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
  selector: 'app-garantias-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent],
  templateUrl: './garantias-tickets.component.html',
  styleUrl: './garantias-tickets.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarantiasTicketsComponent implements OnInit {
  readonly estatuses        = ESTATUSES;
  readonly estatusesPieza   = ESTATUSES_PIEZA;
  readonly piezasReemplazo  = PIEZAS_REEMPLAZO;

  tickets: GarantiaFormulario[] = [];
  cargando = true;
  error = '';

  // Filtros
  busqueda     = '';
  filtroEstatus = 'Todos';
  filtroMarca   = 'Todas';
  filtroMes     = '';

  // Detalle
  selected: GarantiaFormulario | null = null;
  cargandoDetalle = false;
  comentarios: GarantiaComentario[] = [];
  cargandoComentarios = false;

  // Nuevo comentario
  nuevoComentario = '';
  nuevoAutor = 'Administrador';
  enviandoComentario = false;

  // Cambio de estatus / pieza
  cambiandoEstatus   = false;
  cambiandoPieza     = false;
  cambiandoPiezaReem = false;
  piezaSeleccionada  = '';

  // Validación por campo (docs + serie): campo → 'valido' | 'rechazado'
  validacionDocs: Record<string, string> = {};
  validandoDoc: Record<string, boolean>  = {};

  constructor(private svc: GarantiasService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();
    this.svc.listarFormularios().subscribe({
      next: (t) => {
        this.tickets  = t;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error    = 'Error al cargar tickets.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  get marcas(): string[] {
    const set = new Set(this.tickets.map(t => t.marca).filter(Boolean));
    return ['Todas', ...Array.from(set).sort()];
  }

  get mesesDisponibles(): string[] {
    const set = new Set<string>();
    this.tickets.forEach(t => {
      const m = (t.fecha_creacion ?? '').slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }

  formatMes(ym: string): string {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${meses[parseInt(m, 10) - 1] ?? m} ${y}`;
  }

  get ticketsFiltrados(): GarantiaFormulario[] {
    const q  = this.busqueda.toLowerCase().trim();
    const es = this.filtroEstatus;
    const ma = this.filtroMarca;
    const me = this.filtroMes;
    return this.tickets.filter(t => {
      if (es !== 'Todos' && t.estatus !== es) return false;
      if (ma !== 'Todas' && t.marca    !== ma) return false;
      if (me && !(t.fecha_creacion ?? '').startsWith(me))   return false;
      if (q && !(`${t.folio} ${t.distribuidor} ${t.contacto} ${t.marca}`).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  colorEstatus(estatus: string): string {
    return COLOR_ESTATUS[estatus?.toLowerCase()] ?? '#888';
  }

  seleccionarTicket(t: GarantiaFormulario): void {
    this.selected = t;
    this.comentarios = [];
    this.nuevoComentario = '';
    this.validacionDocs   = { ...(t.validacion_docs_json ?? {}) };
    this.validandoDoc     = {};
    this.piezaSeleccionada = t.pieza_reemplazo ?? '';
    this.cdr.markForCheck();
    this.cargarDetalle(t.id);
    this.cargarComentarios(t.id);
  }

  cerrarDetalle(): void {
    this.selected = null;
    this.cdr.markForCheck();
  }

  private cargarDetalle(id: number): void {
    this.cargandoDetalle = true;
    this.cdr.markForCheck();
    this.svc.obtenerFormulario(id).subscribe({
      next: (f) => {
        this.selected          = f;
        this.validacionDocs    = { ...(f.validacion_docs_json ?? {}) };
        this.validandoDoc      = {};
        this.piezaSeleccionada = f.pieza_reemplazo ?? '';
        this.cargandoDetalle   = false;
        this.cdr.markForCheck();
      },
      error: () => { this.cargandoDetalle = false; this.cdr.markForCheck(); },
    });
  }

  private cargarComentarios(id: number): void {
    this.cargandoComentarios = true;
    this.cdr.markForCheck();
    this.svc.getComentarios(id).subscribe({
      next: (c) => {
        this.comentarios = c;
        this.cargandoComentarios = false;
        this.cdr.markForCheck();
      },
      error: () => { this.cargandoComentarios = false; this.cdr.markForCheck(); },
    });
  }

  cambiarEstatus(nuevoEstatus: string): void {
    if (!this.selected || this.cambiandoEstatus) return;
    const prev = this.selected.estatus;
    if (prev === nuevoEstatus) return;
    this.cambiandoEstatus = true;
    this.cdr.markForCheck();
    this.svc.actualizarEstatus(this.selected.id, nuevoEstatus).subscribe({
      next: () => {
        const texto = `Estatus cambiado de "${prev}" a "${nuevoEstatus}"`;
        this.svc.addComentario(this.selected!.id, 'Sistema', texto, 'estatus').subscribe({
          next: () => {
            this.selected!.estatus = nuevoEstatus;
            const idx = this.tickets.findIndex(t => t.id === this.selected!.id);
            if (idx >= 0) this.tickets[idx].estatus = nuevoEstatus;
            this.cambiandoEstatus = false;
            this.cargarComentarios(this.selected!.id);
          },
          error: () => {
            this.selected!.estatus = nuevoEstatus;
            this.cambiandoEstatus = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => { this.cambiandoEstatus = false; this.cdr.markForCheck(); },
    });
  }

  enviarComentario(): void {
    if (!this.selected || !this.nuevoComentario.trim() || this.enviandoComentario) return;
    this.enviandoComentario = true;
    this.cdr.markForCheck();
    this.svc.addComentario(this.selected.id, this.nuevoAutor, this.nuevoComentario.trim()).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.enviandoComentario = false;
        this.cargarComentarios(this.selected!.id);
      },
      error: () => { this.enviandoComentario = false; this.cdr.markForCheck(); },
    });
  }

  get piezaEsNA(): boolean {
    return this.piezaSeleccionada === 'N/A';
  }

  cambiarPiezaReemplazo(pieza: string): void {
    if (!this.selected || this.cambiandoPiezaReem) return;
    if (pieza === (this.selected.pieza_reemplazo ?? '')) return;
    this.cambiandoPiezaReem = true;
    this.cdr.markForCheck();
    this.svc.actualizarPiezaReemplazo(this.selected.id, pieza).subscribe({
      next: () => {
        this.selected!.pieza_reemplazo = pieza;
        const idx = this.tickets.findIndex(t => t.id === this.selected!.id);
        if (idx >= 0) this.tickets[idx].pieza_reemplazo = pieza;
        this.cambiandoPiezaReem = false;
        this.cargarComentarios(this.selected!.id);
      },
      error: () => { this.cambiandoPiezaReem = false; this.cdr.markForCheck(); },
    });
  }

  colorPieza(estatus: string): string {
    return COLOR_PIEZA[estatus?.toLowerCase()] ?? '#444';
  }

  cambiarPieza(nuevoEstatus: string): void {
    if (!this.selected || this.cambiandoPieza) return;
    const prev = this.selected.estatus_pieza;
    if (prev === nuevoEstatus) return;
    this.cambiandoPieza = true;
    this.cdr.markForCheck();
    this.svc.actualizarPieza(this.selected.id, nuevoEstatus).subscribe({
      next: () => {
        this.selected!.estatus_pieza = nuevoEstatus;
        const idx = this.tickets.findIndex(t => t.id === this.selected!.id);
        if (idx >= 0) this.tickets[idx].estatus_pieza = nuevoEstatus;
        this.cambiandoPieza = false;
        this.cargarComentarios(this.selected!.id);
      },
      error: () => { this.cambiandoPieza = false; this.cdr.markForCheck(); },
    });
  }

  toggleValidacionDoc(campo: string, nombre: string, nuevoEstado: 'valido' | 'rechazado'): void {
    if (!this.selected || this.validandoDoc[campo]) return;
    // Si ya tiene ese estado, limpia (toggle off)
    const estadoActual = this.validacionDocs[campo];
    const estado: string | null = estadoActual === nuevoEstado ? null : nuevoEstado;

    this.validandoDoc[campo] = true;
    this.cdr.markForCheck();

    this.svc.validarDocumento(this.selected.id, campo, estado, nombre).subscribe({
      next: (res) => {
        this.validacionDocs = { ...(res.validacion_docs_json ?? {}) };
        if (this.selected) this.selected.validacion_docs_json = this.validacionDocs;
        this.validandoDoc[campo] = false;
        this.cargarComentarios(this.selected!.id);
      },
      error: () => { this.validandoDoc[campo] = false; this.cdr.markForCheck(); },
    });
  }

  // ── Helpers de archivo ──────────────────────────────────────────────────
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
    // Strip leading UUID hex prefix (32 hex chars + underscore)
    return nombre.replace(/^[0-9a-f]{32}_/i, '');
  }

  iconoArchivo(nombre: string): string {
    if (this.esImagen(nombre)) return 'fa-image';
    if (this.esPDF(nombre))    return 'fa-file-pdf';
    return 'fa-file-alt';
  }

  // ── Getters de secciones de datos ──────────────────────────────────────
  get documentos(): Array<{ key: string; nombre: string; legible: string; label: string }> {
    if (!this.selected?.datos) return [];
    return Object.entries(this.selected.datos)
      .filter(([k, v]) => /^(bici_doc|scott_doc|vittoria_doc)\d+$/.test(k) && v)
      .map(([k, v]) => ({
        key:    k,
        nombre: String(v),
        legible: this.nombreLegible(String(v)),
        label:  DOC_LABELS[k] ?? k,
      }));
  }

  get serieCard(): { value: string } | null {
    const serie = this.selected?.datos?.['bici_serie'];
    return serie ? { value: String(serie) } : null;
  }

  get datosBicicleta(): Array<{ label: string; value: any }> {
    const LABELS: Record<string, string> = {
      bici_anio:   'Año',
      bici_modelo: 'Modelo',
    };
    if (!this.selected?.datos) return [];
    return Object.entries(this.selected.datos)
      .filter(([k]) => k in LABELS)
      .map(([k, v]) => ({ label: LABELS[k], value: v }));
  }

  get datosMarca(): Array<{ label: string; value: any }> {
    const LABELS: Record<string, string> = {
      scott_grupo:      'Grupo Scott',
      scott_tipo_marco: 'Tipo de Marco',
      megamo_grupo:     'Grupo Megamo',
      syncros_tipo:     'Tipo Syncros',
    };
    if (!this.selected?.datos) return [];
    return Object.entries(this.selected.datos)
      .filter(([k, v]) => k in LABELS && v)
      .map(([k, v]) => ({ label: LABELS[k], value: v }));
  }

  get danosMarco(): Array<{ seccion: number; localizacion: string; tipo: string; comentarios: string }> {
    if (!this.selected?.datos) return [];
    const datos = this.selected.datos as Record<string, any>;
    const vistos = new Set<number>();
    const result: any[] = [];
    Object.keys(datos).forEach(k => {
      const m = k.match(/^marco_\w+_(\d+)$/);
      if (m) {
        const sec = parseInt(m[1], 10);
        if (!vistos.has(sec)) {
          vistos.add(sec);
          result.push({
            seccion: sec,
            localizacion: datos[`marco_localizacion_${sec}`] ?? '',
            tipo:         datos[`marco_tipo_dano_${sec}`]   ?? '',
            comentarios:  datos[`marco_comentarios_${sec}`] ?? '',
          });
        }
      }
    });
    return result.sort((a, b) => a.seccion - b.seccion);
  }

  get hayDatos(): boolean {
    return this.datosBicicleta.length > 0 || this.documentos.length > 0
        || this.datosMarca.length > 0 || this.danosMarco.length > 0;
  }
}
