import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopBarUsuariosComponent } from '../../../components/top-bar-usuarios/top-bar-usuarios.component';
import { ProyeccionesTabComponent } from '../../../components/proyecciones-tab/proyecciones-tab.component';
import { ClientesService } from '../../../services/clientes.service';
import { AccesoRestringidoComponent } from '../../../components/acceso-restringido/acceso-restringido.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-proyeccion-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, TopBarUsuariosComponent, AccesoRestringidoComponent, ProyeccionesTabComponent],
  templateUrl: './proyeccion-usuarios.component.html',
  styleUrls: ['./proyeccion-usuarios.component.css']
})
export class ProyeccionUsuariosComponent implements OnInit {
  private clientesService = inject(ClientesService);

  modulo = "Proyección de compras";
  moduloIdentificador = "usuarios_proyeccion_compras";

  clienteClave: string | null = null;
  idCliente: number | null = null;
  cargando = true;
  error: string | null = null;

  constructor(
    public authService: AuthService,
  ){}

  // Evaluador dinámico (reemplaza a ngOnInit y a la variable tieneAcceso)
  get tieneAcceso(): boolean {
    return this.authService.tieneModulo(this.moduloIdentificador);
  }

  ngOnInit(): void {
    if (this.tieneAcceso) {
      this.clientesService.getInfoClienteActual().subscribe({
        next: (info) => {
          this.clienteClave = info.clave ?? null;
          this.idCliente   = info.id   ?? null;
          this.cargando    = false;
        },
        error: () => {
          this.error    = 'No se pudo cargar la información del cliente.';
          this.cargando = false;
        }
      });
    }
  }
}
