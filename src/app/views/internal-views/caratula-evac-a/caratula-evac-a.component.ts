import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaratulasService } from '../../../services/caratulas.service';
import { HomeBarComponent } from "../../../components/home-bar/home-bar.component";
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FiltroComponent } from '../../../components/filtro/filtro.component';
import { FiltroOrdenComponent, OrdenDirection } from '../../../components/filtro-orden/filtro-orden.component';
import { TemporadaSelectorComponent } from '../../../components/temporada-selector/temporada-selector.component';
import { AvisoHistoricoComponent } from '../../../components/aviso-historico/aviso-historico.component';

interface Cliente {
  nombre_cliente: string;
  nivel: string;
  compra_minima_anual: number;
  acumulado_anticipado: number;
  avance_proyectado?: number;
  
  // Propiedades globales (las que tenías)
  compromiso_scott?: number;
  avance_global_scott?: number;
  compromiso_apparel_syncros_vittoria?: number;
  avance_global_apparel_syncros_vittoria?: number;

  // AGREGAMOS: Propiedades de los periodos (El backend debe enviarlas)
  compromiso_jul_ago?: number;
  avance_jul_ago?: number;
  compromiso_sep_oct?: number;
  avance_sep_oct?: number;
  compromiso_nov_dic?: number;
  avance_nov_dic?: number;

  compromiso_jul_ago_app?: number;
  avance_jul_ago_app?: number;
  compromiso_sep_oct_app?: number;
  avance_sep_oct_app?: number;
  compromiso_nov_dic_app?: number;
  avance_nov_dic_app?: number;

  // Propiedad para la UI
  expanded?: boolean;
}

interface CaratulaData {
  categoria: 'EB' | 'MY25' | 'MY25_2' | 'SCOTT' | 'APPAREL';
  meta: number;
  acumulado_real: number;
  avance_proyectado: number;
  porcentaje: number;
}

@Component({
  selector: 'app-caratula-evac-a',
  standalone: true,
  imports: [CommonModule, RouterModule, HomeBarComponent, FiltroComponent, FiltroOrdenComponent, TemporadaSelectorComponent, AvisoHistoricoComponent],
  templateUrl: './caratula-evac-a.component.html',
  styleUrl: './caratula-evac-a.component.css'
})
export class CaratulaEvacAComponent implements OnInit {
  @Output() onInit = new EventEmitter<void>();

  meta = ''
  clientes: any[] = [];
  loading = false;
  error: string | null = null;

  my25_monto1 = 0;
  my25_monto2 = 0;
  my25_monto3 = 0;
  my25_monto4 = 0;
  avance_proyectado_monto1 = 0;
  avance_proyectado_monto2 = 0;

  montoCompromisoApparel = 0;
  montoCompromisoScott = 0;

  avanceGlobalScott = 0;
  avanceGlobaApparel = 0;

  avance_proyectado_scott = 0;
  avance_proyectado_apparel = 0;

  clientesFiltrados: any[] = [];

  filtroOpciones = {
    nombre_cliente: [] as any[],
    nivel: [] as any[]
  };

  filtrosAplicados = {
    nombre_cliente: [] as string[],
    nivel: [] as string[]
  };

  temporadasDisponibles: string[] = [];
  modoHistorico = false;
  temporadaHistoricaSeleccionada: string | null = null;
  private clientesEnVivo: any[] = [];

  constructor(private caratulasService: CaratulasService, private router: Router) { }

  ngOnInit(): void {
    this.cargarClientes();
    this.calcularMontos();
    this.cargarTemporadasDisponibles();
    this.onInit.emit();
  }

  cargarTemporadasDisponibles(): void {
    this.caratulasService.getTemporadasDisponibles().subscribe({
      next: (temporadas) => this.temporadasDisponibles = temporadas,
      error: (err) => console.error('Error cargando temporadas disponibles:', err)
    });
  }

