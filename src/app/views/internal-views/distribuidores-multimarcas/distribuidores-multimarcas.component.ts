import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MultimarcasService } from '../../../services/multimarcas.service';
import { AlertaService } from '../../../services/alerta.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-distribuidores-multimarcas',
  standalone: true,
  imports: [HomeBarComponent, CommonModule, FormsModule, RouterModule],
  templateUrl: './distribuidores-multimarcas.component.html',
  styleUrl: './distribuidores-multimarcas.component.css'
})
export class DistribuidoresMultimarcasComponent implements OnInit {
  busqueda: string = '';
  cliente: any = null;
  clienteOriginal: any = null;

  nuevoCliente = {
    clave: '',
    evac: 'A', // Valor por defecto
    cliente_razon_social: ''
  };

  mostrarFormulario = false;
  cargando: boolean = false;
  confirmacionVisible: boolean = false;
  confirmacionEliminarVisible = false;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' | null = null;
  intentoBusqueda = false;

  // Para autocomplete
  sugerencias: string[] = [];
  todosLosClientes: { id: number, clave: string, cliente_razon_social: string }[] = [];

  opcionesEvac = ['A', 'B', 'C', 'D', 'E'];

  constructor(
    private multimarcasService: MultimarcasService,
    private alertaService: AlertaService,
    private authService: AuthService,
    private router: Router
  ) { }

  get puedeEditar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('distribuidores_multimarcas', 'editar');
  }

  get puedeEliminar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('distribuidores_multimarcas', 'eliminar');
  }

  ngOnInit() {
    this.obtenerTodosLosClientes();
  }

  obtenerTodosLosClientes() {
    this.multimarcasService.obtenerMultimarcasClaves().subscribe({
      next: (res) => this.todosLosClientes = res,
      error: () => console.error('No se pudieron cargar los clientes')
    });
  }

  buscarCliente() {
    if (this.busqueda.trim().length === 0) {
      this.cliente = null;
      this.intentoBusqueda = false;
      this.mostrarFormulario = false;
      return;
    }
    this.mostrarFormulario = false;
    this.cargando = true;
    this.intentoBusqueda = true;

    const match = this.busqueda.match(/\(([^)]+)\)$/);
    const terminoBusqueda = match ? match[1] : this.busqueda.trim();

    this.multimarcasService.buscarClienteMultimarcas(terminoBusqueda).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          // Si hay múltiples resultados, toma el primero que coincida exactamente
          this.cliente = res.find(c =>
            c.clave === terminoBusqueda ||
            c.cliente_razon_social.toLowerCase() === terminoBusqueda.toLowerCase()
          ) || res[0]; // Si no hay coincidencia exacta, toma el primero
        } else {
          this.cliente = res;
        }

        if (this.cliente) {
          this.clienteOriginal = JSON.stringify(this.cliente);
        }
        this.cargando = false;
      },
      error: () => {
        this.cliente = null;
        this.cargando = false;
      }
    });
  }

  filtrarSugerencias() {
    const texto = this.busqueda.toLowerCase().trim();
    this.sugerencias = this.todosLosClientes
      .filter(c =>
        c.cliente_razon_social.toLowerCase().includes(texto) ||
        c.clave.toLowerCase().includes(texto)
      )
      .slice(0, 10)
      .map(c => `${c.cliente_razon_social} (${c.clave})`);
  }

  seleccionarSugerencia(sugerencia: string) {
    this.busqueda = sugerencia;
    this.sugerencias = [];
    this.buscarCliente();
  }

  agregarCliente() {
    this.multimarcasService.agregarCliente(this.nuevoCliente).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente agregado correctamente');
        this.mostrarFormulario = false;
        this.nuevoCliente = { clave: '', evac: '', cliente_razon_social: '' };
        this.obtenerTodosLosClientes(); // Actualizar la lista
      },
      error: (err) => this.alertaService.mostrarError(err.error?.error || 'Error al agregar cliente')
    });
  }

  mostrarFormularioAgregar() {
    if (this.mostrarFormulario) {
      // Si ya está mostrando el formulario, lo oculta
      this.mostrarFormulario = false;
    } else {
      // Si no está mostrando el formulario, lo muestra y limpia
      this.cliente = null;
      this.mostrarFormulario = true;
      this.busqueda = '';
      this.sugerencias = [];
      this.intentoBusqueda = false;
    }
  }

  editarCliente() {
    if (!this.puedeEditar) {
      this.alertaService.mostrarError('No cuenta con permiso para editar distribuidores multimarcas.');
      return;
    }
    if (!this.cliente?.id) return;
    this.multimarcasService.editarCliente(this.cliente.id, this.cliente).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente actualizado correctamente');
        this.clienteOriginal = JSON.stringify(this.cliente);
        this.confirmacionVisible = false;
        this.obtenerTodosLosClientes(); // Actualizar la lista
      },
      error: (err) => this.alertaService.mostrarError(err.error?.error || 'Error al actualizar cliente')
    });
  }

  eliminarCliente() {
    if (!this.puedeEliminar) {
      this.alertaService.mostrarError('No cuenta con permiso para eliminar distribuidores multimarcas.');
      return;
    }
    if (!this.cliente?.id) return;
    this.multimarcasService.eliminarCliente(this.cliente.id).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente eliminado correctamente');
        this.cliente = null;
        this.confirmacionEliminarVisible = false;
        this.obtenerTodosLosClientes(); // Actualizar la lista
      },
      error: (err) => this.alertaService.mostrarError(err.error?.error || 'Error al eliminar cliente')
    });
  }

  confirmarEdicion() {
    if (!this.puedeEditar) return;
    this.confirmacionVisible = true;
  }

  cancelarEdicion() {
    this.confirmacionVisible = false;
  }

  confirmarEliminacion() {
    if (!this.puedeEliminar) return;
    this.confirmacionEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.confirmacionEliminarVisible = false;
  }

  hayCambios(): boolean {
    return this.cliente && JSON.stringify(this.cliente) !== this.clienteOriginal;
  }
}
