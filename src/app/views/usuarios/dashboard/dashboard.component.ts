import { Component, inject } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { TopBarUsuariosComponent } from "../../../components/top-bar-usuarios/top-bar-usuarios.component";
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TopBarUsuariosComponent, CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public readonly authService = inject(AuthService);

  get mostrarEstadoSinAccesos(): boolean {
    return this.authService.getRol() === 3 && !this.authService.tieneModulosEfectivos();
  }

  get tieneRetroactivos(): boolean {
    return this.authService.tieneModulo('usuarios_retroactivos');
  }

  get rutaRetroactivos(): string {
    return '/usuarios/caratula-retroactivos';
  }

  get enlaceRetroactivos(): string {
    return 'Ver carátula';
  }
}
