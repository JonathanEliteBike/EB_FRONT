import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { GarantiasService, GarantiaFormulario } from '../../../../services/garantias.service';
import { SECCIONES } from '../garantias-formulario/garantias-formulario.component';

export interface EditorSeccion {
  id: number;
  titulo: string;
  descripcion: string;
  activa: boolean;
  expandida: boolean;
  campos: EditorCampo[];
}

export interface EditorCampo {
  id: string;
  label: string;
  tipo: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'radio' | 'file' | 'checkbox';
  requerido: boolean;
  opciones?: string[];
  editando?: boolean;
}

function buildEstructura(): EditorSeccion[] {
  const mapa: Record<number, EditorCampo[]> = {
    1:  [
          { id: 'email', label: 'Correo Electrónico', tipo: 'email', requerido: true },
        ],
    2:  [
          { id: 'distribuidor', label: 'Razón Social del Distribuidor', tipo: 'select', requerido: true },
          { id: 'contacto', label: 'Nombre del Contacto', tipo: 'text', requerido: true },
          { id: 'puesto', label: 'Puesto o Cargo', tipo: 'text', requerido: true },
          { id: 'marca', label: 'Marca del Producto', tipo: 'radio', requerido: true,
            opciones: ['SCOTT', 'SYNCROS', 'VITTORIA', 'BOLD', 'MEGAMO'] },
        ],
    3:  [
          { id: 'megamo_grupo', label: 'Grupo de Productos (MEGAMO/BOLD)', tipo: 'radio', requerido: true,
            opciones: ['Bicicletas', 'Componentes'] },
          { id: 'megamo_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'megamo_anio', label: 'Año del Producto', tipo: 'number', requerido: false },
          { id: 'megamo_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
          { id: 'megamo_dano', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'megamo_archivo1', label: 'Fotografía / Video del Daño 1', tipo: 'file', requerido: false },
          { id: 'megamo_archivo2', label: 'Fotografía / Video del Daño 2', tipo: 'file', requerido: false },
        ],
    4:  [
          { id: 'scott_grupo', label: 'Grupo de Productos SCOTT', tipo: 'radio', requerido: true,
            opciones: ['Bicicletas', 'Cascos', 'Protecciones', 'Zapatos', 'Componentes'] },
        ],
    5:  [
          { id: 'casco_modelo', label: 'Modelo del Casco', tipo: 'text', requerido: true },
          { id: 'casco_anio', label: 'Año', tipo: 'number', requerido: true },
          { id: 'casco_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
          { id: 'casco_tipo', label: 'Tipo de Casco', tipo: 'text', requerido: false },
        ],
    6:  [
          { id: 'casco_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'casco_dano_ubic', label: 'Ubicación del Daño', tipo: 'text', requerido: false },
        ],
    7:  [
          { id: 'prot_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'prot_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'prot_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
        ],
    8:  [
          { id: 'prot_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'prot_dano_tipo', label: 'Tipo de Daño', tipo: 'text', requerido: false },
        ],
    9:  [
          { id: 'zapato_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'zapato_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'zapato_talla', label: 'Talla', tipo: 'text', requerido: true },
        ],
    10: [
          { id: 'zapato_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'zapato_dano_ubic', label: 'Ubicación del Daño en el Zapato', tipo: 'text', requerido: false },
        ],
    11: [
          { id: 'comp_tipo', label: 'Tipo de Componente', tipo: 'radio', requerido: true,
            opciones: ['Bosch', 'Mahle', 'TQ'] },
          { id: 'comp_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'comp_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
        ],
    12: [
          { id: 'comp_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'comp_error', label: 'Código de Error (si aplica)', tipo: 'text', requerido: false },
        ],
    13: [
          { id: 'scott_doc1', label: 'Fotografía / Video 1', tipo: 'file', requerido: false },
          { id: 'scott_doc2', label: 'Fotografía / Video 2', tipo: 'file', requerido: false },
          { id: 'scott_doc3', label: 'Fotografía / Video 3', tipo: 'file', requerido: false },
          { id: 'scott_doc4', label: 'Fotografía / Video 4', tipo: 'file', requerido: false },
        ],
    14: [
          { id: 'bici_modelo', label: 'Modelo de la Bicicleta', tipo: 'text', requerido: true },
          { id: 'bici_anio', label: 'Año del Modelo', tipo: 'number', requerido: true },
          { id: 'bici_serie', label: 'Número de Serie del Marco', tipo: 'text', requerido: true },
          { id: 'scott_tipo_marco', label: 'Tipo de Marco', tipo: 'radio', requerido: true,
            opciones: ['Doble suspensión', 'Rígida', 'Plasma', 'Foil', 'Ruta', 'Gravel', 'E-Ride'] },
        ],
    15: [{ id: 'marco_dano_15', label: 'Descripción del Daño (Doble Suspensión)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_15', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    16: [{ id: 'marco_dano_16', label: 'Descripción del Daño (Rígida)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_16', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    17: [{ id: 'marco_dano_17', label: 'Descripción del Daño (Plasma)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_17', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    18: [{ id: 'marco_dano_18', label: 'Descripción del Daño (Foil)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_18', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    19: [{ id: 'marco_dano_19', label: 'Descripción del Daño (Ruta)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_19', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    20: [{ id: 'marco_dano_20', label: 'Descripción del Daño (Gravel)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_20', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    21: [{ id: 'marco_dano_21', label: 'Descripción del Daño (E-Ride)', tipo: 'textarea', requerido: true },
         { id: 'marco_zona_21', label: 'Zona afectada del marco', tipo: 'text', requerido: false }],
    22: [
          { id: 'bici_doc1', label: 'Fotografía / Documento 1', tipo: 'file', requerido: false },
          { id: 'bici_doc2', label: 'Fotografía / Documento 2', tipo: 'file', requerido: false },
          { id: 'bici_doc3', label: 'Fotografía / Documento 3', tipo: 'file', requerido: false },
          { id: 'bici_doc4', label: 'Fotografía / Documento 4', tipo: 'file', requerido: false },
          { id: 'bici_doc5', label: 'Fotografía / Documento 5', tipo: 'file', requerido: false },
        ],
    23: [
          { id: 'syncros_tipo', label: 'Tipo de Producto SYNCROS', tipo: 'radio', requerido: true,
            opciones: ['Manubrios', 'Asientos', 'Poste', 'Ruedos/Rines'] },
        ],
    24: [
          { id: 'manubrio_modelo', label: 'Modelo del Manubrio', tipo: 'text', requerido: true },
          { id: 'manubrio_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'manubrio_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'manubrio_medidas', label: 'Medidas (ancho/rise)', tipo: 'text', requerido: false },
        ],
    25: [
          { id: 'manubrio_dano_desc', label: 'Descripción del Daño — Manubrios', tipo: 'textarea', requerido: true },
          { id: 'manubrio_archivo', label: 'Fotografía del Daño', tipo: 'file', requerido: false },
        ],
    26: [
          { id: 'asiento_modelo', label: 'Modelo del Asiento', tipo: 'text', requerido: true },
          { id: 'asiento_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'asiento_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
        ],
    27: [
          { id: 'asiento_dano_desc', label: 'Descripción del Daño — Asiento', tipo: 'textarea', requerido: true },
          { id: 'asiento_archivo', label: 'Fotografía del Daño', tipo: 'file', requerido: false },
        ],
    28: [
          { id: 'poste_modelo', label: 'Modelo del Poste', tipo: 'text', requerido: true },
          { id: 'poste_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'poste_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'poste_medidas', label: 'Diámetro / Longitud', tipo: 'text', requerido: false },
        ],
    29: [
          { id: 'poste_dano_desc', label: 'Descripción del Daño — Poste', tipo: 'textarea', requerido: true },
          { id: 'poste_archivo', label: 'Fotografía del Daño', tipo: 'file', requerido: false },
        ],
    30: [
          { id: 'rin_modelo', label: 'Modelo del Rin', tipo: 'text', requerido: true },
          { id: 'rin_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'rin_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'rin_medida', label: 'Medida / Diámetro', tipo: 'text', requerido: false },
        ],
    31: [
          { id: 'rin_dano_desc', label: 'Descripción del Daño — Ruedos/Rines', tipo: 'textarea', requerido: true },
          { id: 'rin_archivo', label: 'Fotografía del Daño', tipo: 'file', requerido: false },
        ],
    32: [
          { id: 'vittoria_modelo', label: 'Modelo del Producto', tipo: 'text', requerido: true },
          { id: 'vittoria_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'vittoria_lote', label: 'Número de Lote / Código', tipo: 'text', requerido: false },
          { id: 'vittoria_medida', label: 'Medida', tipo: 'text', requerido: false },
        ],
    33: [
          { id: 'vittoria_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
          { id: 'vittoria_doc1', label: 'Fotografía / Evidencia 1', tipo: 'file', requerido: false },
          { id: 'vittoria_doc2', label: 'Fotografía / Evidencia 2', tipo: 'file', requerido: false },
          { id: 'vittoria_doc3', label: 'Fotografía / Evidencia 3', tipo: 'file', requerido: false },
        ],
    34: [
          { id: 'terminos_aceptados', label: 'Aceptación de Términos y Condiciones', tipo: 'checkbox', requerido: true },
        ],
  };

  return SECCIONES.map(s => ({
    id: s.id,
    titulo: s.label,
    descripcion: '',
    activa: true,
    expandida: false,
    campos: mapa[s.id] ?? [],
  }));
}

@Component({
  selector: 'app-garantias-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent],
  templateUrl: './garantias-editor.component.html',
  styleUrl: './garantias-editor.component.css',
})
export class GarantiasEditorComponent implements OnInit {
  secciones: EditorSeccion[] = [];
  formularios: GarantiaFormulario[] = [];

  tab: 'editor' | 'submissions' = 'editor';

  guardando = false;
  guardadoOk = false;
  cargando = true;
  errorMsg = '';

  detalle: GarantiaFormulario | null = null;
  cargandoDetalle = false;

  nuevoLabel = '';
  nuevoCampoSecId: number | null = null;

  readonly tipoIcono: Record<string, string> = {
    text:     'fa-font',
    email:    'fa-envelope',
    number:   'fa-hashtag',
    textarea: 'fa-align-left',
    select:   'fa-chevron-down',
    radio:    'fa-dot-circle',
    file:     'fa-paperclip',
    checkbox: 'fa-check-square',
  };

  constructor(private svc: GarantiasService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.svc.obtenerEstructura().subscribe({
      next: (res) => {
        if (res.estructura && Array.isArray(res.estructura)) {
          this.secciones = res.estructura;
        } else {
          this.secciones = buildEstructura();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.secciones = buildEstructura();
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
    this.cargarFormularios();
  }

  cargarFormularios(): void {
    this.svc.listarFormularios().subscribe({
      next: (rows) => { this.formularios = rows; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  toggleExpand(sec: EditorSeccion): void {
    sec.expandida = !sec.expandida;
  }

  iniciarEditarCampo(campo: EditorCampo): void {
    campo.editando = true;
  }

  guardarCampo(campo: EditorCampo): void {
    campo.editando = false;
  }

  agregarCampo(sec: EditorSeccion): void {
    if (!this.nuevoLabel.trim()) return;
    sec.campos.push({
      id: `campo_${Date.now()}`,
      label: this.nuevoLabel.trim(),
      tipo: 'text',
      requerido: false,
    });
    this.nuevoLabel = '';
    this.nuevoCampoSecId = null;
  }

  eliminarCampo(sec: EditorSeccion, idx: number): void {
    sec.campos.splice(idx, 1);
  }

  moverCampoArriba(sec: EditorSeccion, idx: number): void {
    if (idx === 0) return;
    const tmp = sec.campos[idx - 1];
    sec.campos[idx - 1] = sec.campos[idx];
    sec.campos[idx] = tmp;
  }

  moverCampoAbajo(sec: EditorSeccion, idx: number): void {
    if (idx === sec.campos.length - 1) return;
    const tmp = sec.campos[idx + 1];
    sec.campos[idx + 1] = sec.campos[idx];
    sec.campos[idx] = tmp;
  }

  guardarEstructura(): void {
    this.guardando = true;
    this.guardadoOk = false;
    this.errorMsg = '';
    this.svc.guardarEstructura(this.secciones).subscribe({
      next: () => {
        this.guardando = false;
        this.guardadoOk = true;
        setTimeout(() => { this.guardadoOk = false; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'Error al guardar la estructura.';
        this.cdr.detectChanges();
      },
    });
  }

  verDetalle(f: GarantiaFormulario): void {
    this.cargandoDetalle = true;
    this.detalle = null;
    this.svc.obtenerFormulario(f.id).subscribe({
      next: (row) => { this.detalle = row; this.cargandoDetalle = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoDetalle = false; this.cdr.detectChanges(); },
    });
  }

  cerrarDetalle(): void { this.detalle = null; }

  actualizarEstatus(id: number, estatus: string): void {
    this.svc.actualizarEstatus(id, estatus).subscribe({
      next: () => {
        const f = this.formularios.find(x => x.id === id);
        if (f) f.estatus = estatus;
        if (this.detalle?.id === id) this.detalle.estatus = estatus;
        this.cdr.detectChanges();
      },
    });
  }

  onOpcionesInput(campo: EditorCampo, event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    campo.opciones = val.split('\n').map(s => s.trim()).filter(s => !!s);
  }

  get detalleEntries(): [string, any][] {
    if (!this.detalle?.datos) return [];
    return Object.entries(this.detalle.datos)
      .filter(([k]) => !k.endsWith('_original') && !k.startsWith('archivo'))
      .slice(0, 40);
  }
}
