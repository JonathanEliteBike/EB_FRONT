import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { AuthService } from '../../../services/auth.service';
import {
  SolicitudRetroactivoService,
  SolicitudRetroactivo,
  EstatusNotaCredito,
  ItemHistorial,
  DashboardDistribuidor
} from '../../../services/solicitud-retroactivo.service';

const COLOR_ESTATUS: Record<string, string> = {
  pendiente: '#f0ad4e',
  validado:  '#4caf50',
  rechazado: '#e53935',
};

type FiltroCard = 'todas' | 'pendientes' | 'validadas' | 'nc-capturadas' | 'nc-validadas' | 'aplicadas' | 'monto-estimado' | 'monto-aplicado';

@Component({
  selector: 'app-solicitud-retroactivo-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopBarUsuariosComponent],
  templateUrl: './solicitud-retroactivo-seguimiento.component.html',
  styleUrl: './solicitud-retroactivo-seguimiento.component.css'
})
export class SolicitudRetroactivoSeguimientoComponent implements OnInit {
  cargando = true;
  error = '';
  mensajeExportacion = '';
  descargandoExcel = false;
  solicitudes: SolicitudRetroactivo[] = [];
  dashboard: DashboardDistribuidor | null = null;

  // Ampliamos el control de vistas para incluir la tabla de mis productos
  vista: 'lista' | 'detalle' | 'productos' = 'lista';
  seleccionada: SolicitudRetroactivo | null = null;

  archivosNuevos: { [key: string]: File } = {};
  reenviando = false;
  errorReenvio = '';
  mensajeReenvioExito = '';

  // ── Filtros y paginación de lista ──
  busqueda = '';
  filtroEstatus = '';
  filtroCampana = '';
  filtroCardActivo: FiltroCard = 'todas';
  paginaActual = 1;
  readonly tamPagina = 15;

  camposArchivos = [
    { key: 'ticket_compra', label: 'Ticket de compra', accept: 'image/*,.pdf' },
    { key: 'voucher', label: 'Voucher de pago', accept: 'image/*,.pdf' },
    { key: 'factura_pdf', label: 'Factura (PDF)', accept: '.pdf' },
    { key: 'factura_xml', label: 'Factura (XML)', accept: '.xml' }
  ];

  constructor(private service: SolicitudRetroactivoService, private authService: AuthService) {}

  get puedeVerMontos(): boolean {
    return !this.authService.debeOcultarMontos('retroactivos');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.dashboardDistribuidor().subscribe({
      next: (res) => {
        this.dashboard = res;
        this.solicitudes = res.solicitudes;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el dashboard de solicitudes.';
        this.cargando = false;
      }
    });
  }

  private docsRechazados(s: SolicitudRetroactivo): string[] {
    return Object.entries(s.validacion_docs ?? {})
      .filter(([, estatus]) => estatus === 'rechazado')
      .map(([doc]) => doc);
  }

  colorEstatus(estatus: string): string {
    return COLOR_ESTATUS[estatus?.toLowerCase()] ?? '#888';
  }

  // GUÍA: mismo fix que en el Gestor -- 'validacion' cubre validar,
  // rechazar Y deshacer, antes salían las 3 idénticas (mismo check verde).
  iconoHistorial(item: ItemHistorial): { icono: string; clase: string } {
    const desc = (item.descripcion || '').toLowerCase();

    if (item.tipo === 'creacion') return { icono: 'fa-plus', clase: 'tl-naranja' };
    if (item.tipo === 'reenvio') return { icono: 'fa-redo', clase: 'tl-ambar' };
    if (item.tipo === 'precio') return { icono: 'fa-dollar-sign', clase: 'tl-azul' };

    if (item.tipo === 'nota_credito') {
      if (desc.includes('validada')) return { icono: 'fa-shield-halved', clase: 'tl-verde' };
      return { icono: 'fa-file-invoice-dollar', clase: 'tl-morado' };
    }

    if (item.tipo === 'validacion') {
      if (desc.includes('deshecho')) return { icono: 'fa-rotate-left', clase: 'tl-gris' };
      if (desc.includes('rechazado')) return { icono: 'fa-times', clase: 'tl-rojo' };
      return { icono: 'fa-check', clase: 'tl-verde' };
    }

    return { icono: 'fa-circle', clase: 'tl-gris' };
  }