  verTemporadaPasada(temporada: string): void {
    if (!temporada) {
      this.volverATemporadaActual();
      return;
    }
    this.loading = true;
    this.caratulasService.getDatosPrevioHistorico(temporada).subscribe({
      next: (datos: any[]) => {
        this.modoHistorico = true;
        this.temporadaHistoricaSeleccionada = temporada;
        this.clientes = datos.filter(d => d.evac === 'A');
        this.prepararOpcionesFiltros();
        this.filtrarClientes();
        this.calcularMontos();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando temporada historica:', err);
        this.error = 'Error al cargar la temporada histórica';
        this.loading = false;
      }
    });
  }

  volverATemporadaActual(): void {
    this.modoHistorico = false;
    this.temporadaHistoricaSeleccionada = null;
    this.clientes = this.clientesEnVivo;
    this.prepararOpcionesFiltros();
    this.filtrarClientes();
    this.calcularMontos();
  }

  // Función para abrir/cerrar el acordeón
  toggleCliente(cliente: Cliente): void {
    cliente.expanded = !cliente.expanded;
  }

  private getMesActual(): number {
    return new Date().getMonth() + 1; // Enero = 1
  }

  // Calcula el faltante de SCOTT basado en los periodos acumulados
  getFaltanteScott(cliente: Cliente): number {
    const mes = this.getMesActual();
    
    // 1. Calcular Compromiso Acumulado
    let compromisoAcumulado = (cliente.compromiso_jul_ago || 0);
    if (mes >= 9) compromisoAcumulado += (cliente.compromiso_sep_oct || 0);
    if (mes >= 11) compromisoAcumulado += (cliente.compromiso_nov_dic || 0);

    // 2. Calcular Avance Acumulado
    let avanceAcumulado = (cliente.avance_jul_ago || 0);
    if (mes >= 9) avanceAcumulado += (cliente.avance_sep_oct || 0);
    if (mes >= 11) avanceAcumulado += (cliente.avance_nov_dic || 0);

    // 3. Retornar diferencia
    const diferencia = compromisoAcumulado - avanceAcumulado;
    return diferencia > 0 ? diferencia : 0;
  }

  // Calcula el faltante de APPAREL basado en los periodos acumulados
  getFaltanteApparel(cliente: Cliente): number {
    const mes = this.getMesActual();

    // 1. Calcular Compromiso Acumulado
    let compromisoAcumulado = (cliente.compromiso_jul_ago_app || 0);
    if (mes >= 9) compromisoAcumulado += (cliente.compromiso_sep_oct_app || 0);
    if (mes >= 11) compromisoAcumulado += (cliente.compromiso_nov_dic_app || 0);

    // 2. Calcular Avance Acumulado
    let avanceAcumulado = (cliente.avance_jul_ago_app || 0);
    if (mes >= 9) avanceAcumulado += (cliente.avance_sep_oct_app || 0);
    if (mes >= 11) avanceAcumulado += (cliente.avance_nov_dic_app || 0);

    // 3. Retornar diferencia
    const diferencia = compromisoAcumulado - avanceAcumulado;
    return diferencia > 0 ? diferencia : 0;
  }
  
  // También necesitamos calcular la META que se muestra debajo del número grande
  // para que coincida con el contexto (Meta Acumulada vs Meta Anual)
  getMetaAcumuladaScott(cliente: Cliente): number {
    const mes = this.getMesActual();
    let compromisoAcumulado = (cliente.compromiso_jul_ago || 0);
    if (mes >= 9) compromisoAcumulado += (cliente.compromiso_sep_oct || 0);
    if (mes >= 11) compromisoAcumulado += (cliente.compromiso_nov_dic || 0);
    return compromisoAcumulado;
  }

  getMetaAcumuladaApparel(cliente: Cliente): number {
    const mes = this.getMesActual();
    let compromisoAcumulado = (cliente.compromiso_jul_ago_app || 0);
    if (mes >= 9) compromisoAcumulado += (cliente.compromiso_sep_oct_app || 0);
    if (mes >= 11) compromisoAcumulado += (cliente.compromiso_nov_dic_app || 0);
    return compromisoAcumulado;
  }

  irACaratula(nombreCliente: string): void {
    this.router.navigate(['/caratulas'], {
      queryParams: { q: nombreCliente }
    });
  }

