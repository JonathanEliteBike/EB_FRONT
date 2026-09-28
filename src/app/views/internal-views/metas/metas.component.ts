import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MetasService } from '../../../services/metas.service';
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { MonedaFormatoInputDirective } from '../../../directives/moneda-formato-input.directive';

@Component({
  selector: 'app-metas',
  standalone: true,
  templateUrl: './metas.component.html',
  styleUrl: './metas.component.css',
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, MonedaFormatoInputDirective],
})
export class MetasComponent {
  metas: any[] = [];
  // Formularios separados para agregar y editar
  agregarForm = {
    nivel: '',
    compromiso_scott: 0,
    compromiso_syncros: 0,
    compromiso_apparel: 0,
    compromiso_vittoria: 0,
  };
  editarForm = {
    id: null as number | null,
    nivel: '',
    compromiso_scott: 0,
    compromiso_syncros: 0,
    compromiso_apparel: 0,
    compromiso_vittoria: 0,
  };

  mostrarAgregar = false;
  mostrarEditar = false;
  confirmacionVisible = false;
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor(
    private metasService: MetasService,
    private alertaService: AlertaService,
    private authService: AuthService
  ) { }

  get puedeCrear(): boolean {
    return this.puedeGestionar('crear');
  }

  get puedeEditar(): boolean {
    return this.puedeGestionar('editar');
  }

  get puedeEliminar(): boolean {
    return this.puedeGestionar('eliminar');
  }

  get puedeGestionarMetas(): boolean {
    return this.puedeCrear || this.puedeEditar || this.puedeEliminar;
  }

  ngOnInit() {
    this.cargarMetas();
  }

  cargarMetas() {
    this.metasService.getMetas().subscribe({
      next: (data) => this.metas = data,
      error: () => this.mostrarMensaje('Error al cargar metas', 'error'),
    });
  }

  mostrarMensaje(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    setTimeout(() => (this.mensajeAlerta = ''), 4000);
  }

  abrirAgregar() {
    if (!this.puedeCrear) return;
    this.resetAgregarForm();
    this.mostrarAgregar = true;
    this.mostrarEditar = false;
  }

  abrirEditar(meta: any) {
    if (!this.puedeEditar) return;
    this.editarForm = {
      id: meta.id,
      nivel: meta.nivel,
      compromiso_scott: meta.compromiso_scott,
      compromiso_syncros: meta.compromiso_syncros,
      compromiso_apparel: meta.compromiso_apparel,
      compromiso_vittoria: meta.compromiso_vittoria,
    };
    this.mostrarEditar = true;
    this.mostrarAgregar = false;
  }

  cancelarForm() {
    this.mostrarAgregar = false;
    this.mostrarEditar = false;
  }

  toDecimal(valor: any): number {
    const limpio = String(valor).replace(/[$,]/g, '');
    return parseFloat(parseFloat(limpio).toFixed(2));
  }

  guardarAgregar() {
    if (!this.puedeCrear) return;
    const formateado = {
      ...this.agregarForm,
      compromiso_scott: this.toDecimal(this.agregarForm.compromiso_scott),
      compromiso_syncros: this.toDecimal(this.agregarForm.compromiso_syncros),
      compromiso_apparel: this.toDecimal(this.agregarForm.compromiso_apparel),
      compromiso_vittoria: this.toDecimal(this.agregarForm.compromiso_vittoria),
    };

    this.metasService.agregarMeta(formateado).subscribe({
      next: () => {
        this.mostrarMensaje('Meta agregada correctamente', 'exito');
        this.resetAgregarForm();
        this.mostrarAgregar = false;
        this.cargarMetas();
      },
      error: (err) => {
        console.error('Error al agregar:', err);
        this.mostrarMensaje('Error al agregar meta', 'error');
      },
    });
  }

  guardarEditar() {
    if (!this.puedeEditar) return;
    if (this.editarForm.id == null) return;

    const formateado = {
      ...this.editarForm,
      compromiso_scott: this.toDecimal(this.editarForm.compromiso_scott),
      compromiso_syncros: this.toDecimal(this.editarForm.compromiso_syncros),
      compromiso_apparel: this.toDecimal(this.editarForm.compromiso_apparel),
      compromiso_vittoria: this.toDecimal(this.editarForm.compromiso_vittoria),
    };

    this.metasService.editarMeta(this.editarForm.id, formateado).subscribe({
      next: () => {
        this.mostrarMensaje('Meta actualizada correctamente', 'exito');
        this.mostrarEditar = false;
        this.cargarMetas();
      },
      error: (err) => {
        console.error('Error al editar:', err); // Debug opcional
        this.mostrarMensaje('Error al editar meta', 'error');
      },
    });
  }

  confirmarEliminar(meta: any) {
    if (!this.puedeEliminar) return;
    this.editarForm.id = meta.id;
    this.confirmacionVisible = true;
  }

  eliminarMeta() {
    if (!this.puedeEliminar) return;
    if (this.editarForm.id == null) return;
    this.metasService.eliminarMeta(this.editarForm.id).subscribe({
      next: () => {
        this.mostrarMensaje('Meta eliminada correctamente', 'exito');
        this.confirmacionVisible = false;
        this.editarForm.id = null;
        this.cargarMetas();
      },
      error: () => this.mostrarMensaje('Error al eliminar meta', 'error'),
    });
  }

  cancelarEliminacion() {
    this.confirmacionVisible = false;
    this.editarForm.id = null;
  }

  resetAgregarForm() {
    this.agregarForm = {
      nivel: '',
      compromiso_scott: 0,
      compromiso_syncros: 0,
      compromiso_apparel: 0,
      compromiso_vittoria: 0,
    };
  }

  private puedeGestionar(accion: 'crear' | 'editar' | 'eliminar'): boolean {
    return this.authService.getRol() !== 4 || this.authService.tienePermisoInterno('metas', accion);
  }

  formatearMoneda(valor: any): string {
    if (valor === null || valor === undefined || valor === '') return '$0';

    const limpio = String(valor).replace(/[^0-9.]/g, '');
    const numero = parseFloat(limpio);

    if (isNaN(numero)) return '$0';

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  }

}