  // GUÍA: se guarda en orden cronológico (cada mutación hace .append en el
  // backend), pero se muestra más reciente arriba -- mismo criterio que en
  // el Gestor, para no ver primero lo más viejo al abrir el historial.
  historialOrdenado(historial: ItemHistorial[] | undefined): ItemHistorial[] {
    return historial ? [...historial].reverse() : [];
  }

  // GUÍA: BCYP captura la nota de crédito, pero Auditoría es quien la
  // valida -- mostrar "Emitida" apenas se captura (antes de que Auditoría
  // la revise) le hacía creer al cliente que ya estaba lista de verdad.
  // "Emitida" ahora solo aparece cuando nota_credito_estatus === 'validada'.
  estatusNotaCredito(nota: string | undefined, notaEstatus?: EstatusNotaCredito): { texto: string; clase: string } {
    if (!nota || nota.trim() === '' || nota.trim() === '0') {
      return { texto: 'En proceso', clase: 'badge-pendiente' };
    }
    if (notaEstatus === 'validada') {
      return { texto: `Emitida (#${nota})`, clase: 'badge-validado' };
    }
    return { texto: `En validación (#${nota})`, clase: 'badge-pendiente' };
  }

  // ── Navegación de Vistas ───────────────────────────────────────────

  verMisProductos(): void {
    this.vista = 'productos';
  }

  volverALista(): void {
    this.vista = 'lista';
    this.seleccionada = null;
  }

  // ── Filtrado y paginación ───────────────────────────────────────────

  get campanasDisponibles(): string[] {
    const set = new Set(this.solicitudes.map(s => s.nombre_formulario).filter(Boolean));
    return Array.from(set).sort();
  }

  get estatusDisponibles(): string[] {
    const set = new Set(this.solicitudes.map(s => s.estatus).filter(Boolean));
    return Array.from(set).sort();
  }

  get etiquetaFiltroCardActivo(): string {
    const etiquetas: Record<FiltroCard, string> = {
      todas: 'Todas',
      pendientes: 'Pendientes',
      validadas: 'Solicitudes validadas',
      'nc-capturadas': 'NC capturadas',
      'nc-validadas': 'NC validadas',
      aplicadas: 'Bicicletas aplicadas',
      'monto-estimado': 'Monto estimado',
      'monto-aplicado': 'Monto aplicado',
    };
    return etiquetas[this.filtroCardActivo];
  }

  seleccionarFiltroCard(filtro: FiltroCard): void {
    this.filtroCardActivo = filtro === 'todas' || this.filtroCardActivo === filtro ? 'todas' : filtro;
    this.paginaActual = 1;
  }

  private tieneNotaCreditoValida(solicitud: SolicitudRetroactivo): boolean {
    const nota = String(solicitud.nota_credito ?? '').trim().toLowerCase();
    return Boolean(nota && nota !== '0' && nota !== 'none');
  }

  private tieneMontoPagar(solicitud: SolicitudRetroactivo): boolean {
    const monto = Number(String(solicitud.monto_pagar ?? '').replace(/,/g, ''));
    return Number.isFinite(monto) && monto > 0;
  }

  private cumpleFiltroCard(solicitud: SolicitudRetroactivo): boolean {
    const tieneNc = this.tieneNotaCreditoValida(solicitud);
    const aplicada = tieneNc && solicitud.nota_credito_estatus === 'validada';

    switch (this.filtroCardActivo) {
      case 'pendientes': return solicitud.estatus === 'pendiente';
      case 'validadas': return solicitud.estatus === 'validado';
      case 'nc-capturadas': return tieneNc;
      case 'nc-validadas':
      case 'aplicadas': return aplicada;
      case 'monto-estimado': return this.tieneMontoPagar(solicitud);
      case 'monto-aplicado': return aplicada && this.tieneMontoPagar(solicitud);
      default: return true;
    }
  }