  // 3. AÑADE ESTA FUNCIÓN NUEVA PARA ORDENAR
  ordenarColumna(campo: 'compromiso' | 'acumulado' | 'proyectado' | 'diferencia', direccion: OrdenDirection): void {
    if (!direccion) {
      // Si se deselecciona el orden, volvemos al orden por defecto (por ejemplo, por Nivel)
      // O simplemente recargamos/refiltramos para resetear
      this.filtrarClientes();
      return;
    }

    // Ordenamos la lista actual (clientesFiltrados)
    this.clientesFiltrados.sort((a, b) => {
      let valorA = 0;
      let valorB = 0;

      // Determinamos los valores según la columna
      switch (campo) {
        case 'compromiso':
          valorA = a.compra_minima_anual || 0;
          valorB = b.compra_minima_anual || 0;
          break;
        case 'acumulado':
          valorA = a.acumulado_anticipado || 0;
          valorB = b.acumulado_anticipado || 0;
          break;
        case 'proyectado':
          // Calculamos al vuelo porque no está guardado en el objeto base
          valorA = this.calcularAvanceProyectadoCliente(a.compra_minima_anual);
          valorB = this.calcularAvanceProyectadoCliente(b.compra_minima_anual);
          break;
        case 'diferencia':
          // Calculamos al vuelo
          valorA = this.calcularDiferencia(a);
          valorB = this.calcularDiferencia(b);
          break;
      }

      // Lógica de comparación
      if (direccion === 'asc') {
        return valorA - valorB; // Menor a Mayor
      } else {
        return valorB - valorA; // Mayor a Menor
      }
    });
  }

