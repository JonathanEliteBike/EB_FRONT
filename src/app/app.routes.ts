import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

import { InicioComponent } from './views/inicio/inicio.component';
import { LoginComponent } from './views/login/login.component';
import { HomeComponent } from './views/home/home.component';
import { MonitorComponent } from './views/internal-views/monitor/monitor.component';
import { UsuariosComponent } from './views/internal-views/usuarios/usuarios.component';
import { EnviarCorreoComponent } from './views/recuperacion/enviar-correo/enviar-correo.component';
import { VerificarCodigoComponent } from './views/recuperacion/verificar-codigo/verificar-codigo.component';
import { RestablecerContrasenaComponent } from './views/recuperacion/restablecer-contrasena/restablecer-contrasena.component';
import { PrevioComponent } from './views/internal-views/previo/previo.component';
import { MultimarcasComponent } from './views/internal-views/multimarcas/multimarcas.component';
import { CaratulasComponent } from './views/internal-views/caratulas/caratulas.component';
import { CaratulaEvacAComponent } from './views/internal-views/caratula-evac-a/caratula-evac-a.component';
import { CaratulaEvacBComponent } from './views/internal-views/caratula-evac-b/caratula-evac-b.component';
import { MetasComponent } from './views/internal-views/metas/metas.component';
import { DistribuidoresComponent } from './views/internal-views/distribuidores/distribuidores.component';
import { DashboardComponent } from './views/usuarios/dashboard/dashboard.component';
import { ProyeccionComponent } from './views/internal-views/proyeccion/proyeccion.component';
import { ProyeccionUsuariosComponent } from './views/usuarios/proyeccion-usuarios/proyeccion-usuarios.component';
import { CrearProyeccionUsuariosComponent } from './views/usuarios/crear-proyeccion-usuarios/crear-proyeccion-usuarios.component';
import { ProyeccionHistorialComponent } from './views/usuarios/proyeccion-historial/proyeccion-historial.component';
import { ProyeccionDetallesComponent } from './views/internal-views/proyeccion-detalles/proyeccion-detalles.component';
import { ProyeccionControlComponent } from './views/internal-views/proyeccion-control/proyeccion-control.component';
import { DistribuidoresMultimarcasComponent } from './views/internal-views/distribuidores-multimarcas/distribuidores-multimarcas.component';
import { InicioCaratulasComponent } from './views/internal-views/inicio-caratulas/inicio-caratulas.component';
import { CaratulaGlobalComponent } from './views/internal-views/caratula-global/caratula-global.component';
import { CaratulaUsuariosComponent } from './views/usuarios/caratula-usuarios/caratula-usuarios.component';
import { CaratulaEvacsComponent } from './views/internal-views/caratula-evacs/caratula-evacs.component';
import { IntegralesComponent } from './views/internal-views/integrales/integrales.component';
import { HistorialCaratulasComponent } from './views/internal-views/historial-caratulas/historial-caratulas.component';

import { FlujoDashboardComponent } from './views/internal-views/dashboard-flujo/dashboard-flujo.component';
import { OrdenesCompraComponent } from './views/internal-views/ordenes-compra/ordenes-compra.component';
import { LogisticaComponent } from './views/internal-views/logistica/logistica.component';
import { GastosOperativosComponent } from './views/internal-views/gastos-operativos/gastos-operativos.component';
import { IngresosComponent } from './views/internal-views/ingresos/ingresos.component';
import { TableroComponent } from './views/internal-views/tablero/tablero.component';
import { TableroAnualComponent } from './views/internal-views/tablero-anual/tablero-anual.component';
import { AuditoriaComponent } from './views/internal-views/auditoria/auditoria.component';
import { MonitorPedidosComponent } from './views/internal-views/monitor-pedidos/monitor-pedidos.component';

