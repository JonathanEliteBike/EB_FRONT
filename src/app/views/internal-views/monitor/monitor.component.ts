import { Component, ViewChild, ElementRef, HostListener, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MonitorOdooService } from '../../../services/monitor-odoo.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { AlertaService } from '../../../services/alerta.service';
import { AlertaComponent } from '../../../components/alerta/alerta.component';
import { FiltroComponent } from '../../../components/filtro/filtro.component';
import { FiltroFechaComponent } from '../../../components/filtro-fecha/filtro-fecha.component';

import { FechaActualizacionComponent } from '../../../components/fecha-actualizacion/fecha-actualizacion.component';
import { TemporadaSelectorComponent } from '../../../components/temporada-selector/temporada-selector.component';
import { AvisoHistoricoComponent } from '../../../components/aviso-historico/aviso-historico.component';

import { Router } from '@angular/router';

interface Factura {
  id: number;
  numero_factura: string;
  referencia_interna: string;
  nombre_producto: string;
  contacto_referencia: string;
  contacto_nombre: string;
  fecha_factura: string;
  precio_unitario: number;
  cantidad: number;
  venta_total: number;
  marca: string;
  subcategoria: string;
  apparel: string;
  eride: string;
  evac: string;
  categoria_producto: string;
  estado_factura: string;
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule, HomeBarComponent, FormsModule,
    RouterModule, AlertaComponent, FiltroComponent, FiltroFechaComponent, FechaActualizacionComponent,
    TemporadaSelectorComponent, AvisoHistoricoComponent],
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.css'],
  providers: [MonitorOdooService]
})
export class MonitorComponent {
  @ViewChild('inputArchivo') inputArchivo!: ElementRef<HTMLInputElement>;
  @ViewChild('dialogoExportar') dialogoExportar!: ElementRef;

  @Output() onInit = new EventEmitter<void>(); 

  facturas: Factura[] = [];
  facturasFiltradas: Factura[] = [];
  facturasPaginadas: Factura[] = [];
  cargando = false;

  // Paginación
  paginaActual = 1;
  paginaActualTemp = 1;
  elementosPorPagina = 100;
  totalPaginas = 1;

  // Columnas para exportar
  columnasDisponibles = [
    { nombre: 'numero_factura', etiqueta: 'Número Factura', seleccionado: true },
    { nombre: 'referencia_interna', etiqueta: 'Referencia Interna', seleccionado: true },
    { nombre: 'nombre_producto', etiqueta: 'Producto', seleccionado: true },
    { nombre: 'contacto_referencia', etiqueta: 'Ref. Contacto', seleccionado: true },
    { nombre: 'contacto_nombre', etiqueta: 'Nombre Contacto', seleccionado: true },
    { nombre: 'fecha_factura', etiqueta: 'Fecha Factura', seleccionado: true },
    { nombre: 'precio_unitario', etiqueta: 'Precio Unitario', seleccionado: true },
    { nombre: 'cantidad', etiqueta: 'Cantidad', seleccionado: true },
    { nombre: 'venta_total', etiqueta: 'Venta Total', seleccionado: true },
    { nombre: 'marca', etiqueta: 'Marca', seleccionado: true },
    { nombre: 'subcategoria', etiqueta: 'Subcategoría', seleccionado: true },
    { nombre: 'apparel', etiqueta: 'APPAREL', seleccionado: true },
    { nombre: 'eride', etiqueta: 'ERIDE', seleccionado: true },
    { nombre: 'evac', etiqueta: 'EVAC', seleccionado: true },
    { nombre: 'categoria_producto', etiqueta: 'Categoría', seleccionado: true },
    { nombre: 'estado_factura', etiqueta: 'Estado', seleccionado: true }
  ];

  mensajeAlerta: string | null = null;
  tipoAlerta: 'exito' | 'error' = 'exito';

  showNumeroFilter = false;
  showReferenciaFilter = false;
  showProductoFilter = false;
  showContactoReferenciaFilter = false;
  showContactoNombreFilter = false;
  showMarcaFilter = false;
  showSubcategoriaFilter = false;
  showErideFilter = false;
  showApparelFilter = false;
  showEvacFilter = false;
  showCategoriaFilter = false;

