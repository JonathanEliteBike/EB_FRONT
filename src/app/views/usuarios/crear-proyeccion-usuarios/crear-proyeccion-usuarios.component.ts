import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProyeccionService } from '../../../services/proyeccion.service';
import { RouterModule } from '@angular/router';
import { TopBarUsuariosComponent } from "../../../components/top-bar-usuarios/top-bar-usuarios.component";
import { MatDialog } from '@angular/material/dialog';
import { ConfirmacionDialogComponent } from '../../../components/confirmacion-dialog/confirmacion-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { AlertaService } from '../../../services/alerta.service';
import { AlertaComponent } from '../../../components/alerta/alerta.component';
import { AccesoRestringidoComponent } from '../../../components/acceso-restringido/acceso-restringido.component';
import { ClientesService } from '../../../services/clientes.service';
import { Router, NavigationStart } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment.prod';

interface Disponibilidad {
  q1_sep_2025: boolean;
  q2_sep_2025: boolean;
  q1_oct_2025: boolean;
  q2_oct_2025: boolean;
  q1_nov_2025: boolean;
  q2_nov_2025: boolean;
  q1_dic_2025: boolean;
  q2_dic_2025: boolean;
  q1_mar_2026?: boolean;
  q2_mar_2026?: boolean;
  q1_abr_2026?: boolean;
  q2_abr_2026?: boolean;
  q1_may_2026?: boolean;
  q2_may_2026?: boolean;
}

interface Proyeccion {
  id: number;
  clave_factura: string;
  clave_6_digitos: string;
  clave_odoo: string;
  descripcion: string;
  modelo: string;
  spec: string;
  ean: string;
  referencia: string;
  q1_sep_2025: number | null;
  q2_sep_2025: number | null;
  q1_oct_2025: number | null;
  q2_oct_2025: number | null;
  q1_nov_2025: number | null;
  q2_nov_2025: number | null;
  q1_dic_2025: number | null;
  q2_dic_2025: number | null;
  q1_mar_2026?: number | null;
  q2_mar_2026?: number | null;
  q1_abr_2026?: number | null;
  q2_abr_2026?: number | null;
  q1_may_2026?: number | null;
  q2_may_2026?: number | null;
  disponibilidad: Disponibilidad;
  precio_publico_con_iva: number;
  precio_distribuidor_con_iva: number;
  precio_partner_con_iva: number;
  precio_elite_con_iva: number;
  precio_elite_plus_con_iva: number;
}

@Component({
  standalone: true,
  selector: 'app-crear-proyeccion-usuario',
  templateUrl: './crear-proyeccion-usuarios.component.html',
  styleUrls: ['./crear-proyeccion-usuarios.component.css'],
  imports: [CommonModule, FormsModule, RouterModule, TopBarUsuariosComponent, AlertaComponent, AccesoRestringidoComponent]
})
export class CrearProyeccionUsuariosComponent implements OnInit, OnDestroy {
  proyecciones: Proyeccion[] = [];
  mensajeAlerta: string | null = null;
  tipoAlerta: 'exito' | 'error' = 'exito';
  cargando: boolean = true;

  // Paginación
  paginaActual: number = 1;
  paginaActualTemp: number = 1;
  itemsPorPagina: number = 50;
  totalPaginas: number = 0;
  proyeccionesPaginadas: Proyeccion[] = [];

  // Datos del cliente
  nivelCliente: string = '';
  compromisoCliente: number = 0;

  mostrarMontos: boolean = false; // Controla si se muestra o no el contenido

  mostrarModal: boolean = false;

  showSortDropdown: boolean = false;
  currentSortDirection: 'asc' | 'desc' = 'asc';

  showRefFilter = false;
  refOptions: { value: string, selected: boolean }[] = [];
  filteredRefOptions: { value: string, selected: boolean }[] = [];
  refSearchTerm = '';
  selectedRefs: string[] = [];
  referenciaFilterCount = 0;

  // Propiedades para el filtro de Modelo
  showModeloFilter = false;
  modeloOptions: { value: string, selected: boolean }[] = [];
  filteredModeloOptions: { value: string, selected: boolean }[] = [];
  modeloSearchTerm = '';
  selectedModelos: string[] = [];
  modeloFilterCount = 0;

  private autoguardadoInterval: any;
  private cambiosSinGuardar = false;
  ultimoAutoguardado: Date | null = null;
  private tiempoAutoguardado = 1000;

  private destroy$ = new Subject<void>();

