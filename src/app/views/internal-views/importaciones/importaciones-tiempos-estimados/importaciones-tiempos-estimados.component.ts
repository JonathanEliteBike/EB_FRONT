import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { TiemposEstimadosService, TiempoEstimado, TiempoEstimadoPayload } from '../../../../services/tiempos-estimados.service';

const ORIGENES_DISPONIBLES = ['VIETNAM', 'ESPAÑA', 'TAIWAN', 'BELGICA', 'CAMBOYA', 'ESTADOS UNIDOS', 'CHINA'];
// "Bicicleta eléctrica" no está aquí a propósito -- solo se trae de España y
// por vía aérea, así que se agrega/quita dinámicamente en tiposProductoDisponibles().
const TIPOS_PRODUCTO_BASE = ['Bicicleta', 'Cascos', 'Zapatos', 'Accesorios', 'Accesorios y Bicicletas'];

const FORM_VACIO: TiempoEstimadoPayload = {
  origen: '', tipo_producto: '', via_transporte: 'MARITIMO',
  dias_hasta_booking: 0, dias_booking_a_puerto: 0,
  dias_puerto_a_destino: 0, dias_destino_a_almacen: 0,
};

@Component({
  selector: 'app-importaciones-tiempos-estimados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent],
  templateUrl: './importaciones-tiempos-estimados.component.html',
  styleUrl: './importaciones-tiempos-estimados.component.css',
})
export class ImportacionesTiemposEstimadosComponent implements OnInit {
  readonly ORIGENES = ORIGENES_DISPONIBLES;

  reglas: TiempoEstimado[] = [];
  cargando = true;
  error = '';

  modalAbierto = false;
  editandoId: number | null = null;
  guardando = false;
  errorForm = '';
  form: TiempoEstimadoPayload = { ...FORM_VACIO };

  constructor(private svc: TiemposEstimadosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar().subscribe({
      next: (res) => { this.reglas = res; this.cargando = false; },
      error: () => { this.error = 'No se pudieron cargar las reglas de tiempos estimados.'; this.cargando = false; },
    });
  }

  totalDias(r: TiempoEstimado): number {
    return r.dias_hasta_booking + r.dias_booking_a_puerto + r.dias_puerto_a_destino + r.dias_destino_a_almacen;
  }

  /** "Bicicleta eléctrica" únicamente aplica para origen ESPAÑA + vía AEREO. */
  tiposProductoDisponibles(): string[] {
    const tipos = [...TIPOS_PRODUCTO_BASE];
    if (this.form.origen === 'ESPAÑA' && this.form.via_transporte === 'AEREO') {
      tipos.unshift('Bicicleta eléctrica');
    }
    return tipos;
  }

  private limpiarBicicletaElectricaSiYaNoAplica(): void {
    const aplica = this.form.origen === 'ESPAÑA' && this.form.via_transporte === 'AEREO';
    if (!aplica && this.form.tipo_producto === 'Bicicleta eléctrica') {
      this.form.tipo_producto = '';
    }
  }

  cambiarOrigenForm(origen: string): void {
    this.form.origen = origen;
    this.limpiarBicicletaElectricaSiYaNoAplica();
  }

  cambiarViaForm(via: string): void {
    this.form.via_transporte = via;
    this.limpiarBicicletaElectricaSiYaNoAplica();
  }

  abrirNueva(): void {
    this.editandoId = null;
    this.form = { ...FORM_VACIO };
    this.errorForm = '';
    this.modalAbierto = true;
  }

  abrirEdicion(r: TiempoEstimado): void {
    this.editandoId = r.id;
    this.form = {
      origen: r.origen, tipo_producto: r.tipo_producto, via_transporte: r.via_transporte,
      dias_hasta_booking: r.dias_hasta_booking, dias_booking_a_puerto: r.dias_booking_a_puerto,
      dias_puerto_a_destino: r.dias_puerto_a_destino, dias_destino_a_almacen: r.dias_destino_a_almacen,
    };
    this.errorForm = '';
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.modalAbierto = false;
  }

  formValido(): boolean {
    return !!this.form.origen && !!this.form.tipo_producto && !!this.form.via_transporte;
  }

  guardar(): void {
    if (!this.formValido() || this.guardando) return;
    this.guardando = true;
    this.errorForm = '';

    const payload: TiempoEstimadoPayload = {
      ...this.form,
      dias_hasta_booking:    Number(this.form.dias_hasta_booking)    || 0,
      dias_booking_a_puerto: Number(this.form.dias_booking_a_puerto) || 0,
      dias_puerto_a_destino: Number(this.form.dias_puerto_a_destino) || 0,
      dias_destino_a_almacen: Number(this.form.dias_destino_a_almacen) || 0,
    };

    const obs = this.editandoId
      ? this.svc.actualizar(this.editandoId, payload)
      : this.svc.crear(payload);

    obs.subscribe({
      next: () => {
        this.guardando = false;
        this.modalAbierto = false;
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        this.errorForm = err?.error?.error || 'No se pudo guardar la regla.';
      },
    });
  }

  eliminar(r: TiempoEstimado): void {
    if (!confirm(`¿Eliminar la regla de "${r.origen} · ${r.tipo_producto}"?\nLos embarques con esa combinación dejarán de calcular sus fechas proyectadas hasta que se configure otra regla.`)) return;
    this.svc.eliminar(r.id).subscribe({
      next: () => this.cargar(),
      error: () => { this.error = 'No se pudo eliminar la regla.'; },
    });
  }
}