  // Opciones de filtro
  numeroOptions: { value: string, selected: boolean }[] = [];
  referenciaOptions: { value: string, selected: boolean }[] = [];
  productoOptions: { value: string, selected: boolean }[] = [];
  contactoReferenciaOptions: { value: string, selected: boolean }[] = [];
  contactoNombreOptions: { value: string, selected: boolean }[] = [];
  marcaOptions: { value: string, selected: boolean }[] = [];
  subcategoriaOptions: { value: string, selected: boolean }[] = [];
  erideOptions: { value: string, selected: boolean }[] = [];
  apparelOptions: { value: string, selected: boolean }[] = [];
  evacOptions: { value: string, selected: boolean }[] = [];
  categoriaOptions: { value: string, selected: boolean }[] = [];

  // Opciones filtradas
  filteredNumeroOptions: { value: string, selected: boolean }[] = [];
  filteredReferenciaOptions: { value: string, selected: boolean }[] = [];
  filteredProductoOptions: { value: string, selected: boolean }[] = [];
  filteredContactoReferenciaOptions: { value: string, selected: boolean }[] = [];
  filteredContactoNombreOptions: { value: string, selected: boolean }[] = [];
  filteredMarcaOptions: { value: string, selected: boolean }[] = [];
  filteredSubcategoriaOptions: { value: string, selected: boolean }[] = [];
  filteredErideOptions: { value: string, selected: boolean }[] = [];
  filteredApparelOptions: { value: string, selected: boolean }[] = [];
  filteredEvacOptions: { value: string, selected: boolean }[] = [];
  filteredCategoriaOptions: { value: string, selected: boolean }[] = [];

  // Contadores de selección
  numeroFilterCount = 0;
  referenciaFilterCount = 0;
  productoFilterCount = 0;
  contactoReferenciaFilterCount = 0;
  contactoNombreFilterCount = 0;
  marcaFilterCount = 0;
  subcategoriaFilterCount = 0;
  erideFilterCount = 0;
  apparelFilterCount = 0;
  evacFilterCount = 0;
  categoriaFilterCount = 0;

  selectedNumeros: string[] = [];
  selectedReferencias: string[] = [];
  selectedProductos: string[] = [];
  selectedContactos: string[] = [];
  selectedContactosNombres: string[] = [];
  selectedMarcas: string[] = [];
  selectedSubcategorias: string[] = [];
  selectedEride: string[] = [];
  selectedApparel: string[] = [];
  selectedEvac: string[] = [];
  selectedCategorias: string[] = [];

  showFechaFilter = false;
  fechaOrden: 'asc' | 'desc' | null = null;
  fechaDesdeFiltro: string = '';
  fechaHastaFiltro: string = '';

  // Selector de temporada
  temporadaActualEtiqueta: string | null = null;
  temporadasDisponibles: string[] = [];
  modoHistorico = false;
  temporadaHistoricaSeleccionada: string | null = null;

  constructor(
    private monitorService: MonitorOdooService,
    private alertaService: AlertaService,
    private router: Router
  ) { }

  ngOnInit() {
    this.monitorService.getTemporadas().subscribe({
      next: (temporadas: any[]) => {
        this.temporadaActualEtiqueta = temporadas.find(t => t.estado === 'abierta')?.etiqueta ?? null;
        this.obtenerFacturas();
      },
      error: () => this.obtenerFacturas()
    });

    this.monitorService.getTemporadasDisponibles().subscribe({
      next: (temporadas: string[]) => this.temporadasDisponibles = temporadas,
      error: (error) => console.error('Error al obtener temporadas disponibles:', error)
    });

    this.onInit.emit();
  }

  obtenerFacturas() {
    this.cargando = true;
    const etiqueta = this.temporadaHistoricaSeleccionada || this.temporadaActualEtiqueta;
    const origen = etiqueta
      ? this.monitorService.getFacturasPorTemporada(etiqueta)
      : this.monitorService.getFacturas();

    origen.subscribe({
      next: (data: any[]) => {
        this.facturas = data.filter(f =>
          f.numero_factura && f.numero_factura !== '/' &&
          f.fecha_factura && f.fecha_factura !== '0001-01-01 00:00:00'
        );

        this.actualizarListasUnicas();
        this.filtrarFacturas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener facturas:', error);
        this.alertaService.mostrarError('Error al cargar facturas');
        this.cargando = false;
      }
    });
  }

