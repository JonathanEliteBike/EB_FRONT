import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Banner de "estas viendo una temporada cerrada". Reemplaza el bloque rosa
 * claro copiado en 6 pantallas (estilo alerta-de-error de Bootstrap, no
 * combina con el tema oscuro) por algo consistente con app-temporada-selector.
 */
@Component({
  selector: 'app-aviso-historico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aviso-historico.component.html',
  styleUrl: './aviso-historico.component.css',
})
export class AvisoHistoricoComponent {
  @Input() temporada: string | null = null;
  /** Texto opcional extra, ej. "para KA591" (Carátula Normal, por cliente). */
  @Input() detalle = '';

  @Output() volver = new EventEmitter<void>();
}
