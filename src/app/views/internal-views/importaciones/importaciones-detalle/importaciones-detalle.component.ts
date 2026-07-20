import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { DatePickerComponent } from '../../../../components/date-picker/date-picker.component';
import { ImportacionesService, Importacion } from '../../../../services/importaciones.service';

type Seccion = 'logistica' | 'importacion' | 'despacho' | 'odoo' | 'almacen' | 'recepcion' | 'cierre' | 'costos';

interface CampoValidar { campo: keyof Importacion; label: string; opcional?: boolean; }

@Component({
  selector: 'app-importaciones-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, DatePickerComponent],
  templateUrl: './importaciones-detalle.component.html',
  styleUrl: './importaciones-detalle.component.css',
})
export class ImportacionesDetalleComponent implements OnInit, OnDestroy {
  embarque: Importacion | null = null;
  cargando = true;
  guardando = false;
  guardadoOk = false;
  error = '';
  seccionActiva: Seccion = 'logistica';
  cambiosPendientes: Partial<Importacion> = {};

  validacionError: string[] = [];
  camposConError = new Set<string>();
  camposNA = new Set<string>();

  // Polling de actualizaciones concurrentes
  hayActualizacionExterna = false;
  private _pollSub?: Subscription;
  private _embarqueId = 0;
  private readonly POLL_INTERVAL_MS = 10_000;

  // Auto-guardado silencioso
  autoguardandoOk = false;
  private _autoguardadoTimer?: ReturnType<typeof setTimeout>;

  readonly tabs: { key: Seccion; label: string; icon: string }[] = [
    { key: 'logistica',   label: 'Logística',   icon: 'fa-ship' },
    { key: 'importacion', label: 'Importación',  icon: 'fa-file-alt' },
    { key: 'despacho',    label: 'Despacho',     icon: 'fa-truck' },
    { key: 'odoo',        label: 'Odoo / SAE',   icon: 'fa-database' },
    { key: 'almacen',     label: 'Almacén',      icon: 'fa-warehouse' },
    { key: 'recepcion',   label: 'Recepción',    icon: 'fa-box-open' },
    { key: 'costos',      label: 'Costos',       icon: 'fa-dollar-sign' },
    { key: 'cierre',      label: 'Cierre',       icon: 'fa-check-circle' },
  ];

