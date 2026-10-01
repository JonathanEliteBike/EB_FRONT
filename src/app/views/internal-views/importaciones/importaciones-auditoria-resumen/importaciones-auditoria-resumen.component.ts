import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
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

interface PromedioHito {
  id: number;
  seccion: string;
  etiqueta: string;
  promedio: number;
  n: number;
}

interface GrupoPromedios {
  seccion: string;
  hitos: PromedioHito[];
}

@Component({
  selector: 'app-importaciones-auditoria-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, DatePickerComponent],
  templateUrl: './importaciones-auditoria-resumen.component.html',
  styleUrl: './importaciones-auditoria-resumen.component.css',
})
export class ImportacionesAuditoriaResumenComponent implements OnInit {
  // Solo Administrador (rol 1) ve el acceso a Hitos de Auditoría -- esa
  // pantalla queda restringida por adminGuard en app.routes.ts; este flag
  // solo evita mostrar un link que llevaría a un usuario normal a un redirect.
  readonly esAdmin: boolean = (() => {
    try {
      const token = localStorage.getItem('token');
      return !!token && (jwtDecode(token) as any).rol === 1;
    } catch { return false; }
  })();

  embarques: AuditoriaResumenEmbarque[] = [];
  cargando = true;
  error = '';
  orden: OrdenCampo = 'atrasados';

