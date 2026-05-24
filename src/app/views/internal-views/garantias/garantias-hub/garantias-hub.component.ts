import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { GarantiasService, GarantiasStats } from '../../../../services/garantias.service';

@Component({
  selector: 'app-garantias-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent],
  templateUrl: './garantias-hub.component.html',
  styleUrl: './garantias-hub.component.css',
})
export class GarantiasHubComponent implements OnInit {
  stats: GarantiasStats | null = null;
  cargando = true;

  readonly modulos = [
    {
      titulo: 'Seguimiento de Tickets',
      descripcion: 'Gestiona cada solicitud de garantía: cambia estatus, agrega comentarios y mantén un historial completo de cada caso.',
      icono: 'fa-ticket-alt',
      ruta: '/garantias/tickets',
      accentClass: 'accent-orange',
      cta: 'Abrir módulo',
      badge: null as number | null,
    },
    {
      titulo: 'Dashboard de Análisis',
      descripcion: 'Visualiza estadísticas, tendencias y KPIs del proceso de garantías con gráficas interactivas en tiempo real.',
      icono: 'fa-chart-pie',
      ruta: '/garantias/dashboard',
      accentClass: 'accent-blue',
      cta: 'Ver dashboard',
      badge: null as number | null,
    },
    {
      titulo: 'Editor de Formulario',
      descripcion: 'Configura la estructura del formulario de garantías: secciones, campos y opciones sin necesidad de código.',
      icono: 'fa-sliders-h',
      ruta: '/garantias/editor',
      accentClass: 'accent-purple',
      cta: 'Configurar',
      badge: null as number | null,
    },
    {
      titulo: 'Nueva Solicitud',
      descripcion: 'Abre el formulario para registrar una nueva solicitud de garantía de producto para un distribuidor.',
      icono: 'fa-plus-circle',
      ruta: '/garantias/formulario',
      accentClass: 'accent-green',
      cta: 'Crear solicitud',
      badge: null as number | null,
    },
  ];

  constructor(private svc: GarantiasService) {}

  ngOnInit(): void {
    this.svc.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.cargando = false;
        this.modulos[0].badge = s.abiertos || null;
      },
      error: () => { this.cargando = false; },
    });
  }
}
