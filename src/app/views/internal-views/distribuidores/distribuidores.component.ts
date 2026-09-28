import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MetasService } from '../../../services/metas.service';
import { ClientesService } from '../../../services/clientes.service';
import { AlertaService } from '../../../services/alerta.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-distribuidores',
  standalone: true,
  imports: [HomeBarComponent, CommonModule, FormsModule, RouterModule],
  templateUrl: './distribuidores.component.html',
  styleUrl: './distribuidores.component.css'
})
export class DistribuidoresComponent implements OnInit {
  busqueda: string = '';
  cliente: any = null;
  clienteOriginal: any = null;

  opcionesEvac = ['A', 'B', 'C', 'D', 'E', 'GO']; // Add this line for EVAC options
  nuevoCliente = {
    clave: '',
    evac: 'A',
    nombre_cliente: '',
    nivel: '',
    f_inicio: '',
    f_fin: ''
  };

  mostrarFormulario = false;
  nivelesDisponibles: any[] = [];

  sugerencias: string[] = [];
  todosLosNombres: string[] = [];
  todosLosClientes: { clave: string, nombre_cliente: string }[] = [];
  cargando: boolean = false;
  confirmacionVisible: boolean = false;
  confirmacionEliminarVisible = false;

  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' | null = null;

  intentoBusqueda = false;

  constructor(
    private clientesService: ClientesService,
    private metasService: MetasService,
    private alertaService: AlertaService,
    private authService: AuthService,
    private router: Router
  ) { }

  get puedeCrear(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('distribuidores', 'crear');
  }

