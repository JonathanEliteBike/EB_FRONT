import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import {
  AsignacionesImportacionService,
  AsignacionesResumen,
  AsignacionesProducto,
} from '../../../../services/asignaciones-importacion.service';
import { AsignacionesDetalleProductoComponent } from './asignaciones-detalle-producto/asignaciones-detalle-producto.component';

@Component({
  selector: 'app-asignaciones-importacion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeBarComponent, AsignacionesDetalleProductoComponent],
  templateUrl: './asignaciones-importacion.component.html',
  styleUrl: './asignaciones-importacion.component.css',
})
export class AsignacionesImportacionComponent implements OnInit {
  importacionId!: number;
  resumen: AsignacionesResumen | null = null;
  cargando = true;
  error = '';

  mostrarFormNuevo = false;
  guardandoProducto = false;
  errorProducto = '';
  nuevoProducto = { sku: '', cantidad_embarcada: null as number | null, periodo: '', descripcion: '' };

  productoSeleccionado: AsignacionesProducto | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AsignacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.importacionId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.svc.resumen(this.importacionId).subscribe({
      next: (data) => { this.resumen = data; this.cargando = false; },
      error: (err) => {
        this.error = err?.error?.error?.message || 'No se pudo cargar el embarque';
        this.cargando = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/importaciones', this.importacionId]);
  }

  toggleFormNuevo(): void {
    this.mostrarFormNuevo = !this.mostrarFormNuevo;
    this.errorProducto = '';
  }

  agregarProducto(): void {
    if (!this.nuevoProducto.sku.trim() || !this.nuevoProducto.periodo.trim() ||
        this.nuevoProducto.cantidad_embarcada === null || this.nuevoProducto.cantidad_embarcada < 0) {
      this.errorProducto = 'SKU, periodo y cantidad embarcada (>= 0) son obligatorios';
      return;
    }
    this.guardandoProducto = true;
    this.errorProducto = '';
    this.svc.crearProducto(this.importacionId, {
      sku: this.nuevoProducto.sku.trim(),
      cantidad_embarcada: this.nuevoProducto.cantidad_embarcada,
      periodo: this.nuevoProducto.periodo.trim(),
      descripcion: this.nuevoProducto.descripcion.trim() || undefined,
    }).subscribe({
      next: () => {
        this.guardandoProducto = false;
        this.nuevoProducto = { sku: '', cantidad_embarcada: null, periodo: '', descripcion: '' };
        this.mostrarFormNuevo = false;
        this.cargar();
      },
      error: (err) => {
        this.guardandoProducto = false;
        this.errorProducto = err?.error?.error?.message || 'No se pudo registrar el producto';
      },
    });
  }

  abrirDetalle(producto: AsignacionesProducto): void {
    this.productoSeleccionado = producto;
  }

  cerrarDetalle(): void {
    this.productoSeleccionado = null;
  }

  onCambioEnDetalle(): void {
    this.cargar();
  }
}