  cargarClientes(): void {
    this.loading = true;
    this.error = null;

    this.caratulasService.getClientesEvacA().subscribe({
      next: (data) => {

        const ordenNiveles: { [key: string]: number } = {
          'Partner Elite Plus': 1,
          'Partner Elite': 2,
          'Partner': 3,
          'Distribuidor': 4
        };

        data.sort((a: Cliente, b: Cliente) => {
          const nivelA = ordenNiveles[a.nivel] || 99; // Si un nivel no existe, se va al final
          const nivelB = ordenNiveles[b.nivel] || 99;
          return nivelA - nivelB;
        });

        this.clientes = data;
        this.clientesEnVivo = data;
        this.loading = false;

        this.prepararOpcionesFiltros();
        this.filtrarClientes();
        this.calcularMontos();
        this.actualizarDatosCaratula();
      },
      error: (error) => {
        this.error = 'Error al cargar los clientes';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  private prepararOpcionesFiltros(): void {
    const nombresUnicos = [...new Set(this.clientes.map(c => c.nombre_cliente))];
    this.filtroOpciones.nombre_cliente = nombresUnicos.map(nombre => ({ value: nombre, selected: false }));

    const nivelesUnicos = [...new Set(this.clientes.map(c => c.nivel))];
    this.filtroOpciones.nivel = nivelesUnicos.map(nivel => ({ value: nivel, selected: false }));
  }

  public aplicarFiltro(campo: 'nombre_cliente' | 'nivel', valores: string[]): void {
    this.filtrosAplicados[campo] = valores;
    this.filtrarClientes();
  }

  public limpiarFiltro(campo: 'nombre_cliente' | 'nivel'): void {
    this.filtrosAplicados[campo] = [];
    this.filtrarClientes();
  }

  public limpiarTodosFiltros(): void {
    this.filtrosAplicados.nombre_cliente = [];
    this.filtrosAplicados.nivel = [];
    this.filtrarClientes();
  }

  private filtrarClientes(): void {
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const cumpleFiltroNombre = this.filtrosAplicados.nombre_cliente.length === 0 ||
        this.filtrosAplicados.nombre_cliente.includes(cliente.nombre_cliente);

      const cumpleFiltroNivel = this.filtrosAplicados.nivel.length === 0 ||
        this.filtrosAplicados.nivel.includes(cliente.nivel);

      return cumpleFiltroNombre && cumpleFiltroNivel;
    });
  }

  actualizarDatosCaratula(): void {
    if (this.clientes.length === 0) {
      console.warn('No hay datos de clientes cargados');
      return;
    }

    this.loading = true;
    this.error = null;

    this.calcularMontos();

    // Calcular valores totales para EB
    const metaEB = this.clientes.reduce((sum, cliente) => sum + (cliente.compra_minima_anual || 0), 0);
    const acumuladoEB = this.clientes.reduce((sum, cliente) => sum + (cliente.acumulado_anticipado || 0), 0);
    const avanceProyectadoEB = this.clientes.reduce((sum, cliente) => {
      return sum + this.calcularAvanceProyectadoCliente(cliente.compra_minima_anual);
    }, 0);

    // Calcular porcentajes
    const porcentajeEB = this.calcularPorcentajeEB();
    const porcentajeMY25_1 = this.calcularPorcentajeMonto1();
    const porcentajeMY25_2 = this.calcularPorcentajeMonto2();
    const porcentajeScott = this.calcularPorcentajeScott();
    const porcentajeApparel = this.calcularPorcentajeApparel();

    // Preparar datos para enviar
    const datos = [
      {
        categoria: 'EB',
        meta: metaEB,
        acumulado_real: acumuladoEB,
        avance_proyectado: avanceProyectadoEB,
        porcentaje: parseFloat(porcentajeEB.replace('%', '')) || 0
      },
      {
        categoria: 'MY25',
        meta: this.my25_monto1,
        acumulado_real: this.my25_monto3,
        avance_proyectado: this.avance_proyectado_monto1,
        porcentaje: parseFloat(porcentajeMY25_1.replace('%', '')) || 0
      },
      {
        categoria: 'MY25_2',
        meta: this.my25_monto2,
        acumulado_real: this.my25_monto4,
        avance_proyectado: this.avance_proyectado_monto2,
        porcentaje: parseFloat(porcentajeMY25_2.replace('%', '')) || 0
      },
      {
        categoria: 'SCOTT',
        meta: this.montoCompromisoScott,
        acumulado_real: this.avanceGlobalScott,
        avance_proyectado: this.avance_proyectado_scott,
        porcentaje: parseFloat(porcentajeScott.replace('%', '')) || 0
      },
      {
        categoria: 'APPAREL',
        meta: this.montoCompromisoApparel,
        acumulado_real: this.avanceGlobaApparel,
        avance_proyectado: this.avance_proyectado_apparel,
        porcentaje: parseFloat(porcentajeApparel.replace('%', '')) || 0
      }
    ];

    this.caratulasService.actualizarCaratulaEvacA(datos).subscribe({
      next: (response) => {
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al actualizar los datos: ' + (error.error?.error || error.message);
      }
    });
  }

  obtenerSemanaISO(fecha: Date = new Date()): number {
    const date = new Date(fecha.getTime());
    date.setHours(0, 0, 0, 0);

    // Jueves de la semana actual
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);

    // Enero 4 siempre está en la semana 1
    const week1 = new Date(date.getFullYear(), 0, 4);

    // Calcular el número de semana
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  /** Semanas transcurridas desde el inicio REAL de la temporada (1 jul 2025),
   * no desde "la semana ISO 26 mas reciente" -- ese calculo por modulo de
   * calendario se reiniciaba cada año en la semana 26 (~fin de junio),
   * dando semanas absurdamente bajas apenas pasaba esa semana en 2026
   * aunque la temporada llevara +50 semanas corriendo. Acotado a [0, 52]
   * para que el proyectado nunca exceda la meta tras la duracion normal. */
  obtenerSemanasTranscurridas(): number {
    const FECHA_INICIO_TEMPORADA = new Date(2025, 6, 1); // 1 jul 2025
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy.getTime() - FECHA_INICIO_TEMPORADA.getTime()) / 86400000);
    return Math.max(0, Math.min(52, Math.floor(dias / 7)));
  }

