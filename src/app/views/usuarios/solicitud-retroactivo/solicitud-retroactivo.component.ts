import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { environment } from '../../../../environments/environment';
import {
  SolicitudRetroactivoService,
  SolicitudRetroactivo,
  MarcaCampania,
  ProductoCampania,
  SerieDisponible
} from '../../../services/solicitud-retroactivo.service';

interface Msi {
  id: number;
  plazo_meses: number;
  // GUÍA: el % ya no es fijo por plazo -- depende de la campaña elegida
  // (ver solicitud_retroactivo_campania_msi en el backend), por eso viene
  // en la misma respuesta de /campania/<id>/msi.
  porcentaje?: number;
}

interface Formulario {
  id: number;
  nombre: string;
}

const msiVacio = (): Msi => ({
  id: -1,
  plazo_meses: -1
});

const tipoFormularioVacio = (): Formulario => ({
  id: -1,
  nombre: ""
});

// GUÍA: etiquetas en español de cada campo, usadas para armar el mensaje de
// "faltan estos campos" (tanto en la validación local como en el rechazo 400
// del backend, que regresa las claves crudas en `campos`).
const ETIQUETAS_CAMPOS: Record<string, string> = {
  id_formulario: 'Tipo de Venta',
  id_marca_bicicleta: 'Marca',
  id_msi: 'Meses Sin Intereses',
  id_cliente: 'Razón Social',
  id_tienda: 'Sucursal / Tienda',
  correo_electronico: 'Correo Electrónico',
  fecha_venta: 'Fecha de Venta',
  modelo_bicicleta: 'Modelo de Bicicleta',
  numero_serie: 'Número de Serie',
  precio_publico: 'Precio'
};

// GUÍA: mismo patrón de agrupación del buscador de productos de Forecast
// (proyecciones-tab: producto -> colores -> tallas), pero client-side sobre
// la lista ya cargada de la campaña -- no hace falta buscar en el backend
// porque una campaña trae, cuando mucho, unas cuantas decenas de SKUs.
interface VarianteTalla {
  talla: string;
  producto: ProductoCampania;
}
interface VarianteColor {
  color: string;
  tallas: VarianteTalla[];
}
interface ProductoGrupo {
  nombre: string;
  marca: string | null;
  colores: VarianteColor[];
  soloUna?: ProductoCampania;
}

@Component({
  selector: 'app-solicitud-retroactivo',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TopBarUsuariosComponent, DatePickerComponent],
  templateUrl: './solicitud-retroactivo.component.html',
  styleUrl: './solicitud-retroactivo.component.css'
})
export class SolicitudRetroactivoComponent implements OnInit {
  // GUÍA: ya no es un catálogo global fijo -- se llena por campaña, y solo
  // se muestra si la campaña realmente liga 2+ marcas (ver valueChanges de
  // id_formulario). Con 0 o 1 marca no tiene sentido preguntarla.
  listaMarca: MarcaCampania[] = [];
  listaMsi: Msi[] = [msiVacio()];
  listaFormulario: Formulario[] = [tipoFormularioVacio()];
  listaRazonSocial: any[] = [];
  listaTiendas: any[] = [];
  cargandoTiendas = false;

  // GUÍA: productos ligados a la campaña elegida -- de aquí sale el
  // selector de "Modelo" (ver productosModal más abajo). Se recarga cada
  // vez que cambia id_formulario.
  productosDisponibles: ProductoCampania[] = [];
  productoSeleccionado: ProductoCampania | null = null;
  seriesDisponibles: SerieDisponible[] = [];
  cargandoSeries = false;
  seriesConsultadas = false;
  errorSeries = false;
  private solicitudSeriesActual = 0;

  productosModal = {
    abierto: false,
    query: '',
    grupos: [] as ProductoGrupo[],
    grupoActivo: null as ProductoGrupo | null,
    colorActivo: null as string | null,
  };

