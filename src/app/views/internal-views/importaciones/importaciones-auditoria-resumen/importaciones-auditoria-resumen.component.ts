import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { ImportacionesService, AuditoriaResumenEmbarque } from '../../../../services/importaciones.service';

type OrdenCampo = 'atrasados' | 'adelantados' | 'referencia';

@Component({
  selector: 'app-importaciones-auditoria-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent],
  templateUrl: './importaciones-auditoria-resumen.component.html',
  styleUrl: './importaciones-auditoria-resumen.component.css',
})
export class ImportacionesAuditoriaResumenComponent implements OnInit {
  embarques: AuditoriaResumenEmbarque[] = [];
  cargando = true;
  error = '';
  orden: OrdenCampo = 'atrasados';

  constructor(private svc: ImportacionesService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.svc.obtenerAuditoriaResumen().subscribe({
      next: (res) => { this.embarques = res; this.cargando = false; },
      error: () => { this.error = 'No se pudo cargar el resumen de auditoría.'; this.cargando = false; },
    });
  }

  ordenarPor(campo: OrdenCampo): void {
    this.orden = campo;
  }

  embarquesOrdenados(): AuditoriaResumenEmbarque[] {
    const campo = this.orden;
    if (campo === 'referencia') {
      return [...this.embarques].sort((a, b) => a.referencia.localeCompare(b.referencia));
    }
    return [...this.embarques].sort((a, b) => b[campo] - a[campo]);
  }

  totalHitos(e: AuditoriaResumenEmbarque): number {
    return e.atrasados + e.adelantados + e.a_tiempo + e.pendientes + e.en_espera;
  }
}
