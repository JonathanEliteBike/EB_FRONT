import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { GarantiasService, GarantiaFormulario } from '../../../../services/garantias.service';
import {
  SECCIONES, DISTRIBUIDORES, PUESTOS, TALLAS_PROTECCION, TIPOS_COMPONENTE,
  PROT_LOCALIZACIONES, PROT_TIPOS_DANO, ZAPATO_TIPOS_DANO, CASCO_TIPOS_DANO,
  MANUBRIO_LOCALIZACIONES, SYNCROS_TIPOS_DANO, ASIENTO_LOCALIZACIONES,
  POSTE_LOCALIZACIONES, RIN_LOCALIZACIONES, RIN_TIPOS_DANO, TIPOS_DANO,
} from '../garantias-formulario/garantias-formulario.component';

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
  tipo: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'radio' | 'file' | 'checkbox' | 'scale';
  requerido: boolean;
  opciones?: string[];
  editando?: boolean;
}

// Ramificación (isVisible en el formulario) — no editables desde aquí.
const TIPOS_MARCO   = ['Doble suspensión', 'Rígida', 'Plasma', 'Foil', 'Ruta', 'Gravel', 'E-Ride'];
const TIPOS_MARCO_B = ['Doble suspensión'];
const TIPOS_MARCO_M = ['Doble suspensión', 'Rígida', 'Ruta', 'Gravel', 'E-Ride'];

