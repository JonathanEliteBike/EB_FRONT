import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { HitosAuditoriaService, HitoAuditoria, HitoAuditoriaPayload } from '../../../../services/hitos-auditoria.service';

const SECCIONES = ['logistica', 'importacion', 'despacho', 'odoo', 'almacen', 'recepcion', 'costos', 'cierre'];

// Mismo mapa de colores/etiquetas que usa el pipeline de auditoría
// (importaciones-auditoria-resumen) -- se repite aquí (solo 8 entradas)
// para que ambas pantallas se vean como parte del mismo subsistema sin
// forzar una dependencia cruzada entre dos componentes de ruta distintos.
const SECCION_CFG: Record<string, { label: string; color: string }> = {
  logistica:   { label: 'Logística',   color: '#60a5fa' },
  costos:      { label: 'Costos',      color: '#fbbf24' },
  importacion: { label: 'Importación', color: '#c084fc' },
  odoo:        { label: 'Odoo/SAE',    color: '#22d3ee' },
  despacho:    { label: 'Despacho',    color: '#f472b6' },
  almacen:     { label: 'Almacén',     color: '#a78bfa' },
  recepcion:   { label: 'Recepción',   color: '#38bdf8' },
  cierre:      { label: 'Cierre',      color: '#94a3b8' },
};

const FORM_VACIO: HitoAuditoriaPayload = {
  seccion: 'logistica', orden_hito: 1, etiqueta: '', campo_dato: '', campo_ancla: null, dias_esperados: 0,
};

@Component({
  selector: 'app-importaciones-hitos-auditoria',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './importaciones-hitos-auditoria.component.html',
  styleUrl: './importaciones-hitos-auditoria.component.css',
})
export class ImportacionesHitosAuditoriaComponent implements OnInit {
  readonly SECCIONES = SECCIONES;

  hitos: HitoAuditoria[] = [];
  cargando = true;
  error = '';

  modalAbierto = false;
  editandoId: number | null = null;
  guardando = false;
  errorForm = '';
  form: HitoAuditoriaPayload = { ...FORM_VACIO };

  // Si se llegó desde el link "Configurar hitos" de la Auditoría
  // (?from=auditoria), "volver" regresa ahí en vez de a la lista general
  // de Importaciones.
  returnUrl = '/importaciones';

  constructor(private svc: HitosAuditoriaService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('from') === 'auditoria') {
      this.returnUrl = '/importaciones/auditoria';
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar().subscribe({
      next: (res) => { this.hitos = res; this.cargando = false; },
      error: () => { this.error = 'No se pudieron cargar los hitos de auditoría.'; this.cargando = false; },
    });
  }

  hitosPorSeccion(seccion: string): HitoAuditoria[] {
    return this.hitos.filter((h) => h.seccion === seccion).sort((a, b) => a.orden_hito - b.orden_hito);
  }

  seccionLabel(seccion: string): string {
    return SECCION_CFG[seccion]?.label ?? seccion;
  }

  seccionColor(seccion: string): string {
    return SECCION_CFG[seccion]?.color ?? '#64748b';
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.form = { ...FORM_VACIO };
    this.errorForm = '';
    this.modalAbierto = true;
  }

  abrirEdicion(h: HitoAuditoria): void {
    this.editandoId = h.id;
    this.form = {
      seccion: h.seccion, orden_hito: h.orden_hito, etiqueta: h.etiqueta,
      campo_dato: h.campo_dato, campo_ancla: h.campo_ancla, dias_esperados: h.dias_esperados,
      // Sin esto, el backend recibe el payload sin "activo" y lo trata como
      // ausente -> True por default, reactivando en silencio un hito que
      // estuviera desactivado.
      activo: h.activo,
    };
    this.errorForm = '';
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.modalAbierto = false;
  }

  formValido(): boolean {
    return !!this.form.seccion && !!this.form.etiqueta.trim() && !!this.form.campo_dato.trim();
  }

  guardar(): void {
    if (!this.formValido() || this.guardando) return;
    this.guardando = true;
    this.errorForm = '';

    const payload: HitoAuditoriaPayload = {
      ...this.form,
      orden_hito: Number(this.form.orden_hito) || 1,
      dias_esperados: Number(this.form.dias_esperados) || 0,
      campo_ancla: this.form.campo_ancla?.trim() || null,
    };

    const obs = this.editandoId ? this.svc.actualizar(this.editandoId, payload) : this.svc.crear(payload);

    obs.subscribe({
      next: () => { this.guardando = false; this.modalAbierto = false; this.cargar(); },
      error: (err) => { this.guardando = false; this.errorForm = err?.error?.error || 'No se pudo guardar el hito.'; },
    });
  }

  eliminar(h: HitoAuditoria): void {
    if (!confirm(`¿Eliminar el hito "${h.etiqueta}"?\nLos embarques dejarán de auditar este campo hasta que se configure de nuevo.`)) return;
    this.svc.eliminar(h.id).subscribe({
      next: () => this.cargar(),
      error: () => { this.error = 'No se pudo eliminar el hito.'; },
    });
  }
}