  constructor(
    private proyeccionService: ProyeccionService,
    private authService: AuthService,
    private dialog: MatDialog,
    private alertaService: AlertaService,
    private clientesService: ClientesService,
    private router: Router
  ) {
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.guardarAntesDeSalir();
      }
    });
  }

  get puedeCrear(): boolean {
    return this.authService.tieneModulo('usuarios_proyeccion_compras');
  }

  get puedeVerMontos(): boolean {
    return !this.authService.debeOcultarMontos('proyeccion_compras');
  }

  ngOnInit(): void {
    if (!this.puedeCrear) {
      this.cargando = false;
      return;
    }

    this.cargarProyecciones();
    this.obtenerDatosCliente();
    this.iniciarAutoguardado();

    // Escuchar evento de cierre de sesión
    this.authService.onLogout$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.guardarAutomaticamenteSync();
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.cambiosSinGuardar) {
      // Intenta guardar sincrónicamente (puede no funcionar completamente)
      this.guardarAutomaticamenteSync();
      // Muestra mensaje de confirmación
      event.preventDefault();
      event.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
    }
  }

  private guardarAntesDeSalir(): void {
    if (this.cambiosSinGuardar) {
      // Guardar antes de cambiar de vista
      this.guardarAutomaticamenteSync();
    }
  }

  private guardarAutomaticamenteSync(): void {
    if (!this.puedeCrear || !this.cambiosSinGuardar) return;

    const proyeccionesParaGuardar = this.getProyeccionesParaGuardar();

    if (proyeccionesParaGuardar.length > 0) {
      try {
        const token = this.authService.getToken();
        if (!token) return;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${environment.apiUrl}/proyecciones/autoguardado`, false);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.send(JSON.stringify({
          accion: 'guardar',
          proyecciones: proyeccionesParaGuardar
        }));

        if (xhr.status === 200) {
          this.cambiosSinGuardar = false;
          this.ultimoAutoguardado = new Date();
        }
      } catch (error) {
        console.error('Error en autoguardado sincrónico:', error);
      }
    }
  }

  ngOnDestroy(): void {
    // Guardar antes de destruir el componente
    this.guardarAutomaticamenteSync();

    // Limpiar observables
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar intervalo 
    if (this.autoguardadoInterval) {
      clearInterval(this.autoguardadoInterval);
    }
  }

  // Añade estos nuevos métodos para el autoguardado
  private iniciarAutoguardado(): void {
    if (!this.puedeCrear) return;
    // Cargar datos guardados al iniciar
    this.cargarDatosAutoguardados();

    // Configurar intervalo de autoguardado
    this.autoguardadoInterval = setInterval(() => {
      if (this.cambiosSinGuardar) {
        this.guardarAutomaticamente();
      }
    }, this.tiempoAutoguardado);
  }

  private cargarDatosAutoguardados(): void {
    this.proyeccionService.cargarAutoguardado().subscribe({
      next: (response: any) => {
        if (response.data && response.data.length > 0) {
          const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
            width: '90%', // Cambiado a porcentaje para responsividad
            maxWidth: '500px', // Máximo ancho en pantallas grandes
            panelClass: 'autoguardado-dialog', // Clase CSS personalizada
            data: {
              titulo: 'Proyección recuperada',
              mensaje: '¿Deseas recuperar tu proyección guardada automáticamente?',
              mostrarOpciones: true
            }
          });

          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              this.aplicarDatosAutoguardados(response.data);
            } else {
              this.proyeccionService.limpiarAutoguardado().subscribe();
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar autoguardado:', error);
      }
    });
  }

  private aplicarDatosAutoguardados(datos: any[]): void {
    datos.forEach(item => {
      const proyeccion = this.proyecciones.find(p => p.id === item.id_proyeccion);
      if (proyeccion) {
        // Solo asignar valores si el campo está disponible
        if (proyeccion.disponibilidad.q1_sep_2025 && item.q1_sep_2025) {
          proyeccion.q1_sep_2025 = item.q1_sep_2025;
        }
        if (proyeccion.disponibilidad.q2_sep_2025 && item.q2_sep_2025) {
          proyeccion.q2_sep_2025 = item.q2_sep_2025;
        }
        if (proyeccion.disponibilidad.q1_oct_2025 && item.q1_oct_2025) {
          proyeccion.q1_oct_2025 = item.q1_oct_2025;
        }
        if (proyeccion.disponibilidad.q2_oct_2025 && item.q2_oct_2025) {
          proyeccion.q2_oct_2025 = item.q2_oct_2025;
        }
        if (proyeccion.disponibilidad.q1_nov_2025 && item.q1_nov_2025) {
          proyeccion.q1_nov_2025 = item.q1_nov_2025;
        }
        if (proyeccion.disponibilidad.q2_nov_2025 && item.q2_nov_2025) {
          proyeccion.q2_nov_2025 = item.q2_nov_2025;
        }
        if (proyeccion.disponibilidad.q1_dic_2025 && item.q1_dic_2025) {
          proyeccion.q1_dic_2025 = item.q1_dic_2025;
        }
        if (proyeccion.disponibilidad.q2_dic_2025 && item.q2_dic_2025) {
          proyeccion.q2_dic_2025 = item.q2_dic_2025;
        }
        if (proyeccion.disponibilidad.q1_mar_2026 && item.q1_mar_2026) {
          proyeccion.q1_mar_2026 = item.q1_mar_2026;
        }
        if (proyeccion.disponibilidad.q2_mar_2026 && item.q2_mar_2026) {
          proyeccion.q2_mar_2026 = item.q2_mar_2026;
        }
        if (proyeccion.disponibilidad.q1_abr_2026 && item.q1_abr_2026) {
          proyeccion.q1_abr_2026 = item.q1_abr_2026;
        }
        if (proyeccion.disponibilidad.q2_abr_2026 && item.q2_abr_2026) {
          proyeccion.q2_abr_2026 = item.q2_abr_2026;
        }
        if (proyeccion.disponibilidad.q1_may_2026 && item.q1_may_2026) {
          proyeccion.q1_may_2026 = item.q1_may_2026;
        }
        if (proyeccion.disponibilidad.q2_may_2026 && item.q2_may_2026) {
          proyeccion.q2_may_2026 = item.q2_may_2026;
        }
      }
    });
    this.actualizarPaginado();
  }

  onInputChange(): void {
    this.cambiosSinGuardar = true;
  }

  private guardarAutomaticamente(): void {
    if (!this.puedeCrear || !this.cambiosSinGuardar) return;

    const proyeccionesParaGuardar = this.getProyeccionesParaGuardar();

    if (proyeccionesParaGuardar.length > 0) {
      this.proyeccionService.guardarAutomaticamente(proyeccionesParaGuardar).subscribe({
        next: () => {
          this.cambiosSinGuardar = false;
          this.ultimoAutoguardado = new Date();
          console.log('Autoguardado realizado');
        },
        error: (error) => {
          console.error('Error en autoguardado:', error);
        }
      });
    }
  }

  private getProyeccionesParaGuardar(): any[] {
    return this.proyecciones
      .filter(p =>
        // Solo incluir proyecciones con al menos un valor en campos disponibles
        (p.disponibilidad.q1_sep_2025 && p.q1_sep_2025) ||
        (p.disponibilidad.q2_sep_2025 && p.q2_sep_2025) ||
        (p.disponibilidad.q1_oct_2025 && p.q1_oct_2025) ||
        (p.disponibilidad.q2_oct_2025 && p.q2_oct_2025) ||
        (p.disponibilidad.q1_nov_2025 && p.q1_nov_2025) ||
        (p.disponibilidad.q2_nov_2025 && p.q2_nov_2025) ||
        (p.disponibilidad.q1_dic_2025 && p.q1_dic_2025) ||
        (p.disponibilidad.q2_dic_2025 && p.q2_dic_2025) ||
        (p.disponibilidad.q1_mar_2026 && p.q1_mar_2026) ||
        (p.disponibilidad.q2_mar_2026 && p.q2_mar_2026) ||
        (p.disponibilidad.q1_abr_2026 && p.q1_abr_2026) ||
        (p.disponibilidad.q2_abr_2026 && p.q2_abr_2026) ||
        (p.disponibilidad.q1_may_2026 && p.q1_may_2026) ||
        (p.disponibilidad.q2_may_2026 && p.q2_may_2026)
      )
      .map(p => ({
        id_proyeccion: p.id,
        q1_sep_2025: p.disponibilidad.q1_sep_2025 ? (p.q1_sep_2025 || null) : null,
        q2_sep_2025: p.disponibilidad.q2_sep_2025 ? (p.q2_sep_2025 || null) : null,
        q1_oct_2025: p.disponibilidad.q1_oct_2025 ? (p.q1_oct_2025 || null) : null,
        q2_oct_2025: p.disponibilidad.q2_oct_2025 ? (p.q2_oct_2025 || null) : null,
        q1_nov_2025: p.disponibilidad.q1_nov_2025 ? (p.q1_nov_2025 || null) : null,
        q2_nov_2025: p.disponibilidad.q2_nov_2025 ? (p.q2_nov_2025 || null) : null,
        q1_dic_2025: p.disponibilidad.q1_dic_2025 ? (p.q1_dic_2025 || null) : null,
        q2_dic_2025: p.disponibilidad.q2_dic_2025 ? (p.q2_dic_2025 || null) : null,
        q1_mar_2026: p.disponibilidad.q1_mar_2026 ? (p.q1_mar_2026 || null) : null,
        q2_mar_2026: p.disponibilidad.q2_mar_2026 ? (p.q2_mar_2026 || null) : null,
        q1_abr_2026: p.disponibilidad.q1_abr_2026 ? (p.q1_abr_2026 || null) : null,
        q2_abr_2026: p.disponibilidad.q2_abr_2026 ? (p.q2_abr_2026 || null) : null,
        q1_may_2026: p.disponibilidad.q1_may_2026 ? (p.q1_may_2026 || null) : null,
        q2_may_2026: p.disponibilidad.q2_may_2026 ? (p.q2_may_2026 || null) : null
      }));
  }

  cargarProyecciones(): void {
    this.cargando = true;
    this.proyeccionService.getProyeccionesLimpias().subscribe({
      next: (data: any[]) => {
        this.proyecciones = this.mapearDatosProyecciones(data);
        this.configurarPaginacion();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener proyecciones:', error);
        this.cargando = false;
        this.alertaService.mostrarError('Error al cargar las proyecciones');
      }
    });
  }

  mapearDatosProyecciones(data: any[]): Proyeccion[] {
    // Primero mapeamos los datos
    const proyeccionesMapeadas = data.map(item => ({
      ...item,
      q1_sep_2025: null,
      q2_sep_2025: null,
      q1_oct_2025: null,
      q2_oct_2025: null,
      q1_nov_2025: null,
      q2_nov_2025: null,
      q1_dic_2025: null,
      q2_dic_2025: null,
      q1_mar_2026: null,
      q2_mar_2026: null,
      q1_abr_2026: null,
      q2_abr_2026: null,
      q1_may_2026: null,
      q2_may_2026: null,
      disponibilidad: {
        q1_sep_2025: item.disp_q1_sep_2025 !== undefined ? Boolean(item.disp_q1_sep_2025) : true,
        q2_sep_2025: item.disp_q2_sep_2025 !== undefined ? Boolean(item.disp_q2_sep_2025) : true,
        q1_oct_2025: item.disp_q1_oct_2025 !== undefined ? Boolean(item.disp_q1_oct_2025) : true,
        q2_oct_2025: item.disp_q2_oct_2025 !== undefined ? Boolean(item.disp_q2_oct_2025) : true,
        q1_nov_2025: item.disp_q1_nov_2025 !== undefined ? Boolean(item.disp_q1_nov_2025) : true,
        q2_nov_2025: item.disp_q2_nov_2025 !== undefined ? Boolean(item.disp_q2_nov_2025) : true,
        q1_dic_2025: item.disp_q1_dic_2025 !== undefined ? Boolean(item.disp_q1_dic_2025) : true,
        q2_dic_2025: item.disp_q2_dic_2025 !== undefined ? Boolean(item.disp_q2_dic_2025) : true,
        q1_mar_2026: item.disp_q1_mar_2026 !== undefined ? Boolean(item.disp_q1_mar_2026) : true,
        q2_mar_2026: item.disp_q2_mar_2026 !== undefined ? Boolean(item.disp_q2_mar_2026) : true,
        q1_abr_2026: item.disp_q1_abr_2026 !== undefined ? Boolean(item.disp_q1_abr_2026) : true,
        q2_abr_2026: item.disp_q2_abr_2026 !== undefined ? Boolean(item.disp_q2_abr_2026) : true,
        q1_may_2026: item.disp_q1_may_2026 !== undefined ? Boolean(item.disp_q1_may_2026) : true,
        q2_may_2026: item.disp_q2_may_2026 !== undefined ? Boolean(item.disp_q2_may_2026) : true
      }
    }));

    this.initializeRefOptions();
    this.initializeModeloOptions();

    // Ordenar inicialmente por descripción normalizada
    return proyeccionesMapeadas.sort((a, b) => {
      const claveA = this.normalizarParaOrden(a.descripcion);
      const claveB = this.normalizarParaOrden(b.descripcion);

      // Comparar modelo base
      const modeloA = claveA.split('_')[0];
      const modeloB = claveB.split('_')[0];
      const comparisonModelo = modeloA.localeCompare(modeloB);
      if (comparisonModelo !== 0) return comparisonModelo;

      // Comparar versión numérica
      const versionA = claveA.split('_')[1];
      const versionB = claveB.split('_')[1];
      const comparisonVersion = versionA.localeCompare(versionB);
      if (comparisonVersion !== 0) return comparisonVersion;

      // Comparar año (MY26)
      const añoA = claveA.split('_')[2];
      const añoB = claveB.split('_')[2];
      const comparisonAño = añoA.localeCompare(añoB);
      if (comparisonAño !== 0) return comparisonAño;

      // Comparar variante
      const varianteA = claveA.split('_')[3];
      const varianteB = claveB.split('_')[3];
      return varianteA.localeCompare(varianteB);
    });
  }

  obtenerDatosCliente(): void {
    this.clientesService.getNivelCliente().subscribe({
      next: (res) => {
        this.nivelCliente = res.nivel;
        this.compromisoCliente = res.compromiso;
      },
      error: (err) => {
        console.error('Error al obtener el nivel del cliente:', err);
      }
    });
  }

  // Función para obtener el precio según el nivel del cliente
  getPrecioCliente(proyeccion: Proyeccion): number {
    switch (this.nivelCliente) {
      case 'Partner Elite Plus':
        return proyeccion.precio_elite_plus_con_iva;
      case 'Partner Elite':
        return proyeccion.precio_elite_con_iva;
      case 'Partner':
        return proyeccion.precio_partner_con_iva;
      case 'Distribuidor':
        return proyeccion.precio_distribuidor_con_iva;
      default:
        return proyeccion.precio_publico_con_iva;
    }
  }

  // Ejemplo de precio para mostrar en el resumen
  getPrecioEjemplo(): number {
    if (this.proyecciones.length > 0) {
      return this.getPrecioCliente(this.proyecciones[0]);
    }
    return 0;
  }

  // Ejemplo de precio público para mostrar en el resumen
  getPrecioPublicoEjemplo(): number {
    if (this.proyecciones.length > 0) {
      return this.proyecciones[0].precio_publico_con_iva;
    }
    return 0;
  }

  configurarPaginacion(): void {
    this.totalPaginas = Math.ceil(this.proyecciones.length / this.itemsPorPagina);
    this.actualizarPaginado();
  }

  actualizarPaginado(): void {
    let filteredData = [...this.proyecciones];

    // Aplicar filtros si existen
    if (this.selectedRefs.length > 0) {
      filteredData = filteredData.filter(p =>
        this.selectedRefs.includes(p.referencia)
      );
    }

    if (this.selectedModelos.length > 0) {
      filteredData = filteredData.filter(p =>
        this.selectedModelos.includes(p.modelo)
      );
    }

    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.proyeccionesPaginadas = filteredData.slice(inicio, fin);
    this.totalPaginas = Math.ceil(filteredData.length / this.itemsPorPagina);
  }

  private normalizarParaOrden(descripcion: string): string {
    if (!descripcion) return '';

    // Extraer modelo base (SCALE, SPARK, ADDICT, etc.)
    const modelosBase = [
      'SCALE', 'CONTESSA SCALE', 'SPARK RC', 'SPARK', 'GENIUS', 'SPEEDSTER GRAVEL', 'SPEEDSTER',
      'PATRON ERIDE', 'CONTESSA PATRON ERIDE', 'STRIKE ERIDE', 'CONTESSA STRIKE ERIDE',
      'CONTESSA ACTIVE', 'ADDICT', 'ADDICT RC', 'ADDICT GRAVEL', 'RANSOM', 'VOLTAGE ERIDE',
      'CONTRAIL', 'FOIL RC', 'RC TEAM ISSUE', 'WORLD CUP', 'RC TEAM', 'LUMEN', 'ROXTER'
    ];

    let modeloBase = '';
    let version = '';

    // Buscar el modelo base más largo que coincida
    for (const modelo of modelosBase.sort((a, b) => b.length - a.length)) {
      if (descripcion.toUpperCase().includes(modelo.toUpperCase())) {
        modeloBase = modelo.toUpperCase();

        // Extraer versión (número después del modelo base)
        const versionMatch = descripcion.match(new RegExp(`${modelo}\\s*(\\d+)`, 'i'));
        if (versionMatch) {
          version = versionMatch[1].padStart(3, '0'); // Rellenar con ceros para orden correcto
        }
        break;
      }
    }

    // Si no encontramos modelo base, usar las primeras palabras
    if (!modeloBase) {
      const palabras = descripcion.split(' ');
      modeloBase = palabras.slice(0, 2).join(' ').toUpperCase();
    }

    // Extraer año (MY26) si existe
    let año = '';
    const añoMatch = descripcion.match(/(MY\d{2})/i);
    if (añoMatch) {
      año = añoMatch[1].toUpperCase();
    }

    // Extraer variante (COMP, TEAM, etc.) si existe
    let variante = '';
    const variantes = ['COMP', 'TEAM', 'TEAM ISSUE', 'TUNED', 'EQ'];
    for (const v of variantes) {
      if (descripcion.toUpperCase().includes(v)) {
        variante = v;
        break;
      }
    }

    // Crear clave de ordenamiento: modeloBase + version + año + variante
    return `${modeloBase}_${version}_${año}_${variante}`;
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.paginaActualTemp = pagina;
    this.actualizarPaginado();
  }

  // Métodos para validación y envío
  prepararEnvio(): void {
    const itemsConCantidad = this.proyecciones.filter(item =>
      Object.keys(item.disponibilidad).some(key =>
        (item[key as keyof Proyeccion] as number) > 0
      )
    );

    if (itemsConCantidad.length === 0) {
      this.alertaService.mostrarError('Por favor ingresa al menos una cantidad para enviar la proyección.');
      return;
    }

    // Calcular totales
    const totalBicicletas = this.calcularTotalBicicletas();
    const totalProyeccion = this.calcularTotalProyeccion();

    // Preparar detalles con precios correctos
    const detalles = itemsConCantidad.map(item => {
      const precioUnitario = this.getPrecioCliente(item);
      const cantidades = [
        item.q1_sep_2025 || 0,
        item.q2_sep_2025 || 0,
        item.q1_oct_2025 || 0,
        item.q2_oct_2025 || 0,
        item.q1_nov_2025 || 0,
        item.q2_nov_2025 || 0,
        item.q1_dic_2025 || 0,
        item.q2_dic_2025 || 0,
        item.q1_mar_2026 || 0,
        item.q2_mar_2026 || 0,
        item.q1_abr_2026 || 0,
        item.q2_abr_2026 || 0,
        item.q1_may_2026 || 0,
        item.q2_may_2026 || 0
      ];
      const cantidadTotal = cantidades.reduce((sum, cantidad) => sum + cantidad, 0);

      return {
        id_proyeccion: item.id,
        producto: {
          clave_factura: item.clave_factura,
          descripcion: item.descripcion
        },
        precioUnitario: precioUnitario,
        subtotal: cantidadTotal * precioUnitario,
        q1_sep_2025: item.q1_sep_2025 || 0,
        q2_sep_2025: item.q2_sep_2025 || 0,
        q1_oct_2025: item.q1_oct_2025 || 0,
        q2_oct_2025: item.q2_oct_2025 || 0,
        q1_nov_2025: item.q1_nov_2025 || 0,
        q2_nov_2025: item.q2_nov_2025 || 0,
        q1_dic_2025: item.q1_dic_2025 || 0,
        q2_dic_2025: item.q2_dic_2025 || 0,
        q1_mar_2026: item.q1_mar_2026 || 0,
        q2_mar_2026: item.q2_mar_2026 || 0,
        q1_abr_2026: item.q1_abr_2026 || 0,
        q2_abr_2026: item.q2_abr_2026 || 0,
        q1_may_2026: item.q1_may_2026 || 0,
        q2_may_2026: item.q2_may_2026 || 0
      };
    });

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '700px',
      data: {
        titulo: 'Confirmar Proyección',
        mensaje: '¿Estás seguro de enviar esta proyección?',
        nivelCliente: this.nivelCliente,
        precioCliente: this.getPrecioEjemplo(),
        precioPublico: this.getPrecioPublicoEjemplo(),
        compromisoCliente: this.compromisoCliente,
        totalBicicletas: totalBicicletas,
        totalProyeccion: totalProyeccion,
        detalles: detalles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.enviarProyeccion(itemsConCantidad);
    });
  }

  enviarProyeccion(proyeccionData: any[]): void {
    if (!this.puedeCrear) return;
    const token = this.authService.getToken();
    if (!token) {
      this.alertaService.mostrarError('No estás autenticado. Por favor inicia sesión nuevamente.');
      return;
    }

    // Prepara los datos para enviar al backend
    const datosParaEnviar = proyeccionData.map(item => ({
      id_proyeccion: item.id,
      q1_sep_2025: item.q1_sep_2025 || 0,
      q2_sep_2025: item.q2_sep_2025 || 0,
      q1_oct_2025: item.q1_oct_2025 || 0,
      q2_oct_2025: item.q2_oct_2025 || 0,
      q1_nov_2025: item.q1_nov_2025 || 0,
      q2_nov_2025: item.q2_nov_2025 || 0,
      q1_dic_2025: item.q1_dic_2025 || 0,
      q2_dic_2025: item.q2_dic_2025 || 0,
      q1_mar_2026: item.q1_mar_2026 || 0,
      q2_mar_2026: item.q2_mar_2026 || 0,
      q1_abr_2026: item.q1_abr_2026 || 0,
      q2_abr_2026: item.q2_abr_2026 || 0,
      q1_may_2026: item.q1_may_2026 || 0,
      q2_may_2026: item.q2_may_2026 || 0
    }));

    this.proyeccionService.agregarProyeccionCliente(datosParaEnviar, token).subscribe({
      next: (response: any) => {
        this.proyeccionService.limpiarAutoguardado().subscribe();
        const mensaje = `Proyección enviada exitosamente.`;
        this.alertaService.mostrarExito(mensaje);

        // Mostrar resumen de la proyección
        setTimeout(() => {
          this.router.navigate(['/usuarios/proyeccion-compras'], {
            state: {
              proyeccionEnviada: true,
              folio: response.folio,
              totalBicicletas: response.total_bicicletas,
              totalProyeccion: response.total_proyeccion,
              nivelCliente: this.nivelCliente,
              compromisoCliente: this.compromisoCliente
            }
          });
        }, 2000);
      },
      error: (error) => {
        console.error('Error al enviar proyección:', error);
        this.alertaService.mostrarError('Ocurrió un error al enviar la proyección');
      }
    });
  }

  // Métodos de ayuda para la UI
  getCantidadProyectada(): number {
    return this.proyecciones.filter(item =>
      Object.keys(item.disponibilidad).some(key =>
        (item[key as keyof Proyeccion] as number) > 0
      )
    ).length;
  }

  calcularTotalProyeccion(): number {
    return this.proyecciones.reduce((total, item) => {
      const sumaCantidades = Object.keys(item.disponibilidad).reduce((sum, key) =>
        sum + (item[key as keyof Proyeccion] as number || 0), 0);
      return total + (sumaCantidades * this.getPrecioCliente(item));
    }, 0);
  }

  calcularTotalBicicletas(): number {
    return this.proyecciones.reduce((total, item) =>
      total + Object.keys(item.disponibilidad).reduce((sum, key) =>
        sum + (item[key as keyof Proyeccion] as number || 0), 0), 0);
  }

  // Agregar este nuevo método a la clase CrearProyeccionUsuariosComponent
  calcularMontosPorQuincena(): { [key: string]: number } {
    const montos: { [key: string]: number } = {
      'q1_sep_2025': 0,
      'q2_sep_2025': 0,
      'q1_oct_2025': 0,
      'q2_oct_2025': 0,
      'q1_nov_2025': 0,
      'q2_nov_2025': 0,
      'q1_dic_2025': 0,
      'q2_dic_2025': 0,
      'q1_mar_2026': 0,
      'q2_mar_2026': 0,
      'q1_abr_2026': 0,
      'q2_abr_2026': 0,
      'q1_may_2026': 0,
      'q2_may_2026': 0
    };

    this.proyecciones.forEach(item => {
      const precio = this.getPrecioCliente(item);
      Object.keys(montos).forEach(quincena => {
        const cantidad = item[quincena as keyof Proyeccion] as number || 0;
        montos[quincena] += cantidad * precio;
      });
    });

    return montos;
  }

  // Agregar este método auxiliar
  formatearNombreQuincena(key: string): string {
    const [quincena, mes, año] = key.split('_');

    const meses: { [key: string]: string } = {
      'sep': 'Septiembre',
      'oct': 'Octubre',
      'nov': 'Noviembre',
      'dic': 'Diciembre',
      'mar': 'Marzo',
      'abr': 'Abril',
      'may': 'Mayo'
    };

    const numeroQuincena = quincena === 'q1' ? '1er' : '2da';

    return `${numeroQuincena} Quincena ${meses[mes] || mes} ${año}`;
  }

  contarMontosPositivos(): number {
    const montos = this.calcularMontosPorQuincena();
    return Object.values(montos).filter(monto => monto > 0).length;
  }

  mostrarModalMontos(): void {
    this.mostrarModal = true;
    document.body.style.overflow = 'hidden'; // Evita el scroll del body
  }

  cerrarModal(event?: MouseEvent): void {
    // Cierra solo si se hace clic fuera del contenido o en el botón de cerrar
    if (!event || (event.target as HTMLElement).classList.contains('modal-montos')) {
      this.mostrarModal = false;
      document.body.style.overflow = '';
    }
  }

  tieneMontos(): boolean {
    if (!this.proyecciones) return false;
    return this.proyecciones.some(item =>
      (item.q1_sep_2025 && item.q1_sep_2025 > 0) ||
      (item.q2_sep_2025 && item.q2_sep_2025 > 0) ||
      (item.q1_oct_2025 && item.q1_oct_2025 > 0) ||
      (item.q2_oct_2025 && item.q2_oct_2025 > 0) ||
      (item.q1_nov_2025 && item.q1_nov_2025 > 0) ||
      (item.q2_nov_2025 && item.q2_nov_2025 > 0) ||
      (item.q1_dic_2025 && item.q1_dic_2025 > 0) ||
      (item.q2_dic_2025 && item.q2_dic_2025 > 0) ||
      (item.q1_mar_2026 && item.q1_mar_2026 > 0) ||
      (item.q2_mar_2026 && item.q2_mar_2026 > 0) ||
      (item.q1_abr_2026 && item.q1_abr_2026 > 0) ||
      (item.q2_abr_2026 && item.q2_abr_2026 > 0) ||
      (item.q1_may_2026 && item.q1_may_2026 > 0) ||
      (item.q2_may_2026 && item.q2_may_2026 > 0)
    );
  }

  // Agregar estos métodos a la clase
  toggleSortDropdown(): void {
    this.showSortDropdown = !this.showSortDropdown;
  }

  sortByDescription(direction: 'asc' | 'desc'): void {
    this.currentSortDirection = direction;
    this.showSortDropdown = false;

    // Resetear a la primera página al ordenar
    this.paginaActual = 1;
    this.paginaActualTemp = 1;

    // Hacer una copia del array para ordenar
    const proyeccionesOrdenadas = [...this.proyecciones];

    proyeccionesOrdenadas.sort((a, b) => {
      const claveA = this.normalizarParaOrden(a.descripcion);
      const claveB = this.normalizarParaOrden(b.descripcion);

      // Comparar modelo base
      const modeloA = claveA.split('_')[0];
      const modeloB = claveB.split('_')[0];
      const comparisonModelo = modeloA.localeCompare(modeloB);
      if (comparisonModelo !== 0) {
        return direction === 'asc' ? comparisonModelo : -comparisonModelo;
      }

      // Comparar versión numérica
      const versionA = claveA.split('_')[1];
      const versionB = claveB.split('_')[1];
      const comparisonVersion = versionA.localeCompare(versionB);
      if (comparisonVersion !== 0) {
        return direction === 'asc' ? comparisonVersion : -comparisonVersion;
      }

      // Comparar año (MY26)
      const añoA = claveA.split('_')[2];
      const añoB = claveB.split('_')[2];
      const comparisonAño = añoA.localeCompare(añoB);
      if (comparisonAño !== 0) {
        return direction === 'asc' ? comparisonAño : -comparisonAño;
      }

      // Comparar variante
      const varianteA = claveA.split('_')[3];
      const varianteB = claveB.split('_')[3];
      return direction === 'asc'
        ? varianteA.localeCompare(varianteB)
        : varianteB.localeCompare(varianteA);
    });

    this.proyecciones = proyeccionesOrdenadas;
    this.actualizarPaginado();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Verificar si el click fue en cualquier elemento que no sea parte del filtro
    const isFilterElement = target.closest('.sort-dropdown') ||
      target.closest('.filter-options') ||
      target.closest('.filter-item') ||
      target.closest('.filter-search') ||
      target.closest('.filter-actions');

    if (!isFilterElement) {
      this.showSortDropdown = false;
      this.showRefFilter = false;
      this.showModeloFilter = false;
    }
  }

  // Métodos para el filtro de Referencia
  toggleRefFilter(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation(); // Esto evita que el evento llegue al HostListener
    }
    this.showRefFilter = !this.showRefFilter;
    if (this.showRefFilter && this.refOptions.length === 0) {
      this.initializeRefOptions();
    }
  }

  initializeRefOptions(): void {
    const uniqueRefs = [...new Set(this.proyecciones.map(p => p.referencia))];
    this.refOptions = uniqueRefs.map(ref => ({
      value: ref,
      selected: this.selectedRefs.includes(ref)
    }));
    this.filteredRefOptions = [...this.refOptions];
  }

  filterRefOptions(): void {
    if (!this.refSearchTerm) {
      this.filteredRefOptions = [...this.refOptions];
      return;
    }
    const term = this.refSearchTerm.toLowerCase();
    this.filteredRefOptions = this.refOptions.filter(option =>
      option.value.toLowerCase().includes(term)
    );
  }

  applyRefFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedRefs = this.refOptions
      .filter(option => option.selected)
      .map(option => option.value);
    this.applyFilters();
    // No cerrar automáticamente
  }

  clearRefFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.refOptions.forEach(option => option.selected = false);
    this.selectedRefs = [];
    this.referenciaFilterCount = 0;
    this.applyFilters();
    // No cerrar automáticamente
  }

  toggleModeloFilter(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.showModeloFilter = !this.showModeloFilter;
    if (this.showModeloFilter && this.modeloOptions.length === 0) {
      this.initializeModeloOptions();
    }
  }

  initializeModeloOptions(): void {
    const uniqueModelos = [...new Set(this.proyecciones.map(p => p.modelo))];
    this.modeloOptions = uniqueModelos.map(modelo => ({
      value: modelo,
      selected: this.selectedModelos.includes(modelo)
    }));
    this.filteredModeloOptions = [...this.modeloOptions];
  }

  filterModeloOptions(): void {
    if (!this.modeloSearchTerm) {
      this.filteredModeloOptions = [...this.modeloOptions];
      return;
    }
    const term = this.modeloSearchTerm.toLowerCase();
    this.filteredModeloOptions = this.modeloOptions.filter(option =>
      option.value.toLowerCase().includes(term)
    );
  }

  applyModeloFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedModelos = this.modeloOptions
      .filter(option => option.selected)
      .map(option => option.value);
    this.modeloFilterCount = this.selectedModelos.length;
    this.applyFilters();
    // No cerrar automáticamente
  }

  clearModeloFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.modeloOptions.forEach(option => option.selected = false);
    this.selectedModelos = [];
    this.modeloFilterCount = 0;
    this.applyFilters();
    // No cerrar automáticamente
  }

  applyFilters(): void {
    let filteredData = [...this.proyecciones];

    // Aplicar filtro de referencia
    if (this.selectedRefs.length > 0) {
      filteredData = filteredData.filter(p =>
        this.selectedRefs.includes(p.referencia)
      );
    }

    // Aplicar filtro de modelo
    if (this.selectedModelos.length > 0) {
      filteredData = filteredData.filter(p =>
        this.selectedModelos.includes(p.modelo)
      );
    }

    // Actualizar datos paginados
    this.proyeccionesPaginadas = filteredData.slice(
      (this.paginaActual - 1) * this.itemsPorPagina,
      this.paginaActual * this.itemsPorPagina
    );

    // Recalcular total de páginas
    this.totalPaginas = Math.ceil(filteredData.length / this.itemsPorPagina);
  }

  actualizarPaginadoConFiltros(filteredData: Proyeccion[]): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.proyeccionesPaginadas = filteredData.slice(inicio, fin);
    this.totalPaginas = Math.ceil(filteredData.length / this.itemsPorPagina);
  }

  onCheckboxChange(): void {
    // Solo actualiza los contadores pero no cierra el dropdown
    this.referenciaFilterCount = this.refOptions.filter(o => o.selected).length;
    this.modeloFilterCount = this.modeloOptions.filter(o => o.selected).length;
  }
}