  /** Fracción de la temporada usada para "avance proyectado". Una temporada
   * cerrada ya no tiene proyección semanal en curso -- el proyectado es
   * simplemente el 100% de la meta, igual que en Carátula Global. */
  private factorProyeccion(): number {
    return this.modoHistorico ? 1 : this.obtenerSemanasTranscurridas() / 52;
  }

  calcularAvanceProyectadoMonto1(): void {
    if (this.my25_monto1 === 0) return;

    this.avance_proyectado_monto1 = this.factorProyeccion() * this.my25_monto1;

    this.avance_proyectado_monto1 = Math.round(this.avance_proyectado_monto1 * 100) / 100;
  }

  calcularAvanceProyectadoMonto2(): void {
    if (this.my25_monto2 === 0) return;

    this.avance_proyectado_monto2 = this.factorProyeccion() * this.my25_monto2;

    this.avance_proyectado_monto2 = Math.round(this.avance_proyectado_monto2 * 100) / 100;
  }

  calcularAvanceProyectadoScott(): void {
    if (!this.montoCompromisoScott) return;

    // Avance proyectado BASADO ÚNICAMENTE EN EL COMPROMISO SCOTT
    this.avance_proyectado_scott = this.factorProyeccion() * this.montoCompromisoScott;
    this.avance_proyectado_scott = Math.round(this.avance_proyectado_scott * 100) / 100;
  }

  calcularAvanceProyectadoApparel(): void {
    if (!this.montoCompromisoApparel) return;

    // Cálculo basado en el compromiso Apparel (igual que con Scott)
    this.avance_proyectado_apparel = this.factorProyeccion() * this.montoCompromisoApparel;
    this.avance_proyectado_apparel = Math.round(this.avance_proyectado_apparel * 100) / 100;
  }

  calcularPorcentajeScott(): string {
    if (!this.avance_proyectado_scott || this.avance_proyectado_scott === 0) return "0%";

    const resultado = (this.avanceGlobalScott / this.avance_proyectado_scott) - 1;
    const porcentaje = Math.round(resultado * 100);  // Convierte a porcentaje (ej: 0.15 → 15%)

    return `${porcentaje}%`;
  }

  calcularPorcentajeApparel(): string {
    if (!this.avance_proyectado_apparel || this.avance_proyectado_apparel === 0) return "0%";

    const resultado = (this.avanceGlobaApparel / this.avance_proyectado_apparel) - 1;
    const porcentaje = Math.round(resultado * 100);

    return `${porcentaje}%`;
  }

  // Método para calcular el avance proyectado semanal por cliente
  calcularAvanceProyectadoCliente(compraMinimaAnual: number): number {
    if (!compraMinimaAnual) return 0;

    const avanceProyectado = this.factorProyeccion() * compraMinimaAnual;
    return Math.round(avanceProyectado * 100) / 100;
  }

  calcularDiferencia(cliente: any): number {
    const avanceProyectado = this.calcularAvanceProyectadoCliente(cliente.compra_minima_anual);
    const acumuladoReal = cliente.acumulado_anticipado;

    // =SI(J30>H30, (J30-H30), 0)
    return avanceProyectado > acumuladoReal ? avanceProyectado - acumuladoReal : 0;
  }

  recargarClientes(): void {
    this.cargarClientes();
  }

  calcularMontos(): void {
    this.calcularMonto1();
    this.calcularMonto2();
    this.calcularMonto3();
    this.calcularMonto4();
    this.calcularAvanceProyectadoMonto1();
    this.calcularAvanceProyectadoMonto2();
    this.obtenerMetaTotal();
    this.obtenerAcumuladoTotal();
    this.calcularAvanceProyectadoTotal();
    this.calcularPorcentajeEB();

    this.calcularCompromisoApparel();
    this.calcularCompromisoScott();
    this.calcularAvanceGlobalScott();
    this.calcularAvanceGlobalApparel();

    this.calcularAvanceProyectadoScott();
    this.calcularAvanceProyectadoApparel();
    this.calcularPorcentajeScott();
    this.calcularPorcentajeApparel();

  }

