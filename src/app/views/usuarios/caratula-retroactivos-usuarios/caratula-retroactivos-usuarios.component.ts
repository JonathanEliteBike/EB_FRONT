import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RetroactivosService } from '../../../services/retroactivos.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';

interface DatosRetroactivo {
  CLAVE: string;
  ZONA: string;
  CLIENTE: string;
  CATEGORIA: string;
  temporada_cerrada?: boolean;
  fecha_cierre_temporada?: string | null;

  COMPRA_MINIMA_ANUAL: number;
  COMPRA_GLOBAL_SCOTT: number;
  COMPRA_GLOBAL_APPAREL: number;
  COMPRA_GLOBAL_BOLD?: number;
  TOTAL_ACUMULADO?: number;

  porcentaje_avance_scott: number;
  COMPRA_MINIMA_APPAREL: number;
  porcentaje_avance_apparel: number;
  COMPRAS_TOTALES_CRUDO: number;

  notas_credito: number;
  garantias: number;
  acumulado_global_calculado: number;
  productos_ofertados: number;
  bicicleta_demo: number;
  bicicletas_bold: number;
  importe_final: number;
  compra_adicional: number;
  porcentaje_retroactivo: number;
  porcentaje_retroactivo_apparel: number;
  retroactivo_total: number;
  importe: number;
  porcentaje_avance_general: number;
  total_bicis_deduccion: number;

  [key: string]: any;
}

@Component({
  selector: 'app-caratula-retroactivos-usuario',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent],
  templateUrl: './caratula-retroactivos-usuarios.component.html',
  styleUrl: './caratula-retroactivos-usuarios.component.css'
})
export class CaratulaRetroactivosUsuarioComponent implements OnInit {

  isLoading = true;
  error: string | null = null;
  datosCliente: DatosRetroactivo | null = null;

  constructor(private retroactivosService: RetroactivosService) { }

  ngOnInit(): void {
    this.cargarDatosUsuarioActual();
  }

  cargarDatosUsuarioActual(): void {
    this.isLoading = true;
    this.error = null;

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        this.error = 'No se encontró sesión activa. Por favor inicie sesión nuevamente.';
        this.isLoading = false;
        return;
      }

      const payload = token.split('.')[1];

      if (!payload) {
        this.error = 'Token inválido. Por favor inicie sesión nuevamente.';
        this.isLoading = false;
        return;
      }

      const decodedPayload = atob(payload);
      const tokenData = JSON.parse(decodedPayload);

      let claveParaBuscar = tokenData.clave;

      if (tokenData.id_grupo) {
        claveParaBuscar = `Integral ${tokenData.id_grupo}`;
      }

      if (!claveParaBuscar) {
        this.error = 'No se pudo identificar la clave del usuario en el token.';
        this.isLoading = false;
        return;
      }

      this.retroactivosService.getRetroactivoCliente(claveParaBuscar).subscribe({
        next: (data) => {
          this.datosCliente = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'No se encontró información de retroactivos para tu cuenta en este momento.';
          this.isLoading = false;
        }
      });

    } catch (error) {
      console.error('Error al decodificar el token:', error);
      this.error = 'Error al obtener la información de tu usuario.';
      this.isLoading = false;
    }
  }

  private n(...values: any[]): number {
    for (const value of values) {
      const num = Number(value);

      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
    }

    return 0;
  }

  getCompraGlobalScott(): number {
    const d: any = this.datosCliente;
    return this.n(d?.COMPRA_GLOBAL_SCOTT);
  }

  getCompraGlobalApparel(): number {
    const d: any = this.datosCliente;
    return this.n(d?.COMPRA_GLOBAL_APPAREL);
  }

  getCompraGlobalBold(): number {
    const d: any = this.datosCliente;
    return this.n(d?.COMPRA_GLOBAL_BOLD);
  }

  getTotalAcumulado(): number {
    const d: any = this.datosCliente;

    const totalBackend = this.n(
      d?.COMPRAS_TOTALES_CRUDO,
      d?.compras_totales_crudo,
      d?.TOTAL_ACUMULADO,
      d?.total_acumulado,
      d?.avance_global
    );

    if (totalBackend > 0) {
      return totalBackend;
    }

    return (
      this.getCompraGlobalScott() +
      this.getCompraGlobalApparel() +
      this.getCompraGlobalBold()
    );
  }

  getNotasCredito(): number {
    const d: any = this.datosCliente;
    return this.n(d?.notas_credito);
  }

  getGarantias(): number {
    const d: any = this.datosCliente;
    return this.n(d?.garantias);
  }

  getProductosOfertados(): number {
    const d: any = this.datosCliente;
    return this.n(d?.productos_ofertados);
  }

  getBicicletaDemo(): number {
    const d: any = this.datosCliente;
    return this.n(d?.bicicleta_demo);
  }

  getBicicletasBold(): number {
    const d: any = this.datosCliente;
    return this.n(d?.bicicletas_bold);
  }

  getTotalBicisDeduccion(): number {
    const d: any = this.datosCliente;

    const totalBackend = this.n(d?.total_bicis_deduccion);

    if (totalBackend > 0) {
      return totalBackend;
    }

    return this.getBicicletaDemo() + this.getBicicletasBold();
  }

  getAcumuladoGlobalCalculado(): number {
    return this.getTotalAcumulado() - this.getNotasCredito() - this.getGarantias();
  }

  getImporteFinalBase(): number {
    return (
      this.getAcumuladoGlobalCalculado() -
      this.getProductosOfertados() -
      this.getTotalBicisDeduccion()
    );
  }

  getCompraAdicionalCalculada(): number {
    const d: any = this.datosCliente;
    return this.getAcumuladoGlobalCalculado() - this.n(d?.COMPRA_MINIMA_ANUAL);
  }

  getPorcentajeRetroactivo(): number {
    const d: any = this.datosCliente;
    return this.n(d?.porcentaje_retroactivo);
  }

  getPorcentajeRetroactivoApparel(): number {
    const d: any = this.datosCliente;
    return this.n(d?.porcentaje_retroactivo_apparel);
  }

  getRetroactivoTotal(): number {
    const d: any = this.datosCliente;

    const totalBackend = this.n(d?.retroactivo_total);

    if (totalBackend > 0) {
      return totalBackend;
    }

    return this.getPorcentajeRetroactivo() + this.getPorcentajeRetroactivoApparel();
  }

  getImportePagar(): number {
    return this.getImporteFinalBase() * this.getRetroactivoTotal();
  }

  descargarPDF(): void {
    window.print();
  }

  get temporadaCerrada(): boolean {
    return !!this.datosCliente?.temporada_cerrada;
  }

  get fechaCierreFormateada(): string {
    const f = this.datosCliente?.fecha_cierre_temporada;
    if (!f) return '';
    const [year, month, day] = f.split('-');
    return `${day}/${month}/${year}`;
  }

  get fechaCierreApparel(): string | null {
    const f = (this.datosCliente as any)?.fecha_cierre_apparel;
    if (!f) return null;
    const [year, month, day] = f.split('-');
    return `${day}/${month}/${year}`;
  }

  getPorcentajeAvanceGeneral(): number {
    const d: any = this.datosCliente;
    const meta = this.n(d?.COMPRA_MINIMA_ANUAL);

    if (meta <= 0) {
      return 0;
    }

    return this.getTotalAcumulado() / meta;
  }

  getPorcentajeAvanceApparel(): number {
    const d: any = this.datosCliente;
    const meta = this.n(d?.COMPRA_MINIMA_APPAREL);

    if (meta <= 0) {
      return 0;
    }

    return this.getCompraGlobalApparel() / meta;
  }
}