import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FlujoService } from '../../../services/flujo.service';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from "../../../components/top-bar/top-bar.component";
import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-gastos-operativos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HomeBarComponent],
  templateUrl: './gastos-operativos.component.html',
  styleUrls: ['../gastos-operativos/gastos-operativos.component.css']
})
export class GastosOperativosComponent {
  private fb = inject(FormBuilder);
  private flujoService = inject(FlujoService);
  private alertaService = inject(AlertaService);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  mostrarFormulario = false;
  permisoCompleto = false;
  listaGastos: any[] = [];

  form = this.fb.group({
    concepto: ['', Validators.required],
    categoria: ['SISTEMAS', Validators.required], // Cambiado a una de las nuevas opciones
    proveedor_fijo: [''],
    mes_proyeccion: ['', Validators.required],
    monto_base: [0, [Validators.required, Validators.min(1)]],
    frecuencia: ['MENSUAL']
  });

  ngOnInit() {
    const permiso = this.authService.getFlujoPermiso();
    this.permisoCompleto = this.authService.getRol() === 4
      ? this.authService.tienePermisoInterno('gastos_operativos', 'crear')
      : permiso === 1;
    this.cargarGastos();
  }

  get puedeVerGastos(): boolean {
    return this.authService.getRol() === 4
      ? this.authService.tienePermisoInterno('gastos_operativos', 'ver')
      : this.permisoCompleto;
  }

  cargarGastos() {
    this.flujoService.obtenerGastos().subscribe({
      next: (data) => {
        this.listaGastos = data;
        this.cd.detectChanges();
      },
      error: () => this.alertaService.mostrarError('No se pudo cargar la lista de gastos')
    });
  }

  toggleFormulario() {
    if (!this.permisoCompleto) return;
    this.mostrarFormulario = !this.mostrarFormulario;
    this.cd.detectChanges();
  }

  guardar() {
    if (!this.permisoCompleto) return;
    if (this.form.invalid) return;

    const val = this.form.value;
    // Convierte "2026-01" en "2026-01-01" para el estándar de base de datos
    const fechaCompleta = `${val.mes_proyeccion}-01`;

    const payloadUnificado = {
      ...val,
      fecha_reporte: fechaCompleta
    };

    this.flujoService.crearGasto(payloadUnificado).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Gasto registrado. Se ha actualizado el total de Gastos Operativos.');
        this.mostrarFormulario = false;
        this.form.reset({ categoria: 'SISTEMAS', frecuencia: 'MENSUAL' });
        this.cargarGastos();
      },
      error: (e) => this.alertaService.mostrarError('Error al sincronizar: ' + e.message)
    });
  }
}
