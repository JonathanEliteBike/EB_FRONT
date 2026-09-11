import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import {
  AsignacionesImportacionService,
  AsignacionesResumen,
  AsignacionesProducto,
  ImportacionResultado,
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

  /** Periodos seleccionables (YYYY-YYYY): un año antes y dos después del actual.
   *  El backend exige este formato para poder ubicar cada mes en un año calendario;
   *  antes era texto libre y se llegó a guardar "MY27", que rompía el reparto por mes. */
  readonly periodos: string[] = (() => {
    const y = new Date().getFullYear();
    const out: string[] = [];
    for (let i = -1; i <= 2; i++) out.push(`${y + i}-${y + i + 1}`);
    return out;
  })();

  periodoImport = '';
  archivoImport: File | null = null;
  archivoNombre = '';
  importando = false;
  errorImport = '';
  resultadoImport: ImportacionResultado | null = null;

  productoSeleccionado: AsignacionesProducto | null = null;

  /** A dónde volver: por defecto el detalle del embarque; si se llegó desde el
   *  dashboard (?from=dashboard&tab=...) se vuelve ahí en vez de "hacia adentro". */
  private returnUrl = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AsignacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.importacionId = Number(this.route.snapshot.paramMap.get('id'));
    this.returnUrl = `/importaciones/${this.importacionId}`;
    if (this.route.snapshot.queryParamMap.get('from') === 'dashboard') {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      this.returnUrl = '/importaciones/dashboard' + (tab ? `?tab=${tab}` : '');
    }
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
    this.router.navigateByUrl(this.returnUrl);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoImport = input.files && input.files.length ? input.files[0] : null;
    this.archivoNombre = this.archivoImport ? this.archivoImport.name : '';
    this.errorImport = '';
    this.resultadoImport = null;
  }

  importarExcel(): void {
    if (!this.periodoImport.trim()) {
      this.errorImport = 'Indica el periodo (ej. 2026-2027)';
      return;
    }
    if (!this.archivoImport) {
      this.errorImport = 'Selecciona un archivo .xlsx';
      return;
    }
    this.importando = true;
    this.errorImport = '';
    this.resultadoImport = null;
    this.svc.importarProductos(this.importacionId, this.archivoImport, this.periodoImport.trim()).subscribe({
      next: (res) => {
        this.importando = false;
        this.resultadoImport = res;
        this.archivoImport = null;
        this.archivoNombre = '';
        this.cargar();
      },
      error: (err) => {
        this.importando = false;
        this.errorImport = err?.error?.error?.message || 'No se pudo importar el archivo';
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
