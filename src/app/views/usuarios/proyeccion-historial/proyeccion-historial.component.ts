import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyeccionService } from '../../../services/proyeccion.service';
import { AlertaService } from '../../../services/alerta.service';
import { ClientesService } from '../../../services/clientes.service';
import { RouterModule } from '@angular/router';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { AccesoRestringidoComponent } from '../../../components/acceso-restringido/acceso-restringido.component';
import { AuthService } from '../../../services/auth.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-proyeccion-historial',
  standalone: true,
  templateUrl: './proyeccion-historial.component.html',
  styleUrls: ['./proyeccion-historial.component.css'],
  imports: [CommonModule, RouterModule, TopBarUsuariosComponent, AccesoRestringidoComponent]
})
export class ProyeccionHistorialComponent implements OnInit {

  historial: any[] = [];
  cargando: boolean = true;
  historialAgrupado: any[] = [];
  clienteInfo: any = null;
  quincenas = [
    'q1_sep_2025', 'q2_sep_2025',
    'q1_oct_2025', 'q2_oct_2025',
    'q1_nov_2025', 'q2_nov_2025',
    'q1_dic_2025', 'q2_dic_2025',
    'q1_mar_2026', 'q2_mar_2026',
    'q1_abr_2026', 'q2_abr_2026',
    'q1_may_2026', 'q2_may_2026'
  ];

  constructor(
    private proyeccionService: ProyeccionService,
    private alertaService: AlertaService,
    private clientesService: ClientesService,
    private authService: AuthService
  ) { }

  get puedeVer(): boolean {
    return this.authService.tieneModulo('usuarios_proyeccion_compras');
  }

  get puedeVerMontos(): boolean {
    return !this.authService.debeOcultarMontos('proyeccion_compras');
  }

  ngOnInit(): void {
    if (!this.puedeVer) {
      this.cargando = false;
      return;
    }

    this.clientesService.getInfoClienteActual().subscribe({
      next: (cliente) => this.clienteInfo = cliente,
      error: (err) => console.error('Error al obtener cliente:', err)
    });

    this.proyeccionService.getHistorialCliente().subscribe({
      next: (res) => {
        this.historial = res;
        if (Array.isArray(res) && res.length > 0) {
          this.historialAgrupado = this.agruparPorFecha(res);
        } else {
          this.historialAgrupado = [];
        }
        this.cargando = false;
      },
      error: (err) => {
        if (err && err.status !== 404) {
          this.alertaService.mostrarError('No se pudo cargar el historial.');
        }
        this.historial = [];
        this.historialAgrupado = [];
        console.error(err);
        this.cargando = false;
      }
    });
  }