function marcoDanoFields(n: number): EditorCampo[] {
  return [
    { id: `marco_localizacion_${n}`, label: 'Localización del Daño (no editable — numerada contra el diagrama del marco)', tipo: 'select', requerido: true },
    { id: `marco_tipo_dano_${n}`, label: 'Tipo de Daño (comparte lista con todas las secciones de Marco — edítala en la sección 15)', tipo: 'radio', requerido: true,
      opciones: TIPOS_DANO },
    { id: `marco_tipo_dano_otros_${n}`, label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
    { id: `marco_comentarios_${n}`, label: 'Comentarios', tipo: 'textarea', requerido: true },
  ];
}

function buildEstructura(): EditorSeccion[] {
  const mapa: Record<number, EditorCampo[]> = {
    1:  [
          { id: 'email', label: 'Correo Electrónico', tipo: 'email', requerido: true },
        ],
    2:  [
          { id: 'distribuidor', label: 'Razón Social del Distribuidor', tipo: 'select', requerido: true,
            opciones: DISTRIBUIDORES },
          { id: 'contacto', label: 'Nombre del Contacto', tipo: 'text', requerido: true },
          { id: 'puesto', label: 'Rol dentro de la compañía', tipo: 'radio', requerido: true,
            opciones: PUESTOS },
          { id: 'marca', label: 'Marca del Producto (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: ['SCOTT', 'SYNCROS', 'VITTORIA', 'BOLD', 'MEGAMO'] },
        ],
    3:  [
          { id: 'bici_modelo', label: 'Modelo de la Bicicleta', tipo: 'text', requerido: true },
          { id: 'bici_anio', label: 'Año del Modelo', tipo: 'number', requerido: true },
          { id: 'bici_serie', label: 'Número de Serie del Marco', tipo: 'text', requerido: true },
          { id: 'scott_tipo_marco', label: 'Tipo de Marco (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: TIPOS_MARCO_B },
        ],
    4:  [
          { id: 'scott_grupo', label: 'Grupo de Productos SCOTT (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: ['Bicicletas', 'Cascos', 'Protecciones', 'Zapatos', 'Componentes - Piezas Eléctricas'] },
        ],
    5:  [
          { id: 'casco_modelo', label: 'Modelo del Casco', tipo: 'text', requerido: true },
          { id: 'casco_anio', label: 'Año de Fabricación', tipo: 'number', requerido: true },
          { id: 'casco_color', label: 'Color', tipo: 'text', requerido: false },
          { id: 'casco_talla', label: 'Talla (comparte lista con Protecciones, sección 7)', tipo: 'select', requerido: true,
            opciones: TALLAS_PROTECCION },
          { id: 'casco_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
        ],
    6:  [
          { id: 'casco_localizacion', label: 'Localización del Daño (no editable — numerada contra el diagrama del casco)', tipo: 'select', requerido: true,
            opciones: ['Casco', 'Visor', 'Correa', 'Hebilla de correa', 'Forro', 'Sistema de ajuste',
                       'Capa baja fricción MIPS', 'Canasta de ajuste MIPS', 'Pin de ajuste MIPS', 'Fijación de gama MIPS'] },
          { id: 'casco_tipo_dano', label: 'Tipo de Daño', tipo: 'radio', requerido: true,
            opciones: CASCO_TIPOS_DANO },
          { id: 'casco_tipo_dano_otro', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'casco_comentarios', label: 'Comentarios adicionales', tipo: 'textarea', requerido: false },
        ],
    7:  [
          { id: 'prot_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'prot_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'prot_talla', label: 'Talla (comparte lista con Cascos, sección 5 — edítala ahí)', tipo: 'select', requerido: false,
            opciones: TALLAS_PROTECCION },
          { id: 'prot_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
        ],
    8:  [
          { id: 'prot_localizacion', label: 'Localización del Daño', tipo: 'radio', requerido: true,
            opciones: PROT_LOCALIZACIONES },
          { id: 'prot_localizacion_otro', label: 'Especificar localización (Otros)', tipo: 'text', requerido: false },
          { id: 'prot_tipo_dano', label: 'Tipo de Daño', tipo: 'radio', requerido: true,
            opciones: PROT_TIPOS_DANO },
          { id: 'prot_tipo_dano_otro', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'prot_comentarios', label: 'Comentarios adicionales', tipo: 'textarea', requerido: false },
        ],
    9:  [
          { id: 'zapato_modelo', label: 'Modelo', tipo: 'text', requerido: true },
          { id: 'zapato_color', label: 'Color', tipo: 'text', requerido: false },
          { id: 'zapato_talla', label: 'Talla', tipo: 'text', requerido: true },
          { id: 'zapato_serie', label: 'Número de Serie', tipo: 'text', requerido: false },
        ],
    10: [
          { id: 'zapato_localizacion', label: 'Localización del Daño (no editable — numerada contra el diagrama del zapato)', tipo: 'select', requerido: true,
            opciones: ['Suela', 'Media Suela', 'Suela Interior', 'Empeine', 'Lengua', 'Forro',
                       'Contra dedos', 'Contra talon', 'Cordones Ojal', 'Correa de Velcro', 'Hebilla', 'Sistema de Cordones BOA'] },
          { id: 'zapato_tipo_dano', label: 'Tipo de Daño', tipo: 'radio', requerido: true,
            opciones: ZAPATO_TIPOS_DANO },
          { id: 'zapato_tipo_dano_otro', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'zapato_comentarios', label: 'Comentarios adicionales', tipo: 'textarea', requerido: false },
        ],
    11: [
          { id: 'comp_tipo', label: 'Tipo de Componente', tipo: 'radio', requerido: true,
            opciones: TIPOS_COMPONENTE },
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
          { id: 'scott_tipo_marco', label: 'Tipo de Marco (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: TIPOS_MARCO },
        ],
    15: marcoDanoFields(15),
    16: marcoDanoFields(16),
    17: marcoDanoFields(17),
    18: marcoDanoFields(18),
    19: marcoDanoFields(19),
    20: marcoDanoFields(20),
    21: marcoDanoFields(21),
    22: [
          { id: 'bici_doc1', label: 'Fotografía del Daño', tipo: 'file', requerido: true },
          { id: 'bici_doc2', label: 'Fotografía del Número de Serie', tipo: 'file', requerido: true },
          { id: 'bici_doc3', label: 'Fotografía del Producto', tipo: 'file', requerido: true },
          { id: 'bici_doc4a', label: 'Factura de Compra', tipo: 'file', requerido: true },
          { id: 'bici_doc4b', label: 'Factura de Venta', tipo: 'file', requerido: true },
        ],
    23: [
          { id: 'syncros_tipo', label: 'Tipo de Producto SYNCROS (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: ['Manubrios', 'Asientos', 'Poste', 'Ruedos/Rines'] },
        ],
    24: [
          { id: 'manubrio_modelo', label: 'Modelo del Manubrio', tipo: 'text', requerido: true },
          { id: 'manubrio_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'manubrio_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'manubrio_color', label: 'Color', tipo: 'text', requerido: false },
        ],
    25: [
          { id: 'manubrio_localizacion', label: 'Localización del Daño', tipo: 'radio', requerido: true,
            opciones: MANUBRIO_LOCALIZACIONES },
          { id: 'manubrio_localizacion_otros', label: 'Especificar localización (Otros)', tipo: 'text', requerido: false },
          { id: 'manubrio_tipo_dano', label: 'Tipo de Daño (comparte lista con Asientos y Poste, secciones 27 y 29)', tipo: 'radio', requerido: true,
            opciones: SYNCROS_TIPOS_DANO },
          { id: 'manubrio_tipo_dano_otros', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'manubrio_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
        ],
    26: [
          { id: 'asiento_modelo', label: 'Modelo del Asiento', tipo: 'text', requerido: true },
          { id: 'asiento_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'asiento_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'asiento_color', label: 'Color', tipo: 'text', requerido: false },
        ],
    27: [
          { id: 'asiento_localizacion', label: 'Localización del Daño', tipo: 'radio', requerido: true,
            opciones: ASIENTO_LOCALIZACIONES },
          { id: 'asiento_localizacion_otros', label: 'Especificar localización (Otros)', tipo: 'text', requerido: false },
          { id: 'asiento_tipo_dano', label: 'Tipo de Daño (comparte lista con Manubrios, sección 25 — edítala ahí)', tipo: 'radio', requerido: true,
            opciones: SYNCROS_TIPOS_DANO },
          { id: 'asiento_tipo_dano_otros', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'asiento_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
        ],
    28: [
          { id: 'poste_modelo', label: 'Modelo del Poste', tipo: 'text', requerido: true },
          { id: 'poste_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'poste_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'poste_color', label: 'Color', tipo: 'text', requerido: false },
        ],
    29: [
          { id: 'poste_localizacion', label: 'Localización del Daño', tipo: 'radio', requerido: true,
            opciones: POSTE_LOCALIZACIONES },
          { id: 'poste_localizacion_otros', label: 'Especificar localización (Otros)', tipo: 'text', requerido: false },
          { id: 'poste_tipo_dano', label: 'Tipo de Daño (comparte lista con Manubrios, sección 25 — edítala ahí)', tipo: 'radio', requerido: true,
            opciones: SYNCROS_TIPOS_DANO },
          { id: 'poste_tipo_dano_otros', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'poste_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
        ],
    30: [
          { id: 'rin_modelo', label: 'Modelo del Rin', tipo: 'text', requerido: true },
          { id: 'rin_anio', label: 'Año', tipo: 'number', requerido: false },
          { id: 'rin_serie', label: 'Número de Serie / Código', tipo: 'text', requerido: false },
          { id: 'rin_color', label: 'Color', tipo: 'text', requerido: false },
        ],
    31: [
          { id: 'rin_localizacion', label: 'Localización del Daño', tipo: 'radio', requerido: true,
            opciones: RIN_LOCALIZACIONES },
          { id: 'rin_localizacion_otros', label: 'Especificar localización (Otros)', tipo: 'text', requerido: false },
          { id: 'rin_tipo_dano', label: 'Tipo de Daño', tipo: 'radio', requerido: true,
            opciones: RIN_TIPOS_DANO },
          { id: 'rin_tipo_dano_otros', label: 'Especificar tipo de daño (Otros)', tipo: 'text', requerido: false },
          { id: 'rin_dano_desc', label: 'Descripción del Daño', tipo: 'textarea', requerido: true },
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
    35: [
          { id: 'bici_modelo', label: 'Modelo de la Bicicleta', tipo: 'text', requerido: true },
          { id: 'bici_anio', label: 'Año del Modelo', tipo: 'number', requerido: true },
          { id: 'bici_serie', label: 'Número de Serie del Marco', tipo: 'text', requerido: true },
          { id: 'scott_tipo_marco', label: 'Tipo de Marco (no editable — controla qué secciones se muestran)', tipo: 'radio', requerido: true,
            opciones: TIPOS_MARCO_M },
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
  nuevoTipo: EditorCampo['tipo'] = 'text';
  nuevasOpciones = '';
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
    scale:    'fa-sliders-h',
  };

  readonly tipoLabels: Record<string, string> = {
    text:     'Texto corto',
    email:    'Email',
    number:   'Número',
    textarea: 'Texto largo',
    select:   'Menú desplegable',
    radio:    'Opción única',
    file:     'Archivo',
    checkbox: 'Casilla',
    scale:    'Escala / Rango',
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
    const opciones = (this.nuevoTipo === 'radio' || this.nuevoTipo === 'select')
      ? this.nuevasOpciones.split('\n').map(s => s.trim()).filter(s => !!s)
      : undefined;
    sec.campos.push({
      id: `campo_${Date.now()}`,
      label: this.nuevoLabel.trim(),
      tipo: this.nuevoTipo,
      requerido: false,
      opciones,
    });
    this.nuevoLabel = '';
    this.nuevoTipo = 'text';
    this.nuevasOpciones = '';
    this.nuevoCampoSecId = null;
  }

  cancelarNuevoCampo(): void {
    this.nuevoCampoSecId = null;
    this.nuevoLabel = '';
    this.nuevoTipo = 'text';
    this.nuevasOpciones = '';
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
