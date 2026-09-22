import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// El navegador recuerda el scroll de cada entrada del historial y lo
// restaura solo al recargar (F5) o entrar por atrás/adelante -- eso pasa
// ANTES de que Angular arranque, así que scrollPositionRestoration del
// router (ver app.config.ts) no lo puede evitar. 'manual' apaga esa
// restauración nativa para que un refresh siempre caiga arriba, como
// cualquier carga nueva.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

  