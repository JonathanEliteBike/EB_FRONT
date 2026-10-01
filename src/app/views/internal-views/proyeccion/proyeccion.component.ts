import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyeccionService } from '../../../services/proyeccion.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { AuthService } from '../../../services/auth.service';

interface ProductoDetallado {
  folio: string;
  referencia: string;
  clave_factura: string;
  clave_6_digitos: string;
  ean: string;
  clave_odoo: string;
  modelo: string;
  spec: string;
  descripcion: string;
  precio_aplicado: number;
  precio_publico_con_iva: number;
  q1_sep_2025: number;
  q2_sep_2025: number;
  q1_oct_2025: number;
  q2_oct_2025: number;
  q1_nov_2025: number;
  q2_nov_2025: number;
  q1_dic_2025: number;
  q2_dic_2025: number;
  q1_mar_2026: number;
  q2_mar_2026: number;
  q1_abr_2026: number;
  q2_abr_2026: number;
  q1_may_2026: number;
  q2_may_2026: number;
  orden_total_cant: number;
  orden_total_importe: number;
  fecha_registro: string;
}

interface ClienteDetallado {
  nombre_cliente: string;
  clave_cliente: string;
  zona: string;
  nivel: string;
  productos: ProductoDetallado[];
}

@Component({
  selector: 'app-proyeccion',
  standalone: true,
  imports: [CommonModule, HomeBarComponent, FormsModule, RouterModule],
  templateUrl: './proyeccion.component.html',
  styleUrls: ['./proyeccion.component.css']
})
export class ProyeccionComponent implements OnInit {
  proyecciones: any[] = [];
  cargando: boolean = true;

  // Variables de paginación
  paginaActual: number = 1;
  paginaActualTemp: number = 1;
  itemsPorPagina: number = 40;
  totalPaginas: number = 0;

  // Filtros
  filtros = {
    referencia: '',
    clave_factura: '',
    clave_6_digitos: '',
    clave_odoo: '',
    ean: '',
    descripcion: '',
    modelo: '',
    spec: '',
  };

  filtroAbierto: string | null = null;
  proyeccionesOriginal: any[] = [];
  proyeccionesFiltradas: any[] = [];
  proyeccionesPaginadas: any[] = [];
  proyeccionesDetalladas: any[] = [];
  proyeccionesCompleta: any[] = [];

  // Diálogos
  mostrarDialogoExportar: boolean = false;
  mostrarDialogoImportar: boolean = false;
  archivoSeleccionado: File | null = null;

  constructor(
    private proyeccionService: ProyeccionService,
    private router: Router,
    private authService: AuthService,
  ) { }

  get debeOcultarMontos(): boolean {
    return this.authService.debeOcultarMontos('proyeccion_compra');
  }

