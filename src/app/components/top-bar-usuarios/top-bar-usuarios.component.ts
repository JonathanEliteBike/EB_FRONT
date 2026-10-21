import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-top-bar-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './top-bar-usuarios.component.html',
  styleUrl: './top-bar-usuarios.component.css'
})
export class TopBarUsuariosComponent implements OnInit {
  nombreUsuario: string = '';
  rutaInicio = '/usuarios/dashboard';

  constructor(private router: Router) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.nombreUsuario = payload.nombre;
        // El rol interno no usa el panel histórico de usuarios como inicio.
        // Mantener la ruta histórica para los roles 1, 2 y 3 evita alterar
        // su navegación existente.
        if (payload.rol === 4) this.rutaInicio = '/home';
      } catch (e) {
        console.error('Error al decodificar el token', e);
      }
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