  verTemporadaPasada(temporada: string) {
    if (this.temporadaHistoricaSeleccionada === temporada) return;
    this.temporadaHistoricaSeleccionada = temporada;
    this.modoHistorico = true;
    this.limpiarTodosLosFiltros();
    this.obtenerFacturas();
  }

  volverATemporadaActual() {
    this.temporadaHistoricaSeleccionada = null;
    this.modoHistorico = false;
    this.limpiarTodosLosFiltros();
    this.obtenerFacturas();
  }

  private limpiarTodosLosFiltros() {
    this.selectedNumeros = [];
    this.selectedReferencias = [];
    this.selectedProductos = [];
    this.selectedContactos = [];
    this.selectedContactosNombres = [];
    this.selectedMarcas = [];
    this.selectedSubcategorias = [];
    this.selectedEride = [];
    this.selectedApparel = [];
    this.selectedEvac = [];
    this.selectedCategorias = [];
    this.fechaOrden = null;
    this.fechaDesdeFiltro = '';
    this.fechaHastaFiltro = '';
  }

  actualizarListasUnicas() {
    // Inicializar opciones para el filtro de número de factura
    const numerosUnicos = [...new Set(this.facturas.map(f => f.numero_factura).filter(n => n))];
    this.numeroOptions = numerosUnicos.map(numero => ({
      value: numero,
      selected: this.selectedNumeros.includes(numero)
    }));

    const referenciasUnicas = [...new Set(this.facturas.map(f => f.referencia_interna).filter(r => r))];
    this.referenciaOptions = referenciasUnicas.map(referencia => ({
      value: referencia,
      selected: this.selectedReferencias.includes(referencia)
    }));

    const productosUnicos = [...new Set(this.facturas.map(f => f.nombre_producto).filter(p => p))];
    this.productoOptions = productosUnicos.map(producto => ({
      value: producto,
      selected: this.selectedProductos.includes(producto)
    }));

    const contactosUnicos = [...new Set(this.facturas.map(f => f.contacto_referencia).filter(c => c))];
    this.contactoReferenciaOptions = contactosUnicos.map(contacto => ({
      value: contacto,
      selected: this.selectedContactos.includes(contacto)
    }));

    const contactosNombresUnicos = [...new Set(this.facturas.map(f => f.contacto_nombre).filter(c => c))];
    this.contactoNombreOptions = contactosNombresUnicos.map(contactoNombre => ({
      value: contactoNombre,
      selected: this.selectedContactosNombres.includes(contactoNombre)
    }));

    const marcasUnicas = [...new Set(this.facturas.map(f => f.marca).filter(m => m))];
    this.marcaOptions = marcasUnicas.map(marca => ({
      value: marca,
      selected: this.selectedMarcas.includes(marca)
    }));

    const subcategoriasUnicas = [...new Set(this.facturas.map(f => f.subcategoria).filter(s => s))];
    this.subcategoriaOptions = subcategoriasUnicas.map(subcategoria => ({
      value: subcategoria,
      selected: this.selectedSubcategorias.includes(subcategoria)
    }));

    const erideUnicos = [...new Set(this.facturas.map(f => f.eride).filter(e => e))];
    this.erideOptions = erideUnicos.map(eride => ({
      value: eride,
      selected: this.selectedEride.includes(eride)
    }));

    const apparelUnicos = [...new Set(this.facturas.map(f => f.apparel).filter(a => a))];
    this.apparelOptions = apparelUnicos.map(apparel => ({
      value: apparel,
      selected: this.selectedApparel.includes(apparel)
    }));

    const evacUnicos = [...new Set(this.facturas.map(f => f.evac).filter(e => e))];
    this.evacOptions = evacUnicos.map(evac => ({
      value: evac,
      selected: this.selectedEvac.includes(evac)
    }));

    const categoriasUnicas = [...new Set(this.facturas.map(f => f.categoria_producto).filter(c => c))];
    this.categoriaOptions = categoriasUnicas.map(categoria => ({
      value: categoria,
      selected: this.selectedCategorias.includes(categoria)
    }));
  }