  get puedeAdministrar(): boolean {
    return this.authService.getRol() !== 4
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'crear')
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'editar')
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'eliminar');
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    this.proyeccionService.getProyeccionesDetalladas().subscribe({
      next: (data) => {
        this.proyeccionesDetalladas = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener proyecciones detalladas:', error);
        this.cargando = false;
      }
    });

    this.proyeccionService.getProyecciones().subscribe({
      next: (data) => {
        this.proyecciones = data;
        this.proyeccionesOriginal = [...data];
        this.proyeccionesFiltradas = [...data];
        this.proyeccionesCompleta = [...data];
        this.actualizarPaginacion();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener proyecciones:', error);
        this.cargando = false;
      }
    });
  }

  actualizarPaginacion(): void {
    this.totalPaginas = Math.ceil(this.proyeccionesFiltradas.length / this.itemsPorPagina);
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.proyeccionesPaginadas = this.proyeccionesFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.paginaActualTemp = pagina;
    this.actualizarPaginacion();
  }

  toggleFiltro(campo: string): void {
    this.filtroAbierto = this.filtroAbierto === campo ? null : campo;
  }

  filtrarProyecciones(): void {
    this.proyeccionesFiltradas = this.proyeccionesOriginal.filter(item =>
      Object.keys(this.filtros).every(key =>
        String(item[key] || '').toLowerCase().includes(String(this.filtros[key as keyof typeof this.filtros]).toLowerCase())
      )
    );
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  verDetalles(item: any): void {
    this.router.navigate(['proyeccion/detalles', item.id]);
  }

  // Métodos para exportación
  abrirDialogoExportar(): void {
    this.mostrarDialogoExportar = true;
  }

  cerrarDialogoExportar(): void {
    this.mostrarDialogoExportar = false;
  }

  exportarExcelGlobal(): void {
    const datosFormateados = this.proyeccionesCompleta.map(item => ({
      // Información básica del producto
      'Referencia': item.referencia || '',
      'Clave Factura': item.clave_factura || '',
      'Clave 6 Dígitos': {
        v: item.clave_6_digitos || '',
        t: 's', // 's' indica string (texto)
        z: '@'  // Formato de texto en Excel
      },
      'EAN': item.ean || '',
      'Clave Odoo': item.clave_odoo || '',
      'Descripción': item.descripcion || '',
      'Modelo': item.modelo || '',
      'Especificaciones': item.spec || '',

      // Precios con IVA
      'Precio Público con IVA': { v: item.precio_publico_con_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Precio Público MY26': { v: item.precio_publico_con_iva_my26 ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Distribuidor con IVA': { v: item.precio_distribuidor_con_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Partner con IVA': { v: item.precio_partner_con_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Elite con IVA': { v: item.precio_elite_con_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Elite Plus con IVA': { v: item.precio_elite_plus_con_iva ?? 0, t: 'n', z: '"$"#,##0.00' },

      // Precios sin IVA (formato numérico)
      'Precio Público sin IVA': { v: item.precio_publico_sin_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Distribuidor sin IVA': { v: item.precio_distribuidor_sin_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Partner sin IVA': { v: item.precio_partner_sin_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Elite sin IVA': { v: item.precio_elite_sin_iva ?? 0, t: 'n', z: '"$"#,##0.00' },
      'Elite Plus sin IVA': { v: item.precio_elite_plus_sin_iva ?? 0, t: 'n', z: '"$"#,##0.00' },

      // Proyecciones por quincena
      '1Q Sep 2025': item.q1_sep_2025 ?? 0,
      '2Q Sep 2025': item.q2_sep_2025 ?? 0,
      '1Q Oct 2025': item.q1_oct_2025 ?? 0,
      '2Q Oct 2025': item.q2_oct_2025 ?? 0,
      '1Q Nov 2025': item.q1_nov_2025 ?? 0,
      '2Q Nov 2025': item.q2_nov_2025 ?? 0,
      '1Q Dic 2025': item.q1_dic_2025 ?? 0,
      '2Q Dic 2025': item.q2_dic_2025 ?? 0,
      '1Q Mar 2026': item.q1_mar_2026 ?? 0,
      '2Q Mar 2026': item.q2_mar_2026 ?? 0,
      '1Q Abr 2026': item.q1_abr_2026 ?? 0,
      '2Q Abr 2026': item.q2_abr_2026 ?? 0,
      '1Q May 2026': item.q1_may_2026 ?? 0,
      '2Q May 2026': item.q2_may_2026 ?? 0,

      // Totales
      'Total Cantidad': item.orden_total_cant ?? 0,
      'Total Importe': { v: item.orden_total_importe ?? 0, t: 'n', z: '"$"#,##0.00' },
    }));

    this.generarExcel(datosFormateados, 'Proyecciones_Globales');
    this.cerrarDialogoExportar();
  }

  exportarExcelDetallado(): void {
    this.cargando = true;
    this.proyeccionService.getProyeccionesDetalladas().subscribe({
      next: (clientes: ClienteDetallado[]) => {
        const datosFormateados = this.formatearDatosDetallados(clientes);
        this.generarExcel(datosFormateados, 'Proyecciones_Detalladas', true);
        this.cargando = false;
        this.cerrarDialogoExportar();
      },
      error: (error) => {
        console.error('Error al exportar:', error);
        this.mostrarMensaje('Error al exportar datos detallados', 'error');
        this.cargando = false;
      }
    });
  }

  private formatearDatosDetallados(clientes: ClienteDetallado[]): any[] {
    const datosFormateados: any[] = [];

    clientes.forEach(cliente => {
      cliente.productos.forEach(producto => {
        const limpiarClave6Digitos = (valor: string): string => {
          return valor ? valor.replace(/\.0$/, '') : '';
        };
        datosFormateados.push({
          // Información de texto (exportar como string)
          'Cliente': { v: cliente.nombre_cliente || '', t: 's' },
          'Clave Cliente': { v: cliente.clave_cliente || '', t: 's' },
          'Zona': { v: cliente.zona || '', t: 's' },
          'Nivel': { v: cliente.nivel || '', t: 's' },
          'Folio': { v: producto.folio || '', t: 's' },
          'Referencia': { v: producto.referencia || '', t: 's' },
          'Clave Factura': { v: producto.clave_factura || '', t: 's' },
          'Clave 6 Dígitos': {
            v: limpiarClave6Digitos(producto.clave_6_digitos),
            t: 's',
            z: '@',
            s: { numFmt: '@' } // Estilo explícito para texto
          },
          'EAN': { v: producto.ean || '', t: 's' },
          'Clave Odoo': { v: producto.clave_odoo || '', t: 's' },
          'Modelo': { v: producto.modelo || '', t: 's' },
          'Especificaciones': { v: producto.spec || '', t: 's' },
          'Descripción': { v: producto.descripcion || '', t: 's' },

          // Campos numéricos (formato de moneda)
          'Precio Aplicado': { v: producto.precio_aplicado, t: 'n', z: '"$"#,##0.00' },
          'Precio Público': { v: producto.precio_publico_con_iva, t: 'n', z: '"$"#,##0.00' },

          // Campos numéricos (formato estándar)
          '1Q Sep 2025': { v: producto.q1_sep_2025, t: 'n' },
          '2Q Sep 2025': { v: producto.q2_sep_2025, t: 'n' },
          '1Q Oct 2025': { v: producto.q1_oct_2025, t: 'n' },
          '2Q Oct 2025': { v: producto.q2_oct_2025, t: 'n' },
          '1Q Nov 2025': { v: producto.q1_nov_2025, t: 'n' },
          '2Q Nov 2025': { v: producto.q2_nov_2025, t: 'n' },
          '1Q Dic 2025': { v: producto.q1_dic_2025, t: 'n' },
          '2Q Dic 2025': { v: producto.q2_dic_2025, t: 'n' },
          '1Q Mar 2026': { v: producto.q1_mar_2026, t: 'n' },
          '2Q Mar 2026': { v: producto.q2_mar_2026, t: 'n' },
          '1Q Abr 2026': { v: producto.q1_abr_2026, t: 'n' },
          '2Q Abr 2026': { v: producto.q2_abr_2026, t: 'n' },
          '1Q May 2026': { v: producto.q1_may_2026, t: 'n' },
          '2Q May 2026': { v: producto.q2_may_2026, t: 'n' },
          'Total Unidades': { v: producto.orden_total_cant, t: 'n' },
          'Total Importe': { v: producto.orden_total_importe, t: 'n', z: '"$"#,##0.00' },
          // Fecha
          'Fecha Registro': producto.fecha_registro
        });
      });
    });

    return datosFormateados;
  }

  private generarExcel(datos: any[], nombreArchivo: string, conSaltos: boolean = false): void {
    // 1. Crear un libro de trabajo nuevo
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    // 2. Crear una hoja de cálculo con los datos
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);

    // 3. Agregar los datos con formato
    XLSX.utils.sheet_add_json(worksheet, datos, {
      skipHeader: false,
      origin: 'A1',
      cellDates: true
    });

    // 4. Configurar anchos de columnas
    const columnWidths = Object.keys(datos[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...datos.map(row => {
            const value = row[key];
            return (value?.v?.toString() || value?.toString() || '').length
          })
        ) + 2,
        50
      )
    }));
    worksheet['!cols'] = columnWidths;

    // 5. Configurar estilos directamente en las celdas (SOLUCIÓN DEFINITIVA)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })].v;

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

        if (!worksheet[cellAddress]) continue;

        // Forzar formato de texto para campos clave
        if (header.includes('Clave') ||
          header === 'EAN' ||
          header === 'Modelo' ||
          header === 'Referencia' ||
          header === 'Folio') {
          worksheet[cellAddress].t = 's';
          worksheet[cellAddress].z = '@';

          // Agregar estilo explícito para formato de texto
          worksheet[cellAddress].s = {
            ...(worksheet[cellAddress].s || {}),
            numFmt: '@' // Formato de texto explícito
          };
        }

        // Formato de moneda para precios
        if ((header.includes('Precio') || header.includes('Importe')) && worksheet[cellAddress].v != null) {
          worksheet[cellAddress].z = '"$"#,##0.00';
          worksheet[cellAddress].s = {
            ...(worksheet[cellAddress].s || {}),
            numFmt: '"$"#,##0.00'
          };
        }
      }
    }

    // 6. Configurar saltos de línea si es necesario
    if (conSaltos) {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];

          if (cell && cell.v && typeof cell.v === 'string' && cell.v.length > 30) {
            cell.s = {
              ...(cell.s || {}),
              alignment: {
                wrapText: true,
                vertical: 'top'
              }
            };
          }
        }
      }
    }

    // 7. Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    // 8. Escribir el archivo con todas las opciones necesarias
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      cellStyles: true,
      bookSST: true // Importante para formatos de texto
    });

    // 9. Guardar el archivo
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Métodos para importación
  abrirDialogoImportar(): void {
    this.mostrarDialogoImportar = true;
  }

  cerrarDialogoImportar(): void {
    this.mostrarDialogoImportar = false;
    this.archivoSeleccionado = null;
  }

  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      this.archivoSeleccionado = file;
    } else {
      this.mostrarMensaje('Solo se permiten archivos .xlsx', 'error');
      this.archivoSeleccionado = null;
    }
  }

  importarProyecciones(): void {
    if (!this.archivoSeleccionado) {
      this.mostrarMensaje('Selecciona un archivo antes de importar', 'error');
      return;
    }

    this.cargando = true;
    this.proyeccionService.subirArchivoProyecciones(this.archivoSeleccionado).subscribe({
      next: (res) => {
        this.mostrarMensaje(res.message || 'Archivo importado correctamente', 'success');
        this.cerrarDialogoImportar();
        this.cargarDatos(); // Recargar datos después de importar
      },
      error: (err) => {
        console.error(err);
        const mensajeError = err.error?.error || err.error?.message || 'Error al importar el archivo';
        this.mostrarMensaje(mensajeError, 'error');
        this.cargando = false;
      }
    });
  }

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning'): void {
    // Implementar lógica de notificación (toast, snackbar, etc.)
    alert(tipo === 'error' ? `❌ ${mensaje}` : `✔️ ${mensaje}`);
  }
}
