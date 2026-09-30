import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { ImportacionesService, AuditoriaResumenEmbarque, HitoAuditoriaResultado } from '../../../../services/importaciones.service';

type OrdenCampo = 'atrasados' | 'adelantados' | 'referencia';

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

  // Color por sección, solo para el pequeño tag encima de cada hito -- el
  // pipeline NO se agrupa/reordena por sección: los hitos se llenan en el
  // orden en que se le dieron al usuario (mezclando secciones), así que la
  // tira respeta ese orden tal cual llega del backend (ORDER BY id).
  private static readonly SECCION_CFG: Record<string, { label: string; color: string }> = {
    logistica:   { label: 'Logística',   color: '#60a5fa' },
    costos:      { label: 'Costos',      color: '#fbbf24' },
    importacion: { label: 'Importación', color: '#c084fc' },
    odoo:        { label: 'Odoo/SAE',    color: '#22d3ee' },
    despacho:    { label: 'Despacho',    color: '#f472b6' },
    almacen:     { label: 'Almacén',     color: '#a78bfa' },
    recepcion:   { label: 'Recepción',   color: '#38bdf8' },
    cierre:      { label: 'Cierre',      color: '#94a3b8' },
  };

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

  seccionLabel(seccion: string): string {
    return ImportacionesAuditoriaResumenComponent.SECCION_CFG[seccion]?.label ?? seccion;
  }

  seccionColor(seccion: string): string {
    return ImportacionesAuditoriaResumenComponent.SECCION_CFG[seccion]?.color ?? '#64748b';
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

  stageCls(h: HitoAuditoriaResultado): string {
    if (h.fecha_real) return 'stage-real';
    if (h.estado === 'sin_historial') return 'stage-sin-historial';
    return '';
  }
}