  // Métodos para importación
  seleccionarArchivo() {
    this.inputArchivo.nativeElement.click();
  }

  importarArchivo(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const formData = new FormData();
    formData.append('file', input.files[0]);

    this.cargando = true;
    this.monitorService.importarFacturas(formData).subscribe({
      next: (res) => {
        this.alertaService.mostrarExito('Facturas importadas. Actualizando previo automáticamente...');
        this.obtenerFacturas();

        setTimeout(() => {
          this.router.navigate(['/previo']);
        }, 1500);

      },
      error: (err) => {
        this.alertaService.mostrarError(err.error?.error || 'Error al importar');
        this.cargando = false;
      }
    });
  }
}

  // Métodos para exportación
  abrirDialogoExportar() {
    this.dialogoExportar.nativeElement.showModal();
  }

  cerrarDialogoExportar() {
    this.dialogoExportar.nativeElement.close();
  }

  exportarExcel() {
    const columnasSeleccionadas = this.columnasDisponibles
      .filter(c => c.seleccionado)
      .map(c => c.nombre);

    const datosExportar = this.facturasFiltradas.map(factura => {
      const fila: any = {};
      columnasSeleccionadas.forEach(col => {
        let valor = factura[col as keyof Factura] ?? '';

        // Formatear fecha en formato YYYY-MM-DD si la columna es fecha_factura
        if (col === 'fecha_factura' && valor) {
          const fecha = new Date(valor);
          // Formateo YYYY-MM-DD sin horas
          valor = fecha.toISOString().slice(0, 10);
        }

        // Convertir precio_unitario y venta_total a número
        if (col === 'precio_unitario' || col === 'venta_total') {
          if (typeof valor === 'string') {
            valor = valor.replace(/[^0-9.-]+/g, '');
            valor = parseFloat(valor);
          }
        }

        fila[col] = valor;
      });
      return fila;
    });

    const worksheet = XLSX.utils.json_to_sheet(datosExportar);

    // Ajustar ancho automático
    const colWidths = columnasSeleccionadas.map(col => {
      const valores = datosExportar.map(row => row[col]?.toString() ?? '');
      valores.push(col);
      const maxLength = Math.max(...valores.map(v => v.length));
      return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = colWidths;

    // Formatear columnas numéricas (precio_unitario y venta_total)
    ['precio_unitario', 'venta_total'].forEach(colName => {
      const idx = columnasSeleccionadas.indexOf(colName);
      if (idx !== -1) {
        const letraCol = XLSX.utils.encode_col(idx);
        for (let i = 2; i <= datosExportar.length + 1; i++) {
          const celda = worksheet[`${letraCol}${i}`];
          if (celda && typeof celda.v === 'number') {
            celda.t = 'n';
            celda.z = '#,##0.00';
          }
        }
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');
    XLSX.writeFile(workbook, 'facturas_exportadas.xlsx');
    this.cerrarDialogoExportar();
  }

  // Métodos de paginación
  cambiarPagina(numero: number) {
    if (numero < 1 || numero > this.totalPaginas) return;
    this.paginaActual = numero;
    this.paginaActualTemp = numero;
    this.actualizarFacturasPaginadas();
  }

  actualizarFacturasPaginadas() {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    this.facturasPaginadas = this.facturasFiltradas.slice(inicio, fin);
  }

  filtrarFacturas() {
    let facturasFiltradas = [...this.facturas];

    // Filtro por números de factura seleccionados
    if (this.selectedNumeros.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.numero_factura && this.selectedNumeros.includes(f.numero_factura)
      );
    }

    // Filtro por referencias seleccionadas
    if (this.selectedReferencias.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.referencia_interna && this.selectedReferencias.includes(f.referencia_interna)
      );
    }

    // Filtro por productos seleccionados
    if (this.selectedProductos.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.nombre_producto && this.selectedProductos.includes(f.nombre_producto)
      );
    }

    // Filtro por contactos seleccionados
    if (this.selectedContactos.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.contacto_referencia && this.selectedContactos.includes(f.contacto_referencia)
      );
    }

    // Filtro por nombres de contactos seleccionados
    if (this.selectedContactosNombres.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.contacto_nombre && this.selectedContactosNombres.includes(f.contacto_nombre)
      );
    }

    // Filtro por marcas seleccionadas
    if (this.selectedMarcas.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.marca && this.selectedMarcas.includes(f.marca)
      );
    }

    // Filtro por subcategorías seleccionadas
    if (this.selectedSubcategorias.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.subcategoria && this.selectedSubcategorias.includes(f.subcategoria)
      );
    }

    // Filtro por ERIDE seleccionados
    if (this.selectedEride.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.eride && this.selectedEride.includes(f.eride)
      );
    }

    // Filtro por APPAREL seleccionados
    if (this.selectedApparel.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.apparel && this.selectedApparel.includes(f.apparel)
      );
    }

    // Filtro por EVAC seleccionados
    if (this.selectedEvac.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.evac && this.selectedEvac.includes(f.evac)
      );
    }

    // Filtro por categorías seleccionadas
    if (this.selectedCategorias.length > 0) {
      facturasFiltradas = facturasFiltradas.filter(f =>
        f.categoria_producto && this.selectedCategorias.includes(f.categoria_producto)
      );
    }

    // Filtro por rango de fechas
    if (this.fechaDesdeFiltro || this.fechaHastaFiltro) {
      facturasFiltradas = facturasFiltradas.filter(f => {
        const fechaFactura = new Date(f.fecha_factura).toISOString().split('T')[0];

        const cumpleDesde = !this.fechaDesdeFiltro || fechaFactura >= this.fechaDesdeFiltro;
        const cumpleHasta = !this.fechaHastaFiltro || fechaFactura <= this.fechaHastaFiltro;

        return cumpleDesde && cumpleHasta;
      });
    }

    // Ordenar por fecha si hay un orden seleccionado
    if (this.fechaOrden) {
      facturasFiltradas.sort((a, b) => {
        const fechaA = new Date(a.fecha_factura).getTime();
        const fechaB = new Date(b.fecha_factura).getTime();
        return this.fechaOrden === 'asc' ? fechaA - fechaB : fechaB - fechaA;
      });
    }

    // ... resto de tus filtros existentes ...

    this.facturasFiltradas = facturasFiltradas;
    this.totalPaginas = Math.ceil(this.facturasFiltradas.length / this.elementosPorPagina);
    this.cambiarPagina(1);
  }

  // Métodos de utilidad
  extraerPrimeraParte(texto: string): string {
    if (!texto) return '';
    const partes = texto.split('/').map(p => p.trim());
    return partes[0] || '';
  }

  obtenerSegundaParte(texto: string): string {
    if (!texto) return '';
    const partes = texto.split('/').map(p => p.trim());
    return partes.length > 1 ? partes[1] : '';
  }

  contieneERIDE(texto: string): string {
    return texto?.toUpperCase().includes('ERIDE') ? 'SI' : 'NO';
  }

  contieneAPPAREL(texto: string): string {
    return texto?.toUpperCase().includes('APPAREL') ? 'SI' : 'NO';
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';

    // Parsear la fecha del formato "Thu, 07 Aug 2025 00:00:00 GMT"
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr; // si no es fecha válida

    // Obtener año, mes y día en UTC para evitar desfase por zona horaria
    const year = fecha.getUTCFullYear();
    const month = (fecha.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getUTCDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


  calcularVentaTotal(precio: number, cantidad: number): number {
    return precio * cantidad;
  }

  /* filtros */

  // Métodos para manejar el filtro de número
  onNumeroFilterApply(selectedValues: string[]) {
    this.selectedNumeros = selectedValues;
    this.numeroFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.numeroOptions.forEach(option => {
      option.selected = this.selectedNumeros.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onNumeroFilterClear() {
    this.selectedNumeros = [];
    this.numeroFilterCount = 0;

    // Desmarcar todas las opciones
    this.numeroOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onReferenciaFilterApply(selectedValues: string[]) {
    this.selectedReferencias = selectedValues;
    this.referenciaFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.referenciaOptions.forEach(option => {
      option.selected = this.selectedReferencias.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onReferenciaFilterClear() {
    this.selectedReferencias = [];
    this.referenciaFilterCount = 0;

    // Desmarcar todas las opciones
    this.referenciaOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onProductoFilterApply(selectedValues: string[]) {
    this.selectedProductos = selectedValues;
    this.productoFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.productoOptions.forEach(option => {
      option.selected = this.selectedProductos.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onProductoFilterClear() {
    this.selectedProductos = [];
    this.productoFilterCount = 0;

    // Desmarcar todas las opciones
    this.productoOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onContactoReferenciaFilterApply(selectedValues: string[]) {
    this.selectedContactos = selectedValues;
    this.contactoReferenciaFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.contactoReferenciaOptions.forEach(option => {
      option.selected = this.selectedContactos.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onContactoReferenciaFilterClear() {
    this.selectedContactos = [];
    this.contactoReferenciaFilterCount = 0;

    // Desmarcar todas las opciones
    this.contactoReferenciaOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onContactoNombreFilterApply(selectedValues: string[]) {
    this.selectedContactosNombres = selectedValues;
    this.contactoNombreFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.contactoNombreOptions.forEach(option => {
      option.selected = this.selectedContactosNombres.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onContactoNombreFilterClear() {
    this.selectedContactosNombres = [];
    this.contactoNombreFilterCount = 0;

    // Desmarcar todas las opciones
    this.contactoNombreOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onMarcaFilterApply(selectedValues: string[]) {
    this.selectedMarcas = selectedValues;
    this.marcaFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.marcaOptions.forEach(option => {
      option.selected = this.selectedMarcas.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onMarcaFilterClear() {
    this.selectedMarcas = [];
    this.marcaFilterCount = 0;

    // Desmarcar todas las opciones
    this.marcaOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onSubcategoriaFilterApply(selectedValues: string[]) {
    this.selectedSubcategorias = selectedValues;
    this.subcategoriaFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.subcategoriaOptions.forEach(option => {
      option.selected = this.selectedSubcategorias.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onSubcategoriaFilterClear() {
    this.selectedSubcategorias = [];
    this.subcategoriaFilterCount = 0;

    // Desmarcar todas las opciones
    this.subcategoriaOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onErideFilterApply(selectedValues: string[]) {
    this.selectedEride = selectedValues;
    this.erideFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.erideOptions.forEach(option => {
      option.selected = this.selectedEride.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onErideFilterClear() {
    this.selectedEride = [];
    this.erideFilterCount = 0;

    // Desmarcar todas las opciones
    this.erideOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onApparelFilterApply(selectedValues: string[]) {
    this.selectedApparel = selectedValues;
    this.apparelFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.apparelOptions.forEach(option => {
      option.selected = this.selectedApparel.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onApparelFilterClear() {
    this.selectedApparel = [];
    this.apparelFilterCount = 0;

    // Desmarcar todas las opciones
    this.apparelOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onEvacFilterApply(selectedValues: string[]) {
    this.selectedEvac = selectedValues;
    this.evacFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.evacOptions.forEach(option => {
      option.selected = this.selectedEvac.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onEvacFilterClear() {
    this.selectedEvac = [];
    this.evacFilterCount = 0;

    // Desmarcar todas las opciones
    this.evacOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onCategoriaFilterApply(selectedValues: string[]) {
    this.selectedCategorias = selectedValues;
    this.categoriaFilterCount = selectedValues.length;

    // Actualizar el estado de las opciones seleccionadas
    this.categoriaOptions.forEach(option => {
      option.selected = this.selectedCategorias.includes(option.value);
    });

    this.filtrarFacturas();
  }

  onCategoriaFilterClear() {
    this.selectedCategorias = [];
    this.categoriaFilterCount = 0;

    // Desmarcar todas las opciones
    this.categoriaOptions.forEach(option => {
      option.selected = false;
    });

    this.filtrarFacturas();
  }

  onFechaFilterApply(filtro: any) {
    this.fechaOrden = filtro.orden;
    this.fechaDesdeFiltro = filtro.fechaDesde;
    this.fechaHastaFiltro = filtro.fechaHasta;
    this.filtrarFacturas();
  }

  onFechaFilterClear() {
    this.fechaOrden = null;
    this.fechaDesdeFiltro = '';
    this.fechaHastaFiltro = '';
    this.filtrarFacturas();
  }

  /* Validacion de filtros */
  
  
}