  get solicitudesFiltradas(): SolicitudRetroactivo[] {
    const q = this.busqueda.toLowerCase().trim();
    return this.solicitudes.filter(s => {
      if (!this.cumpleFiltroCard(s)) return false;
      if (q && !s.modelo_bicicleta?.toLowerCase().includes(q) && !s.numero_serie?.toLowerCase().includes(q)) return false;
      if (this.filtroEstatus && s.estatus !== this.filtroEstatus) return false;
      if (this.filtroCampana && s.nombre_formulario !== this.filtroCampana) return false;
      return true;
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.solicitudesFiltradas.length / this.tamPagina));
  }

  get solicitudesPaginadas(): SolicitudRetroactivo[] {
    const inicio = (this.paginaActual - 1) * this.tamPagina;
    return this.solicitudesFiltradas.slice(inicio, inicio + this.tamPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  resetFiltros(): void {
    this.busqueda = '';
    this.filtroEstatus = '';
    this.filtroCampana = '';
    this.paginaActual = 1;
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
  }

  onFiltroChange(): void {
    this.paginaActual = 1;
  }

  exportarExcel(): void {
    const dashboard = this.dashboard;
    const solicitudes = this.solicitudesFiltradas;
    if (!dashboard || solicitudes.length === 0) {
      this.mensajeExportacion = 'No hay solicitudes para exportar con los filtros actuales.';
      return;
    }

    this.mensajeExportacion = '';
    this.descargandoExcel = true;
    try {
      const incluirMontos = this.puedeVerMontos && dashboard.totales.monto_total_estimado !== undefined;
      const incluirMontoAplicado = this.puedeVerMontos && dashboard.totales.monto_total_aplicado !== undefined;
      const resumen = [
        { Indicador: 'Total bicicletas', Valor: dashboard.totales.total_solicitudes },
        { Indicador: 'Pendientes', Valor: dashboard.totales.pendientes },
        { Indicador: 'Solicitudes validadas', Valor: dashboard.totales.validadas },
        { Indicador: 'Rechazadas', Valor: dashboard.totales.rechazadas },
        { Indicador: 'NC capturadas', Valor: dashboard.totales.notas_credito_capturadas },
        { Indicador: 'NC validadas', Valor: dashboard.totales.notas_credito_validadas },
        { Indicador: 'Bicicletas aplicadas', Valor: dashboard.totales.bicicletas_aplicadas },
        ...(incluirMontos ? [{ Indicador: 'Monto estimado', Valor: Number(dashboard.totales.monto_total_estimado) }] : []),
        ...(incluirMontoAplicado ? [{ Indicador: 'Monto aplicado', Valor: Number(dashboard.totales.monto_total_aplicado) }] : []),
      ];

      const notasCredito = dashboard.notas_credito.map(nota => ({
        'Número NC': this.textoExcel(nota.numero_nota_credito),
        Estado: nota.estado === 'validada' ? 'Validada' : 'En validación',
        'Cantidad de solicitudes': nota.cantidad_solicitudes_relacionadas,
        ...(incluirMontos ? { 'Monto asociado estimado': Number(nota.monto_asociado_estimado ?? 0) } : {}),
      }));

      const detalle = solicitudes.map(solicitud => ({
        ID: solicitud.id,
        Campaña: solicitud.nombre_formulario ?? '',
        Modelo: solicitud.modelo_bicicleta ?? '',
        'Número de serie': this.textoExcel(solicitud.numero_serie),
        Fecha: solicitud.fecha_venta ?? '',
        MSI: solicitud.plazo_meses ?? '',
        'Usuario que registró': solicitud.usuario_registro ?? '',
        'Estatus documental': solicitud.estatus ?? '',
        'Nota de crédito': this.textoExcel(solicitud.nota_credito),
        'Estado nota de crédito': this.estadoNotaCreditoParaExcel(solicitud.nota_credito, solicitud.nota_credito_estatus),
        ...(incluirMontos ? { 'Monto estimado': Number(solicitud.monto_pagar ?? 0) } : {}),
      }));

      const hojaResumen = XLSX.utils.json_to_sheet(resumen);
      XLSX.utils.sheet_add_aoa(hojaResumen, [[], ['Notas de crédito']], { origin: -1 });
      XLSX.utils.sheet_add_json(hojaResumen, notasCredito, { origin: -1 });
      hojaResumen['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 26 }];

      const hojaDetalle = XLSX.utils.json_to_sheet(detalle);
      hojaDetalle['!cols'] = [
        { wch: 10 }, { wch: 24 }, { wch: 34 }, { wch: 24 }, { wch: 14 },
        { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 18 },
      ];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');
      XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Detalle');

      const contenido = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
      const fecha = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `retroactivos_distribuidor_${fecha}.xlsx`
      );
    } finally {
      this.descargandoExcel = false;
    }
  }

  private textoExcel(valor: string | number | null | undefined): string {
    return valor === null || valor === undefined ? '' : String(valor);
  }

  private estadoNotaCreditoParaExcel(nota: string | undefined, estatus?: EstatusNotaCredito): string {
    if (!nota || nota.trim() === '' || nota.trim() === '0') return 'En proceso';
    return estatus === 'validada' ? 'Validada' : 'En validación';
  }

  // ── Vista de detalle ──────────────────────────────────────────────────

  verDetalle(s: SolicitudRetroactivo): void {
    this.seleccionada = s;
    this.vista = 'detalle';
    this.archivosNuevos = {};
    this.errorReenvio = '';
    this.mensajeReenvioExito = '';
  }

  documentos(s: SolicitudRetroactivo) {
    return this.camposArchivos.map(c => ({
      ...c,
      url: s.archivos?.[c.key]?.url ?? null,
      estatus: s.archivos?.[c.key]?.estatus ?? s.validacion_docs?.[c.key] ?? 'pendiente'
    }));
  }

  private formatFechaISO(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  onFileSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivosNuevos[key] = input.files[0];
    }
  }

  faltanArchivosPorSeleccionar(s: SolicitudRetroactivo): boolean {
    return this.docsRechazados(s).some(key => !this.archivosNuevos[key]);
  }

  reenviar(s: SolicitudRetroactivo): void {
    this.errorReenvio = '';
    if (this.faltanArchivosPorSeleccionar(s)) {
      this.errorReenvio = 'Selecciona todos los archivos rechazados antes de reenviar.';
      return;
    }

    const formData = new FormData();
    formData.append('id_formulario', String(s.id_formulario));
    formData.append('id_msi', String(s.id_msi));
    formData.append('nombre_sucursal', s.nombre_sucursal);
    formData.append('correo_electronico', s.correo_electronico);
    formData.append('nombre_completo', s.nombre_completo);
    formData.append('fecha_venta', this.formatFechaISO(s.fecha_venta));
    formData.append('modelo_bicicleta', s.modelo_bicicleta);
    formData.append('numero_serie', s.numero_serie);
    formData.append('precio_publico', s.precio_publico);
    if (s.id_marca_bicicleta) formData.append('id_marca_bicicleta', String(s.id_marca_bicicleta));

    this.docsRechazados(s).forEach(key => {
      formData.append(key, this.archivosNuevos[key], this.archivosNuevos[key].name);
    });

    this.reenviando = true;
    this.service.actualizarVenta(s.id, formData).subscribe({
      next: () => {
        this.reenviando = false;
        this.mensajeReenvioExito = '¡Solicitud actualizada y enviada de nuevo a revisión!';
        this.archivosNuevos = {};
        this.recargarSeleccionada(s.id);
      },
      error: (err) => {
        this.reenviando = false;
        this.errorReenvio = err.error?.error || 'Ocurrió un error al reenviar la solicitud.';
      }
    });
  }

  private recargarSeleccionada(id: number): void {
    this.service.dashboardDistribuidor().subscribe({
      next: (res) => {
        this.dashboard = res;
        this.solicitudes = res.solicitudes;
        this.seleccionada = res.solicitudes.find(s => s.id === id) ?? null;
      }
    });
  }
}