  private readonly CAMPOS_VALIDAR: Partial<Record<Seccion, CampoValidar[]>> = {
    logistica: [
      { campo: 'odoo_importador',                  label: 'Importador' },
      { campo: 'log_fecha_notificacion',           label: 'Fecha notificación de entrega' },
      { campo: 'log_fecha_entrega',                label: 'Fecha de entrega' },
      { campo: 'log_titulo_correo_salida',         label: 'Título correo salida de contenedor' },
      { campo: 'log_confirmacion_enterado',        label: 'Confirmación de enterado ELEI' },
      { campo: 'log_origen',                       label: 'Origen' },
      { campo: 'log_tipo_productos',               label: 'Tipo de productos' },
      { campo: 'log_fecha_solicitud_cotizaciones', label: 'Fecha solicitud de cotizaciones' },
      { campo: 'log_confirmacion_cotizacion',      label: 'Confirmación de cotización y forwarder' },
      { campo: 'log_costo_flete',                  label: 'Costo de flete' },
      { campo: 'log_fecha_shipping_instructions',  label: 'Envío shipping instructions' },
      { campo: 'log_confirmacion_booking',         label: 'Confirmación de booking' },
      { campo: 'log_fecha_booking',                label: 'Booking (fecha salida contenedor)' },
      { campo: 'log_eta_puerto',                   label: 'ETA Puerto' },
      { campo: 'log_buque',                        label: 'Buque' },
      { campo: 'log_no_viaje',                     label: 'No. de Viaje' },
      { campo: 'log_puerto_salida',                label: 'Puerto de salida' },
      { campo: 'log_contenedor',                   label: 'Contenedor(es)' },
      { campo: 'log_recepcion_bl_co',              label: 'Recepción de BL y CO' },
      { campo: 'log_confirmacion_bl_co',           label: 'Confirmación de BL y CO definitivos' },
      { campo: 'log_envio_certificado',            label: 'Envío de Certificado a México', opcional: true },
      { campo: 'log_certificado_seguro',           label: 'Certificado de Seguro (número)' },
      // log_recepcion_documentos moved to odoo
    ],
    importacion: [
      { campo: 'imp_fecha_traduccion',           label: 'Fecha entrega de traducción al RBF' },
      { campo: 'imp_fecha_numeros_serie',        label: 'Fecha entrega de números de serie' },
      { campo: 'imp_bl_guia',                    label: 'BL / Guía' },
      { campo: 'imp_co',                         label: 'CO' },
      { campo: 'imp_facturas',                   label: 'Facturas (números)' },
      { campo: 'imp_series',                     label: 'Series' },
      { campo: 'imp_solicitud_pago_forwarder',   label: 'Solicitud de pago a Forwarder' },
      { campo: 'imp_llegada_contenedor_puerto',  label: 'Llegada de contenedor a puerto' },
      { campo: 'imp_terminal',                   label: 'Terminal' },
      { campo: 'imp_bl_endosado',                label: 'BL endosado por el forwarder al AA' },
      { campo: 'imp_bl_revalidado',              label: 'BL revalidado por el AA' },
      { campo: 'imp_entrega_facturas_aa',        label: 'Entrega de facturas al AA' },
      { campo: 'imp_traduccion_aa',              label: 'Traducción para el AA' },
      { campo: 'imp_entrega_certificado_origen', label: 'Entrega de certificado de origen' },
      { campo: 'imp_relacion_numeros_serie',     label: 'Relación de números de serie' },
      { campo: 'imp_relacion_incrementables',    label: 'Relación de incrementables' },
      { campo: 'imp_recepcion_draft_pedimento',  label: 'Recepción de draft de pedimento' },
      { campo: 'imp_fecha_entrega_docs_aa',      label: 'Fecha entrega documentos al AA' },
      { campo: 'imp_pedimento_revisado',         label: 'Pedimento revisado definitivo' },
      { campo: 'imp_pedimento',                  label: 'Pedimento (número)' },
      { campo: 'imp_coves_aa',                   label: 'Elaboración de COVES del AA' },
      { campo: 'imp_revision_coves',             label: 'Revisión de COVES por ELEI' },
      { campo: 'imp_aplica_verificacion',        label: '¿Aplica verificación?' },
      { campo: 'imp_layout_verificacion',        label: 'Layout para verificación', opcional: true },
      { campo: 'imp_envio_layout',               label: 'Envío de layout (si aplica)', opcional: true },
      { campo: 'imp_carta_318',                  label: 'Carta 3.1.8' },
      { campo: 'imp_carta_incrementables',       label: 'Carta de incrementables' },
      { campo: 'imp_carta_no_previo',            label: 'Carta de no previo' },
      { campo: 'imp_carta_declaracion_marca',    label: 'Carta declaración de marca' },
      { campo: 'imp_carta_aplicacion_uva',       label: 'Carta aplicación de UVA' },
      { campo: 'imp_articulos_verificar',        label: 'Artículos a verificar y cantidad total' },
      { campo: 'imp_liberacion_folios',          label: 'Liberación de folios' },
      { campo: 'imp_fecha_pago_pedimento',       label: 'Fecha de pago de pedimento' },
      { campo: 'imp_fecha_limite_cruce',         label: 'Fecha límite cruce' },
    ],
    despacho: [
      { campo: 'des_solicitud_cita_cruce',       label: 'Solicitud de cita para cruce' },
      { campo: 'des_cita_cruce',                 label: 'Cita para cruce' },
      { campo: 'des_fecha_cruce_real',           label: 'Fecha de cruce real' },
      { campo: 'des_solicitud_pase_maniobras',   label: 'Solicitud de pase para maniobras' },
      { campo: 'des_carta_maniobras',            label: 'Carta de maniobras (transportista)' },
      { campo: 'des_fecha_carta_porte',          label: 'Datos para carta porte' },
      { campo: 'des_fecha_entrega_almacen_prog', label: 'Fecha de entrega en almacén programada' },
      { campo: 'des_lugar_destino',              label: 'Lugar de destino (Ciudad)' },
      { campo: 'des_llegada_almacen',            label: 'Llegada de contenedor a almacén' },
      { campo: 'des_solicitud_carta_vacio',      label: 'Solicitud de carta para entrega de vacío' },
      { campo: 'des_fecha_lavado',               label: 'Fecha de lavado de contenedor' },
      { campo: 'des_entrega_contenedor_naviera', label: 'Fecha entrega contenedor a naviera' },
      { campo: 'des_dias_sin_demoras',           label: 'Días sin demoras para devolver contenedor' },
      { campo: 'des_recepcion_eir',              label: 'Recepción de documento EIR' },
    ],
    odoo: [
      { campo: 'log_recepcion_documentos', label: 'Recepción de documentos' },
      { campo: 'odoo_codificacion',     label: 'Codificación de productos' },
      { campo: 'odoo_alta_catalogo',    label: 'Alta de catálogo en Odoo' },
      { campo: 'odoo_alta_precios',     label: 'Alta de precios en Odoo' },
      { campo: 'odoo_alta_orden_compra', label: 'Alta de orden de compra' },
      { campo: 'odoo_folio_orden',      label: 'Folio(s) de orden de compra' },
    ],
    almacen: [
      { campo: 'alm_base_datos_etiquetas',        label: 'Base de datos para etiquetas' },
      { campo: 'alm_base_datos_verificacion',     label: 'Base de datos de artículos a verificación' },
      { campo: 'alm_fecha_limite_etiquetado',     label: 'Fecha límite cumplimiento etiquetado (UVA)' },
      { campo: 'alm_liberacion_etiquetado',       label: 'Liberación de etiquetado por almacén' },
      { campo: 'alm_liberacion_etiquetado_uva',   label: 'Liberación de etiquetado por almacén (UVA)' },
      { campo: 'alm_envio_info_uva',              label: 'Envío de información a la UVA' },
      { campo: 'alm_liberacion_uva',              label: 'Liberación de etiquetado por la UVA' },
      { campo: 'alm_proyectado_dias_etiquetado',  label: 'Proyectado de días estimado para el etiquetado' },
      { campo: 'alm_inicio_etiquetado',           label: 'Fecha de inicio de etiquetado' },
      { campo: 'alm_terminacion_etiquetado',      label: 'Fecha de terminación de etiquetado' },
      // alm_real_dias_etiquetado is calculated — not in CAMPOS_VALIDAR (user can't fill it)
    ],
    recepcion: [
      { campo: 'rec_cedula_costeo',           label: 'Cédula de costeo de IGI' },
      { campo: 'rec_recepcion_odoo',          label: 'Recepción en Odoo' },
      { campo: 'rec_folio_compra',            label: 'Folio de Compra en Odoo' },
      { campo: 'rec_liberacion_verificacion', label: 'Liberación de productos a verificación' },
      { campo: 'rec_liberacion_final',        label: 'Liberación final del producto' },
    ],
    cierre: [
      { campo: 'cie_recepcion_cuenta_gastos', label: 'Recepción de cuenta de gastos' },
      { campo: 'cie_saldo_favor_elite',       label: 'Saldo a favor de Elite Bike' },
      { campo: 'cie_liquidado_elite',         label: 'Liquidado a Elite Bike' },
      { campo: 'cie_fecha_pago_elite',        label: 'Fecha de pago a Elite Bike', opcional: true },
      { campo: 'cie_saldo_favor_aa',          label: 'Saldo a favor del Agente Aduanal' },
      { campo: 'cie_liquidado_aa',            label: 'Liquidado a Agente Aduanal' },
      { campo: 'cie_fecha_pago_aa',           label: 'Fecha de pago a Agente Aduanal' },
    ],
    costos: [
      { campo: 'cos_tipo_cambio_pedimento',    label: 'Tipo de cambio pedimento'        },
      { campo: 'cos_valor_factura',            label: 'Valor factura (del pedimento)',   opcional: true },
      { campo: 'cos_cantidad_bicicletas',      label: 'Cantidad de bicicletas',          opcional: true },
      { campo: 'cos_flete_internacional_usd',  label: 'Costo flete internacional (USD)', opcional: true },
      { campo: 'cos_gastos_forwarder_pesos',   label: 'Gastos forwarder en destino (pesos)', opcional: true },
      { campo: 'cos_seguro_pesos',             label: 'Seguro (pesos)',                  opcional: true },
      { campo: 'cos_custodia_pesos',           label: 'Custodia (pesos)',                opcional: true },
      { campo: 'cos_maniobras_pesos',          label: 'Maniobras (pesos)',               opcional: true },
      { campo: 'cos_cargos_adicionales_pesos', label: 'Cargos adicionales / Multas (pesos)', opcional: true },
      { campo: 'cos_honorarios_pesos',         label: 'Honorarios AA (pesos)',           opcional: true },
      { campo: 'cos_flete_terrestre_usd',      label: 'Flete terrestre (USD)',           opcional: true },
      { campo: 'cos_pernoctas_usd',            label: 'Pernoctas flete terrestre (USD)', opcional: true },
      { campo: 'cos_paquetexpress_usd',        label: 'Ingreso a PaquetExpress (USD)',   opcional: true },
      { campo: 'cos_demoras_usd',              label: 'Demoras / almacenaje (USD)',      opcional: true },
      { campo: 'cos_verificacion_pesos',       label: 'Verificación (pesos)',            opcional: true },
      { campo: 'cos_lavado_contenedor_pesos',  label: 'Lavado de contenedor (pesos)',    opcional: true },
      { campo: 'cos_monitoreo_pesos',          label: 'Monitoreo (pesos)',               opcional: true },
      { campo: 'cos_impuestos_pagados_pesos',  label: 'Impuestos pagados (pesos)',       opcional: true },
      { campo: 'cos_reconocimiento_aduanero',  label: 'Reconocimiento aduanero (pesos)', opcional: true },
      // Piezas por tipo de caja (opcional — N/A si no aplica)
      { campo: 'cos_caja_scott_r24',          label: 'SCOTT R-24 — CAJA 1 (0.16 m³)',                       opcional: true },
      { campo: 'cos_caja_scott_r20',          label: 'SCOTT R-20 — CAJA 2 (0.14 m³)',                       opcional: true },
      { campo: 'cos_caja_scott_adulto',       label: 'SCOTT ADULTO — CAJA 3 (0.25 m³)',                     opcional: true },
      { campo: 'cos_caja_scott_tw',           label: 'SCOTT TW — CAJA 4 (0.42 m³)',                         opcional: true },
      { campo: 'cos_caja_scott_tw_electrica', label: 'SCOTT TW ELÉCTRICA — CAJA 5 (0.45 m³)',               opcional: true },
      { campo: 'cos_caja_megamo_track',       label: 'MEGAMO TRACK / PULSE — CAJA 5 (0.32 m³)',             opcional: true },
      { campo: 'cos_caja_megamo_reason',      label: 'MEGAMO REASON / FLAME / ALONG / RYAL — CAJA 6 (0.42 m³)', opcional: true },
      { campo: 'cos_caja_megamo_vitae',       label: 'MEGAMO VITAE MUSCULAR / NATURAL — CAJA 7 (0.46 m³)', opcional: true },
      // Proyección de costos
      { campo: 'cos_flete_proyectado_usd',        label: 'Flete proyectado (USD)',         opcional: true },
      { campo: 'cos_tipo_cambio_proyectado',       label: 'Tipo de cambio proyectado',      opcional: true },
      { campo: 'cos_maniobras_proyectado_pesos',   label: 'Maniobras proyectado (pesos)',   opcional: true },
      { campo: 'cos_honorarios_proyectado_pesos',  label: 'Honorarios proyectado (pesos)',  opcional: true },
    ],
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: ImportacionesService
  ) {}

