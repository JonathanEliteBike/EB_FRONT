import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MonitorOdooService } from '../../services/monitor-odoo.service';
import { HomeBarComponent } from '../../components/home-bar/home-bar.component';
import { environment } from '../../../environments/environment';

interface CargaResult {
  cargados: number;
  total_filas_procesadas: number;
  duplicados_actualizados: number;
  advertencias: string[];
}

interface TokenSlot {
  codigo: string | null;
  expira_en: string | null;
  creado_en: string | null;
}

interface UsuarioToken {
  id: number;
  nombre: string;
  usuario: string;
  activo: boolean;
  clave: string | null;
  nombre_grupo: string | null;
  tokens: {
    super: TokenSlot | null;
    eliminar: TokenSlot | null;
    meses: TokenSlot | null;
  };
}

interface Modulo {
  icono: string;
  titulo: string;
  descripcion: string;
  boton: string;
  ruta: string | null;
  accion: string | null;
  pinned?: boolean;
}

type TipoToken = 'super' | 'eliminar' | 'meses';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HomeBarComponent, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  facturas: any[] = [];

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private timerInterval: any;

  busquedaModulos = '';

  modulos: Modulo[] = [
    {
      icono: 'fa-desktop',
      titulo: 'Monitor MY26',
      descripcion: 'Visualizacion y administracion de unidades, seguimiento de embarques y estatus de ordenes.',
      boton: 'Ir a Monitor',
      ruta: '/previo',
      accion: null
    },
    {
      icono: 'fa-exchange-alt',
      titulo: 'Flujo de Efectivo',
      descripcion: 'Visualiza movimientos financieros clave y el estado de tus cuentas en tiempo real.',
      boton: 'Ir a Flujo',
      ruta: '/flujo-dashboard',
      accion: null
    },
    {
      icono: 'fa-users',
      titulo: 'Usuarios',
      descripcion: 'Control de accesos y configuracion de roles para los usuarios del portal.',
      boton: 'Ir a Usuarios',
      ruta: '/usuarios',
      accion: null
    },
    {
      icono: 'fa-clipboard-list',
      titulo: 'Monitor de Pedidos',
      descripcion: 'Consulta el historial de ordenes de cualquier cliente o grupo integral.',
      boton: 'Ir a Pedidos',
      ruta: '/monitor-pedidos',
      accion: null
    },
    {
      icono: 'fa-shopping-cart',
      titulo: 'Proyeccion de Compra MY26',
      descripcion: 'Consulta o planifica tu compra estimada con base en tus necesidades.',
      boton: 'Ir a Proyeccion',
      ruta: '/proyeccion',
      accion: null
    },
    {
      icono: 'fa-undo',
      titulo: 'Retroactivos',
      descripcion: 'Consulta tu caratula de retroactivos para conocer el estado de tus bonificaciones.',
      boton: 'Ir a Retroactivos',
      ruta: '/dashboard-retroactivos',
      accion: null
    },
    {
      icono: 'fa-chart-bar',
      titulo: 'Monitor de Ventas',
      descripcion: 'Consulta el historial de facturacion por periodo, compara meses entre años y analiza los productos mas vendidos.',
      boton: 'Ir a Ventas',
      ruta: '/ventas-monitor',
      accion: null
    },
    {
      icono: 'fa-file-excel',
      titulo: 'Cargar Productos para Proyecciones',
      descripcion: 'Carga el catalogo de productos disponibles para proyecciones de compra. Solo los productos aqui cargados podran seleccionarse.',
      boton: 'Cargar Catalogo',
      ruta: null,
      accion: 'catalogo'
    },
    {
      icono: 'fa-key',
      titulo: 'Tokens de Edicion',
      descripcion: 'Genera codigos de acceso para que los distribuidores puedan editar sus proyecciones. Cada codigo dura 1 hora y es de un solo uso.',
      boton: 'Gestionar Tokens',
      ruta: null,
      accion: 'tokens'
    },
    {
      icono: 'fa-shield-alt',
      titulo: 'Garantias',
      descripcion: 'Dashboard de garantias con graficas de estatus, latencia de atencion, garantias por cliente y analisis de danos.',
      boton: 'Ir a Garantias',
      ruta: '/garantias',
      accion: null
    },
    {
      icono: 'fa-chart-line',
      titulo: 'Proyecciones MY27',
      descripcion: 'Vista consolidada de los 92 articulos MY27 con cantidades por mes sumadas de todos los distribuidores.',
      boton: 'Ir a Proyecciones',
      ruta: '/proyecciones-my27',
      accion: null
    },
    {
      icono: 'fa-ship',
      titulo: 'Importaciones',
      descripcion: 'Seguimiento completo del proceso de importacion: logistica, despacho aduanero, almacen y cierre de cuentas.',
      boton: 'Ir a Importaciones',
      ruta: '/importaciones',
      accion: null
    }
  ];

  private readonly PINS_KEY = 'eb_home_pinned';

  get modulosFiltrados(): Modulo[] {
    const q = this.busquedaModulos.trim().toLowerCase();
    const lista = q
      ? this.modulos.filter(m =>
          m.titulo.toLowerCase().includes(q) || m.descripcion.toLowerCase().includes(q)
        )
      : this.modulos;
    return [...lista.filter(m => m.pinned), ...lista.filter(m => !m.pinned)];
  }

  ejecutarAccion(accion: string | null): void {
    if (accion === 'catalogo') this.abrirModalCatalogo();
    if (accion === 'tokens') this.abrirModalTokens();
  }

  togglePin(modulo: Modulo, event: MouseEvent): void {
    event.stopPropagation();
    modulo.pinned = !modulo.pinned;
    this.savePins();
  }

  private loadPins(): void {
    try {
      const stored = localStorage.getItem(this.PINS_KEY);
      if (stored) {
        const pinnedTitulos: string[] = JSON.parse(stored);
        this.modulos.forEach(m => { m.pinned = pinnedTitulos.includes(m.titulo); });
      }
    } catch { }
  }

  private savePins(): void {
    const pinned = this.modulos.filter(m => m.pinned).map(m => m.titulo);
    localStorage.setItem(this.PINS_KEY, JSON.stringify(pinned));
  }

  // ── Modal catálogo ────────────────────────────────────────────────────────
  modalCatalogoAbierto = false;
  totalProductosCatalogo = 0;
  archivoSeleccionado: File | null = null;
  subiendoCatalogo = false;
  resultadoCarga: CargaResult | null = null;
  errorCarga: string | null = null;
  arrastrando = false;
  mostrarConfirmLimpiar = false;
  limpiandoCatalogo = false;

  // ── Modal tokens ──────────────────────────────────────────────────────────
  modalTokensAbierto = false;
  cargandoTokens = false;
  usuariosTokens: UsuarioToken[] = [];
  generandoToken: Record<string, boolean> = {};
  copiado: Record<string, boolean> = {};
  busquedaToken = '';

  get usuariosTokensFiltrados(): UsuarioToken[] {
    const q = this.busquedaToken.trim().toLowerCase();
    if (!q) return this.usuariosTokens;
    return this.usuariosTokens.filter(u =>
      u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q)
    );
  }

  tokenKey(userId: number, tipo: TipoToken): string {
    return `${userId}-${tipo}`;
  }

  constructor(private monitorService: MonitorOdooService) {}

  ngOnInit(): void {
    this.loadPins();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  verMonitor() {
    this.monitorService.getFacturas().subscribe({
      next: (data) => { this.facturas = data; },
      error: (error) => { console.error('Error al obtener facturas:', error); }
    });
  }

  // ── Modal catálogo ────────────────────────────────────────────────────────

  abrirModalCatalogo(): void {
    this.modalCatalogoAbierto = true;
    this.resetearEstadoCatalogo();
    this.cargarConteo();
  }

  cerrarModalCatalogo(): void {
    this.modalCatalogoAbierto = false;
    this.resetearEstadoCatalogo();
  }

  private resetearEstadoCatalogo(): void {
    this.archivoSeleccionado = null;
    this.resultadoCarga = null;
    this.errorCarga = null;
    this.arrastrando = false;
    this.mostrarConfirmLimpiar = false;
  }

  cargarConteo(): void {
    this.http.get<{ total_productos: number }>(`${this.apiUrl}/forecast/catalogo-excel`)
      .subscribe({
        next: r => { this.totalProductosCatalogo = r.total_productos; },
        error: () => {}
      });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.arrastrando = true; }
  onDragLeave(): void { this.arrastrando = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.arrastrando = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.seleccionarArchivo(file);
  }

  onFileInput(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.seleccionarArchivo(file);
  }

  seleccionarArchivo(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      this.errorCarga = 'Solo se aceptan archivos Excel (.xlsx o .xls)';
      return;
    }
    this.archivoSeleccionado = file;
    this.resultadoCarga = null;
    this.errorCarga = null;
  }

  limpiarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.resultadoCarga = null;
    this.errorCarga = null;
  }

  subirCatalogo(): void {
    if (!this.archivoSeleccionado) return;
    this.subiendoCatalogo = true;
    this.resultadoCarga = null;
    this.errorCarga = null;

    const fd = new FormData();
    fd.append('file', this.archivoSeleccionado);

    this.http.post<CargaResult>(`${this.apiUrl}/forecast/catalogo-excel`, fd).subscribe({
      next: r => {
        this.resultadoCarga = r;
        this.subiendoCatalogo = false;
        this.archivoSeleccionado = null;
        this.cargarConteo();
      },
      error: err => {
        this.errorCarga = err.error?.error || 'Error al subir el archivo';
        this.subiendoCatalogo = false;
      }
    });
  }

  confirmarLimpiarCatalogo(): void { this.mostrarConfirmLimpiar = true; }
  cancelarLimpiar(): void { this.mostrarConfirmLimpiar = false; }

  ejecutarLimpiar(): void {
    this.limpiandoCatalogo = true;
    this.http.delete<{ eliminados: number }>(`${this.apiUrl}/forecast/catalogo-excel`).subscribe({
      next: () => {
        this.limpiandoCatalogo = false;
        this.mostrarConfirmLimpiar = false;
        this.totalProductosCatalogo = 0;
      },
      error: err => {
        this.errorCarga = err.error?.error || 'Error al limpiar el catálogo';
        this.limpiandoCatalogo = false;
        this.mostrarConfirmLimpiar = false;
      }
    });
  }

  // ── Modal tokens ──────────────────────────────────────────────────────────

  abrirModalTokens(): void {
    this.modalTokensAbierto = true;
    this.cargarTokens();
    this.timerInterval = setInterval(() => {
      if (this.modalTokensAbierto) this.usuariosTokens = [...this.usuariosTokens];
    }, 30000);
  }

  cerrarModalTokens(): void {
    this.modalTokensAbierto = false;
    this.busquedaToken = '';
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  cargarTokens(): void {
    this.cargandoTokens = true;
    this.http.get<UsuarioToken[]>(`${this.apiUrl}/edicion/tokens-monitor`).subscribe({
      next: lista => { this.usuariosTokens = lista; this.cargandoTokens = false; },
      error: () => { this.cargandoTokens = false; }
    });
  }

  generarToken(u: UsuarioToken, tipo: TipoToken): void {
    const key = this.tokenKey(u.id, tipo);
    this.generandoToken[key] = true;
    this.http.post<{ codigo: string; tipo: TipoToken }>(
      `${this.apiUrl}/edicion/generar-otp`,
      { usuario_id: u.id, tipo }
    ).subscribe({
      next: r => {
        const expira = new Date(Date.now() + 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        u.tokens[tipo] = { codigo: r.codigo, expira_en: expira, creado_en: null };
        this.generandoToken[key] = false;
      },
      error: () => { this.generandoToken[key] = false; }
    });
  }

  onGenerarToken(event: { usuario: UsuarioToken; tipo: TipoToken }): void {
    this.generarToken(event.usuario, event.tipo);
  }

  onCopiarToken(event: { codigo: string; usuarioId: number; tipo: TipoToken }): void {
    this.copiarToken(event.codigo, event.usuarioId, event.tipo);
  }

  copiarToken(codigo: string, userId: number, tipo: TipoToken): void {
    const key = this.tokenKey(userId, tipo);
    navigator.clipboard.writeText(codigo).then(() => {
      this.copiado[key] = true;
      setTimeout(() => { this.copiado[key] = false; }, 2000);
    });
  }

  calcularTiempoRestante(expiraEn: string | null): string {
    if (!expiraEn) return '';
    const diff = new Date(expiraEn).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const min = Math.floor(diff / 60000);
    const seg = Math.floor((diff % 60000) / 1000);
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${min}m ${seg}s`;
  }
}
