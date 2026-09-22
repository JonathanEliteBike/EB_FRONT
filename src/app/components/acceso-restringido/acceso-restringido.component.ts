import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-acceso-restringido',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './acceso-restringido.component.html',
  styleUrl: './acceso-restringido.component.css'
})
export class AccesoRestringidoComponent {
  /** Nombre del módulo actual para personalizar el mensaje */
  @Input() modulo: string = 'este módulo';
  /** Ruta a la que dirigirá el botón de retorno */
  @Input() rutaInicio: string = '/usuarios/inicio';
}