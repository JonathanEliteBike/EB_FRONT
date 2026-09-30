import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { ProyeccionService } from '../../../services/proyeccion.service';
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';

interface Producto {
  id: number;
  referencia: string;
  clave_factura: string;
  clave_6_digitos: string;
  ean: string;
  clave_odoo: string;
  descripcion: string;
  modelo: string;
  spec?: string; 
  precio_distribuidor_sin_iva?: number;
  precio_elite_plus_sin_iva?: number;
  precio_elite_sin_iva?: number;
  precio_partner_sin_iva?: number;
  precio_publico_sin_iva?: number;
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
  id_disponibilidad: number;
  disp_q1_sep_2025?: boolean;
  disp_q2_sep_2025?: boolean;
  disp_q1_oct_2025?: boolean;
  disp_q2_oct_2025?: boolean;
  disp_q1_nov_2025?: boolean;
  disp_q2_nov_2025?: boolean;
  disp_q1_dic_2025?: boolean;
  disp_q2_dic_2025?: boolean;
  disp_q1_mar_2026?: boolean;
  disp_q2_mar_2026?: boolean;
  disp_q1_abr_2026?: boolean;
  disp_q2_abr_2026?: boolean;
  disp_q1_may_2026?: boolean;
  disp_q2_may_2026?: boolean;
}

interface Disponibilidad {
  id: number;
  q1_sep_2025: boolean;
  q2_sep_2025: boolean;
  q1_oct_2025: boolean;
  q2_oct_2025: boolean;
  q1_nov_2025: boolean;
  q2_nov_2025: boolean;
  q1_dic_2025: boolean;
  q2_dic_2025: boolean;
  q1_mar_2026: boolean;
  q2_mar_2026: boolean;
  q1_abr_2026: boolean;
  q2_abr_2026: boolean;
  q1_may_2026: boolean;
  q2_may_2026: boolean;
  descripcion: string;
}

@Component({
  selector: 'app-proyeccion-control',
  standalone: true,
  imports: [HomeBarComponent, CommonModule, FormsModule, RouterModule],
  templateUrl: './proyeccion-control.component.html',
  styleUrls: ['./proyeccion-control.component.css']
})
export class ProyeccionControlComponent implements OnInit {
  todosLosProductos: Producto[] = [];
  busqueda: string = '';
  proyeccion: Producto | null = null;
  proyeccionOriginal: Producto | null = null;
  nuevaProyeccion: Producto = {
    id: 0,
    referencia: '',
    clave_factura: '',
    clave_6_digitos: '',
    ean: '',
    clave_odoo: '',
    descripcion: '',
    modelo: '',
    spec: '',
    precio_distribuidor_sin_iva: 0,
    precio_elite_plus_sin_iva: 0,
    precio_elite_sin_iva: 0,
    precio_partner_sin_iva: 0,
    precio_publico_sin_iva: 0,
    q1_sep_2025: 0,
    q2_sep_2025: 0,
    q1_oct_2025: 0,
    q2_oct_2025: 0,
    q1_nov_2025: 0,
    q2_nov_2025: 0,
    q1_dic_2025: 0,
    q2_dic_2025: 0,
    q1_mar_2026: 0,
    q2_mar_2026: 0,
    q1_abr_2026: 0,
    q2_abr_2026: 0,
    q1_may_2026: 0,
    q2_may_2026: 0,
    id_disponibilidad: 5
  };
  mostrarFormulario = false;
  disponibilidades: Disponibilidad[] = [];
  sugerencias: { nombre: string, id: number }[] = [];
  cargando = false;
  confirmacionVisible = false;
  confirmacionEliminarVisible = false;
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' | null = null;
  intentoBusqueda = false;

  constructor(
    private proyeccionService: ProyeccionService,
    private alertaService: AlertaService,
    private router: Router,
    private authService: AuthService,
  ) { }

