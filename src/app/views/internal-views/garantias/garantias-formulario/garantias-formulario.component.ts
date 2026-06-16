import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeBarComponent } from '../../../../components/home-bar/home-bar.component';
import { TitleCaseDirective } from '../../../../directives/title-case.directive';
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
  // BOLD
  { id: 3,  label: 'Producto BOLD',                         isVisible: d => d.marca === 'BOLD' },
  // MEGAMO
  { id: 35, label: 'Producto MEGAMO',                       isVisible: d => d.marca === 'MEGAMO' },
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
  { id: 15, label: 'Daño en Marco — Doble Suspensión',      isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Doble suspensión' },
  { id: 16, label: 'Daño en Marco — Rígida',                isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Rígida' },
  { id: 17, label: 'Daño en Marco — Plasma',                isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Plasma' },
  { id: 18, label: 'Daño en Marco — Foil',                  isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Foil' },
  { id: 19, label: 'Daño en Marco — Ruta',                  isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Ruta' },
  { id: 20, label: 'Daño en Marco — Gravel',                isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'Gravel' },
  { id: 21, label: 'Daño en Marco — E-Ride',                isVisible: d => (d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO') && d.scott_tipo_marco === 'E-Ride' },
  { id: 22, label: 'Documentos de Soporte — Cuadros',       isVisible: d => d.marca === 'SCOTT' && d.scott_grupo === 'Cuadros' || d.marca === 'BOLD' || d.marca === 'MEGAMO' },
  // SYNCROS path
  { id: 23, label: 'SYNCROS — Tipo de Producto',            isVisible: d => d.marca === 'SYNCROS' },
  { id: 24, label: 'Manubrios — Datos del Producto',        isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Manubrios' },
  { id: 25,  label: 'Manubrios — Descripción del Daño',      isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Manubrios' },
  { id: 252, label: 'Manubrios — Documentos',                isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Manubrios' },
  { id: 26,  label: 'Asientos — Datos del Producto',         isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Asientos' },
  { id: 27,  label: 'Asientos — Descripción del Daño',       isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Asientos' },
  { id: 272, label: 'Asientos — Documentos',                 isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Asientos' },
  { id: 28,  label: 'Poste — Datos del Producto',            isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Poste' },
  { id: 29,  label: 'Poste — Descripción del Daño',          isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Poste' },
  { id: 292, label: 'Poste — Documentos',                    isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Poste' },
  { id: 30,  label: 'Ruedos/Rines — Datos del Producto',     isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Ruedos/Rines' },
  { id: 31,  label: 'Ruedos/Rines — Descripción del Daño',   isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Ruedos/Rines' },
  { id: 315, label: 'Ruedos/Rines — Documentos',             isVisible: d => d.marca === 'SYNCROS' && d.syncros_tipo === 'Ruedos/Rines' },
  // VITTORIA path
  { id: 32, label: 'VITTORIA — Datos del Producto',         isVisible: d => d.marca === 'VITTORIA' },
  { id: 33, label: 'VITTORIA — Descripción del Daño',       isVisible: d => d.marca === 'VITTORIA' },
  // Always last
  { id: 34, label: 'Términos y Condiciones',                isVisible: () => true },
];

@Component({
  selector: 'app-garantias-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeBarComponent, TitleCaseDirective],
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
  readonly tiposMarco  = ['Doble suspensión', 'Rígida', 'Plasma', 'Foil', 'Ruta', 'Gravel', 'E-Ride'];
  readonly tiposMarcoB = ['Doble suspensión'];
  readonly tiposMarcoM = ['Doble suspensión', 'Rígida', 'Ruta', 'Gravel', 'E-Ride'];
  readonly tiposComponente = ['Bosch', 'Mahle', 'TQ', 'AVINOX'];
  readonly syncrosTipos = ['Manubrios', 'Asientos', 'Poste', 'Ruedos/Rines'];
  readonly megamoGrupos = ['Cuadros', 'Componentes'];

  readonly syncrosTiposDano = [
    'Raspado', 'Roto', 'Color de la Capa Base Defectuoso', 'Asimétrico', 'Otros',
  ];

  readonly protLocalizaciones = [
    'Cascarón de Plástico',
    'D30 Insert',
    'Relleno / Espuma',
    'Correa / Velcro',
    'Cierre / Cremallera',
    'Hebilla',
    'Tejido',
    'Decoloración',
    'Otros',
  ];
  readonly protTiposDano = [
    'Roto', 'Defecto en Costura', 'Defecto de Armado', 'Rasgado', 'Descolorido', 'Malfunción', 'Otros',
  ];
  readonly tallasProteccion = ['XS', 'S', 'M', 'L', 'XL', 'Unitalla'];

  readonly zapatoLocalizaciones = [
    'Suela', 'Media Suela', 'Suela Interior', 'Empeine', 'Lengua',
    'Forro', 'Contra dedos', 'Contra talon', 'Cordones Ojal',
    'Correa de Velcro', 'Hebilla', 'Sistema de Cordones BOA',
  ];
  readonly zapatoTiposDano = [
    'Costura', 'Delaminación', 'Desgastado', 'Marca de Pegamento',
    'Marca de Impresión', 'Roto', 'Otros',
  ];

  readonly cascoLocalizaciones = [
    'Casco',
    'Visor',
    'Correa',
    'Hebilla de correa',
    'Forro',
    'Sistema de ajuste',
    'Capa baja fricción MIPS',
    'Canasta de ajuste MIPS',
    'Pin de ajuste MIPS',
    'Fijación de gama MIPS',
  ];
  readonly cascoTiposDano = [
    'Roto', 'Descolorido', 'Defecto en Costura', 'Rasgado', 'Malfunción', 'Otros',
  ];

  readonly manubrioLocalizaciones = [
    'Potencia', 'Barra de la base', 'Extension', 'Manubrio',
    'Abrazadera del Manubrio', 'Hardware de la Potencia', 'Otros',
  ];
  readonly asientoLocalizaciones = [
    'Base', 'Almohadilla', 'Riel', 'Otros',
  ];
  readonly posteLocalizaciones = [
    'Poste de Asiento', 'Abrazadera del asiento', 'Cartucho', 'Base', 'Dropper Seatpost', 'Otros',
  ];
  readonly rinLocalizaciones = [
    'Base del Rin', 'Banda del Rin', 'Rayo de Carbon',
    'Nucleo del cascarón', 'Nucleo interno', 'Otros',
  ];
  readonly rinTiposDano = [
    'Roto', 'Asimétrico', 'Delaminación',
    'Color de la Capa Base Defectuoso', 'Otros',
  ];

  readonly tiposDano = [
    'Rayado', 'BB ID DIMENSION', 'Roto', 'Asimétrico',
    'Hilo Defectuoso', 'Soldadura de Unión Defectuosa',
    'Color de la Capa Base Defectuoso', 'Burbujas de Aire',
    'Línea de Separación del Molde', 'Otros',
  ];

  // Partes exactas según diagrama oficial SCOTT (marcos rígidos)
  private readonly PARTES_RIGIDA = [
    '1 - DROP OUT LEFT',
    '2 - SEAT STAY LEFT REAR END',
    '3 - CHAIN STAY LEFT REAR END',
    '4 - BRAKE BOSSES',
    '5 - DROP OUT RIGHT',
    '6 - SEAT STAY RIGHT REAR END',
    '7 - CHAIN STAY LEFT MIDDLE',
    '8 - SEAT STAY LEFT MIDDLE',
    '9 - CHAIN STAY RIGHT REAR END',
    '10 - CHAIN STAY LEFT FRONT END',
    '11 - SEAT STAY RIGHT MIDDLE',
    '12 - CHAIN STAY RIGHT MIDDLE',
    '13 - SEAT STAY LEFT FRONT END',
    '14 - SEAT STAY RIGHT FRONT END',
    '15 - CHAIN STAY RIGHT FRONT END',
    '16 - SEAT TUBE TOP END',
    '17 - SEAT LUG',
    '18 - SEAT TUBE MIDDLE',
    '19 - SEAT TUBE LOWER END',
    '20 - BB HOUSING',
    '21 - TOP TUBE REAR END',
    '22 - DOWN TUBE REAR END',
    '23 - RIVETS E.G FOR BOTTLECAGE',
    '24 - TOP TUBE MIDDLE',
    '25 - DOWN TUBE MIDDLE',
    '26 - TOP TUBE FRONT END',
    '27 - DOWN TUBE FRONT END',
    '28 - HEAD TUBE TOP END',
    '29 - HEAD TUBE MIDDLE',
    '30 - HEAD TUBE LOWER END',
  ];

  // Partes exactas según diagrama oficial SCOTT (marcos con suspensión: Doble Suspensión / E-Ride)
  private readonly PARTES_SUSPENSION = [
    '1 - DROP OUT LEFT',
    '2 - CHAIN STAY LEFT REAR END',
    '3 - SEAT STAY LEFT REAR END',
    '4 - BRAKE BOSSES',
    '5 - DROP OUT RIGHT',
    '6 - CHAIN STAY RIGHT REAR END',
    '7 - CHAIN STAY LEFT MIDDLE',
    '8 - SEAT STAY RIGHT REAR END',
    '9 - SEAT STAY LEFT MIDDLE',
    '10 - CHAIN STAY RIGHT MIDDLE',
    '11 - CHAIN STAY LEFT FRONT END',
    '12 - SEAT STAY RIGHT MIDDLE',
    '13 - SEAT STAY LEFT FRONT END',
    '14 - CHAIN STAY RIGHT FRONT END',
    '15 - SEAT STAY RIGHT FRONT END',
    '16 - SHOCK MOUNT SWINGRAM',
    '17 - SEAT TUBE TOP END',
    '18 - SEAT LUG',
    '19 - SEAT TUBE MIDDLE',
    '20 - BB HOUSING',
    '21 - SEAT TUBE LOWER END',
    '22 - DOWN TUBE REAR END',
    '23 - TOP TUBE REAR END',
    '24 - RIVETS E.G FOR BOTTLECAGE',
    '25 - TOP TUBE MIDDLE',
    '26 - DOWN TUBE MIDDLE',
    '27 - TOP TUBE FRONT END',
    '28 - DOWN TUBE FRONT END',
    '29 - HEAD TUBE TOP END',
    '30 - HEAD TUBE MIDDLE',
    '31 - HEAD TUBE LOWER END',
  ];

  private readonly PARTES_PLASMA = [
    '1 - DROP OUT LEFT',
    '2 - SEAT STAY LEFT REAR END',
    '3 - CHAIN STAY LEFT REAR END',
    '4 - BRAKE BOSSES',
    '5 - DROP OUT RIGHT',
    '6 - SEAT STAY RIGHT REAR END',
    '7 - SEAT STAY RIGHT REAR END',
    '8 - CHAIN STAY RIGHT REAR END',
    '9 - SEAT STAY RIGHT MIDDLE',
    '10 - CHAIN STAY LEFT MIDDLE',
    '11 - SEAT STAY LEFT FRONT END',
    '12 - SEAT LUG',
    '13 - SEAT STAY RIGHT FRONT END',
    '14 - CHAIN STAY RIGHT FRONT END',
    '15 - SEAT TUBE TOP END',
    '16 - CHAIN STAY FRONT END',
    '17 - TOP TUBE REAR END',
    '18 - SEAT TUBE MIDDLE',
    '19 - CHAIN STAY RIGHT FRONT END',
    '20 - SEAT TUBE LOWER END',
    '21 - BB HOUSTING',
    '22 - DOWN TUBE REAR END',
    '23 - TOP TUBE MIDDLE',
    '24 - RIVETS E.G FOR BOTTLECAGE',
    '25 - DOWN TUBE MIDDLE',
    '26 - TOP TUBE FRONT END',
    '27 - DOWN TUBE FRONT END',
    '28 - HEAD TUBE TOP END',
    '29 - HEAD TUBE MIDDLE',
    '30 - HEAD TUBE LOWER END',
  ];

  private readonly PARTES_FOIL = [
    '1 - DROP OUT LEFT',
    '2 - SEAT STAY LEFT REAR END',
    '3 - CHAIN STAY LEFT REAR END',
    '4 - DROP OUT RIGHT',
    '5 - CHAIN STAY LEFT MIDDLE',
    '6 - SEAT STAY RIGHT REAR END',
    '7 - CHAIN STAY RIGHT REAR END',
    '8 - CHAIN STAY LEFT MIDDLE',
    '9 - SEAT STAY RIGHT MIDDLE',
    '10 - SEAT STAY LEFT FRONT END',
    '11 - SEAT LUG',
    '12 - SEAT STAY RIGHT FRONT END',
    '13 - CHAIN STAY FRONT END',
    '14 - CHAIN STAY RIGHT MIDDLE',
    '15 - SEAT TUBE TOP END',
    '16 - SEAT TUBE MIDDLE',
    '17 - TOP TUBE REAR END',
    '18 - CHAIN STAY RIGHT FRONT END',
    '19 - SEAT TUBE LOWER END',
    '20 - BB-HOUSTING',
    '21 - DOWN TUBE REAR END',
    '22 - TOP TUBE MIDDLE',
    '23 - RIVES E.G FOR BOTTLECAGE',
    '24 - DOWN TUBE MIDDLE',
    '25 - TOP TUBE FRONT END',
    '26 - DOWN TUBE FRONT END',
    '27 - HEAD TUBE TOP END',
    '28 - HEAD TUBE MIDDLE',
    '29 - HEAD TUBE LOWER END',
  ];

  private readonly PARTES_RUTA = [
    '1 - DROP OUT LEFT',
    '2 - SEAT STAY LEFT REAR END',
    '3 - BRAKE BOSSES',
    '4 - CHAIN STAY LEFT REAR END',
    '5 - DROP OUT RIGHT',
    '6 - CHAIN STAY LEFT MIDDLE',
    '7 - SEAT STAY RIGHT REAR END',
    '8 - CHAIN STAY RIGHT REAR END',
    '9 - CHAIN STAY LEFT MIDDLE',
    '10 - SEAT STAY RIGHT MIDDLE',
    '11 - SEAT STAY LEFT FRONT END',
    '12 - CHAIN STAY RIGHT MIDDLE',
    '13 - CHAIN STAY LEFT FRONT END',
    '14 - SEAT TUBE RIGHT FRONT END',
    '15 - SEAT LUG',
    '16 - CHAIN STAY RIGHT FRONT END',
    '17 - SEAT TUBE TOP END',
    '18 - SEAT TUBE MIDDLE',
    '19 - SEAT TUBE LOWER END',
    '20 - FRONT DERAILLEUR HANGER',
    '21 - TOP TUBE REAR END',
    '22 - BB-HOUSING',
    '23 - DOWN TUBE REAR END',
    '24 - RIVETS E.G. FOR BOTTLECAGE',
    '25 - TOP TUBE MIDDLE',
    '26 - DOWN TUBE MIDDLE',
    '27 - TOP TUBE FRONT END',
    '28 - DOWN TUBE FRONT END',
    '29 - HEAD TUBE TOP END',
    '30 - HEAD TUBE LOWER END',
    '31 - HEAD TUBE MIDDLE',
  ];

  private readonly PARTES_GRAVEL = [
    '1 - DROP OUT LEFT',
    '2 - SEAT STAY LEFT REAR END',
    '3 - CHAIN STAY LEFT REAR END',
    '4 - DROP OUT RIGHT',
    '5 - SEAT STAY RIGHT REAR END',
    '6 - CHAIN STAY RIGHT REAR END',
    '7 - SEAT STAY LEFT MIDDLE',
    '8 - CHAIN STAY LEFT MIDDLE',
    '9 - SEAT STAY RIGHT MIDDLE',
    '10 - CHAIN STAY RIGHT MIDDLE',
    '11 - SEAT STAY LEFT FRONT END',
    '12 - CHAIN STAY LEFT FRONT END',
    '13 - SEAT STAY RIGHT FRONT END',
    '14 - CHAIN STAY RIGHT FRONT END',
    '15 - SEAT LUG',
    '16 - SEAT TUBE TOP END',
    '17 - SEAT TUBE MIDDLE',
    '18 - SEAT TUBE LOWER END',
    '19 - TOP TUBE REAR END',
    '20 - BB-HOUSING',
    '21 - DOWN TUBE REAR END',
    '22 - RIVETS E.G. FOR BOTTLECAGE',
    '23 - TOP TUBE MIDDLE',
    '24 - DOWN TUBE MIDDLE',
    '25 - DOWN TUBE FRONT END',
    '26 - TOP TUBE FRONT END',
    '27 - HEAD TUBE TOP END',
    '28 - HEAD TUBE MIDDLE',
    '29 - HEAD TUBE LOWER END',
  ];

  private readonly PARTES_ERIDE = [
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
    '13 - CHAIN STAY RIGHT FRONT END',
    '14 - SEAT STAY RIGHT FRONT END',
    '15 - SEAT STAY LEFT FRONT END',
    '16 - SEAT TUBE TOP END',
    '17 - SEAT LUG',
    '18 - SEAT TUBE LOWER END',
    '19 - SEAT TUBE MIDDLE',
    '20 - SHOCK MOUNT SWINGARM',
    '21 - BB-HOUSING',
    '22 - TOP TUBE REAR END',
    '23 - RIVETS E.G FOR BOTTLECAGE',
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
    'E-Ride':           this.PARTES_ERIDE,
    'Rígida':           this.PARTES_RIGIDA,
    'Plasma':           this.PARTES_PLASMA,
    'Foil':             this.PARTES_FOIL,
    'Ruta':             this.PARTES_RUTA,
    'Gravel':           this.PARTES_GRAVEL,
  };

  getPartes(tipoMarco: string): string[] {
    return this.PARTES_MARCO[tipoMarco] ?? this.PARTES_RIGIDA;
  }

  formData: any = {};
  uploadedFiles: { [campo: string]: string } = {};
  uploadingFields: { [campo: string]: boolean } = {};
  uploadProgress: { [campo: string]: number } = {};

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
  fechaIngreso = '';
  readonly hoy = new Date().toISOString().split('T')[0];

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
      if (!this.esAdmin && !this.validarSeccionActual()) return;
      this.currentStepIdx++;
      this.errorMensaje = '';
      this.guardarBorrador();
      window.scrollTo({ top: (document.querySelector('app-home-bar') as HTMLElement | null)?.offsetHeight ?? 64, behavior: 'smooth' });
    }
  }

  private validarSeccionActual(): boolean {
    const id = this.currentSection.id;
    const fd = this.formData;
    const uf = this.uploadedFiles;
    const campos: string[] = [];
    const archivos: string[] = [];

    switch (id) {
      case 1:   campos.push('email'); break;
      case 2:   campos.push('distribuidor', 'contacto', 'puesto', 'marca'); break;
      case 3:
      case 35:
      case 14:  campos.push('bici_modelo', 'bici_anio', 'bici_serie', 'scott_tipo_marco'); break;
      case 4:   campos.push('scott_grupo'); break;
      case 5:   campos.push('casco_modelo', 'casco_anio', 'casco_color', 'casco_talla', 'casco_serie'); break;
      case 6:   campos.push('casco_localizacion', 'casco_tipo_dano', 'casco_comentarios'); break;
      case 7:   campos.push('prot_modelo', 'prot_talla'); break;
      case 8:   campos.push('prot_localizacion', 'prot_tipo_dano', 'prot_comentarios'); break;
      case 9:   campos.push('zapato_modelo', 'zapato_color', 'zapato_talla', 'zapato_serie'); break;
      case 10:  campos.push('zapato_localizacion', 'zapato_tipo_dano', 'zapato_comentarios'); break;
      case 11:  campos.push('comp_tipo', 'comp_modelo'); break;
      case 12:  campos.push('comp_dano_desc'); break;
      case 13:  archivos.push('scott_doc1', 'scott_doc2', 'scott_doc3', 'scott_doc4a', 'scott_doc4b'); break;
      case 22:  archivos.push('bici_doc1', 'bici_doc2', 'bici_doc3', 'bici_doc4a', 'bici_doc4b'); break;
      case 23:  campos.push('syncros_tipo'); break;
      case 24:  campos.push('manubrio_modelo'); break;
      case 25:  campos.push('manubrio_localizacion', 'manubrio_tipo_dano', 'manubrio_dano_desc'); break;
      case 252: archivos.push('manubrio_doc1', 'manubrio_doc2', 'manubrio_doc3', 'manubrio_doc4a', 'manubrio_doc4b'); break;
      case 26:  campos.push('asiento_modelo'); break;
      case 27:  campos.push('asiento_localizacion', 'asiento_tipo_dano', 'asiento_dano_desc'); break;
      case 272: archivos.push('asiento_doc1', 'asiento_doc2', 'asiento_doc3', 'asiento_doc4a', 'asiento_doc4b'); break;
      case 28:  campos.push('poste_modelo'); break;
      case 29:  campos.push('poste_localizacion', 'poste_tipo_dano', 'poste_dano_desc'); break;
      case 292: archivos.push('poste_doc1', 'poste_doc2', 'poste_doc3', 'poste_doc4a', 'poste_doc4b'); break;
      case 30:  campos.push('rin_modelo'); break;
      case 31:  campos.push('rin_localizacion', 'rin_tipo_dano', 'rin_dano_desc'); break;
      case 315: archivos.push('rin_doc1', 'rin_doc2', 'rin_doc3', 'rin_doc4a', 'rin_doc4b'); break;
      case 32:  campos.push('vittoria_modelo'); break;
      case 33:
        campos.push('vittoria_dano_desc');
        archivos.push('vittoria_doc1', 'vittoria_doc2', 'vittoria_doc3', 'vittoria_doc4a', 'vittoria_doc4b');
        break;
      case 34:  campos.push('terminos_aceptados'); break;
    }

    if (id >= 15 && id <= 21) {
      campos.push(`marco_localizacion_${id}`, `marco_tipo_dano_${id}`, `marco_comentarios_${id}`);
    }

    for (const c of campos) {
      const v = fd[c];
      if (v === undefined || v === null || v === '' || v === false) {
        this.errorMensaje = 'Por favor completa todos los campos obligatorios antes de continuar.';
        return false;
      }
    }
    for (const a of archivos) {
      if (!uf[a]) {
        this.errorMensaje = 'Por favor adjunta todos los documentos requeridos antes de continuar.';
        return false;
      }
    }
    return true;
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
    this.uploadProgress[campo] = 0;
    this.cdr.detectChanges();

    this.svc.subirArchivo(file, (pct) => {
      this.uploadProgress[campo] = pct;
      this.cdr.detectChanges();
    }).subscribe({
      next: (res) => {
        this.uploadedFiles[campo] = res.nombre;
        this.formData[campo] = res.nombre;
        this.formData[campo + '_original'] = res.original;
        this.uploadingFields[campo] = false;
        this.uploadProgress[campo] = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploadingFields[campo] = false;
        this.uploadProgress[campo] = 0;
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
    if (this.esAdmin && this.fechaIngreso) {
      payload['fecha_ingreso'] = this.fechaIngreso;
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
