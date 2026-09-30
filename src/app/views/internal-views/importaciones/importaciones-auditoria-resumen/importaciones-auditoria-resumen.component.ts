import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { ImportacionesService, AuditoriaResumenEmbarque, HitoAuditoriaResultado } from '../../../../services/importaciones.service';

type OrdenCampo = 'atrasados' | 'adelantados' | 'referencia';

interface SeccionGrupo {
  seccion: string;
  hitos: HitoAuditoriaResultado[];
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

  totalHitos(e: AuditoriaResumenEmbarque): number {
    return e.atrasados + e.adelantados + e.a_tiempo + e.pendientes + e.en_espera;
  }

  // Agrupa el arreglo plano de hitos (ya viene ordenado seccion, orden_hito
  // desde el backend) en tiras consecutivas por sección, para pintar una
  // franja de pipeline por sección dentro de la tarjeta del embarque.
  seccionesDe(e: AuditoriaResumenEmbarque): SeccionGrupo[] {
    const grupos: SeccionGrupo[] = [];
    let actual: SeccionGrupo | null = null;
    for (const h of e.hitos || []) {
      if (!actual || actual.seccion !== h.seccion) {
        actual = { seccion: h.seccion, hitos: [] };
        grupos.push(actual);
      }
      actual.hitos.push(h);
    }
    return grupos;
  }

  irDetalle(id: number): void {
    this.router.navigate(['/importaciones', id]);
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
    return h.fecha_real ? 'stage-real' : '';
  }
}
