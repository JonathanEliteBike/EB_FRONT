import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { DatePickerComponent } from '../../../../components/date-picker/date-picker.component';
import { ImportacionesService, AuditoriaResumenEmbarque, HitoAuditoriaResultado } from '../../../../services/importaciones.service';

type OrdenCampo = 'atrasados' | 'adelantados' | 'referencia';
type EstadoFiltro = 'atrasados' | 'adelantados' | 'sin_historial' | 'al_corriente';

interface Segmento {
  clase: string;
  pct: number;
  label: string;
}

@Component({
  selector: 'app-importaciones-auditoria-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, DatePickerComponent],
  templateUrl: './importaciones-auditoria-resumen.component.html',
  styleUrl: './importaciones-auditoria-resumen.component.css',
})
export class ImportacionesAuditoriaResumenComponent implements OnInit {
  embarques: AuditoriaResumenEmbarque[] = [];
  cargando = true;
  error = '';
  orden: OrdenCampo = 'atrasados';

  // Filtros de la barra de búsqueda
  busqueda = '';
  estadosFiltro = new Set<EstadoFiltro>();
  seccionFiltro = '';
  fechaDesde = '';
  fechaHasta = '';

  // Tag corto + color por sección -- solo como referencia visual encima de
  // cada hito. El pipeline NO se agrupa/reordena por sección: los hitos se
  // llenan en el orden en que se le dieron al usuario (mezclando
  // secciones), así que la tira respeta ese orden tal cual llega del
  // backend (ORDER BY id).
  private static readonly SECCION_CFG: Record<string, { abbr: string; label: string; color: string }> = {
    logistica:   { abbr: 'LOG', label: 'Logística',   color: '#60a5fa' },
    costos:      { abbr: 'COS', label: 'Costos',      color: '#fbbf24' },
    importacion: { abbr: 'IMP', label: 'Importación', color: '#c084fc' },
    odoo:        { abbr: 'ODO', label: 'Odoo/SAE',    color: '#22d3ee' },
    despacho:    { abbr: 'DES', label: 'Despacho',    color: '#f472b6' },
    almacen:     { abbr: 'ALM', label: 'Almacén',     color: '#a78bfa' },
    recepcion:   { abbr: 'REC', label: 'Recepción',   color: '#38bdf8' },
    cierre:      { abbr: 'CIE', label: 'Cierre',      color: '#94a3b8' },
  };

  readonly seccionesFiltro = Object.entries(ImportacionesAuditoriaResumenComponent.SECCION_CFG)
    .map(([value, cfg]) => ({ value, label: cfg.label }));

  private static readonly SEGMENTOS_CFG: { key: keyof AuditoriaResumenEmbarque; clase: string; label: string }[] = [
    { key: 'atrasados',     clase: 'seg-atrasado',      label: 'Atrasados' },
    { key: 'adelantados',   clase: 'seg-adelantado',    label: 'Adelantados' },
    { key: 'a_tiempo',      clase: 'seg-a-tiempo',      label: 'A tiempo' },
    { key: 'en_espera',     clase: 'seg-en-espera',     label: 'En espera' },
    { key: 'sin_historial', clase: 'seg-sin-historial', label: 'Sin dato histórico' },
    { key: 'pendientes',    clase: 'seg-pendiente',     label: 'Pendientes' },
  ];

  constructor(private svc: ImportacionesService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.svc.obtenerAuditoriaResumen().subscribe({
      next: (res) => { this.embarques = res; this.cargando = false; },
      error: () => { this.error = 'No se pudo cargar el resumen de auditoría.'; this.cargando = false; },
    });
  }

  ordenarPor(campo: OrdenCampo): void {
    this.orden = campo;
  }

  toggleEstadoFiltro(f: EstadoFiltro): void {
    if (this.estadosFiltro.has(f)) this.estadosFiltro.delete(f);
    else this.estadosFiltro.add(f);
  }

  onRangoFechaChange(rango: { desde: string; hasta: string }): void {
    this.fechaDesde = rango.desde;
    this.fechaHasta = rango.hasta;
  }