  formatearFechaUTC(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatearQuincena(quincena: string): string {
    const parts = quincena.split('_');
    const num = parts[0].replace('q', '');
    const mes = parts[1];
    const año = parts[2];

    const meses: { [key: string]: string } = {
      'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dic',
      'mar': 'Mar', 'abr': 'Abr', 'may': 'May'
    };

    return `${num}${num === '1' ? 'era' : 'da'} ${meses[mes]} ${año}`;
  }

  getTotalPorItem(item: any): number {
    return this.quincenas.reduce((total, q) => total + (item[q] || 0), 0);
  }

  calcularDescuento(item: any): number {
    if (!item.precio_publico_con_iva || !item.precio_aplicado) return 0;
    const descuento = ((item.precio_publico_con_iva - item.precio_aplicado) / item.precio_publico_con_iva) * 100;
    return Math.round(descuento * 10) / 10; // Redondear a 1 decimal
  }

  exportarHistorialExcel(): void {
    if (!this.historialAgrupado?.length || !this.clienteInfo) return;

    const datosFormateados: any[] = [];
    let totalBicicletas = 0;
    let totalImporte = 0;

    // Función para formatear el nombre corto de quincena
    const formatearQuincenaCorta = (quincena: string) => {
      const parts = quincena.split('_');
      const num = parts[0].replace('q', '');
      const mes = parts[1];
      const año = parts[2];

      const meses: { [key: string]: string } = {
        'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dic',
        'mar': 'Mar', 'abr': 'Abr', 'may': 'May'
      };

      return `${num}${num === '1' ? 'er' : 'do'} Q ${meses[mes]} ${año}`;
    };

    this.historialAgrupado.forEach(grupo => {
      grupo.items.forEach((item: any) => {
        const total = this.getTotalPorItem(item);
        const importe = total * item.precio_aplicado;

        totalBicicletas += total;
        totalImporte += importe;

        datosFormateados.push({
          'Fecha': this.formatearFechaUTC(grupo.fecha),
          'Referencia': item.referencia,
          'Modelo': item.modelo,
          'Especificaciones': item.spec || 'N/A',
          'Descripción': item.descripcion,
          'EAN': item.ean,
          'Clave Odoo': item.clave_odoo,
          'Precio Unitario': item.precio_aplicado,
          'Precio Público': item.precio_publico_con_iva,
          ...this.quincenas.reduce((acc, q) => {
            acc[formatearQuincenaCorta(q)] = item[q] || 0;
            return acc;
          }, {} as Record<string, any>),
          'Total Unidades': total,
          'Importe Total': importe
        });
      });
    });

    // Crear hoja de trabajo vacía
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);

    // 1. Agregar encabezados informativos (filas 1-3)
    XLSX.utils.sheet_add_aoa(worksheet, [
      ['Cliente:', `${this.clienteInfo.clave} - ${this.clienteInfo.nombre_cliente}`],
      ['Total Bicicletas:', totalBicicletas],
      ['Total Importe:', totalImporte],
      [], // Fila vacía (fila 4)
      Object.keys(datosFormateados[0]) // Encabezados de columna (fila 5)
    ], { origin: 'A1' });

    // 2. Agregar los datos (a partir de fila 6)
    XLSX.utils.sheet_add_json(worksheet, datosFormateados, {
      origin: 'A6',
      skipHeader: true // Omitir encabezados ya que los agregamos manualmente
    });

    // Calcular anchos de columna automáticamente
    const columnWidths = Object.keys(datosFormateados[0]).map(key => {
      const headerLength = key.length;
      const maxDataLength = Math.max(...datosFormateados.map(row => String(row[key]).length));
      const maxLength = Math.max(headerLength, maxDataLength);

      if (key === 'Descripción') {
        return { wch: Math.min(maxLength + 2, 40) };
      } else if (key.includes('Q')) {
        return { wch: Math.min(maxLength + 2, 12) };
      } else if (['Precio Unitario', 'Precio Público', 'Importe Total'].includes(key)) {
        return { wch: 15 };
      } else {
        return { wch: Math.min(maxLength + 2, 20) };
      }
    });

    worksheet['!cols'] = columnWidths;

    // Formatear columnas numéricas
    Object.keys(datosFormateados[0]).forEach((key, idx) => {
      if (['Precio Unitario', 'Precio Público', 'Importe Total'].includes(key)) {
        const col = XLSX.utils.encode_col(idx);

        // Formatear total en encabezados informativos
        if (key === 'Importe Total') {
          const cell = worksheet['B3'];
          if (cell) {
            cell.t = 'n';
            cell.z = '"$"#,##0.00';
          }
        }

        // Formatear datos y encabezados de columna
        for (let row = 5; row <= 5 + datosFormateados.length; row++) {
          const cell = worksheet[`${col}${row}`];
          if (cell && typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = key.includes('Q') ? '#,##0' : '"$"#,##0.00';
          }
        }
      }
    });

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Historial Proyecciones': worksheet },
      SheetNames: ['Historial Proyecciones']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `Historial_Proyecciones_${this.clienteInfo.clave}.xlsx`);
  }

  agruparPorFecha(data: any[]): any[] {
    const grupos: { [fecha: string]: any } = {};

    data.forEach(item => {
      const fecha = item.fecha_registro.split('T')[0];

      if (!grupos[fecha]) {
        grupos[fecha] = {
          fecha: item.fecha_registro,
          items: [],
          totalBicis: 0,
          totalImporte: 0,
          totalesQuincena: this.initializeQuincenaTotals()
        };
      }

      grupos[fecha].items.push(item);
      const totalItem = this.getTotalPorItem(item);
      grupos[fecha].totalBicis += totalItem;
      grupos[fecha].totalImporte += totalItem * item.precio_aplicado;

      // Sumar por quincena
      this.quincenas.forEach(quincena => {
        const cantidad = item[quincena] || 0;
        grupos[fecha].totalesQuincena[quincena].cantidad += cantidad;
        grupos[fecha].totalesQuincena[quincena].importe += cantidad * item.precio_aplicado;
      });
    });

    return Object.values(grupos).sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  initializeQuincenaTotals(): any {
    const totals: any = {};
    this.quincenas.forEach(quincena => {
      totals[quincena] = {
        cantidad: 0,
        importe: 0
      };
    });
    return totals;
  }
}
