import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';

// GUÍA: esta vista vive en la misma ruta ('usuarios/solicitud-retroactivo')
// para admin (rol 1) y usuarios del portal (roles 2 y 3), con contenido distinto:
// - admin: 3 cards (Gestor / Dashboard / Formulario)
// - cliente: 2 cards estilo garantias-usuario (Seguimiento / Registrar venta)
@Component({
  selector: 'app-solicitud-retroactivo-landing',
  imports: [CommonModule, RouterModule, TopBarUsuariosComponent],
  templateUrl: './solicitud-retroactivo-landing.component.html',
  styleUrl: './solicitud-retroactivo-landing.component.css'
})
export class SolicitudRetroactivoLandingComponent implements OnInit {
  esAdmin = false;
  esCliente = false;

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/dashboard-retroactivos']);
  }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded: any = jwtDecode(token);
      this.esAdmin = decoded.rol === 1;
      this.esCliente = decoded.rol === 2 || decoded.rol === 3;
    } catch {
      // Token inválido: el guard de la ruta ya se encarga de sacarlo al login.
    }
  }
}