  calcularCompromisoApparel(): void {
    this.montoCompromisoApparel = 0; // Asegúrate de definir esta variable en tu clase

    this.clientes.forEach(cliente => {
      const compromiso = cliente.compromiso_apparel_syncros_vittoria || 0;
      this.montoCompromisoApparel += compromiso;
    });

    // Redondear a 2 decimales
    this.montoCompromisoApparel = Math.round(this.montoCompromisoApparel * 100) / 100;
  }

  calcularAvanceGlobalScott(): void {
    this.avanceGlobalScott = 0; // Asegúrate de definir esta variable en tu clase

    this.clientes.forEach(cliente => {
      const compromiso = cliente.avance_global_scott || 0;
      this.avanceGlobalScott += compromiso;
    });

    // Redondear a 2 decimales
    this.avanceGlobalScott = Math.round(this.avanceGlobalScott * 100) / 100;
  }

  calcularAvanceGlobalApparel(): void {
    this.avanceGlobaApparel = 0; // Asegúrate de definir esta variable en tu clase

    this.clientes.forEach(cliente => {
      const compromiso = cliente.avance_global_apparel_syncros_vittoria || 0;
      this.avanceGlobaApparel += compromiso;
    });

    // Redondear a 2 decimales
    this.avanceGlobaApparel = Math.round(this.avanceGlobaApparel * 100) / 100;
  }

  calcularCompromisoScott(): void {
    // Primero asegúrate que los otros montos están calculados
    this.calcularMonto1();
    this.calcularMonto2();
    this.calcularCompromisoApparel();

    // Realiza el cálculo una sola vez fuera del bucle
    this.montoCompromisoScott = (this.my25_monto1 + this.my25_monto2) - this.montoCompromisoApparel;

    // Redondear a 2 decimales
    this.montoCompromisoScott = Math.round(this.montoCompromisoScott * 100) / 100;
  }

  // Método para calcular monto1 (Partner, Partner Elite, Partner Elite Plus)
  calcularMonto1(): void {
    this.my25_monto1 = 0;
    const nivelesPermitidos = ['Partner', 'Partner Elite', 'Partner Elite Plus'];

    this.clientes.forEach(cliente => {
      const compraMinima = cliente.compra_minima_anual || 0;

      if (nivelesPermitidos.includes(cliente.nivel)) {
        this.my25_monto1 += compraMinima;
      }
    });

    // Redondear a 2 decimales
    this.my25_monto1 = Math.round(this.my25_monto1 * 100) / 100;
  }

  // Método para calcular monto2 (solo Distribuidor)
  calcularMonto2(): void {
    this.my25_monto2 = 0;

    this.clientes.forEach(cliente => {
      const compraMinima = cliente.compra_minima_anual || 0;

      if (cliente.nivel === 'Distribuidor') {
        this.my25_monto2 += compraMinima;
      }
    });

    // Redondear a 2 decimales
    this.my25_monto2 = Math.round(this.my25_monto2 * 100) / 100;
  }

  calcularMonto3(): void {
    this.my25_monto3 = 0;
    const nivelesPermitidos = ['Partner', 'Partner Elite', 'Partner Elite Plus'];

    this.clientes.forEach(cliente => {
      const compraAcumulado = cliente.acumulado_anticipado || 0;

      if (nivelesPermitidos.includes(cliente.nivel)) {
        this.my25_monto3 += compraAcumulado;
      }
    });

    // Redondear a 2 decimales
    this.my25_monto3 = Math.round(this.my25_monto3 * 100) / 100;
  }

  // Método para calcular monto2 (solo Distribuidor)
  calcularMonto4(): void {
    this.my25_monto4 = 0;

    this.clientes.forEach(cliente => {
      const compraAcumulado = cliente.acumulado_anticipado || 0;

      if (cliente.nivel === 'Distribuidor') {
        this.my25_monto4 += compraAcumulado;
      }
    });

    // Redondear a 2 decimales
    this.my25_monto4 = Math.round(this.my25_monto4 * 100) / 100;
  }