  get hayFiltrosActivos(): boolean {
    return !!this.busqueda.trim() || this.estadosFiltro.size > 0 || !!this.seccionFiltro
      || !!this.fechaDesde || !!this.fechaHasta;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.estadosFiltro.clear();
    this.seccionFiltro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  private _pasaFiltros(e: AuditoriaResumenEmbarque): boolean {
    const q = this.busqueda.trim().toLowerCase();
    if (q && !e.referencia.toLowerCase().includes(q) && !(e.nombre || '').toLowerCase().includes(q)) {
      return false;
    }
    if (this.estadosFiltro.size > 0) {
      const coincideAlguno = Array.from(this.estadosFiltro).some(f => {
        switch (f) {
          case 'atrasados':     return e.atrasados > 0;
          case 'adelantados':   return e.adelantados > 0;
          case 'sin_historial': return e.sin_historial > 0;
          case 'al_corriente':  return e.atrasados === 0 && e.adelantados === 0;
        }
      });
      if (!coincideAlguno) return false;
    }
    if (this.seccionFiltro) {
      const tieneProblemaEnSeccion = (e.hitos || []).some(
        h => h.seccion === this.seccionFiltro && (h.estado === 'atrasado' || h.estado === 'en_espera')
      );
      if (!tieneProblemaEnSeccion) return false;
    }
    if (this.fechaDesde && e.creado_en < this.fechaDesde) return false;
    if (this.fechaHasta && e.creado_en > this.fechaHasta) return false;
    return true;
  }

  embarquesVisibles(): AuditoriaResumenEmbarque[] {
    const campo = this.orden;
    const filtrados = this.embarques.filter(e => this._pasaFiltros(e));
    if (campo === 'referencia') {
      return filtrados.sort((a, b) => a.referencia.localeCompare(b.referencia));
    }
    return filtrados.sort((a, b) => b[campo] - a[campo]);
  }

  irDetalle(id: number): void {
    this.router.navigate(['/importaciones', id]);
  }

  // Clic en un hito puntual: lleva directo al campo de origen en el
  // detalle del embarque (misma mecánica que el pipeline del dashboard),
  // para que el usuario pueda ir a validar/corregir el dato sin tener que
  // buscar la sección manualmente.
  irHito(e: AuditoriaResumenEmbarque, h: HitoAuditoriaResultado, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/importaciones', e.id], {
      queryParams: { from: 'auditoria', highlight: h.campo_dato },
    });
  }

  seccionAbbr(seccion: string): string {
    return ImportacionesAuditoriaResumenComponent.SECCION_CFG[seccion]?.abbr ?? seccion.slice(0, 3).toUpperCase();
  }

  seccionColor(seccion: string): string {
    return ImportacionesAuditoriaResumenComponent.SECCION_CFG[seccion]?.color ?? '#64748b';
  }

  // Franja de progreso del embarque: "qué tan auditado" se ve de un vistazo
  // antes de leer celda por celda -- el resumen primero, el detalle después.
  segmentosProgreso(e: AuditoriaResumenEmbarque): Segmento[] {
    const total = e.hitos?.length || 0;
    if (!total) return [];
    return ImportacionesAuditoriaResumenComponent.SEGMENTOS_CFG
      .map(d => ({ clase: d.clase, pct: (e[d.key] as number) / total * 100, label: `${d.label}: ${e[d.key]}` }))
      .filter(s => s.pct > 0);
  }

  fmtD(s: string | null | undefined): string {
    if (!s) return '—';
    try {
      const d = new Date(s + 'T12:00:00');
      return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    } catch { return s.slice(5); }
  }

  // Convención de signo de esta feature: dias_diferencia = esperada - real.
  // Positivo => se llenó ANTES de lo esperado (adelantado, verde).
  // Negativo => se llenó DESPUÉS de lo esperado (atrasado, rojo).
  // (Es la convención opuesta a la del dashboard de embarques: ahí
  // delta <= 0 es "a tiempo/verde" porque mide latencia acumulada, no
  // adelanto/atraso contra un plazo esperado.)
  deltaClass(dias: number | null | undefined): string {
    if (dias == null) return '';
    return dias >= 0 ? 'delta-ok' : 'delta-late';
  }

  absDif(dias: number): number {
    return Math.abs(dias);
  }

  // Estado -> clase de la celda. "pendiente" (nada resoluble todavía, aguas
  // arriba de la cadena) se trata como ruido y se apaga visualmente; el
  // resto son estados accionables o con información real que deben
  // destacar en proporción a su importancia.
  stageCls(h: HitoAuditoriaResultado): string {
    switch (h.estado) {
      case 'pendiente':     return 'stage-pendiente';
      case 'en_espera':     return 'stage-en-espera';
      case 'sin_historial': return 'stage-sin-historial';
      case 'atrasado':      return 'stage-atrasado';
      case 'adelantado':
      case 'a_tiempo':
        return 'stage-real';
      default: return '';
    }
  }
}
