import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';
import { AlertaService } from './services/alerta.service';
import { AuthService } from './services/auth.service';
import { AlertaComponent } from './components/alerta/alerta.component';
import { MonitorOdooService } from './services/monitor-odoo.service';
import { PrevioService } from './services/previo.service';
import { CaratulasService } from './services/caratulas.service';
import { UpdateService } from './services/update.service';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AlertaComponent, ConfirmDialogComponent],
  template: `
    <!-- Banner de nueva versión disponible -->
    <div *ngIf="hayActualizacion" class="update-banner">
      <div class="update-banner__stripe"></div>
      <svg class="update-banner__icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2.5A7.5 7.5 0 1 0 17.5 10" stroke="#EB5E28" stroke-width="1.75" stroke-linecap="round"/>
        <path d="M14 2l3.5 3.5L14 9" stroke="#EB5E28" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="update-banner__text">Nueva versión disponible — recarga para aplicar los cambios.</span>
      <button class="update-banner__btn" (click)="actualizarAhora()">Actualizar ahora</button>
      <button class="update-banner__close" (click)="hayActualizacion = false" aria-label="Cerrar">✕</button>
    </div>
    <div [class.montos-ocultos]="debeOcultarMontosEnCaratulas">
      <router-outlet></router-outlet>
    </div>
    <app-alerta *ngIf="mensajeVisible" [mensaje]="mensaje" [tipo]="tipo"></app-alerta>
    <app-confirm-dialog></app-confirm-dialog>
  `,
  styles: [`
    .update-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #252320;
      color: #FFFCF2;
      padding: 0 20px 0 0;
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Segoe UI', 'Roboto', sans-serif;
      font-size: 13.5px;
      font-weight: 400;
      letter-spacing: 0.01em;
      border-bottom: 1px solid rgba(235, 94, 40, 0.35);
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(235, 94, 40, 0.15);
      min-height: 42px;
    }
    .update-banner__stripe {
      width: 4px;
      min-height: 42px;
      background: #EB5E28;
      flex-shrink: 0;
      align-self: stretch;
    }
    .update-banner__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.95;
    }
    .update-banner__text {
      flex: 1;
      color: rgba(255, 252, 242, 0.85);
    }
    .update-banner__btn {
      background: #EB5E28;
      color: #1e1d1b;
      border: none;
      border-radius: 5px;
      padding: 5px 15px;
      font-weight: 700;
      font-size: 12.5px;
      letter-spacing: 0.03em;
      cursor: pointer;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .update-banner__btn:hover {
      background: #ff6d35;
    }
    .update-banner__close {
      background: transparent;
      border: none;
      color: rgba(255, 252, 242, 0.4);
      padding: 4px 6px;
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
      flex-shrink: 0;
      transition: color 0.15s;
    }
    .update-banner__close:hover {
      color: rgba(255, 252, 242, 0.8);
    }
  `],
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private authSubscription?: Subscription;
  private renewalSub?: Subscription;
  mensaje = '';
  tipo: 'exito' | 'error' = 'exito';
  mensajeVisible = false;
  hayActualizacion = false;

  constructor(
    public authService: AuthService,
    private alerta: AlertaService,
    private router: Router,
    private monitorService: MonitorOdooService,
    private previoService: PrevioService,
    private caratulasService: CaratulasService,
    private updateService: UpdateService
  ) {
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }

    this.alerta.alerta$.subscribe(data => {
      this.mensaje = data.mensaje;
      this.tipo = data.tipo;
      this.mensajeVisible = true;
      setTimeout(() => this.mensajeVisible = false, 3000);
    });

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
    // Iniciar detector de actualizaciones del sistema
    this.updateService.iniciar();
    this.updateService.hayActualizacion$.subscribe(hay => {
      this.hayActualizacion = hay;
    });

    if (this.authService.isLoggedIn()) {
      this.iniciarPrecargaDatos();
      this._iniciarRenovacionProactiva();
    }

    this.authSubscription = this.authService.authState$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.iniciarPrecargaDatos();
        this._iniciarRenovacionProactiva();
      } else {
        this.renewalSub?.unsubscribe();
      }
    });
  }

  actualizarAhora(): void {
    this.updateService.recargar();
  }

  get debeOcultarMontosEnCaratulas(): boolean {
    const ruta = this.router.url.split('?')[0].replace(/\/+$/, '');
    const moduloPorRuta: Record<string, string> = {
      '/caratulas': 'caratulas',
      '/caratula-evacs': 'caratula_evacs',
      '/caratula-evac-a': 'caratula_evac_a',
      '/caratula-evac-b': 'caratula_evac_b',
      '/monitor': 'monitor',
    };
    const modulo = moduloPorRuta[ruta];
    return this.authService.getRol() === 4 &&
      !!modulo && this.authService.debeOcultarMontos(modulo);
  }

  private iniciarPrecargaDatos() {
    // La autorización interna resuelve los endpoints compartidos con la ruta
    // activa. Estas precargas se ejecutan fuera de una pantalla concreta, por
    // lo que para rol 4 se cargan desde cada componente al navegar a él.
    if (this.authService.getRol() === 4) return;
    this.monitorService.precargarDatos();
    this.previoService.precargarDatos();
    this.caratulasService.precargarDatos();
  }

  // Revisa cada 15 minutos: si quedan menos de 60 min, renueva silenciosamente
  private _iniciarRenovacionProactiva(): void {
    this.renewalSub?.unsubscribe();
    this.renewalSub = interval(15 * 60 * 1000).subscribe(() => {
      if (!this.authService.isLoggedIn()) return;
      const segsRestantes = this.authService.getTokenExpirySeconds();
      if (segsRestantes > 0 && segsRestantes < 60 * 60) {
        this.authService.renovarToken().subscribe({
          next: res => this.authService.setToken(res.token),
          error: () => {}
        });
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.renewalSub?.unsubscribe();
  }
}
