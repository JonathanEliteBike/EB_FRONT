import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { FacturasClienteComponent } from '../../../components/facturas-cliente/facturas-cliente.component';
import { UsuariosService } from '../../../services/usuarios.service';
import { ClientesService } from '../../../services/clientes.service';

interface UsuarioMonitor {
  id: number | null;
  id_cliente: number | null;
  nombre: string;
  usuario: string | null;
  rol: string;
  activo: boolean;
  clave: string | null;
  id_grupo: number | null;
  nombre_grupo: string | null;
  tiene_proyeccion: boolean;
}

interface GrupoIntegral {
  id: number;
  nombre_grupo: string;
}

@Component({
  selector: 'app-monitor-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, FacturasClienteComponent],
  templateUrl: './monitor-pedidos.component.html',
  styleUrls: ['./monitor-pedidos.component.css']
})
export class MonitorPedidosComponent implements OnInit {
  private usuariosService  = inject(UsuariosService);
  private clientesService  = inject(ClientesService);
  private _prefetchTimer: any = null;

  // ── Modo de búsqueda ─────────────────────────────────────────────────────
  modo: 'usuario' | 'integral' = 'usuario';

  // ── Datos ─────────────────────────────────────────────────────────────────
  usuarios: UsuarioMonitor[] = [];
  grupos: GrupoIntegral[] = [];
  cargando = true;
  error: string | null = null;

  // ── Búsqueda / filtro ─────────────────────────────────────────────────────
  textoBusqueda = '';
  ocultarAdmins = true;
  soloConProyecciones = false;
  private sinAcentos = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  get usuariosFiltrados(): UsuarioMonitor[] {
    let base = this.ocultarAdmins
      ? this.usuarios.filter(u => u.rol !== 'Administrador')
      : this.usuarios;
    if (this.soloConProyecciones) {
      base = base.filter(u => u.tiene_proyeccion);
    }
    const q = this.sinAcentos(this.textoBusqueda.trim().toLowerCase());
    if (!q) return base;
    return base.filter(u =>
      this.sinAcentos(u.nombre.toLowerCase()).includes(q) ||
      this.sinAcentos((u.usuario ?? '').toLowerCase()).includes(q) ||
      this.sinAcentos((u.clave ?? '').toLowerCase()).includes(q) ||
      this.sinAcentos((u.nombre_grupo ?? '').toLowerCase()).includes(q)
    );
  }

  // ── Sync Odoo ─────────────────────────────────────────────────────────────
  sincronizando = false;
  syncMensaje: string | null = null;

  syncOdoo(): void {
    this.sincronizando = true;
    this.syncMensaje = null;
    this.usuariosService.syncClientesOdoo().subscribe({
      next: (res) => {
        this.sincronizando = false;
        this.syncMensaje = res.agregados > 0
          ? `${res.agregados} cliente(s) nuevos agregados desde Odoo.`
          : `Sin cambios — todos los clientes ya estaban registrados (${res.ya_existian}).`;
        if (res.agregados > 0) this.cargarDatos();
      },
      error: () => {
        this.sincronizando = false;
        this.syncMensaje = 'Error al sincronizar con Odoo.';
      }
    });
  }

  // ── Modal FacturasCliente ─────────────────────────────────────────────────
  modalAbierto = false;
  modalClave: string | null = null;
  modalIdCliente: number | null = null;
  modalGrupoOdoo: number | null = null;
  modalEtiqueta = '';
  modalClaveExacta = false;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = null;
    let usuariosCargados = false;
    let gruposCargados = false;
    const verificarListo = () => {
      if (usuariosCargados && gruposCargados) this.cargando = false;
    };

    this.usuariosService.getUsuariosParaMonitor().subscribe({
      next: (data) => { this.usuarios = data; usuariosCargados = true; verificarListo(); },
      error: () => { this.error = 'Error al cargar usuarios'; this.cargando = false; }
    });

    this.usuariosService.getGruposIntegrales().subscribe({
      next: (data) => { this.grupos = data; gruposCargados = true; verificarListo(); },
      error: () => { this.error = 'Error al cargar grupos'; this.cargando = false; }
    });
  }

  cambiarModo(m: 'usuario' | 'integral'): void {
    this.modo = m;
    this.textoBusqueda = '';
  }

  verPedidosUsuario(u: UsuarioMonitor): void {
    this.modalClave = null;
    this.modalGrupoOdoo = null;
    this.modalClaveExacta = false;
    this.modalIdCliente = u.id_cliente ?? null;

    if (u.clave) {
      this.modalClave = u.clave;
      this.modalClaveExacta = true;
      this.modalEtiqueta = `${u.nombre} (${u.clave})`;
    } else {
      this.modalClave = '__sin_clave__';
      this.modalClaveExacta = true;
      this.modalEtiqueta = u.nombre;
    }
    this.modalAbierto = true;
  }

  verPedidosGrupo(g: GrupoIntegral): void {
    this.modalClave = null;
    this.modalGrupoOdoo = g.id;
    this.modalClaveExacta = false;
    this.modalEtiqueta = g.nombre_grupo;
    this.modalAbierto = true;
  }

  /** Inicia prefetch al hover — 150 ms de debounce para no disparar en movimientos rápidos */
  prefetchUsuario(u: UsuarioMonitor): void {
    clearTimeout(this._prefetchTimer);
    if (!u.clave) return;
    this._prefetchTimer = setTimeout(() => {
      this.clientesService
        .getDetalleComprasCliente(undefined, undefined, undefined, u.clave!, true)
        .subscribe({ next: () => {}, error: () => {} });
    }, 150);
  }

  prefetchGrupo(g: GrupoIntegral): void {
    clearTimeout(this._prefetchTimer);
    this._prefetchTimer = setTimeout(() => {
      this.clientesService
        .getDetalleComprasCliente(undefined, undefined, undefined, undefined, false, g.id)
        .subscribe({ next: () => {}, error: () => {} });
    }, 150);
  }

  cancelarPrefetch(): void {
    clearTimeout(this._prefetchTimer);
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.modalClave = null;
    this.modalGrupoOdoo = null;
    this.modalIdCliente = null;
  }
}