  private returnUrl = '/importaciones';

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (Object.keys(this.cambiosPendientes).length > 0) {
      e.preventDefault();
    }
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('from') === 'dashboard') {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      this.returnUrl = '/importaciones/dashboard' + (tab ? `?tab=${tab}` : '');
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this._embarqueId = id;
    this.svc.obtener(id).subscribe({
      next: (data) => {
        this.embarque = data;
        for (const campo of (this.embarque.campos_na || [])) {
          this.camposNA.add(campo);
        }
        this._aplicarBorradores();
        this._cargarDraftLocal(id);
        this.cargando = false;
        this._iniciarPolling(id);
      },
      error: () => { this.error = 'Embarque no encontrado'; this.cargando = false; },
    });
  }

  ngOnDestroy(): void {
    this._pollSub?.unsubscribe();
    if (this._autoguardadoTimer) clearTimeout(this._autoguardadoTimer);
    if (!this.embarque) return;
    const tieneCambios = Object.keys(this.cambiosPendientes).length > 0;
    if (!tieneCambios) return;
    const draft = {
      seccion:  this.seccionActiva,
      cambios:  this.cambiosPendientes,
      na:       Array.from(this.camposNA),
    };
    localStorage.setItem(`imp_draft_${this.embarque.id}`, JSON.stringify(draft));
  }

  private _iniciarPolling(id: number): void {
    this._pollSub = interval(this.POLL_INTERVAL_MS).pipe(
      switchMap(() => this.svc.obtener(id))
    ).subscribe({
      next: (data) => {
        if (!this.embarque) return;
        // Merge inteligente: actualiza campos del servidor EXCEPTO los que el
        // usuario está editando en este momento (que están en cambiosPendientes).
        const camposEnEdicion = new Set(Object.keys(this.cambiosPendientes));
        const merged: any = { ...data };
        for (const campo of camposEnEdicion) {
          merged[campo] = (this.embarque as any)[campo]; // preservar versión local
        }
        this.embarque = merged;
        this._recalcularCamposLocales();
        this.hayActualizacionExterna = false;
      },
      error: () => { /* silencioso — no interrumpir al usuario */ }
    });
  }

  recargarDesdeServidor(): void {
    this.svc.obtener(this._embarqueId).subscribe({
      next: (data) => {
        this.embarque = data;
        this.cambiosPendientes = {};
        this.camposNA.clear();
        for (const campo of (this.embarque.campos_na || [])) {
          this.camposNA.add(campo);
        }
        this._aplicarBorradores();
        this._recalcularCamposLocales();
        localStorage.removeItem(`imp_draft_${this._embarqueId}`);
        this.hayActualizacionExterna = false;
      }
    });
  }

  private _cargarDraftLocal(id: number): void {
    const raw = localStorage.getItem(`imp_draft_${id}`);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      let applied = false;
      for (const [campo, valor] of Object.entries(draft.cambios || {})) {
        const actual = (this.embarque as any)[campo];
        // Comparar como string (primeros 10 chars para fechas ISO) para detectar si ya está guardado
        const mismoValor = actual !== null && actual !== undefined && actual !== ''
          && String(actual).slice(0, 10) === String(valor).slice(0, 10);
        if (mismoValor) continue; // ya está guardado en DB con ese valor, no hay cambio pendiente
        if (valor === '__NA__') {
          this.camposNA.add(campo);
        } else {
          (this.embarque as any)[campo] = valor;
        }
        (this.cambiosPendientes as any)[campo] = valor;
        applied = true;
      }
      for (const campo of (draft.na || [])) {
        const actual = (this.embarque as any)[campo];
        if (!this.camposNA.has(campo) && !actual) {
          this.camposNA.add(campo);
          (this.cambiosPendientes as any)[campo] = '__NA__';
          applied = true;
        }
      }
      if (applied && draft.seccion) this.seccionActiva = draft.seccion;
      if (applied) this._recalcularCamposLocales();
    } catch {}
  }

  private _aplicarBorradores(): void {
    if (!this.embarque?.borradores) {
      this._recalcularCamposLocales();
      return;
    }
    for (const campos of Object.values(this.embarque.borradores)) {
      for (const [campo, valor] of Object.entries(campos as Record<string, any>)) {
        if (valor === '__NA__') {
          const actual = (this.embarque as any)[campo];
          if (!this.camposNA.has(campo) && (actual === null || actual === undefined || actual === '')) {
            this.camposNA.add(campo);
            (this.cambiosPendientes as any)[campo] = '__NA__';
          }
        } else {
          const actual = (this.embarque as any)[campo];
          if (actual === null || actual === undefined || actual === '') {
            (this.embarque as any)[campo] = valor;
            (this.cambiosPendientes as any)[campo] = valor;
          }
        }
      }
    }
    this._recalcularCamposLocales();
  }

  toggleNA(campo: string): void {
    if (this.camposNA.has(campo)) {
      this.camposNA.delete(campo);
      // When removing N/A, register a pending change so Save button enables
      (this.cambiosPendientes as any)[campo] = (this.embarque as any)[campo] ?? null;
    } else {
      this.camposNA.add(campo);
      (this.embarque as any)[campo] = null;
      (this.cambiosPendientes as any)[campo] = '__NA__';
    }
  }

  esNA(campo: string): boolean {
    return this.camposNA.has(campo);
  }

  esCampoFaltante(campo: string): boolean {
    if (this.camposNA.has(campo)) return false;
    const seccCampos = this.CAMPOS_VALIDAR[this.seccionActiva] ?? [];
    const def = seccCampos.find(c => c.campo === campo);
    if (!def) return false;
    return !this.valorValido((this.embarque as any)[campo]);
  }

  usdEquiv(pesos: number | undefined | null): number | null {
    const tc = this.embarque?.cos_tipo_cambio_pedimento;
    if (!tc || !pesos) return null;
    return pesos / tc;
  }

  marcarCambio(campo: keyof Importacion, valor: any): void {
    if (!this.embarque) return;
    // Uppercase texto libre; excluye fechas ISO (YYYY-MM-DD) y valores nulos/numéricos
    if (typeof valor === 'string' && valor && !/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      valor = valor.toUpperCase();
    }
    (this.embarque as any)[campo] = valor;
    (this.cambiosPendientes as any)[campo] = valor;
    if (this.valorValido(valor)) {
      this.camposConError.delete(campo as string);
      if (this.camposConError.size === 0) this.validacionError = [];
    }
    this._recalcularCamposLocales();
    this._programarAutoguardado();
  }

  private _programarAutoguardado(): void {
    if (this._autoguardadoTimer) clearTimeout(this._autoguardadoTimer);
    this._autoguardadoTimer = setTimeout(() => {
      if (!this.embarque || !this.hayCambios() || this.guardando) return;
      // Guardar directo a columnas reales (sin _borrador_seccion) para que
      // otros usuarios vean los datos al instante vía polling.
      const payload: any = { ...this.cambiosPendientes };
      for (const campo of this.camposNA) { payload[campo] = '__NA__'; }
      this.svc.actualizar(this.embarque.id, payload).subscribe({
        next: () => {
          this.autoguardandoOk = true;
          // Actualizar updated_at local para que el polling no genere falsa alerta
          if (this.embarque) this.embarque.updated_at = new Date().toISOString();
          setTimeout(() => { this.autoguardandoOk = false; }, 2000);
        },
        error: () => {}
      });
    }, 5_000);
  }

  private _diffDias(a: string | null, b: string | null): number | null {
    if (!a || !b) return null;
    try {
      const msA = new Date(a + 'T00:00:00').getTime();
      const msB = new Date(b + 'T00:00:00').getTime();
      return Math.round((msB - msA) / 86400000);
    } catch { return null; }
  }

  private _recalcularCamposLocales(): void {
    const e = this.embarque as any;

    // Días libres en terminal = fecha_limite_cruce - llegada_contenedor_puerto
    const dias1 = this._diffDias(e.imp_llegada_contenedor_puerto, e.imp_fecha_limite_cruce);
    if (dias1 !== null) e.imp_dias_libres_almacenaje = dias1;

    // Días de despacho aduanero = cruce_real - llegada_contenedor_puerto
    const dias2 = this._diffDias(e.imp_llegada_contenedor_puerto, e.des_fecha_cruce_real);
    if (dias2 !== null) e.imp_dias_despacho_aduanero = dias2;

    // Fecha límite naviera = ETA puerto + días sin demoras
    const eta = e.log_eta_puerto;
    const dias = e.des_dias_sin_demoras;
    if (eta && dias != null && dias !== '') {
      try {
        const d = new Date(eta + 'T00:00:00');
        d.setDate(d.getDate() + Number(dias));
        e.des_fecha_limite_naviera = d.toISOString().slice(0, 10);
      } catch { e.des_fecha_limite_naviera = null; }
    } else {
      e.des_fecha_limite_naviera = null;
    }

    // Real días etiquetado = terminación - inicio
    const diasEtiq = this._diffDias(e.alm_inicio_etiquetado, e.alm_terminacion_etiquetado);
    if (diasEtiq !== null) e.alm_real_dias_etiquetado = diasEtiq;
  }

  isoADMY(iso: string | null | undefined): string {
    if (!iso) return '—';
    const s = String(iso).substring(0, 10);
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  private valorValido(v: any): boolean {
    return v !== null && v !== undefined && v !== '';
  }

  esCampoError(campo: string): boolean {
    return this.camposConError.has(campo);
  }

  private validarSeccionActual(): string[] {
    const campos = this.CAMPOS_VALIDAR[this.seccionActiva] ?? [];
    return campos
      .filter(c => !c.opcional && !this.camposNA.has(c.campo as string) && !this.valorValido((this.embarque as any)[c.campo]))
      .map(c => c.label);
  }

  private camposFaltantesSet(): Set<string> {
    const campos = this.CAMPOS_VALIDAR[this.seccionActiva] ?? [];
    return new Set(
      campos
        .filter(c => !c.opcional && !this.camposNA.has(c.campo as string) && !this.valorValido((this.embarque as any)[c.campo]))
        .map(c => c.campo as string)
    );
  }

  cambiarSeccion(s: Seccion): void {
    this.validacionError = [];
    this.camposConError.clear();
    this.seccionActiva = s;
  }

  guardar(): void {
    if (!this.embarque) return;

    const faltantes = this.validarSeccionActual();
    if (faltantes.length > 0) {
      this.validacionError = faltantes;
      this.camposConError = this.camposFaltantesSet();
      return;
    }

    this.validacionError = [];
    this.camposConError.clear();

    // Enviar todos los campos de la sección (incluyendo opcionales) + campos extra que el usuario cambió
    const payload: any = { _seccion_oficial: this.seccionActiva };
    for (const c of (this.CAMPOS_VALIDAR[this.seccionActiva] ?? [])) {
      if (this.camposNA.has(c.campo as string)) {
        payload[c.campo] = '__NA__';   // N/A explícito → backend lo cuenta como completado
      } else {
        const val = (this.embarque as any)[c.campo];
        payload[c.campo] = val === '__NA__' ? null : val;  // si antes era __NA__ y se quitó → limpiar
      }
    }
    // Incluir cambios adicionales que no estén en CAMPOS_VALIDAR (campos en el HTML sin validación)
    for (const [campo, valor] of Object.entries(this.cambiosPendientes)) {
      if (!(campo in payload)) {
        payload[campo] = this.camposNA.has(campo) ? '__NA__' : (valor === '__NA__' ? null : valor);
      }
    }

    this.guardando = true;
    this.svc.actualizar(this.embarque.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.guardadoOk = true;
        this.error = '';
        this.cambiosPendientes = {};
        localStorage.removeItem(`imp_draft_${this.embarque!.id}`);
        this.hayActualizacionExterna = false;
        this.svc.obtener(this.embarque!.id).subscribe((d) => {
          this.embarque = d;
          this.camposNA.clear();
          for (const campo of (d.campos_na || [])) {
            this.camposNA.add(campo);
          }
          this._aplicarBorradores();
        });
        setTimeout(() => { this.guardadoOk = false; }, 2500);
      },
      error: (e) => {
        this.guardando = false;
        const msg = e?.error?.error || 'Error al guardar. Intenta de nuevo.';
        this.error = msg;
        setTimeout(() => { this.error = ''; }, 5000);
      },
    });
  }

  guardarBorrador(): void {
    if (!this.embarque || !this.hayCambios()) return;
    const naPayload: any = {};
    for (const campo of this.camposNA) { naPayload[campo] = '__NA__'; }
    const payload: any = { _borrador_seccion: this.seccionActiva, ...naPayload, ...this.cambiosPendientes };
    this.guardando = true;
    this.svc.actualizar(this.embarque.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.cambiosPendientes = {};
        this.svc.obtener(this.embarque!.id).subscribe(d => {
          this.embarque = d;
          this._aplicarBorradores();
        });
      },
      error: () => { this.guardando = false; },
    });
  }

  volver(): void {
    if (this.hayCambios() || this.camposNA.size > 0) {
      const naPayload: any = {};
      for (const campo of this.camposNA) { naPayload[campo] = '__NA__'; }
      const payload: any = { _borrador_seccion: this.seccionActiva, ...naPayload, ...this.cambiosPendientes };
      this.svc.actualizar(this.embarque!.id, payload).subscribe({
        next:  () => this.router.navigateByUrl(this.returnUrl),
        error: () => this.router.navigateByUrl(this.returnUrl),
      });
    } else {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  pct(key: string): number {
    return this.embarque?.progreso ? (this.embarque.progreso as any)[key]?.pct ?? 0 : 0;
  }

  colorPct(p: number): string {
    if (p === 100) return '#22c55e';
    if (p >= 60) return '#f59e0b';
    if (p > 0) return '#3b82f6';
    return '#374151';
  }

  hayCambios(): boolean {
    return Object.keys(this.cambiosPendientes).length > 0;
  }

  formatMoney(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined) return '';
    return val.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  parseMoney(str: string): number | null {
    if (!str) return null;
    const cleaned = str.replace(/[$\s]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  formatFechaCalc(s: string | null | undefined): string {
    if (!s) return '—';
    const parts = s.split('-');
    if (parts.length !== 3) return s;
    const [y, m, d] = parts;
    const day = parseInt(d);
    const mon = parseInt(m) - 1;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    if (isNaN(day) || isNaN(mon) || mon < 0 || mon > 11) return s;
    return `${day} ${meses[mon]} ${y}`;
  }

  get progresoPct(): number {
    return this.svc.progresoPct(this.embarque!);
  }
}
