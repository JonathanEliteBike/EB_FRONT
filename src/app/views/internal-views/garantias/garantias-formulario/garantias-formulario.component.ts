import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { GarantiasService } from '../../../../services/garantias.service';
import { AuthService } from '../../../../services/auth.service';

export interface SeccionDef {
  id: number;
  label: string;
  isVisible: (d: any) => boolean;
}

export const DISTRIBUIDORES: string[] = [
  'ADAN JOSUE SUAREZ HERNANDEZ',
  'ADAN ORTEGA LEON',
  'ADVENTURE BIKE RIDER',
  'ALBERTO DÍAZ DE LEÓN ALONSO',
  'ALEXIS JASIEL CONCHA ESPIRITU',
  'ANA CECILIA LOPEZ LOPEZ',
  'ANGELICA OSORIO GASPERIN',
  'ARTURO LUNA ROMERO',
  'ATV MOTO POWERSPORTS',
  'BERTHA LIGIA LAMELAS DOMINGUEZ',
  'BICICLETAS SCJM',
  'BIKES MART',
  'BIKES95CYCLINGCLUB',
  'BLANCA ISABEL DIAZ ALDECO RODRIGUEZ',
  'BROTHERS BIKE',
  'CARLOS ALBERTO CRUZ CALVA',
  'CARLOS DOMINGUEZ TOLEDO',
  'CHRISTIAN BOCCALETTI',
  'CHRISTOPHER WALTER BASSAM',
  'CICLISMO EXTREMO',
  'CYCLING RIDING DE MEXICO',
  'DANIEL CRUZ ARRIETA',
  'DEPORTES TEXCOCO',
  'EDUARDO FRANCISCO MENDOZA NIETO',
  'EDUARDO LUNA LOPEZ',
  'EL PAJE TIENDAS DEPARTAMENTALES SA DE CV',
  'ELITE CYCLERY',
  'FERNANDO PONTON ROCHA',
  'FRANCISCO AGUILAR MORALES',
  'FRANCISCO DAVID FRAGOSO DEL RIO',
  'FRANCISCO MACHUCA ROJAS',
  'GO LEMON',
  'GRAND MOTOR SPORTS',
  'GUADALUPE GONZALEZ REYES',
  'H & A BIKES MEXICO',
  'HABROS BICICLETAS',
  'HUGO ALLAN GARCIA MACIAS',
  'IVAN MARTINEZ CARRILLO',
  'IVAN NIEVES AYALA',
  'JESSICA FERNANDA JURADO CUETO',
  'JESUS EUDON FLORES NOVOA',
  'JESUS IVAN PEREZ CAVAZOS',
  'JESUS MANUEL MEDRANO VELARDE',
  'JORGE FLORES LIMA',
  'JORGE JUAN VILLA MARTINEZ',
  'JOSE ANGEL DIAZ CORTES',
  'JOSE MANUEL VAZQUEZ PACHECO',
  'JOSE RICARDO GAMBOA MANRIQUE',
  'JUAN JOSE DE RUEDA MUÑOZ',
  'JUAN JOSE GARCIA MEDRANO',
  'JUAN MANUEL RUACHO RANGEL',
  'JULIAN ERNESTO CURIEL JIMENEZ',
  'LIVING FOR BIKES',
  'LUCIA SALAZAR LOPEZ',
  'MANUEL ALEJANDRO NAVARRO GONZALEZ',
  'MANUEL DE JESUS SOTO ACOSTA',
  'MARCO ANTONIO GARCIA VEJAR',
  'MARCO TULIO ANDRADE NAVARRO',
  'MARIA CRISTINA QUINTERO MILLAN',
  'MARIA GUADALUPE GODINEZ FERNANDEZ',
  'MARKETER AYV',
  'MIGUEL ANGEL ORTIZ CASTAÑEDA',
  'NARUCO',
  'OPCIONES CREATIVAS',
  'ORIOI MEDRANO CESPEDES',
  'OSIRIS ONDAL DELFIN',
  'PAULINA ALVAREZ FERNANDEZ',
  'RAMON DE JESUS MARTINEZ LOPEZ',
  'RAUL INFANTE MIRANDA',
  'RAUL MENA ORTIZ',
  'RICARDO REYES GOMEZ',
  'ROCIO CABALLERO CORONEL',
  'RODRIGO AMADOR RAMIREZ',
  'RUTA 87 BIKE STORE',
  'TUNING AUTOSPORT',
  'VICTOR ALBERTO VILLASEÑOR RUIZ',
  'VICTOR ALEJANDRO GARNIER MORGA',
  'VICTOR HUGO VILLANUEVA GUZMAN',
  'XAVIER JAMES LORD SANTOS',
  'ZIRANDA CAPINDA MADRIGAL ALVAREZ UGENA',
];