  ventaForm: FormGroup;
  archivos: { [key: string]: File } = {};
  enviando = false;
  mensajeExito = '';
  mensajeError = '';

  // GUÍA: claves de campos a resaltar en rojo, ya sea porque la validación
  // local los detectó vacíos (incluye los que Angular ignora por estar
  // disabled, como id_msi) o porque el backend los regresó en `campos`.
  camposFaltantes = new Set<string>();

  // GUÍA: "Tus solicitudes" ahora vive en su propia página
  // (solicitud-retroactivo-seguimiento). Este formulario solo necesita saber
  // si hay que precargar una reedición, vía ?editar=<id> en la URL.
  esCliente = false;
  esAdmin = false;
  editandoId: number | null = null;
  cargandoEdicion = false;
  // GUÍA: solo los archivos marcados 'rechazado' en esa solicitud -- el
  // cliente no tiene que resubir los que ya quedaron validos. Ver
  // camposArchivosVisibles más abajo.
  docsRechazadosEnEdicion: string[] = [];

  camposArchivos = [
    { key: 'ticket_compra', label: 'Ticket de compra (debe tener la fecha del mismo mes)', tooltip: 'Debe contener modelo, serie y detalles de la bicicleta', accept: 'image/*,.pdf' },
    { key: 'voucher', label: 'Voucher de pago', tooltip: '', accept: 'image/*,.pdf' },
    { key: 'factura_pdf', label: 'Factura (PDF)', tooltip: '', accept: '.pdf' },
    { key: 'factura_xml', label: 'Factura (XML)', tooltip: '', accept: '.xml' }
  ];

  get camposArchivosVisibles() {
    if (this.editandoId === null) return this.camposArchivos;
    return this.camposArchivos.filter(c => this.docsRechazadosEnEdicion.includes(c.key));
  }

