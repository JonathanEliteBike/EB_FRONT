import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HomeBarComponent } from "../../../components/home-bar/home-bar.component"; 
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-flujo',
  standalone: true, 
  imports: [RouterModule, CommonModule, HomeBarComponent],
  templateUrl: './dashboard-flujo.component.html',
  styleUrl: './dashboard-flujo.component.css'
})
export class FlujoDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  
  // Variable para controlar la visibilidad en el HTML
  permisoCompleto: boolean = false;

  ngOnInit(): void {
    // Obtenemos el permiso del token (1 para Joker/Completo, 0 para limitado)
    // Según tu AuthService, getFlujoPermiso() ya decodifica el JWT
    const flujo = this.authService.getFlujoPermiso();
    this.permisoCompleto = (flujo === 1);
  }

  get puedeVerTableroMaestro(): boolean {
    return this.authService.getRol() === 4
      ? this.authService.tienePermisoInterno('flujo_tablero_anual', 'ver')
      : this.permisoCompleto;
  }

  get puedeVerIngresos(): boolean {
    return this.authService.getRol() === 4
      ? this.authService.tienePermisoInterno('ingresos', 'ver')
      : this.permisoCompleto;
  }
}