  // Colapsado por defecto: el desglose por sección/hito hacía la página
  // demasiado larga para desplazarse de un vistazo -- el total siempre
  // visible, el detalle solo cuando se pide.
  mostrarDesglose = false;

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
          case 'atrasados':     return this.atrasadosConVencidos(e) > 0;
          case 'adelantados':   return e.adelantados > 0;
          case 'sin_historial': return e.sin_historial > 0;
          case 'al_corriente':  return this.atrasadosConVencidos(e) === 0 && e.adelantados === 0;
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
    if (campo === 'atrasados') {
      return filtrados.sort((a, b) => this.atrasadosConVencidos(b) - this.atrasadosConVencidos(a));
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

  seccionLabel(seccion: string): string {
    return ImportacionesAuditoriaResumenComponent.SECCION_CFG[seccion]?.label ?? seccion;
  }

  // ── Panorama general: agregado entre TODOS los embarques dados de alta
  // desde el arranque de esta auditoría en adelante -- los anteriores no
  // entran porque su historial de captura está incompleto (ver estado
  // "sin_historial") y distorsionaría el promedio.
  //
  // OJO: es una fecha de corte FIJA (el día en que esto se desplegó), NO
  // "hoy" recalculado en cada carga de la página. Con "hoy" literal el
  // panorama quedaría casi siempre vacío en producción: un embarque recién
  // dado de alta ESE MISMO día casi nunca tiene todavía ningún hito con
  // dias_diferencia calculado (eso toma días), así que el filtro se
  // vaciaría y se volvería a llenar cada 24h en vez de ir acumulando.
  readonly FECHA_INICIO_PANORAMA = '2026-10-01';

  embarquesDesdeHoy(): AuditoriaResumenEmbarque[] {
    return this.embarques.filter(e => e.creado_en >= this.FECHA_INICIO_PANORAMA);
  }

  // "Hoy" de verdad (no confundir con FECHA_INICIO_PANORAMA, que es un
  // corte fijo) -- se usa para saber si un hito en_espera ya venció.
  // Mismos getters locales que ya se usaron para el fix de zona horaria:
  // toISOString() convierte a UTC y cerca de medianoche en México da el
  // día siguiente.
  get hoyISO(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // Un hito "en_espera" (el campo sigue vacío) cuya fecha esperada ya pasó
  // SÍ es un atraso real -- el backend no lo puede saber por sí solo
  // porque "¿ya venció?" depende del día en que se mira la pantalla, no
  // de datos fijos del embarque, así que se resuelve aquí.
  estaVencido(h: HitoAuditoriaResultado): boolean {
    return h.estado === 'en_espera' && !!h.fecha_esperada && h.fecha_esperada < this.hoyISO;
  }

  // dias_diferencia real cuando existe; si no, y el hito está vencido, los
  // días de atraso acumulados hasta hoy (negativo, mismo signo que
  // dias_diferencia). null en cualquier otro caso (pendiente, en_espera
  // no vencido, sin_historial).
  diasConVencido(h: HitoAuditoriaResultado): number | null {
    if (h.dias_diferencia != null) return h.dias_diferencia;
    if (!this.estaVencido(h)) return null;
    const esperada = new Date(h.fecha_esperada + 'T00:00:00');
    const hoy = new Date(this.hoyISO + 'T00:00:00');
    return Math.round((esperada.getTime() - hoy.getTime()) / 86400000);
  }

  // "Atrasados" del embarque, contando también los en_espera vencidos que
  // el backend no incluye en su contador (no sabe qué día es "hoy").
  atrasadosConVencidos(e: AuditoriaResumenEmbarque): number {
    const vencidos = (e.hitos || []).filter(h => this.estaVencido(h)).length;
    return e.atrasados + vencidos;
  }

  // Latencia TOTAL del panorama: suma (no promedio) del balance neto de
  // cada embarque considerado -- "cuántos días, en conjunto, lleva de
  // adelanto o atraso la operación completa".
  latenciaTotalGeneral(): number | null {
    const valores = this.embarquesDesdeHoy()
      .flatMap(e => (e.hitos || []).map(h => this.diasConVencido(h)))
      .filter((d): d is number => d != null);
    if (!valores.length) return null;
    return valores.reduce((a, b) => a + b, 0);
  }

  // Latencia PROMEDIO por hito: para cada hito (identificado por su id,
  // que es único e invariante entre embarques -- todos comparten la misma
  // configuración de importaciones_hitos_auditoria), se promedia
  // dias_diferencia entre los embarques que ya lo tienen calculado.
  // Responde "¿qué tan tarde/temprano anda este hito en general?", sin que
  // un atraso enorme de un solo embarque domine como lo haría una suma.
  promediosPorSeccion(): GrupoPromedios[] {
    const acumulador = new Map<number, { seccion: string; etiqueta: string; suma: number; n: number }>();
    for (const e of this.embarquesDesdeHoy()) {
      for (const h of e.hitos || []) {
        const dias = this.diasConVencido(h);
        if (dias == null) continue;
        const actual = acumulador.get(h.id) ?? { seccion: h.seccion, etiqueta: h.etiqueta, suma: 0, n: 0 };
        actual.suma += dias;
        actual.n += 1;
        acumulador.set(h.id, actual);
      }
    }
    const porSeccion = new Map<string, PromedioHito[]>();
    for (const [id, v] of acumulador) {
      const lista = porSeccion.get(v.seccion) ?? [];
      lista.push({ id, seccion: v.seccion, etiqueta: v.etiqueta, promedio: v.suma / v.n, n: v.n });
      porSeccion.set(v.seccion, lista);
    }
    for (const lista of porSeccion.values()) lista.sort((a, b) => a.id - b.id);

    const ordenSecciones = Object.keys(ImportacionesAuditoriaResumenComponent.SECCION_CFG);
    return Array.from(porSeccion.entries())
      .map(([seccion, hitos]) => ({ seccion, hitos }))
      .sort((a, b) => ordenSecciones.indexOf(a.seccion) - ordenSecciones.indexOf(b.seccion));
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

  // Balance neto de días del embarque: suma TODOS los dias_diferencia
  // (atrasos negativos + adelantos positivos) de los hitos que ya tienen
  // un valor calculado. Un adelanto en un hito puede compensar el atraso
  // de otro -- es un balance, no un acumulado de solo atrasos.
  latenciaTotal(e: AuditoriaResumenEmbarque): number | null {
    const valores = (e.hitos || [])
      .map(h => this.diasConVencido(h))
      .filter((d): d is number => d != null);
    if (!valores.length) return null;
    return valores.reduce((a, b) => a + b, 0);
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
    if (this.estaVencido(h)) return 'stage-atrasado';
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
