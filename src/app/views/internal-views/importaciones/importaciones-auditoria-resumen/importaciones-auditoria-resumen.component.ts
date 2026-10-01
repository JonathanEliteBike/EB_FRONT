import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { ImportacionesService, AuditoriaResumenEmbarque, HitoAuditoriaResultado } from '../../../../services/importaciones.service';

type OrdenCampo = 'atrasados' | 'adelantados' | 'referencia';

interface Segmento {
  clase: string;
  pct: number;
  label: string;
}

@Component({
  selector: 'app-importaciones-auditoria-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent],
  templateUrl: './importaciones-auditoria-resumen.component.html',
  styleUrl: './importaciones-auditoria-resumen.component.css',
})
export class ImportacionesAuditoriaResumenComponent implements OnInit {
  embarques: AuditoriaResumenEmbarque[] = [];
  cargando = true;
  error = '';
  orden: OrdenCampo = 'atrasados';

  // Tag corto + color por sección -- solo como referencia visual encima de
  // cada hito. El pipeline NO se agrupa/reordena por sección: los hitos se
  // llenan en el orden en que se le dieron al usuario (mezclando
  // secciones), así que la tira respeta ese orden tal cual llega del
  // backend (ORDER BY id).
  private static readonly SECCION_CFG: Record<string, { abbr: string; color: string }> = {
    logistica:   { abbr: 'LOG', color: '#60a5fa' },
    costos:      { abbr: 'COS', color: '#fbbf24' },
    importacion: { abbr: 'IMP', color: '#c084fc' },
    odoo:        { abbr: 'ODO', color: '#22d3ee' },
    despacho:    { abbr: 'DES', color: '#f472b6' },
    almacen:     { abbr: 'ALM', color: '#a78bfa' },
    recepcion:   { abbr: 'REC', color: '#38bdf8' },
    cierre:      { abbr: 'CIE', color: '#94a3b8' },
  };

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

  embarquesOrdenados(): AuditoriaResumenEmbarque[] {
    const campo = this.orden;
    if (campo === 'referencia') {
      return [...this.embarques].sort((a, b) => a.referencia.localeCompare(b.referencia));
    }
    return [...this.embarques].sort((a, b) => b[campo] - a[campo]);
  }

  irDetalle(id: number): void {
    this.router.navigate(['/importaciones', id]);
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