  validarCantidad(e: Event): void {
    const input = e.target as HTMLInputElement;
    const cursor = input.selectionStart || 0;
    const valorOriginal = input.value;

    const limpio = valorOriginal.replace(/[^0-9.]/g, '')
                                .replace(/(\..*)\./g, '$1')
                                .replace(/(\.\d{2})\d+/, '$1');

    const [entero, decimal] = limpio.split('.');
    const formateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 
                      (decimal !== undefined ? `.${decimal}` : '');

    const nuevaPosicion = cursor + (formateado.length - valorOriginal.length);
    
    input.value = formateado;
    input.setSelectionRange(nuevaPosicion, nuevaPosicion);
    this.ventaForm.get('precio_publico')?.setValue(formateado, { emitEvent: false });
  }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private solicitudService: SolicitudRetroactivoService,
    private route: ActivatedRoute
  ) {
    this.ventaForm = this.fb.group({
      id_formulario: ['', Validators.required],
      id_marca_bicicleta: [{ value: '', disabled: true }],
      id_msi: [{ value: '', disabled: true }, Validators.required],
      id_cliente: ['', Validators.required],
      id_tienda: [{ value: '', disabled: true }, Validators.required],
      correo_electronico: ['', [Validators.required, Validators.email]],
      fecha_venta: ['', Validators.required],
      modelo_bicicleta: ['', Validators.required],
      numero_serie: ['', Validators.required],
      precio_publico: ['', Validators.required]
    });
  }

  onFileSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivos[key] = input.files[0];
    }
  }

  removeArchivo(key: string): void {
    delete this.archivos[key];

    const input = document.querySelector<HTMLInputElement>(`input[type="file"][data-file-key="${key}"]`);
    if (input) {
      input.value = '';
    }
  }

  private formatFechaParaInput(fecha: string | undefined): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  private cargarYPrecargarEdicion(id: number): void {
    this.cargandoEdicion = true;
    this.solicitudService.misSolicitudes().subscribe({
      next: (res) => {
        this.cargandoEdicion = false;
        const solicitud = res.find(s => s.id === id);
        if (solicitud) {
          this.iniciarEdicion(solicitud);
        } else {
          this.mensajeError = 'No se encontró la solicitud a reeditar.';
        }
      },
      error: () => {
        this.cargandoEdicion = false;
        this.mensajeError = 'No se pudo cargar la solicitud a reeditar.';
      }
    });
  }

  iniciarEdicion(s: SolicitudRetroactivo): void {
    this.editandoId = s.id;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.archivos = {};
    this.docsRechazadosEnEdicion = Object.entries(s.validacion_docs ?? {})
      .filter(([, estatus]) => estatus === 'rechazado')
      .map(([doc]) => doc);

    this.ventaForm.patchValue({
      id_formulario: s.id_formulario,
      correo_electronico: s.correo_electronico,
      fecha_venta: this.formatFechaParaInput(s.fecha_venta),
      modelo_bicicleta: s.modelo_bicicleta,
      numero_serie: s.numero_serie,
      precio_publico: s.precio_publico
    });

    // El valueChanges de id_formulario habilita id_marca_bicicleta/id_msi y
    // recarga sus catálogos; una vez listos, fijamos los valores guardados.
    setTimeout(() => {
      this.ventaForm.patchValue({
        id_marca_bicicleta: s.id_marca_bicicleta ?? '',
        id_msi: s.id_msi
      });
    }, 400);

    document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.docsRechazadosEnEdicion = [];
    this.ventaForm.reset();
    this.archivos = {};
  }

  // Bordea en rojo el form-group del campo, ya sea por invalidez local o
  // porque el backend lo marcó como faltante.
  esCampoInvalido(campo: string): boolean {
    const control = this.ventaForm.get(campo);
    return this.camposFaltantes.has(campo) || !!(control?.invalid && control?.touched);
  }

  // GUÍA: revisa a mano los campos requeridos que pueden estar disabled
  // (id_msi siempre, id_tienda mientras no haya cliente elegido). Angular
  // excluye los controles disabled de ventaForm.invalid, así que sin este
  // chequeo el formulario "pasa" localmente aunque vayan vacíos al backend.
  // id_marca_bicicleta NO necesita este chequeo: se habilita+requiere
  // exactamente cuando la campaña elegida tiene 2+ marcas (ver
  // valueChanges de id_formulario), así que "disabled" y "no requerido"
  // siempre coinciden para ese control.
  private camposCondicionalesFaltantes(): string[] {
    const valores = this.ventaForm.getRawValue();
    const faltantes: string[] = [];

    if (!valores.id_msi) {
      faltantes.push('id_msi');
    }
    if (this.listaTiendas.length > 0 && !valores.id_tienda) {
      faltantes.push('id_tienda');
    }
    return faltantes;
  }

  onSubmit(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.camposFaltantes.clear();

    const condicionalesFaltantes = this.camposCondicionalesFaltantes();

    if (this.ventaForm.invalid || condicionalesFaltantes.length > 0) {
      this.ventaForm.markAllAsTouched();
      condicionalesFaltantes.forEach(campo => this.camposFaltantes.add(campo));

      Object.keys(this.ventaForm.controls).forEach(campo => {
        if (this.ventaForm.get(campo)?.invalid) {
          this.camposFaltantes.add(campo);
        }
      });

      const etiquetas = [...this.camposFaltantes].map(c => ETIQUETAS_CAMPOS[c] || c);
      this.mensajeError = `Faltan estos campos: ${etiquetas.join(', ')}.`;
      return;
    }

    // Se filtran los archivos faltantes excluyendo los opcionales (XML)
    const archivosFaltantes = this.camposArchivosVisibles.filter(item => 
      !this.archivos[item.key] && item.key !== 'factura_xml'
    );
    if (archivosFaltantes.length > 0) {
      this.mensajeError = `Falta adjuntar los siguientes archivos: ${archivosFaltantes.map(f => f.label).join(', ')}`;
      return;
    }

    this.enviando = true;

    const formData = new FormData();
    const datosFormulario = this.ventaForm.getRawValue();

    const clienteSel = this.listaRazonSocial.find(c => c.id == datosFormulario.id_cliente);
    const tiendaSel = this.listaTiendas.find(t => t.id == datosFormulario.id_tienda);

    if (datosFormulario.precio_publico) {
      datosFormulario.precio_publico = datosFormulario.precio_publico.toString().replace(/,/g, '');
    }

    Object.keys(datosFormulario).forEach(key => {
      formData.append(key, datosFormulario[key] ?? '');
    });

    if (this.productoSeleccionado) {
      formData.append('producto_detalle_id', String(this.productoSeleccionado.id));
      formData.append('sku', this.productoSeleccionado.sku);
    }

    if (clienteSel) {
      formData.append('nombre_completo', clienteSel.nombre_cliente);
    }
    if (tiendaSel) {
      formData.append('nombre_sucursal', tiendaSel.nombre);
    }

    Object.keys(this.archivos).forEach(key => {
      formData.append(key, this.archivos[key], this.archivos[key].name);
    });

    const token = localStorage.getItem('token');
    if (!token) return;

    const manejarExito = (mensaje: string) => {
      this.enviando = false;
      this.mensajeExito = mensaje;
      this.editandoId = null;
      this.docsRechazadosEnEdicion = [];

      this.ventaForm.reset();
      this.archivos = {};

      const inputsArchivos = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputsArchivos.forEach(input => input.value = '');

      this.ventaForm.get('id_marca_bicicleta')?.disable();
      this.ventaForm.get('id_msi')?.disable();
      this.ventaForm.get('id_tienda')?.disable();

      this.listaMarca = [];
      this.listaMsi = [];
      this.productosDisponibles = [];
      this.productoSeleccionado = null;
    };

    const manejarError = (err: any) => {
      this.enviando = false;

      const camposBackend: string[] = err.error?.campos ?? [];
      if (camposBackend.length > 0) {
        camposBackend.forEach(campo => this.camposFaltantes.add(campo));
        const etiquetas = camposBackend.map(c => ETIQUETAS_CAMPOS[c] || c);
        this.mensajeError = `Faltan estos campos: ${etiquetas.join(', ')}.`;
      } else {
        this.mensajeError = err.error?.error || 'Ocurrió un error al enviar la información.';
      }
    };

    if (this.editandoId !== null) {
      this.solicitudService.actualizarVenta(this.editandoId, formData).subscribe({
        next: () => manejarExito('¡Solicitud actualizada y enviada de nuevo a revisión!'),
        error: manejarError
      });
      return;
    }

    formData.set('id_usuario', JSON.parse(atob(token.split('.')[1])).id);

    this.http.post(`${environment.apiUrl}/api/solicitud-retroactivo/registrar/venta`, formData)
      .subscribe({
        next: () => manejarExito('¡Venta y archivos cargados con éxito!'),
        error: manejarError
      });
  }

  async ngOnInit() {
    let clienteIdUsuario: number | null = null;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.esCliente = decoded.rol === 2 || decoded.rol === 3;
        this.esAdmin = decoded.rol === 1;
        if (decoded.cliente_id) {
          clienteIdUsuario = Number(decoded.cliente_id);
        }
      } catch { /* token inválido */ }
    }
    const idEditar = Number(this.route.snapshot.queryParamMap.get('editar'));
    if (this.esCliente && idEditar) {
      this.cargarYPrecargarEdicion(idEditar);
    }

    // GUÍA: si el usuario cambia de Marca, el producto ya elegido en
    // "Modelo" puede ya no corresponder (era de otra marca) -- se limpia
    // para forzar una nueva selección coherente con la marca actual.
    this.ventaForm.get('id_marca_bicicleta')?.valueChanges.subscribe(() => {
      this.productoSeleccionado = null;
      this.ventaForm.get('modelo_bicicleta')?.setValue('');
      this.limpiarSeriesDisponibles();
    });

    this.ventaForm.get('id_cliente')?.valueChanges.subscribe((clienteId) => {
      const controlTienda = this.ventaForm.get('id_tienda');
      controlTienda?.setValue('');
      controlTienda?.markAsUntouched();
      controlTienda?.markAsPristine();
      this.camposFaltantes.delete('id_tienda');
      if (clienteId) {
        this.cargarTiendas(Number(clienteId));
      } else {
        this.listaTiendas = [];
        controlTienda?.disable();
      }
    });

    try {
        this.listaFormulario = await this.buscarTipoFormulario();

        this.solicitudService.buscarRazonesSociales().subscribe({
          next: (razones) => {
            this.listaRazonSocial = razones;
            if (clienteIdUsuario && razones.some(r => r.id === clienteIdUsuario)) {
              this.ventaForm.patchValue({ id_cliente: clienteIdUsuario });
            }
          },
          error: (err) => console.error("Error al obtener Razones Sociales:", err)
        });

        this.ventaForm.get('id_formulario')?.valueChanges.subscribe(async (valor) => {
          const controlMarca = this.ventaForm.get('id_marca_bicicleta');
          const controlMsi = this.ventaForm.get('id_msi');

          // La campaña cambió: el producto/modelo elegido (si había uno) ya
          // no necesariamente pertenece a la nueva campaña.
          this.productosDisponibles = [];
          this.productoSeleccionado = null;
          this.ventaForm.get('modelo_bicicleta')?.setValue('');
          this.limpiarSeriesDisponibles();

          if (!valor) {
            this.listaMarca = [];
            this.listaMsi = [];
            controlMarca?.clearValidators();
            controlMarca?.setValue('');
            controlMarca?.disable();
            controlMarca?.updateValueAndValidity();
            return;
          }

          const idCampania = Number(valor);

          // GUÍA: la Marca ya no depende de un id de campaña fijo (antes
          // solo se mostraba para id_formulario==1, hardcodeado a SCOTT).
          // Ahora se activa dinámicamente según lo que la campaña
          // REALMENTE tenga ligado: 2+ marcas -> se pregunta; 1 sola ->
          // se guarda sola, sin molestar al usuario; 0 -> se deja vacía.
          try {
            const marcas = await this.buscarMarcasCampania(idCampania);
            if (marcas.length >= 2) {
              this.listaMarca = marcas;
              controlMarca?.setValidators([Validators.required]);
              controlMarca?.setValue('');
              controlMarca?.enable();
            } else {
              this.listaMarca = [];
              controlMarca?.clearValidators();
              controlMarca?.setValue(marcas.length === 1 ? marcas[0].id : '');
              controlMarca?.disable();
            }
          } catch (err) {
            console.error("Error al obtener marcas de la campaña:", err);
            this.listaMarca = [];
            controlMarca?.disable();
          }
          controlMarca?.updateValueAndValidity();

          // Productos ligados a la campaña, para el selector de "Modelo".
          try {
            this.productosDisponibles = await this.buscarProductosCampania(idCampania);
          } catch (err) {
            console.error("Error al obtener productos de la campaña:", err);
            this.productosDisponibles = [];
          }

          try {
            this.listaMsi = await this.buscarMsi(idCampania);
            this.listaMsi.length ? controlMsi?.enable() : controlMsi?.disable();
          } catch (err) {
            console.error("Error al obtener catálogos:", err);
            controlMsi?.disable();
          }
      });
    } catch (error) {
      console.error("Error al cargar la información inicial:", error);
    }
  }

  cargarTiendas(clienteId: number): void {
    const controlTienda = this.ventaForm.get('id_tienda');
    this.cargandoTiendas = true;
    this.solicitudService.buscarTiendas(clienteId).subscribe({
      next: (tiendas) => {
        this.cargandoTiendas = false;
        this.listaTiendas = tiendas;
        controlTienda?.enable();
      },
      error: (err) => {
        console.error("Error al cargar tiendas:", err);
        this.cargandoTiendas = false;
        this.listaTiendas = [];
        controlTienda?.enable();
      }
    });
  }

  async buscarTipoFormulario(): Promise<Formulario[]> {
    const res = await fetch(`${environment.apiUrl}/api/solicitud-retroactivo/formulario`);
    if (!res.ok) throw new Error("Error API");
    return res.json();
  }

  // GUÍA: los plazos MSI disponibles (y su %) dependen de la campaña
  // elegida -- ya no es un catálogo global fijo, cada campaña liga los
  // suyos con su propio porcentaje (ver módulo de Campañas).
  async buscarMsi(idFormulario: number): Promise<Msi[]> {
    const res = await fetch(`${environment.apiUrl}/api/solicitud-retroactivo/campania/${idFormulario}/msi`);
    if (!res.ok) throw new Error("Error API");
    return res.json();
  }

  async buscarMarcasCampania(idCampania: number): Promise<MarcaCampania[]> {
    return firstValueFrom(this.solicitudService.marcasPorCampania(idCampania));
  }

  async buscarProductosCampania(idCampania: number): Promise<ProductoCampania[]> {
    return firstValueFrom(this.solicitudService.productosPorCampania(idCampania));
  }

  // ─────────────────────────────────────────
  // Selector de "Modelo": agrupa los productos de la campaña por nombre ->
  // color -> talla (mismo patrón que el buscador de Forecast), pero
  // client-side, ya que la lista completa de la campaña ya está cargada.
  // ─────────────────────────────────────────

  private agruparProductos(lista: ProductoCampania[]): ProductoGrupo[] {
    const map = new Map<string, ProductoCampania[]>();
    for (const p of lista) {
      const key = (p.modelo || p.codigo || p.sku).trim().replace(/\s+/g, ' ').toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    const grupos: ProductoGrupo[] = [];
    for (const [, variantes] of map.entries()) {
      const primero = variantes[0];
      const colorMap = new Map<string, VarianteTalla[]>();
      for (const v of variantes) {
        const c = v.color || 'N/A';
        if (!colorMap.has(c)) colorMap.set(c, []);
        colorMap.get(c)!.push({ talla: v.talla || 'N/A', producto: v });
      }
      const colores: VarianteColor[] = [...colorMap.entries()].map(([color, tallas]) => ({ color, tallas }));

      grupos.push({
        nombre: primero.modelo || primero.codigo || primero.sku,
        marca: primero.marca,
        colores,
        soloUna: variantes.length === 1 ? primero : undefined
      });
    }
    return grupos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // GUÍA: si la campaña tiene selector de Marca activo, el "Modelo" solo
  // debe ofrecer productos DE ESA marca -- así no se puede, por accidente,
  // registrar una venta MEGAMO con un producto SCOTT de la misma campaña
  // multimarca. Sin marca elegida (o campaña de una sola marca), no filtra.
  get productosParaSeleccion(): ProductoCampania[] {
    const marcaId = this.ventaForm.get('id_marca_bicicleta')?.value;
    if (this.listaMarca.length > 0 && marcaId) {
      return this.productosDisponibles.filter((p) => p.marca_id === Number(marcaId));
    }
    return this.productosDisponibles;
  }

  get faltaElegirMarcaParaModelo(): boolean {
    return this.listaMarca.length > 0 && !this.ventaForm.get('id_marca_bicicleta')?.value;
  }

  get nombreMarcaSeleccionada(): string | null {
    const id = this.ventaForm.get('id_marca_bicicleta')?.value;
    if (!id || this.listaMarca.length === 0) return null;
    return this.listaMarca.find((m) => m.id === Number(id))?.nombre ?? null;
  }

  abrirProductosModal(): void {
    if (this.productosDisponibles.length === 0) {
      this.mensajeError = 'Primero selecciona una Campaña para ver sus productos disponibles.';
      return;
    }
    if (this.faltaElegirMarcaParaModelo) {
      this.mensajeError = 'Primero selecciona una Marca para filtrar los productos disponibles.';
      return;
    }
    this.productosModal.query = '';
    this.productosModal.grupoActivo = null;
    this.productosModal.colorActivo = null;
    this.productosModal.grupos = this.agruparProductos(this.productosParaSeleccion);
    this.productosModal.abierto = true;
  }

  cerrarProductosModal(): void {
    this.productosModal.abierto = false;
    this.productosModal.grupoActivo = null;
    this.productosModal.colorActivo = null;
  }

  buscarEnProductosModal(q: string): void {
    this.productosModal.query = q;
    const texto = q.trim().toLowerCase();
    const base = this.productosParaSeleccion;
    const filtrados = texto
      ? base.filter((p) =>
          [p.modelo, p.sku, p.color, p.talla, p.marca].filter(Boolean)
            .some((campo) => campo!.toLowerCase().includes(texto))
        )
      : base;
    this.productosModal.grupos = this.agruparProductos(filtrados);
  }

  seleccionarGrupoModelo(grupo: ProductoGrupo): void {
    if (grupo.soloUna) {
      this.confirmarProducto(grupo.soloUna);
      return;
    }
    this.productosModal.grupoActivo = grupo;
    this.productosModal.colorActivo = grupo.colores.length === 1 ? grupo.colores[0].color : null;
  }

  seleccionarColorModelo(color: string): void {
    this.productosModal.colorActivo = color;
  }

  getTallasParaColorModelo(grupo: ProductoGrupo, color: string): VarianteTalla[] {
    return grupo.colores.find((c) => c.color === color)?.tallas ?? [];
  }

  confirmarProducto(producto: ProductoCampania): void {
    this.productoSeleccionado = producto;
    const partes = [producto.modelo || producto.codigo];
    if (producto.color && producto.color !== 'N/A') partes.push(`Color: ${producto.color}`);
    if (producto.talla && producto.talla !== 'N/A') partes.push(`Talla: ${producto.talla}`);
    this.ventaForm.get('modelo_bicicleta')?.setValue(partes.join(' — '));
    this.cerrarProductosModal();
    this.cargarSeriesDisponibles(producto.sku);
  }

  quitarProductoSeleccionado(): void {
    this.productoSeleccionado = null;
    this.ventaForm.get('modelo_bicicleta')?.setValue('');
    this.limpiarSeriesDisponibles();
  }

  private limpiarSeriesDisponibles(): void {
    this.solicitudSeriesActual++;
    this.seriesDisponibles = [];
    this.cargandoSeries = false;
    this.seriesConsultadas = false;
    this.errorSeries = false;

    const controlSerie = this.ventaForm.get('numero_serie');
    controlSerie?.setValue('');
    controlSerie?.markAsPristine();
    controlSerie?.markAsUntouched();
    this.camposFaltantes.delete('numero_serie');
  }

  private cargarSeriesDisponibles(sku: string): void {
    this.limpiarSeriesDisponibles();
    const solicitudActual = ++this.solicitudSeriesActual;
    this.cargandoSeries = true;

    this.solicitudService.seriesDisponibles(sku).subscribe({
      next: (respuesta) => {
        if (solicitudActual !== this.solicitudSeriesActual) return;
        this.cargandoSeries = false;
        this.seriesConsultadas = true;
        this.seriesDisponibles = Array.isArray(respuesta.series) ? respuesta.series : [];
      },
      error: (err) => {
        if (solicitudActual !== this.solicitudSeriesActual) return;
        console.error('Error al cargar números de serie disponibles:', err);
        this.cargandoSeries = false;
        this.seriesConsultadas = true;
        this.errorSeries = true;
      }
    });
  }
}
