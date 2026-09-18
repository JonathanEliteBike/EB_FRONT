import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { UsuariosService } from '../../../services/usuarios.service';
import { AlertaService } from '../../../services/alerta.service';
import { ClientesService } from '../../../services/clientes.service';
import { AlertaComponent } from '../../../components/alerta/alerta.component';
import { FiltroComponent } from '../../../components/filtro/filtro.component';
import { GestionClientesComponent } from '../gestion-clientes/gestion-clientes.component';

interface Usuario {
  id: number | null;
  usuario: string;
  contrasena?: string;
  nombre: string;
  correo: string;
  rol: string;
  cliente_nombre?: string | null;
  cliente_id?: number | null;
  activo: boolean;
}

interface ClienteNombre {
  id?: number;
  clave: string;
  nombre_cliente: string;
}

interface FiltroOpciones {
  clave: any[];
  nombre: any[];
  correo: any[];
  usuario: any[];
  rol: any[];
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HomeBarComponent,
    AlertaComponent,
    FiltroComponent
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private alerta = inject(AlertaService);
  private clientesService = inject(ClientesService);
  private cdr = inject(ChangeDetectorRef);

  constructor(private location: Location) {} goBack() { this.location.back(); }

  // Control de pestaña y título unificado
  pestanaActiva: 'usuarios' | 'clientes' = 'usuarios';
  tituloPantalla: string = 'Gestión de Usuarios';

