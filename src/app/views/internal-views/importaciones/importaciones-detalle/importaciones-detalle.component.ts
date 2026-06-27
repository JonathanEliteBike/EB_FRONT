import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
export class ImportacionesDetalleComponent implements OnInit {
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
      { campo: 'imp_carta_porte',                label: 'Carta porte (fecha)' },
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
      { campo: 'imp_layout_verificacion',        label: 'Layout para verificación' },
      { campo: 'imp_envio_layout',               label: 'Envío de layout (si aplica)' },
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
      { campo: 'odoo_codificacion',     label: 'Codificación de productos' },
      { campo: 'odoo_alta_catalogo',    label: 'Alta de catálogo en Odoo' },
      { campo: 'odoo_alta_precios',     label: 'Alta de precios en Odoo' },
      { campo: 'odoo_alta_orden_compra', label: 'Alta de orden de compra' },
      { campo: 'odoo_folio_orden',      label: 'Folio(s) de orden de compra' },
      { campo: 'log_recepcion_documentos', label: 'Recepción de documentos' },
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
      { campo: 'cie_fecha_pago_elite',        label: 'Fecha de pago a Elite Bike' },
      { campo: 'cie_saldo_favor_aa',          label: 'Saldo a favor del Agente Aduanal' },
      { campo: 'cie_liquidado_aa',            label: 'Liquidado a Agente Aduanal' },
      { campo: 'cie_fecha_pago_aa',           label: 'Fecha de pago a Agente Aduanal' },
    ],
    costos: [
      { campo: 'cos_tipo_cambio_pedimento',    label: 'Tipo de cambio pedimento'        },
      { campo: 'cos_valor_factura',            label: 'Valor factura (del pedimento)'   },
      { campo: 'cos_cantidad_bicicletas',      label: 'Cantidad de bicicletas'          },
      { campo: 'cos_flete_internacional_usd',  label: 'Costo flete internacional (USD)' },
      { campo: 'cos_gastos_forwarder_pesos',   label: 'Gastos forwarder en destino (pesos)' },
      { campo: 'cos_seguro_pesos',             label: 'Seguro (pesos)'                  },
      { campo: 'cos_custodia_pesos',           label: 'Custodia (pesos)'                },
      { campo: 'cos_maniobras_pesos',          label: 'Maniobras (pesos)'               },
      { campo: 'cos_cargos_adicionales_pesos', label: 'Cargos adicionales / Multas (pesos)' },
      { campo: 'cos_honorarios_pesos',         label: 'Honorarios AA (pesos)'           },
      { campo: 'cos_flete_terrestre_usd',      label: 'Flete terrestre (USD)'           },
      { campo: 'cos_pernoctas_usd',            label: 'Pernoctas flete terrestre (USD)' },
      { campo: 'cos_paquetexpress_usd',        label: 'Ingreso a PaquetExpress (USD)'   },
      { campo: 'cos_demoras_usd',              label: 'Demoras / almacenaje (USD)'      },
      { campo: 'cos_verificacion_pesos',       label: 'Verificación (pesos)'            },
      { campo: 'cos_lavado_contenedor_pesos',  label: 'Lavado de contenedor (pesos)'    },
      { campo: 'cos_monitoreo_pesos',          label: 'Monitoreo (pesos)'               },
      { campo: 'cos_impuestos_pagados_pesos',  label: 'Impuestos pagados (pesos)'       },
      { campo: 'cos_reconocimiento_aduanero',  label: 'Reconocimiento aduanero (pesos)' },
    ],
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: ImportacionesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.obtener(id).subscribe({
      next: (data) => {
        this.embarque = data;
        // Restore authoritative N/A state first (from official saves)
        for (const campo of (this.embarque.campos_na || [])) {
          this.camposNA.add(campo);
        }
        this._aplicarBorradores();
        this.cargando = false;
      },
      error: () => { this.error = 'Embarque no encontrado'; this.cargando = false; },
    });
  }

  private _aplicarBorradores(): void {
    if (!this.embarque?.borradores) return;
    for (const campos of Object.values(this.embarque.borradores)) {
      for (const [campo, valor] of Object.entries(campos as Record<string, any>)) {
        if (valor === '__NA__') {
          // Only apply draft N/A if the DB value is empty AND not already in camposNA (from campos_na)
          const actual = (this.embarque as any)[campo];
          if (!this.camposNA.has(campo) && (actual === null || actual === undefined || actual === '')) {
            this.camposNA.add(campo);
          }
        } else {
          const actual = (this.embarque as any)[campo];
          if (actual === null || actual === undefined || actual === '') {
            (this.embarque as any)[campo] = valor;
          }
        }
      }
    }
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
    (this.embarque as any)[campo] = valor;
    (this.cambiosPendientes as any)[campo] = valor;
    if (this.valorValido(valor)) {
      this.camposConError.delete(campo as string);
      if (this.camposConError.size === 0) this.validacionError = [];
    }
  }

  private valorValido(v: any): boolean {
    return v !== null && v !== undefined && v !== '' && v !== 'NO';
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
        this.cambiosPendientes = {};
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
      error: () => { this.guardando = false; },
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
        next: () => this.router.navigate(['/importaciones']),
        error: () => this.router.navigate(['/importaciones']),
      });
    } else {
      this.router.navigate(['/importaciones']);
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