import { DashboardRetroactivosComponent } from './views/internal-views/dashboard-retroactivos/dashboard-retroactivos.component';
import { CaratulaRetroactivosComponent } from './views/internal-views/caratula-retroactivos/caratula-retroactivos.component';
import { VentasMonitorComponent } from './views/internal-views/ventas-monitor/ventas-monitor.component';
import { CatalogoForecastComponent } from './views/internal-views/catalogo-forecast/catalogo-forecast.component';
import { GarantiasHubComponent } from './views/internal-views/garantias/garantias-hub/garantias-hub.component';
import { GarantiasComponent } from './views/internal-views/garantias/garantias.component';
import { GarantiasFormularioComponent } from './views/internal-views/garantias/garantias-formulario/garantias-formulario.component';
import { GarantiasEditorComponent } from './views/internal-views/garantias/garantias-editor/garantias-editor.component';
import { GarantiasTicketsComponent } from './views/internal-views/garantias/garantias-tickets/garantias-tickets.component';
import { ProyeccionesMY27Component } from './views/internal-views/proyecciones-my27/proyecciones-my27.component';
import { ImportacionesComponent } from './views/internal-views/importaciones/importaciones.component';
import { ImportacionesDetalleComponent } from './views/internal-views/importaciones/importaciones-detalle/importaciones-detalle.component';
import { ImportacionesDashboardComponent } from './views/internal-views/importaciones/importaciones-dashboard/importaciones-dashboard.component';
import { ImportacionesTiemposEstimadosComponent } from './views/internal-views/importaciones/importaciones-tiempos-estimados/importaciones-tiempos-estimados.component';

import { CaratulaRetroactivosUsuarioComponent } from './views/usuarios/caratula-retroactivos-usuarios/caratula-retroactivos-usuarios.component';
import { GarantiasUsuarioComponent } from './views/usuarios/garantias-usuario/garantias-usuario.component';

import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { usuarioGuard } from './guards/usuario.guard';
import { flujoGuard } from './guards/flujo.guard';
import { loggedInGuard } from './guards/logged-in.guard';
import { importacionesGuard } from './guards/importaciones.guard';

import { CalculadoraRetroactivosComponent } from './views/internal-views/calculadora-retroactivos/calculadora-retroactivos.component';
import { SolicitudRetroactivoComponent } from './views/usuarios/solicitud-retroactivo/solicitud-retroactivo.component';
import { SolicitudRetroactivoLandingComponent } from './views/usuarios/solicitud-retroactivo-landing/solicitud-retroactivo-landing.component';
import { SolicitudRetroactivoDashboardComponent } from './views/internal-views/solicitud-retroactivo-dashboard/solicitud-retroactivo-dashboard.component';
import { SolicitudRetroactivoGestorComponent } from './views/internal-views/solicitud-retroactivo-gestor/solicitud-retroactivo-gestor.component';
import { SolicitudRetroactivoSeguimientoComponent } from './views/usuarios/solicitud-retroactivo-seguimiento/solicitud-retroactivo-seguimiento.component';
import { SolicitudRetroactivoCampaniasComponent } from './views/internal-views/solicitud-retroactivo-campanias/solicitud-retroactivo-campanias.component';

// --- NUEVOS COMPONENTES DE GESTIÓN Y PERMISOS ---
import { GestionClientesComponent } from './views/internal-views/gestion-clientes/gestion-clientes.component';
import { CatalogoGeneralComponent } from './views/internal-views/catalogo-general/catalogo-general.component';
import { CreacionUsuariosComponent } from './views/usuarios/creacion-usuarios/creacion-usuarios.component';
import { CatalogoPermisosComponent } from './views/usuarios/catalogo-permisos/catalogo-permisos.component';

/** Sincroniza permisos y el modelo nuevo de módulos/capacidades desde BD. */
export const refrescarPermisosGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return forkJoin([
    authService.obtenerPermisosEnVivo(),
    authService.obtenerAccesosEnVivo(),
    authService.obtenerPoliticaMontosEnVivo()
  ]).pipe(map(() => true));
};