  readonly ROLES = {
    ADMIN: { backendValue: 'Administrador' as const, display: 'Administrador' as const },
    USUARIO: { backendValue: 'Usuario' as const, display: 'Usuario' as const }
  };

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];

  nuevoUsuario: Usuario = {
    id: null,
    usuario: '',
    contrasena: '',
    nombre: '',
    correo: '',
    rol: this.ROLES.USUARIO.backendValue,
    activo: true
  };

  mostrarFormularioRegistroVisible = false;
  mostrarFormularioEdicion = false;
  cargandoUsuarios = false;

  mensajeAlerta: string | null = null;
  tipoAlerta: 'exito' | 'error' = 'exito';

  filtroOpciones: FiltroOpciones = {
    clave: [],
    nombre: [],
    correo: [],
    usuario: [],
    rol: []
  };

  filtrosAplicados: any = {
    clave: [],
    nombre: [],
    correo: [],
    usuario: [],
    rol: []
  };

  get filtrosActivos(): boolean {
    return (Object.values(this.filtrosAplicados) as any[]).some((filtro: any[]) => filtro.length > 0);
  }

  // Paginación estandarizada
  paginaActual = 1;
  usuariosPorPagina = 25;
  opcionesPorPagina: number[] = [10, 25, 50, 100];

  filtroAbierto: string | null = null;

  usuarioAEliminar: Usuario | null = null;
  mostrarConfirmacion = false;

  asociarCliente = false;
  clienteBusqueda = '';
  clienteSugerencias: ClienteNombre[] = [];
  clienteSeleccionadoId: number | null = null;

  vincularGrupo = false;
  grupoSeleccionadoId: number | null = null;
  grupos: { id: number; nombre_grupo: string }[] = [];
  clientesDelGrupo: { id: number; clave: string; nombre_cliente: string }[] = [];
  clienteGrupoSeleccionadoId: number | null = null;

  ngOnInit(): void {
    if (this.location.path().includes('gestion-clientes')) {
      this.cambiarPestana('clientes');
    } else {
      this.cambiarPestana('usuarios');
    }

    this.cargarUsuarios();

    this.alerta.alerta$.subscribe(({ mensaje, tipo }) => {
      this.mensajeAlerta = mensaje;
      this.tipoAlerta = tipo;
      setTimeout(() => this.mensajeAlerta = null, 4000);
    });

    this.clientesService.getNombresClientes().subscribe({
      next: (res: ClienteNombre[]) => {
        this.clienteSugerencias = res;
      },
      error: () => console.error('Error al obtener clientes')
    });

    this.usuariosService.getGruposIntegrales().subscribe({
      next: (res) => { this.grupos = res; },
      error: () => console.error('Error al obtener grupos integrales')
    });
  }

  cambiarPestana(pestana: 'usuarios' | 'clientes'): void {
    this.pestanaActiva = pestana;
    if (pestana === 'usuarios') {
      this.tituloPantalla = 'Gestión de Usuarios';
      this.location.replaceState('/usuarios');
    } else {
      this.tituloPantalla = 'Gestión de Administradores Cliente';
      this.location.replaceState('/gestion-clientes');
    }
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios = true;
    this.usuariosService.obtenerUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data.map((u: any) => ({
          ...u,
          rol: u.rol === 'Administrador' ? this.ROLES.ADMIN.backendValue : this.ROLES.USUARIO.backendValue
        }));
        this.cargandoUsuarios = false;
        this.prepararOpcionesFiltros();
        this.filtrarUsuarios();
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.cargandoUsuarios = false;
      }
    });
  }

  prepararOpcionesFiltros(): void {
    this.filtroOpciones.clave = Array.from(new Set(this.usuarios.map(u => u.id?.toString() || '')))
      .filter(id => id)
      .map(id => ({ value: id, selected: false }));

    this.filtroOpciones.nombre = Array.from(new Set(this.usuarios.map(u => u.nombre)))
      .filter(nombre => nombre)
      .map(nombre => ({ value: nombre, selected: false }));

    this.filtroOpciones.correo = Array.from(new Set(this.usuarios.map(u => u.correo)))
      .filter(correo => correo)
      .map(correo => ({ value: correo, selected: false }));

    this.filtroOpciones.usuario = Array.from(new Set(this.usuarios.map(u => u.usuario)))
      .filter(usuario => usuario)
      .map(usuario => ({ value: usuario, selected: false }));

    this.filtroOpciones.rol = Array.from(new Set(this.usuarios.map(u => u.rol)))
      .filter(rol => rol)
      .map(rol => ({
        value: rol === this.ROLES.ADMIN.backendValue ? this.ROLES.ADMIN.display : this.ROLES.USUARIO.display,
        selected: false
      }));
  }

  aplicarFiltro(campo: string, valores: string[]): void {
    this.filtrosAplicados[campo] = valores;
    this.filtrarUsuarios();
  }

  limpiarFiltro(campo: string): void {
    this.filtrosAplicados[campo] = [];
    this.filtrarUsuarios();
  }

  limpiarTodosFiltros(): void {
    Object.keys(this.filtrosAplicados).forEach(campo => {
      this.filtrosAplicados[campo] = [];
    });
    this.filtrarUsuarios();
  }

  get totalPaginas(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.usuariosPorPagina) || 1;
  }

  cambiarUsuariosPorPagina(cant: number): void {
    this.usuariosPorPagina = cant;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  filtrarUsuarios(): void {
    this.paginaActual = 1;

    this.usuariosFiltrados = this.usuarios.filter(usuario => {
      return this.cumpleFiltro('clave', usuario.id?.toString()) &&
        this.cumpleFiltro('nombre', usuario.nombre) &&
        this.cumpleFiltro('correo', usuario.correo) &&
        this.cumpleFiltro('usuario', usuario.usuario) &&
        this.cumpleFiltroRol(usuario.rol);
    });
  }

  private cumpleFiltro(campo: string, valor: string = ''): boolean {
    if (this.filtrosAplicados[campo].length === 0) return true;
    return this.filtrosAplicados[campo].includes(valor);
  }

  private cumpleFiltroRol(rol: string): boolean {
    if (this.filtrosAplicados.rol.length === 0) return true;

    const rolDisplay = rol === this.ROLES.ADMIN.backendValue ?
      this.ROLES.ADMIN.display : this.ROLES.USUARIO.display;

    return this.filtrosAplicados.rol.includes(rolDisplay);
  }

  filtrarClientes(): ClienteNombre[] {
    const texto = this.clienteBusqueda.toLowerCase().trim();
    return this.clienteSugerencias.filter(c =>
      c.clave.toLowerCase().includes(texto) ||
      c.nombre_cliente.toLowerCase().includes(texto)
    ).slice(0, 8);
  }

  seleccionarCliente(cliente: ClienteNombre) {
    this.clienteBusqueda = `${cliente.nombre_cliente} (${cliente.clave})`;

    if (cliente.id) {
      this.clienteSeleccionadoId = cliente.id;
      return;
    }

    this.clientesService.buscarCliente(cliente.clave).subscribe({
      next: (clienteCompleto) => {
        this.clienteSeleccionadoId = clienteCompleto.id;
      },
      error: () => {
        console.error('Error al buscar cliente completo');
        this.clienteSeleccionadoId = null;
      }
    });
  }

  usuariosPaginados(): Usuario[] {
    const inicio = (this.paginaActual - 1) * this.usuariosPorPagina;
    return this.usuariosFiltrados.slice(inicio, inicio + this.usuariosPorPagina);
  }

  mostrarFormularioRegistro(): void {
    this.nuevoUsuario = {
      id: null,
      usuario: '',
      contrasena: '',
      nombre: '',
      correo: '',
      rol: this.ROLES.USUARIO.backendValue,
      activo: true
    };
    this.mostrarFormularioRegistroVisible = true;
    this.mostrarFormularioEdicion = false;

    this.asociarCliente = false;
    this.clienteBusqueda = '';
    this.clienteSeleccionadoId = null;
    this.vincularGrupo = false;
    this.grupoSeleccionadoId = null;
    this.clientesDelGrupo = [];
    this.clienteGrupoSeleccionadoId = null;
  }

  editarUsuario(usuario: Usuario): void {
    this.nuevoUsuario = { ...usuario };
    this.mostrarFormularioEdicion = true;

    if (usuario.cliente_id) {
      this.asociarCliente = true;
      this.clienteSeleccionadoId = usuario.cliente_id;

      if (usuario.cliente_nombre) {
        this.clienteBusqueda = usuario.cliente_nombre;
      } else {
        const clienteEncontrado = this.buscarClientePorId(usuario.cliente_id);
        if (clienteEncontrado) {
          this.clienteBusqueda = `${clienteEncontrado.nombre_cliente}`;
        } else {
          this.clienteBusqueda = `Cliente ID: ${usuario.cliente_id}`;
        }
      }
    } else {
      this.asociarCliente = false;
      this.clienteSeleccionadoId = null;
      this.clienteBusqueda = '';
    }
  }

  buscarClientePorId(clienteId: number): ClienteNombre | undefined {
    return this.clienteSugerencias.find(c => {
      try {
        const partes = c.clave.split('-');
        const idDeClave = parseInt(partes[partes.length - 1]);
        return idDeClave === clienteId;
      } catch {
        return false;
      }
    });
  }

  volverALista(): void {
    this.mostrarFormularioRegistroVisible = false;
    this.mostrarFormularioEdicion = false;
  }

  onGrupoChange(): void {
    this.clienteGrupoSeleccionadoId = null;
    this.clientesDelGrupo = [];
    if (!this.grupoSeleccionadoId) return;
    this.usuariosService.getClientesPorGrupo(this.grupoSeleccionadoId).subscribe({
      next: (res) => { this.clientesDelGrupo = res; },
      error: () => console.error('Error al cargar clientes del grupo')
    });
  }

  agregarUsuario(): void {
    if (this.validarFormulario()) {
      this.cargandoUsuarios = true;

      const usuarioParaCrear: any = {
        usuario: this.nuevoUsuario.usuario.trim(),
        contrasena: this.nuevoUsuario.contrasena,
        nombre: this.nuevoUsuario.nombre.trim(),
        correo: this.nuevoUsuario.correo.trim(),
        rol: this.nuevoUsuario.rol,
        activo: true
      };

      if (this.asociarCliente && this.clienteSeleccionadoId) {
        usuarioParaCrear.cliente_id = this.clienteSeleccionadoId;
      } else {
        usuarioParaCrear.cliente_id = null;
      }

      if (this.vincularGrupo && this.grupoSeleccionadoId) {
        if (this.clienteGrupoSeleccionadoId) {
          usuarioParaCrear.cliente_id = this.clienteGrupoSeleccionadoId;
        } else {
          usuarioParaCrear.id_grupo = this.grupoSeleccionadoId;
        }
      }

      this.usuariosService.crearUsuario(usuarioParaCrear).subscribe({
        next: (usuarioCreado) => {
          this.alerta.mostrarExito('✅ Usuario creado con éxito');
          this.cargandoUsuarios = false;
          this.volverALista();

          this.usuarios.unshift({
            ...usuarioCreado,
            rol: usuarioCreado.rol === 'Administrador' ? this.ROLES.ADMIN.backendValue : this.ROLES.USUARIO.backendValue
          });
          this.prepararOpcionesFiltros();
          this.filtrarUsuarios();

          this.asociarCliente = false;
          this.clienteBusqueda = '';
          this.clienteSeleccionadoId = null;
          this.vincularGrupo = false;
          this.grupoSeleccionadoId = null;
          this.clientesDelGrupo = [];
          this.clienteGrupoSeleccionadoId = null;
        },
        error: (error) => {
          console.error('Error completo:', error);
          let mensaje = 'Error al crear usuario';

          if (error.error?.error) {
            mensaje = error.error.error;
          } else if (error.status === 400) {
            mensaje = 'Datos inválidos. Verifique la información';
          } else if (error.status === 409) {
            mensaje = 'El usuario, correo o nombre ya existen';
          }

          this.alerta.mostrarError(mensaje);
          this.cargandoUsuarios = false;
        }
      });
    }
  }

  actualizarUsuario(): void {
    if (this.validarFormulario()) {
      if (this.nuevoUsuario.id == null) {
        this.alerta.mostrarError('ID de usuario no válido para la actualización');
        return;
      }

      this.cargandoUsuarios = true;

      const datosActualizacion: any = {
        nombre: this.nuevoUsuario.nombre.trim(),
        rol: this.nuevoUsuario.rol,
        activo: this.nuevoUsuario.activo,
        usuario: this.nuevoUsuario.usuario.trim(),
        correo: this.nuevoUsuario.correo.trim()
      };

      if (this.nuevoUsuario.contrasena?.trim()) {
        datosActualizacion.contrasena = this.nuevoUsuario.contrasena;
      }

      if (this.asociarCliente && this.clienteSeleccionadoId) {
        datosActualizacion.cliente_id = this.clienteSeleccionadoId;
      } else {
        datosActualizacion.cliente_id = null;
      }

      this.usuariosService.actualizarUsuario(this.nuevoUsuario.id, datosActualizacion).subscribe({
        next: (usuarioActualizado) => {
          const usuarioActualizadoFormateado = {
            ...usuarioActualizado,
            rol: usuarioActualizado.rol === 'Administrador' ? this.ROLES.ADMIN.backendValue : this.ROLES.USUARIO.backendValue
          };

          const index = this.usuarios.findIndex(u => u.id === usuarioActualizadoFormateado.id);
          if (index !== -1) {
            this.usuarios[index] = usuarioActualizadoFormateado;
            this.prepararOpcionesFiltros();
            this.filtrarUsuarios();
          }

          this.alerta.mostrarExito('✅ Usuario actualizado con éxito');
          this.volverALista();
          this.cargandoUsuarios = false;

          this.asociarCliente = false;
          this.clienteBusqueda = '';
          this.clienteSeleccionadoId = null;
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          let mensaje = 'Error al actualizar usuario';

          if (error.error?.error) {
            mensaje = error.error.error;
          } else if (error.status === 400) {
            mensaje = 'Datos inválidos. Verifique la información';
          } else if (error.status === 409) {
            mensaje = 'El usuario, correo o nombre ya existen';
          } else if (error.status === 404) {
            mensaje = 'Usuario no encontrado';
          }

          this.alerta.mostrarError(mensaje);
          this.cargandoUsuarios = false;
        }
      });
    }
  }

  validarFormulario(): boolean {
    if (this.mostrarFormularioRegistroVisible) {
      const usuarioRegex = /^[a-zA-Z0-9_.-]{3,20}$/;
      if (!usuarioRegex.test(this.nuevoUsuario.usuario)) {
        this.alerta.mostrarError('El nombre de usuario debe tener entre 3 y 20 caracteres alfanuméricos');
        return false;
      }
    }

    if (this.nuevoUsuario.correo && !this.validarEmail(this.nuevoUsuario.correo)) {
      this.alerta.mostrarError('El correo electrónico no es válido');
      return false;
    }

    if (this.mostrarFormularioRegistroVisible) {
      if (!this.nuevoUsuario.contrasena) {
        this.alerta.mostrarError('La contraseña es requerida');
        return false;
      }
      if (this.nuevoUsuario.contrasena.length < 6) {
        this.alerta.mostrarError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
    }

    if (!this.nuevoUsuario.nombre?.trim()) {
      this.alerta.mostrarError('El nombre es obligatorio');
      return false;
    }

    if (this.mostrarFormularioRegistroVisible) {
      if (!this.nuevoUsuario.usuario?.trim()) {
        this.alerta.mostrarError('El nombre de usuario es obligatorio');
        return false;
      }
      if (!this.nuevoUsuario.correo?.trim()) {
        this.alerta.mostrarError('El correo electrónico es obligatorio');
        return false;
      }
    }

    if (this.asociarCliente && !this.clienteSeleccionadoId) {
      this.alerta.mostrarError('Debe seleccionar un cliente válido');
      return false;
    }

    if (this.vincularGrupo && !this.grupoSeleccionadoId) {
      this.alerta.mostrarError('Debe seleccionar un grupo integral válido');
      return false;
    }

    return true;
  }

  validarEmail(email: string): boolean {
    const re = /^[^@]+@[^@]+\.[^@]+$/;
    return re.test(email);
  }

  confirmarEliminacion(usuario: Usuario): void {
    this.usuarioAEliminar = usuario;
    this.mostrarConfirmacion = true;
  }

  cancelarEliminacion(): void {
    this.usuarioAEliminar = null;
    this.mostrarConfirmacion = false;
  }

  eliminarUsuario(): void {
    if (this.usuarioAEliminar?.id) {
      this.cargandoUsuarios = true;
      this.usuariosService.eliminarUsuario(this.usuarioAEliminar.id).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== this.usuarioAEliminar?.id);
          this.prepararOpcionesFiltros();
          this.filtrarUsuarios();
          this.alerta.mostrarExito('✅ Usuario eliminado');
          this.mostrarConfirmacion = false;
          this.cargandoUsuarios = false;
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.alerta.mostrarError(this.obtenerMensajeErrorEliminacion(error));
          this.cargandoUsuarios = false;
        }
      });
    }
  }

  private obtenerMensajeErrorEliminacion(error: any): string {
    if (error?.status === 404) return 'El usuario ya no existe.';
    if (error?.status === 409) {
      return error.error?.error || 'El usuario tiene información relacionada y no puede eliminarse.';
    }
    if (error?.status === 403) return 'No tienes autorización para eliminar este usuario.';
    if (error?.status >= 500) return 'No fue posible eliminar el usuario.';
    return error?.error?.error || 'No fue posible eliminar el usuario.';
  }

  obtenerRangoPaginas(): number[] {
    const totalPages = this.totalPaginas;
    const currentPage = this.paginaActual;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      if (i > 0 && i <= totalPages) {
        range.push(i);
      }
    }

    if (currentPage - delta > 2) {
      range.unshift(-1);
    }
    if (currentPage + delta < totalPages - 1) {
      range.push(-1);
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range.filter((page, index, array) =>
      page !== -1 || array[index - 1] !== -1
    );
  }

  cambiarPagina(pagina: number): void {
    if (pagina > 0 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }
}
