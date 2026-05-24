import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AlertaService } from './services/alerta.service';
import { AuthService } from './services/auth.service';
import { AlertaComponent } from './components/alerta/alerta.component';
// Importamos los servicios de datos
import { MonitorOdooService } from './services/monitor-odoo.service'; // Asumiendo nombre del archivo
import { PrevioService } from './services/previo.service';
import { CaratulasService } from './services/caratulas.service';
import { Subscription } from 'rxjs';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AlertaComponent, ConfirmDialogComponent],
  template: `
    <router-outlet></router-outlet>
    <app-alerta *ngIf="mensajeVisible" [mensaje]="mensaje" [tipo]="tipo"></app-alerta>
    <app-confirm-dialog></app-confirm-dialog>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private authSubscription?: Subscription;
  mensaje = '';
  tipo: 'exito' | 'error' = 'exito';
  mensajeVisible = false;

  constructor(
    public authService: AuthService,
    private alerta: AlertaService,
    private router: Router,
    // Inyectamos los servicios para iniciar la precarga
    private monitorService: MonitorOdooService,
    private previoService: PrevioService,
    private caratulasService: CaratulasService
  ) {
    // Evita que el browser restaure su propio scroll (conflicto con el nuestro)
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }

    this.alerta.alerta$.subscribe(data => {
      this.mensaje = data.mensaje;
      this.tipo = data.tipo;
      this.mensajeVisible = true;
      setTimeout(() => this.mensajeVisible = false, 3000);
    });

    // Ocultar navbar al entrar a cualquier módulo — mide altura real del navbar
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          const navbar = document.querySelector('app-home-bar') as HTMLElement | null;
          const offset = navbar ? navbar.offsetHeight + 2 : 64;
          window.scrollTo({ top: offset, behavior: 'instant' });
        }, 100);
      });
  }

  ngOnInit() {
    // 1. Si ya estamos logueados al iniciar (F5), precargar.
    if (this.authService.isLoggedIn()) {
      this.iniciarPrecargaDatos();
    }

    // 2. Si nos logueamos en este momento, precargar.
    this.authSubscription = this.authService.authState$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.iniciarPrecargaDatos();
      }
    });
  }

  private iniciarPrecargaDatos() {
    this.monitorService.precargarDatos();
    this.previoService.precargarDatos();
    this.caratulasService.precargarDatos();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }
}