  get puedeEditar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('distribuidores', 'editar');
  }

  get puedeEliminar(): boolean {
    return this.authService.getRol() !== 4 ||
      this.authService.tienePermisoInterno('distribuidores', 'eliminar');
  }

  ngOnInit() {
    this.obtenerNiveles();
    this.obtenerTodosLosNombres();
  }

  // BUSQUEDA COMPLETA
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
    const clave = match ? match[1] : this.busqueda.trim();

    this.clientesService.buscarCliente(clave).subscribe({
      next: (res) => {
        this.cliente = res;
        if (this.cliente) {
          // FORMATEAR FECHAS PARA LOS INPUTS DATE
          if (this.cliente.f_inicio) {
            this.cliente.f_inicio = this.formatearFechaParaInput(this.cliente.f_inicio);
          }
          if (this.cliente.f_fin) {
            this.cliente.f_fin = this.formatearFechaParaInput(this.cliente.f_fin);
          }

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

  // Añadir este método helper
  private formatearFechaParaInput(fecha: string): string {
    // Si ya está en formato YYYY-MM-DD, dejarlo igual
    if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }

    // Si es un objeto Date o string con formato diferente, convertirlo
    try {
      const dateObj = new Date(fecha);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error formateando fecha:', e);
    }

    return fecha; // Devolver original si no se puede formatear
  }

  mostrarFormularioAgregar() {
    if (!this.puedeCrear) return;
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

  // OBTENER NIVELES
  obtenerNiveles() {
    this.metasService.getMetas().subscribe({
      next: (res) => this.nivelesDisponibles = res,
      error: () => console.error('No se pudieron cargar los niveles')
    });
  }

  // OBTENER NOMBRES DE CLIENTES PARA AUTOCOMPLETE
  obtenerTodosLosNombres() {
    this.clientesService.getNombresClientes().subscribe({
      next: (res) => this.todosLosClientes = res,
      error: () => console.error('No se pudieron cargar los nombres')
    });
  }

  // AUTOCOMPLETE
  filtrarSugerencias() {
    const texto = this.busqueda.toLowerCase().trim();
    this.sugerencias = this.todosLosClientes
      .filter(c =>
        c.nombre_cliente.toLowerCase().includes(texto) ||
        c.clave.toLowerCase().includes(texto)
      )
      .slice(0, 10)
      .map(c => `${c.nombre_cliente} (${c.clave})`);
  }

  seleccionarSugerencia(sugerencia: string) {
    this.busqueda = sugerencia;
    this.sugerencias = [];

    const match = sugerencia.match(/\(([^)]+)\)$/);
    const clave = match ? match[1] : sugerencia;

    this.clientesService.buscarCliente(clave).subscribe({
      next: (res) => {
        this.cliente = res;
        if (this.cliente) {
          // FORMATEAR FECHAS TAMBIÉN AQUÍ
          if (this.cliente.f_inicio) {
            this.cliente.f_inicio = this.formatearFechaParaInput(this.cliente.f_inicio);
          }
          if (this.cliente.f_fin) {
            this.cliente.f_fin = this.formatearFechaParaInput(this.cliente.f_fin);
          }
          this.clienteOriginal = JSON.stringify(this.cliente);
        }
      },
      error: () => {
        this.cliente = null;
      }
    });
  }

  agregarCliente() {
    if (!this.puedeCrear) {
      this.alertaService.mostrarError('No cuenta con permiso para crear distribuidores.');
      return;
    }
    // Validar que las fechas tengan formato correcto
    const clienteParaEnviar = {
      ...this.nuevoCliente,
      f_inicio: this.nuevoCliente.f_inicio || null,
      f_fin: this.nuevoCliente.f_fin || null
    };

    this.clientesService.agregarCliente(clienteParaEnviar).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente agregado correctamente');
        this.mostrarFormulario = false;
        this.nuevoCliente = {
          clave: '',
          evac: 'A',
          nombre_cliente: '',
          nivel: '',
          f_inicio: '',
          f_fin: ''
        };
      },
      error: (err) => this.alertaService.mostrarError(err.error?.error || 'Error al agregar')
    });
  }

  editarCliente() {
    if (!this.cliente?.id) return;
  }

  confirmarEdicion() {
    if (!this.puedeEditar) {
      this.alertaService.mostrarError('No cuenta con permiso para editar distribuidores.');
      return;
    }
    // Crear una copia del cliente con las fechas en formato correcto para el backend
    const clienteParaEnviar = {
      ...this.cliente,
      f_inicio: this.cliente.f_inicio ? this.cliente.f_inicio : null,
      f_fin: this.cliente.f_fin ? this.cliente.f_fin : null
    };

    this.clientesService.editarCliente(this.cliente.id, clienteParaEnviar).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente editado correctamente');

        // Actualizar el original con las fechas formateadas
        this.clienteOriginal = JSON.stringify(this.cliente);
        this.confirmacionVisible = false;
      },
      error: () => this.alertaService.mostrarError('Error al editar cliente')
    });
  }

  cancelarEdicion() {
    this.confirmacionVisible = false;
  }

  eliminarCliente() {
    if (!this.puedeEliminar) {
      this.alertaService.mostrarError('No cuenta con permiso para eliminar distribuidores.');
      return;
    }
    if (!this.cliente?.id) return;
    if (confirm('¿Seguro que deseas eliminar este cliente?')) {
      this.clientesService.eliminarCliente(this.cliente.id).subscribe({
        next: () => {
          this.alertaService.mostrarExito('Cliente eliminado');
          this.cliente = null;
        },
        error: () => this.alertaService.mostrarError('Error al eliminar cliente')
      });
    }
  }

  hayCambios(): boolean {
    return this.cliente && JSON.stringify(this.cliente) !== this.clienteOriginal;
  }

  confirmarEliminacion() {
    if (!this.puedeEliminar) {
      this.alertaService.mostrarError('No cuenta con permiso para eliminar distribuidores.');
      return;
    }
    if (!this.cliente?.id) return;

    this.clientesService.eliminarCliente(this.cliente.id).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Cliente eliminado');
        this.cliente = null;
        this.confirmacionEliminarVisible = false;
      },
      error: () => this.alertaService.mostrarError('Error al eliminar cliente')
    });
  }

  cancelarEliminacion() {
    this.confirmacionEliminarVisible = false;
  }
}