  calcularAvanceProyectadoTotal(): void {
    const metaTotal = this.my25_monto1 + this.my25_monto2;

    if (metaTotal === 0) return;

    // Calcular el avance proyectado total
    const avanceProyectadoTotal = this.factorProyeccion() * metaTotal;

    // Redondear a 2 decimales
    const avanceProyectadoTotalRedondeado = Math.round(avanceProyectadoTotal * 100) / 100;

    // Ahora distribuir proporcionalmente entre monto1 y monto2
    if (metaTotal > 0) {
      const proporcionMonto1 = this.my25_monto1 / metaTotal;
      const proporcionMonto2 = this.my25_monto2 / metaTotal;

      this.avance_proyectado_monto1 = Math.round((avanceProyectadoTotalRedondeado * proporcionMonto1) * 100) / 100;
      this.avance_proyectado_monto2 = Math.round((avanceProyectadoTotalRedondeado * proporcionMonto2) * 100) / 100;
    }
  }

  obtenerAvanceProyectadoTotalFormateado(): string {
    const metaTotal = this.my25_monto1 + this.my25_monto2;

    if (metaTotal === 0) return this.formatearMoneda(0);

    const avanceProyectadoTotal = this.factorProyeccion() * metaTotal;
    const avanceProyectadoTotalRedondeado = Math.round(avanceProyectadoTotal * 100) / 100;

    return this.formatearMoneda(avanceProyectadoTotalRedondeado);
  }

  calcularPorcentajeEB(): string {
    const acumuladoStr = this.obtenerAcumuladoTotal();
    const proyectadoStr = this.obtenerAvanceProyectadoTotalFormateado();

    // Extraer números de los strings formateados (quitar $ y ,)
    const acumulado = parseFloat(acumuladoStr.replace(/[$,]/g, ''));
    const proyectado = parseFloat(proyectadoStr.replace(/[$,]/g, ''));

    if (proyectado === 0) return "0%";

    const resultado = (acumulado / proyectado) - 1;
    const porcentaje = Math.round(resultado * 100);

    return `${porcentaje}%`;
  }

  calcularPorcentajeMonto1(): string {
    const acumuladoStr = this.calcularMonto1();
    const proyectadoStr = this.calcularMonto3();

    // Extraer números de los strings formateados (quitar $ y ,)
    const acumulado = this.my25_monto3;
    const proyectado = this.avance_proyectado_monto1;

    if (proyectado === 0) return "0%";

    const resultado = (acumulado / proyectado) - 1;
    const porcentaje = Math.round(resultado * 100);

    return `${porcentaje}%`;
  }

  // Función para calcular porcentaje de monto2
  calcularPorcentajeMonto2(): string {
    const acumuladoStr = this.calcularMonto2();
    const proyectadoStr = this.calcularMonto4();

    // Extraer números de los strings formateados (quitar $ y ,)
    const acumulado = this.my25_monto4;
    const proyectado = this.avance_proyectado_monto2;

    if (proyectado === 0) return "0%";

    const resultado = (acumulado / proyectado) - 1;
    const porcentaje = Math.round(resultado * 100);

    return `${porcentaje}%`;
  }

  obtenerFechaHoy(): string {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Función para obtener el día de la temporada (semana ISO - 26)
  obtenerDiaTemporada(): number {
    const semanaISO = this.obtenerSemanaISO();
    return semanaISO - 26;
  }

  calcularYFormatearAvanceProyectado(metaValor: number): string {
    if (metaValor === 0) return this.formatearMoneda(0);

    const avanceProyectado = this.factorProyeccion() * metaValor;
    const avanceProyectadoRedondeado = Math.round(avanceProyectado * 100) / 100;

    return this.formatearMoneda(avanceProyectadoRedondeado);
  }


  obtenerMetaTotal(): string {
    return this.formatearMoneda(this.my25_monto1 + this.my25_monto2);
  }

  obtenerAcumuladoTotal(): string {
    return this.formatearMoneda(this.my25_monto3 + this.my25_monto4);
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  fechaCierreClienteFormateada(cliente: any): string {
    const f = cliente?.fecha_cierre_temporada;
    if (!f) return '';
    const [year, month, day] = String(f).split('-');
    return `${day}/${month}/${year}`;
  }
}