export const SECCIONES: SeccionDef[] = [
  { id: 1,  label: 'Información del Solicitante',           isVisible: () => true },
  { id: 2,  label: 'Datos del Distribuidor',                isVisible: () => true },
  // MEGAMO / BOLD
  { id: 3,  label: 'Producto MEGAMO / BOLD',                isVisible: d => d.marca === 'MEGAMO' || d.marca === 'BOLD' },
  // SCOTT path
  { id: 4,  label: 'Grupo de Productos SCOTT',              isVisible: d => d.marca === 'SCOTT' },
  { id: 5,  label: 'Cascos — Datos del Producto',           isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cascos' },
  { id: 6,  label: 'Cascos — Descripción del Daño',         isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cascos' },
  { id: 7,  label: 'Protecciones — Datos del Producto',     isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Protecciones' },
  { id: 8,  label: 'Protecciones — Descripción del Daño',   isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Protecciones' },
  { id: 9,  label: 'Zapatos — Datos del Producto',          isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Zapatos' },
  { id: 10, label: 'Zapatos — Descripción del Daño',        isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Zapatos' },
  { id: 11, label: 'Componentes — Datos del Producto',      isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Componentes' },
  { id: 12, label: 'Componentes — Descripción del Daño',    isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Componentes' },
  { id: 13, label: 'Documentos de Soporte SCOTT',           isVisible: d => d.marca === 'SCOTT' && d.scott_grupo !== 'Cuadros' && !!d.scott_grupo },
  { id: 14, label: 'SCOTT Cuadros — Datos',                 isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' },
  { id: 15, label: 'Daño en Marco — Doble Suspensión',      isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Doble suspensión' },
  { id: 16, label: 'Daño en Marco — Rígida',                isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Rígida' },
  { id: 17, label: 'Daño en Marco — Plasma',                isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Plasma' },
  { id: 18, label: 'Daño en Marco — Foil',                  isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Foil' },
  { id: 19, label: 'Daño en Marco — Ruta',                  isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Ruta' },
  { id: 20, label: 'Daño en Marco — Gravel',                isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'Gravel' },
  { id: 21, label: 'Daño en Marco — E-Ride',                isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' && d.scott_tipo_marco === 'E-Ride' },
  { id: 22, label: 'Documentos de Soporte — Cuadros',       isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' },
  // SYNCROS path
  { id: 23, label: 'SYNCROS — Tipo de Producto',            isVisible: d => d.marca === 'SYNCROS' },
  { id: 24, label: 'Manubrios — Datos del Producto',        isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Manubrios' },
  { id: 25, label: 'Manubrios — Descripción del Daño',      isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Manubrios' },
  { id: 26, label: 'Asientos — Datos del Producto',         isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Asientos' },
  { id: 27, label: 'Asientos — Descripción del Daño',       isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Asientos' },
  { id: 28, label: 'Poste — Datos del Producto',            isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Poste' },
  { id: 29, label: 'Poste — Descripción del Daño',          isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Poste' },
  { id: 30, label: 'Ruedos/Rines — Datos del Producto',     isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Ruedos/Rines' },
  { id: 31, label: 'Ruedos/Rines — Descripción del Daño',   isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Ruedos/Rines' },
  // VITTORIA path
  { id: 32, label: 'VITTORIA — Datos del Producto',         isVisible: d => d.marca === 'VITTORIA' },
  { id: 33, label: 'VITTORIA — Descripción del Daño',       isVisible: d => d.marca === 'VITTORIA' },
  // Always last
  { id: 34, label: 'Términos y Condiciones',                isVisible: () => true },
];

@Component({
  selector: 'app-garantias-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent],
  templateUrl: './garantias-formulario.component.html',
  styleUrl: './garantias-formulario.component.css',
})
export class GarantiasFormularioComponent implements OnInit, OnDestroy {

  private readonly STORAGE_KEY = 'garantias_form_draft';
  private autoSaveInterval?: ReturnType<typeof setInterval>;
  readonly distribuidores = DISTRIBUIDORES;
  readonly secciones = SECCIONES;
  readonly marcas = ['SCOTT', 'SYNCROS', 'VITTORIA', 'BOLD', 'MEGAMO'];
  readonly scottGrupos = ['Cuadros', 'Cascos', 'Protecciones', 'Zapatos', 'Componentes'];
  readonly tiposMarco = ['Doble suspensión', 'Rígida', 'Plasma', 'Foil', 'Ruta', 'Gravel', 'E-Ride'];
  readonly tiposComponente = ['Bosch', 'Mahle', 'TQ', 'AVINOX'];
  readonly syncrosTipos = ['Manubrios', 'Asientos', 'Poste', 'Ruedos/Rines'];
  readonly megamoGrupos = ['Cuadros', 'Componentes'];

  readonly tiposDano = [
    'Rayado', 'BB ID DIMENSION', 'Roto', 'Asimétrico',
    'Hilo Defectuoso', 'Soldadura de Unión Defectuosa',
    'Color de la Capa Base Defectuoso', 'Burbujas de Aire',
    'Línea de Separación del Molde', 'Otros',
  ];

  // Partes exactas según diagrama oficial SCOTT (marcos rígidos)
  private readonly PARTES_RIGIDA = [
    '1 - DROP OUT LEFT',
    '2 - BRAKE BOSSES',
    '3 - DROP OUT RIGHT',
    '4 - CHAIN STAY LEFT REAR END',
    '5 - SEAT STAY LEFT REAR END',
    '6 - SEAT STAY RIGHT REAR END',
    '7 - CHAIN STAY RIGHT REAR END',
    '8 - CHAIN STAY LEFT MIDDLE',
    '9 - CHAIN STAY RIGHT MIDDLE',
    '10 - SEAT STAY LEFT MIDDLE',
    '11 - SEAT STAY RIGHT MIDDLE',
    '12 - CHAIN STAY LEFT FRONT END',
    '13 - SEAT STAY RIGHT FRONT END',
    '14 - SEAT STAY LEFT FRONT END',
    '15 - SEAT LUG',
    '16 - SEAT TUBE LOWER END',
    '17 - SEAT TUBE MIDDLE',
    '18 - SEAT TUBE TOP END',
    '19 - BB-HOUSING',
    '20 - TOP TUBE REAR END',
    '21 - DOWN TUBE REAR END',
    '22 - TOP TUBE MIDDLE',
    '23 - DOWN TUBE MIDDLE',
    '24 - TOP TUBE FRONT END',
    '25 - DOWN TUBE FRONT END',
    '26 - HEAD TUBE TOP END',
    '27 - HEAD TUBE MIDDLE',
    '28 - HEAD TUBE LOWER END',
  ];

  // Partes exactas según diagrama oficial SCOTT (marcos con suspensión: Doble Suspensión / E-Ride)
  private readonly PARTES_SUSPENSION = [
    '1 - DROP OUT LEFT',
    '2 - BRAKE BOSSES',
    '3 - DROP OUT RIGHT',
    '4 - CHAIN STAY LEFT REAR END',
    '5 - SEAT STAY LEFT REAR END',
    '6 - SEAT STAY RIGHT REAR END',
    '7 - CHAIN STAY RIGHT REAR END',
    '8 - CHAIN STAY LEFT MIDDLE',
    '9 - CHAIN STAY RIGHT MIDDLE',
    '10 - SEAT STAY LEFT MIDDLE',
    '11 - SEAT STAY RIGHT MIDDLE',
    '12 - CHAIN STAY LEFT FRONT END',
    '13 - SEAT STAY RIGHT FRONT END',
    '14 - SEAT STAY LEFT FRONT END',
    '15 - SEAT LUG',
    '16 - SEAT TUBE LOWER END',
    '17 - SEAT TUBE MIDDLE',
    '18 - SEAT STAY TOP END',
    '19 - SEAT TUBE TOP END',
    '20 - SHOCK MOUNT SWINGARM',
    '21 - BB-HOUSING',
    '22 - TOP TUBE REAR END',
    '23 - RIVERS E.G FOR BOTTLECAGE',
    '24 - DOWN TUBE REAR END',
    '25 - TOP TUBE MIDDLE',
    '26 - DOWN TUBE MIDDLE',
    '27 - TOP TUBE FRONT END',
    '28 - DOWN TUBE FRONT END',
    '29 - HEAD TUBE TOP END',
    '30 - HEAD TUBE MIDDLE',
    '31 - HEAD TUBE LOWER END',
  ];

  private readonly PARTES_MARCO: Record<string, string[]> = {
    'Doble suspensión': this.PARTES_SUSPENSION,
    'E-Ride':           this.PARTES_SUSPENSION,
    'Rígida':           this.PARTES_RIGIDA,
    'Plasma':           this.PARTES_RIGIDA,
    'Foil':             this.PARTES_RIGIDA,
    'Ruta':             this.PARTES_RIGIDA,
    'Gravel':           this.PARTES_RIGIDA,
  };

  getPartes(tipoMarco: string): string[] {
    return this.PARTES_MARCO[tipoMarco] ?? this.PARTES_RIGIDA;
  }

  formData: any = {};
  uploadedFiles: { [campo: string]: string } = {};
  uploadingFields: { [campo: string]: boolean } = {};

  currentStepIdx = 0;
  enviando = false;
  exito = false;
  folio = '';
  errorMensaje = '';

  // Admin-only assignment
  esAdmin = false;
  usuariosDisponibles: { id: number; nombre: string; correo: string; usuario: string; rol: string }[] = [];
  emailAsignado = '';
  busquedaUsuario = '';
  mostrarListaUsuarios = false;
  usuarioAsignado: { id: number; nombre: string; correo: string; usuario: string } | null = null;

  get usuariosFiltrados() {
    const q = this.busquedaUsuario.toLowerCase().trim();
    const lista = q
      ? this.usuariosDisponibles.filter(u =>
          (u.usuario ?? '').toLowerCase().includes(q) ||
          (u.nombre  ?? '').toLowerCase().includes(q))
      : this.usuariosDisponibles;
    return lista.slice(0, 30);
  }

  seleccionarUsuario(u: { id: number; nombre: string; correo: string; usuario: string }): void {
    this.usuarioAsignado   = u;
    this.emailAsignado     = u.correo;
    this.busquedaUsuario   = u.usuario;
    this.mostrarListaUsuarios = false;
  }

  limpiarAsignacion(): void {
    this.usuarioAsignado      = null;
    this.emailAsignado        = '';
    this.busquedaUsuario      = '';
    this.mostrarListaUsuarios = false;
  }

  cerrarListaConDelay(): void {
    setTimeout(() => { this.mostrarListaUsuarios = false; }, 200);
  }

  constructor(private svc: GarantiasService, private cdr: ChangeDetectorRef, private auth: AuthService) {}

  // ── Alerta al recargar/cerrar pestaña ────────────────────────────────────
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.tieneProgreso) {
      // Marcar que el usuario vio el diálogo de confirmación.
      // Si confirma (recarga/cierra), esta flag persiste en sessionStorage
      // y restaurarBorrador() la detecta para limpiar el draft.
      sessionStorage.setItem('garantias_reload_pending', 'true');
      e.preventDefault();
      e.returnValue = '';
    }
  }

  private get tieneProgreso(): boolean {
    return Object.keys(this.formData).length > 0 && !this.exito;
  }

  // ── Persistencia en localStorage ─────────────────────────────────────────
  private guardarBorrador(): void {
    if (!this.exito) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        formData: this.formData,
        uploadedFiles: this.uploadedFiles,
        currentStepIdx: this.currentStepIdx,
      }));
    }
  }

  private restaurarBorrador(): void {
    // Si el usuario confirmó recargar la página, borrar el draft y empezar limpio
    if (sessionStorage.getItem('garantias_reload_pending') === 'true') {
      sessionStorage.removeItem('garantias_reload_pending');
      this.limpiarBorrador();
      return;
    }
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.formData       = saved.formData       ?? {};
      this.uploadedFiles  = saved.uploadedFiles  ?? {};
      this.currentStepIdx = saved.currentStepIdx ?? 0;
    } catch { /* borrador corrupto, ignorar */ }
  }

  private limpiarBorrador(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  ngOnInit(): void {
    this.restaurarBorrador();
    this.autoSaveInterval = setInterval(() => this.guardarBorrador(), 10_000);
    this.esAdmin = this.auth.isAdmin();
    if (this.esAdmin) {
      this.svc.getUsuariosParaAsignar().subscribe({
        next: (us) => {
        this.usuariosDisponibles = (us as any[])
          .filter(u => u.rol !== 'Administrador')
          .map(u => ({ id: u.id, nombre: u.nombre, correo: u.correo, usuario: u.usuario ?? u.nombre, rol: u.rol }));
      },
        error: () => {},
      });
    }
  }

  get visibleSections(): SeccionDef[] {
    return this.secciones.filter(s => s.isVisible(this.formData));
  }

  get currentSection(): SeccionDef {
    return this.visibleSections[this.currentStepIdx] ?? this.secciones[0];
  }

  get isFirstStep(): boolean { return this.currentStepIdx === 0; }
  get isLastStep(): boolean  { return this.currentStepIdx === this.visibleSections.length - 1; }
  get progreso(): number {
    const total = this.visibleSections.length;
    return total ? Math.round(((this.currentStepIdx + 1) / total) * 100) : 0;
  }

  isSectionVisible(id: number): boolean {
    return this.currentSection.id === id;
  }

  ngOnDestroy(): void {
    clearInterval(this.autoSaveInterval);
  }

  next(): void {
    if (!this.isLastStep) {
      this.currentStepIdx++;
      this.errorMensaje = '';
      this.guardarBorrador();
      window.scrollTo({ top: (document.querySelector('app-home-bar') as HTMLElement | null)?.offsetHeight ?? 64, behavior: 'smooth' });
    }
  }

  back(): void {
    if (!this.isFirstStep) {
      this.currentStepIdx--;
      this.errorMensaje = '';
      this.guardarBorrador();
      window.scrollTo({ top: (document.querySelector('app-home-bar') as HTMLElement | null)?.offsetHeight ?? 64, behavior: 'smooth' });
    }
  }

  onMarcaChange(): void {
    // Reset brand-specific selections when brand changes
    this.formData.scott_grupo = null;
    this.formData.scott_tipo_marco = null;
    this.formData.syncros_tipo = null;
    this.formData.megamo_grupo = null;
    // Go back to distributor step if user changes brand mid-form
    const sec2idx = this.visibleSections.findIndex(s => s.id === 2);
    if (sec2idx >= 0) this.currentStepIdx = sec2idx;
  }

  onFileChange(event: Event, campo: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingFields[campo] = true;
    this.cdr.detectChanges();

    this.svc.subirArchivo(file).subscribe({
      next: (res) => {
        this.uploadedFiles[campo] = res.nombre;
        this.formData[campo] = res.nombre;
        this.formData[campo + '_original'] = res.original;
        this.uploadingFields[campo] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploadingFields[campo] = false;
        this.cdr.detectChanges();
      },
    });
  }

  submit(): void {
    if (!this.formData.terminos_aceptados) {
      this.errorMensaje = 'Debe aceptar los términos y condiciones para continuar.';
      return;
    }
    this.enviando = true;
    this.errorMensaje = '';

    const payload = { ...this.formData };
    if (this.esAdmin && this.emailAsignado) {
      payload['email_asignado'] = this.emailAsignado;
    }

    this.svc.enviarFormulario(payload).subscribe({
      next: (res) => {
        this.folio   = res.folio;
        this.exito   = true;
        this.enviando = false;
        this.limpiarBorrador();
        window.scrollTo({ top: (document.querySelector('app-home-bar') as HTMLElement | null)?.offsetHeight ?? 64, behavior: 'smooth' });
      },
      error: () => {
        this.errorMensaje = 'Error al enviar el formulario. Por favor intente de nuevo.';
        this.enviando = false;
      },
    });
  }

  reiniciar(): void {
    this.limpiarBorrador();
    this.formData = {};
    this.uploadedFiles = {};
    this.currentStepIdx = 0;
    this.exito = false;
    this.folio = '';
    this.errorMensaje = '';
  }
}