  get puedeCrear(): boolean {
    return this.authService.getRol() !== 4
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'crear');
  }

  get puedeEditar(): boolean {
    return this.authService.getRol() !== 4
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'editar');
  }

  get puedeEliminar(): boolean {
    return this.authService.getRol() !== 4
      || this.authService.tienePermisoInternoActual('proyeccion_compra', 'eliminar');
  }

  ngOnInit() {
    this.obtenerDisponibilidades();
    this.obtenerTodosLosProductos();
  }

  obtenerDisponibilidades() {
    this.proyeccionService.getDisponibilidades().subscribe({
      next: (res) => {
        this.disponibilidades = res;
        // Establecer disponibilidad por defecto si es necesario
        if (this.disponibilidades.length > 0 && !this.nuevaProyeccion.id_disponibilidad) {
          this.nuevaProyeccion.id_disponibilidad = this.disponibilidades[0].id;
        }
      },
      error: (err) => {
        console.error('No se pudieron cargar las disponibilidades', err);
        this.alertaService.mostrarError('Error al cargar disponibilidades');
      }
    });
  }

  obtenerTodosLosProductos() {
    this.proyeccionService.getProyeccionesLimpias().subscribe({
      next: (res) => this.todosLosProductos = res,
      error: (err) => {
        console.error('No se pudieron cargar los productos', err);
        this.alertaService.mostrarError('Error al cargar proyecciones');
      }
    });
  }

  buscarProyeccion() {
    if (this.busqueda.trim().length === 0) {
      this.proyeccion = null;
      this.intentoBusqueda = false;
      return;
    }
    this.cargando = true;
    this.intentoBusqueda = true;

    const match = this.busqueda.match(/\(([^)]+)\)$/);
    const clave = match ? match[1] : this.busqueda.trim();

    // Buscar el producto por clave_factura usando el valor extraído de la búsqueda
    const producto = this.todosLosProductos.find(p => p.clave_factura === clave);
    if (!producto) {
      this.proyeccion = null;
      this.cargando = false;
      return;
    }
    this.proyeccionService.buscarProyeccionPorId(producto.id).subscribe({
      next: (res: Producto) => {
        this.proyeccion = res;
        this.proyeccionOriginal = { ...res };
        this.cargando = false;
      },
      error: () => {
        this.proyeccion = null;
        this.cargando = false;
      }
    });
  }

  filtrarSugerencias() {
    if (!this.busqueda.trim()) {
      this.proyeccion = null;
      this.sugerencias = [];
      return;
    }

    const texto = this.busqueda.toLowerCase().trim();
    this.sugerencias = this.todosLosProductos
      .filter((p: Producto) =>
      (p.descripcion?.toLowerCase().includes(texto) ||
        p.clave_factura?.toLowerCase().includes(texto) ||
        p.modelo?.toLowerCase().includes(texto)))
      .slice(0, 10)
      .map(p => ({ nombre: `${p.descripcion} (${p.clave_factura})`, id: p.id }));
  }

  seleccionarSugerencia(sugerencia: { nombre: string, id: number }) {
    this.busqueda = sugerencia.nombre;
    this.sugerencias = [];

    this.cargando = true;
    this.proyeccionService.buscarProyeccionPorId(sugerencia.id).subscribe({
      next: (res) => {
        this.proyeccion = res;
        this.proyeccionOriginal = { ...res };
        this.cargando = false;
      },
      error: () => {
        this.proyeccion = null;
        this.cargando = false;
      }
    });
  }

  agregarProyeccion() {
    if (!this.puedeCrear) return;
    this.cargando = true;
    this.proyeccionService.agregarProyeccion(this.nuevaProyeccion).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Proyección agregada correctamente');
        this.mostrarFormulario = false;
        this.resetearFormulario();
        this.obtenerTodosLosProductos();
        this.cargando = false;
      },
      error: (err) => {
        this.alertaService.mostrarError(err.error?.error || 'Error al agregar proyección');
        this.cargando = false;
      }
    });
  }

  confirmarEdicion() {
    if (!this.proyeccion || !this.puedeEditar) return;

    this.cargando = true;
    this.proyeccionService.editarProyeccion(this.proyeccion.id, this.proyeccion).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Proyección actualizada correctamente');
        // Asegurarnos de que todos los campos requeridos están presentes
        this.proyeccionOriginal = {
          id: this.proyeccion!.id,
          referencia: this.proyeccion!.referencia,
          clave_factura: this.proyeccion!.clave_factura,
          clave_6_digitos: this.proyeccion!.clave_6_digitos,
          ean: this.proyeccion!.ean,
          clave_odoo: this.proyeccion!.clave_odoo,
          descripcion: this.proyeccion!.descripcion,
          modelo: this.proyeccion!.modelo,
          spec: this.proyeccion!.spec,
          precio_distribuidor_sin_iva: this.proyeccion!.precio_distribuidor_sin_iva,
          precio_elite_plus_sin_iva: this.proyeccion!.precio_elite_plus_sin_iva,
          precio_elite_sin_iva: this.proyeccion!.precio_elite_sin_iva,
          precio_partner_sin_iva: this.proyeccion!.precio_partner_sin_iva,
          precio_publico_sin_iva: this.proyeccion!.precio_publico_sin_iva,
          q1_sep_2025: this.proyeccion!.q1_sep_2025,
          q2_sep_2025: this.proyeccion!.q2_sep_2025,
          q1_oct_2025: this.proyeccion!.q1_oct_2025,
          q2_oct_2025: this.proyeccion!.q2_oct_2025,
          q1_nov_2025: this.proyeccion!.q1_nov_2025,
          q2_nov_2025: this.proyeccion!.q2_nov_2025,
          q1_dic_2025: this.proyeccion!.q1_dic_2025,
          q2_dic_2025: this.proyeccion!.q2_dic_2025,
          q1_mar_2026: this.proyeccion!.q1_mar_2026,
          q2_mar_2026: this.proyeccion!.q2_mar_2026,
          q1_abr_2026: this.proyeccion!.q1_abr_2026,
          q2_abr_2026: this.proyeccion!.q2_abr_2026,
          q1_may_2026: this.proyeccion!.q1_may_2026,
          q2_may_2026: this.proyeccion!.q2_may_2026,
          id_disponibilidad: this.proyeccion!.id_disponibilidad,
          // Campos opcionales
          disp_q1_sep_2025: this.proyeccion!.disp_q1_sep_2025,
          disp_q2_sep_2025: this.proyeccion!.disp_q2_sep_2025,
          disp_q1_oct_2025: this.proyeccion!.disp_q1_oct_2025,
          disp_q2_oct_2025: this.proyeccion!.disp_q2_oct_2025,
          disp_q1_nov_2025: this.proyeccion!.disp_q1_nov_2025,
          disp_q2_nov_2025: this.proyeccion!.disp_q2_nov_2025,
          disp_q1_dic_2025: this.proyeccion!.disp_q1_dic_2025,
          disp_q2_dic_2025: this.proyeccion!.disp_q2_dic_2025,
          disp_q1_mar_2026: this.proyeccion!.disp_q1_mar_2026,
          disp_q2_mar_2026: this.proyeccion!.disp_q2_mar_2026,
          disp_q1_abr_2026: this.proyeccion!.disp_q1_abr_2026,
          disp_q2_abr_2026: this.proyeccion!.disp_q2_abr_2026,
          disp_q1_may_2026: this.proyeccion!.disp_q1_may_2026,
          disp_q2_may_2026: this.proyeccion!.disp_q2_may_2026
        };
        this.confirmacionVisible = false;
        this.cargando = false;
      },
      error: (err) => {
        this.alertaService.mostrarError(err.error?.error || 'Error al actualizar proyección');
        this.cargando = false;
      }
    });
  }

  cancelarEdicion() {
    this.confirmacionVisible = false;
    if (this.proyeccionOriginal && this.proyeccion) {
      this.proyeccion = { ...this.proyeccionOriginal };
    }
  }

  confirmarEliminacion() {
    if (!this.proyeccion || !this.puedeEliminar) return;

    this.cargando = true;
    this.proyeccionService.eliminarProyeccion(this.proyeccion.id).subscribe({
      next: () => {
        this.alertaService.mostrarExito('Proyección eliminada correctamente');
        this.proyeccion = null;
        this.confirmacionEliminarVisible = false;
        this.cargando = false;
      },
      error: (err) => {
        this.alertaService.mostrarError(err.error?.error || 'Error al eliminar proyección');
        this.cargando = false;
      }
    });
  }

  cancelarEliminacion() {
    this.confirmacionEliminarVisible = false;
  }

  hayCambios(): boolean {
    if (!this.proyeccion || !this.proyeccionOriginal) return false;
    return JSON.stringify(this.proyeccion) !== JSON.stringify(this.proyeccionOriginal);
  }

  resetearFormulario() {
    this.nuevaProyeccion = {
      id: 0,
      referencia: '',
      clave_factura: '',
      clave_6_digitos: '',
      ean: '',
      clave_odoo: '',
      descripcion: '',
      modelo: '',
      spec: '',
      precio_distribuidor_sin_iva: 0,
      precio_elite_plus_sin_iva: 0,
      precio_elite_sin_iva: 0,
      precio_partner_sin_iva: 0,
      precio_publico_sin_iva: 0,
      q1_sep_2025: 0,
      q2_sep_2025: 0,
      q1_oct_2025: 0,
      q2_oct_2025: 0,
      q1_nov_2025: 0,
      q2_nov_2025: 0,
      q1_dic_2025: 0,
      q2_dic_2025: 0,
      q1_mar_2026: 0,
      q2_mar_2026: 0,
      q1_abr_2026: 0,
      q2_abr_2026: 0,
      q1_may_2026: 0,
      q2_may_2026: 0,
      id_disponibilidad: 5
    };
  }

  getDescripcionDisponibilidad(id: number): string {
    const disp = this.disponibilidades.find(d => d.id === id);
    return disp ? disp.descripcion : 'Disponibilidad no encontrada';
  }
}