/** Un submódulo sólo es utilizable cuando también está habilitada su área. */
export const requiereModulosGuard = (...identificadores: string[]): CanActivateFn => () => {
  const authService = inject(AuthService);
  if (identificadores.every(identificador => authService.tieneModulo(identificador))) {
    return true;
  }
  return inject(Router).parseUrl('/usuarios/dashboard');
};

export const routes: Routes = [
  { path: '', component: InicioComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent, canActivate: [authGuard] },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'monitor', component: MonitorComponent, canActivate: [authGuard] },
  { path: 'previo', component: PrevioComponent, canActivate: [authGuard] },
  { path: 'multimarcas', component: MultimarcasComponent, canActivate: [authGuard] },
  { path: 'metas', component: MetasComponent, canActivate: [authGuard] },
  { path: 'integrales', component: IntegralesComponent, canActivate: [authGuard] },
  { path: 'distribuidores', component: DistribuidoresComponent, canActivate: [authGuard] },
  { path: 'distribuidores-multimarcas', component: DistribuidoresMultimarcasComponent, canActivate: [authGuard] },
  { path: 'caratulas', component: CaratulasComponent, canActivate: [authGuard] },
  { path: 'historial-caratulas', component: HistorialCaratulasComponent, canActivate: [authGuard] },
  { path: 'inicio-caratulas', component: InicioCaratulasComponent, canActivate: [authGuard] },
  { path: 'caratula-evac-a', component: CaratulaEvacAComponent, canActivate: [authGuard] },
  { path: 'caratula-evac-b', component: CaratulaEvacBComponent, canActivate: [authGuard] },
  { path: 'caratula-global', component: CaratulaGlobalComponent, canActivate: [authGuard] },
  { path: 'caratula-evacs', component: CaratulaEvacsComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [authGuard] },
  { path: 'proyeccion', component: ProyeccionComponent, canActivate: [authGuard] },
  { path: 'proyeccion/detalles/:id', component: ProyeccionDetallesComponent, canActivate: [authGuard] },
  { path: 'proyeccion/control', component: ProyeccionControlComponent, canActivate: [authGuard] },
  { path: 'recuperacion/enviar-correo', component: EnviarCorreoComponent },
  { path: 'recuperacion/verificar-codigo', component: VerificarCodigoComponent },
  { path: 'recuperacion/restablecer-contrasena', component: RestablecerContrasenaComponent },

  // --- GESTIÓN Y PERMISOS ---
  { path: 'gestion-clientes', component: GestionClientesComponent, canActivate: [authGuard, refrescarPermisosGuard] },
  { path: 'catalogo-general', component: CatalogoGeneralComponent, canActivate: [authGuard, refrescarPermisosGuard] },
  { path: 'usuarios/creacion-usuarios', component: CreacionUsuariosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/catalogo-permisos', component: CatalogoPermisosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },

  // --- RUTAS PROTEGIDAS DE USUARIO / CLIENTE ---
  { path: 'usuarios/dashboard', component: DashboardComponent, canActivate: [usuarioGuard,refrescarPermisosGuard] },
  { path: 'usuarios/proyeccion-compras', component: ProyeccionUsuariosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/crear-proyeccion', component: CrearProyeccionUsuariosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/proyeccion-historial', component: ProyeccionHistorialComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/caratula-retroactivos', component: CaratulaRetroactivosUsuarioComponent, canActivate: [usuarioGuard, refrescarPermisosGuard, requiereModulosGuard('usuarios_retroactivos')] },
  { path: 'usuarios/caratula', component: CaratulaUsuariosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/garantias', component: GarantiasUsuarioComponent, canActivate: [usuarioGuard, refrescarPermisosGuard] },
  { path: 'usuarios/solicitud-retroactivo', component: SolicitudRetroactivoLandingComponent, canActivate: [usuarioGuard, refrescarPermisosGuard, requiereModulosGuard('usuarios_retroactivos', 'usuarios_solicitudes_retroactivos')] },
  { path: 'usuarios/solicitud-retroactivo/formulario', component: SolicitudRetroactivoComponent, canActivate: [usuarioGuard, refrescarPermisosGuard, requiereModulosGuard('usuarios_retroactivos', 'usuarios_solicitudes_retroactivos')] },
  { path: 'usuarios/solicitud-retroactivo/seguimiento', component: SolicitudRetroactivoSeguimientoComponent, canActivate: [usuarioGuard, refrescarPermisosGuard, requiereModulosGuard('usuarios_retroactivos', 'usuarios_solicitudes_retroactivos')] },
  { path: 'usuarios/calculadora-retroactivos', component: CalculadoraRetroactivosComponent, canActivate: [usuarioGuard, refrescarPermisosGuard, requiereModulosGuard('usuarios_retroactivos', 'usuarios_calculadora_retroactivos')] },

  // --- RUTAS INTERNAS ADMINISTRATIVAS ---
  { path: 'usuarios/solicitud-retroactivo/gestor', component: SolicitudRetroactivoGestorComponent, canActivate: [adminGuard] },
  { path: 'usuarios/solicitud-retroactivo/dashboard', component: SolicitudRetroactivoDashboardComponent, canActivate: [adminGuard] },
  { path: 'solicitud-retroactivo-campanias', component: SolicitudRetroactivoCampaniasComponent, canActivate: [adminGuard] },
  { path: 'flujo-dashboard', component: FlujoDashboardComponent, canActivate: [adminGuard] },
  { path: 'ordenes-compra', component: OrdenesCompraComponent, canActivate: [adminGuard] },
  { path: 'logistica', component: LogisticaComponent, canActivate: [adminGuard] },
  { path: 'gastos-operativos', component: GastosOperativosComponent, canActivate: [adminGuard] },
  { path: 'ingresos', component: IngresosComponent, canActivate: [adminGuard] },
  { path: 'flujo-tablero', component: TableroComponent, canActivate: [adminGuard] },
  { path: 'flujo-tablero-anual', component: TableroAnualComponent, canActivate: [adminGuard] },
  { path: 'flujo-auditoria', component: AuditoriaComponent, canActivate: [adminGuard] },
  { path: 'flujo-tablero-anual', component: TableroAnualComponent, canActivate: [adminGuard, flujoGuard] },
  { path: 'monitor-pedidos', component: MonitorPedidosComponent, canActivate: [adminGuard] },
  { path: 'dashboard-retroactivos', component: DashboardRetroactivosComponent, canActivate: [adminGuard] },
  { path: 'caratula-retroactivos', component: CaratulaRetroactivosComponent, canActivate: [adminGuard] },
  { path: 'calculadora-retroactivos', component: CalculadoraRetroactivosComponent, canActivate: [adminGuard] },
  { path: 'ventas-monitor', component: VentasMonitorComponent, canActivate: [adminGuard] },
  { path: 'catalogo-forecast', component: CatalogoForecastComponent, canActivate: [adminGuard] },
  { path: 'garantias', component: GarantiasHubComponent, canActivate: [adminGuard] },
  { path: 'garantias/dashboard', component: GarantiasComponent, canActivate: [adminGuard] },
  { path: 'garantias/tickets', component: GarantiasTicketsComponent, canActivate: [adminGuard] },
  { path: 'garantias/formulario', component: GarantiasFormularioComponent, canActivate: [loggedInGuard] },
  { path: 'garantias/editor', component: GarantiasEditorComponent, canActivate: [adminGuard] },
  { path: 'proyecciones-my27', component: ProyeccionesMY27Component, canActivate: [adminGuard] },
  { path: 'importaciones', component: ImportacionesComponent, canActivate: [importacionesGuard] },
  { path: 'importaciones/dashboard', component: ImportacionesDashboardComponent, canActivate: [importacionesGuard] },
  { path: 'importaciones/tiempos-estimados', component: ImportacionesTiemposEstimadosComponent, canActivate: [adminGuard] },
  { path: 'importaciones/:id', component: ImportacionesDetalleComponent, canActivate: [importacionesGuard] },
  { path: '**', redirectTo: '' }
];
