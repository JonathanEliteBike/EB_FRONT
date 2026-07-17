import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultimarcasService } from '../../../services/multimarcas.service';
import { MonitorOdooService } from '../../../services/monitor-odoo.service';
import { FiltroService } from '../../../services/filtro.service';
import { HomeBarComponent } from '../../../components/home-bar/home-bar.component';
import { finalize } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { FiltroPrevioComponent } from '../../../components/filtro-previo/filtro-previo.component';
import * as XLSX from 'xlsx';
import { TemporadaSelectorComponent } from '../../../components/temporada-selector/temporada-selector.component';
import { AvisoHistoricoComponent } from '../../../components/aviso-historico/aviso-historico.component';

@Component({
  selector: 'app-multimarcas',
  standalone: true,
  imports: [CommonModule, FormsModule, HomeBarComponent, RouterModule, FiltroPrevioComponent, TemporadaSelectorComponent, AvisoHistoricoComponent],
  templateUrl: './multimarcas.component.html',
  styleUrls: ['./multimarcas.component.css']
})
export class MultimarcasComponent implements OnInit, OnDestroy {

  clientesPaginados: any[] = [];
  clientesOriginales: any[] = [];
  facturasOriginales: any[] = [];
  cargando: boolean = false;

  // Rango de la temporada ACTUALMENTE abierta -- se llena dinamicamente desde
  // /temporadas antes de calcular avances, en vez de fechas fijas de MY26.
  temporadaActualInicio: string = '2026-07-01';
  temporadaActualFin: string = '2027-06-30';

  temporadasDisponibles: string[] = [];
  modoHistorico: boolean = false;
  temporadaHistoricaSeleccionada: string | null = null;
  private temporadaHistoricaInicio: string | null = null;
  private todasLasTemporadas: { etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string }[] = [];

  private readonly NOMBRES_MESES_TEMPORADA = [
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO'
  ];

  // Rango [primer dia, ultimo dia] del mes N (0=primer mes de la temporada,
  // ej. julio; 11=ultimo mes, ej. junio) de la temporada ACTUAL -- calculado
  // dinamicamente, ya no fechas fijas de MY26. Parsea el string de fecha
  // directo para evitar corrimientos de un dia por zona horaria.
  private rangoMesTemporada(offset: number): { inicio: Date; fin: Date } {
    const [anioStr, mesStr] = this.temporadaActualInicio.split('-');
    let anio = parseInt(anioStr, 10);
    let mes = parseInt(mesStr, 10) - 1; // 0-indexado para Date

    mes += offset;
    anio += Math.floor(mes / 12);
    mes = ((mes % 12) + 12) % 12;

    const inicio = new Date(anio, mes, 1);
    const fin = new Date(anio, mes + 1, 0); // dia 0 del mes siguiente = ultimo dia de este mes
    return { inicio, fin };
  }

  // Etiquetas de columna (ej. "JULIO 25") calculadas a partir del inicio de
  // la temporada que se este mostrando -- ya no fijas a MY26. Parsea el
  // string de fecha directo (sin pasar por Date) para evitar corrimientos de
  // un dia por zona horaria.
  get etiquetasMeses(): string[] {
    const fechaInicioStr = (this.modoHistorico && this.temporadaHistoricaInicio)
      ? this.temporadaHistoricaInicio
      : this.temporadaActualInicio;

    const [anioStr, mesStr] = fechaInicioStr.split('-');
    let anio = parseInt(anioStr, 10);
    let mes = parseInt(mesStr, 10); // 1-indexado

    return this.NOMBRES_MESES_TEMPORADA.map(nombre => {
      const etiqueta = `${nombre} ${String(anio).slice(-2)}`;
      mes++;
      if (mes > 12) { mes = 1; anio++; }
      return etiqueta;
    });
  }

  // Opciones para los filtros
  opcionesClave: { value: string; selected: boolean; }[] = [];
  opcionesEvac: { value: string; selected: boolean; }[] = [];
  opcionesCliente: { value: string; selected: boolean; }[] = [];

  // Filtros activos
  filtroClaveActivo: string[] = [];
  filtroEvacActivo: string[] = [];
  filtroClienteActivo: string[] = [];

  filtroActivo: string | null = null;

  constructor(
    private multimarcasService: MultimarcasService,
    private monitorOdooService: MonitorOdooService,
    private filtroService: FiltroService
  ) { }

  ngOnInit(): void {
    this.cargarTemporadaActualYDatos();
    this.cargarTemporadasDisponibles();

    this.filtroService.filtroAbierto$.subscribe(filtroId => {
      this.filtroActivo = filtroId;
    });
  }

  private cargarTemporadaActualYDatos(): void {
    this.multimarcasService.getTemporadas().subscribe({
      next: (temporadas) => {
        this.todasLasTemporadas = temporadas;
        const abierta = temporadas.find(t => t.estado === 'abierta');
        if (abierta) {
          this.temporadaActualInicio = abierta.fecha_inicio;
          this.temporadaActualFin = abierta.fecha_fin;
        }
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error cargando temporada actual, usando default:', err);
        this.cargarDatos();
      }
    });
  }

  cargarTemporadasDisponibles(): void {
    this.multimarcasService.getTemporadasDisponibles().subscribe({
      next: (temporadas) => this.temporadasDisponibles = temporadas,
      error: (err) => console.error('Error cargando temporadas disponibles:', err)
    });
  }

  ngOnDestroy() {
    this.filtroService.cerrarFiltros();
  }

  // Métodos para verificar si un filtro está activo
  esFiltroActivo(tipoFiltro: string): boolean {
    return this.filtroActivo === `multimarcas-${tipoFiltro}`;
  }

  // Métodos para manejar clicks específicos de cada filtro
  toggleFiltroClave() {
    this.manejarClickFiltro('clave');
  }

  toggleFiltroEvac() {
    this.manejarClickFiltro('evac');
  }

  toggleFiltroCliente() {
    this.manejarClickFiltro('cliente');
  }

  manejarClickFiltro(tipoFiltro: string) {
    const filtroId = `multimarcas-${tipoFiltro}`;

    // Si el filtro ya está abierto, lo cerramos
    if (this.filtroActivo === filtroId) {
      this.filtroService.cerrarFiltros();
    } else {
      // Si no, abrimos este filtro (esto cerrará automáticamente cualquier otro abierto)
      this.filtroService.abrirFiltro(filtroId);
    }
  }


  cargarDatos() {
    this.cargando = true;

    // Cargamos primero los clientes
    this.multimarcasService.getMultimarcas().subscribe({
      next: (clientes) => {
        // Guardia contra condicion de carrera: si el usuario ya cambio a
        // modo historico mientras esta respuesta (lenta, en vivo) seguia en
        // curso, no pisar los datos historicos que ya se cargaron.
        if (this.modoHistorico) {
          return;
        }

        this.clientesOriginales = [...clientes];
        this.clientesPaginados = [...clientes];
        this.generarOpcionesFiltros();

        // Luego cargamos las facturas
        this.monitorOdooService.getFacturas().pipe(
          finalize(() => this.cargando = false)
        ).subscribe({
          next: (facturas) => {
            if (this.modoHistorico) {
              return;
            }
            this.facturasOriginales = facturas;
            this.recalcularAvances();
            this.actualizarDatosEnBackend();
          },
          error: (error) => {
            console.error('Error al cargar facturas:', error);
          }
        });
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar clientes:', error);
      }
    });
  }

  verTemporadaPasada(temporada: string): void {
    if (!temporada) {
      this.volverATemporadaActual();
      return;
    }

    this.modoHistorico = true;
    this.temporadaHistoricaSeleccionada = temporada;
    this.temporadaHistoricaInicio = this.todasLasTemporadas.find(t => t.etiqueta === temporada)?.fecha_inicio ?? null;
    this.cargando = true;

    this.multimarcasService.getDatosMultimarcasHistorico(temporada).subscribe({
      next: (datos) => {
        this.clientesOriginales = [...datos];
        this.clientesPaginados = [...datos];
        this.generarOpcionesFiltros();
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando temporada historica de multimarcas:', error);
        this.cargando = false;
      }
    });
  }

  volverATemporadaActual(): void {
    this.modoHistorico = false;
    this.temporadaHistoricaSeleccionada = null;
    this.temporadaHistoricaInicio = null;
    this.cargarDatos();
  }

  generarOpcionesFiltros() {
    // Extraer todas las claves únicas y convertir al formato esperado
    const clavesUnicas = [...new Set(this.clientesOriginales.map(cliente => cliente.clave))]
      .filter(clave => clave) // Filtrar valores nulos/undefined
      .sort();

    this.opcionesClave = clavesUnicas.map(clave => ({
      value: clave,
      selected: false
    }));

    // Extraer todos los EVACs únicos y convertir al formato esperado
    const evacsUnicos = [...new Set(this.clientesOriginales.map(cliente => cliente.evac))]
      .filter(evac => evac) // Filtrar valores nulos/undefined
      .sort();

    this.opcionesEvac = evacsUnicos.map(evac => ({
      value: evac,
      selected: false
    }));

    // Extraer todos los Clientes únicos y convertir al formato esperado
    const clientesUnicos = [...new Set(this.clientesOriginales.map(cliente => cliente.cliente_razon_social))]
      .filter(cliente => cliente) // Filtrar valores nulos/undefined
      .sort();

    this.opcionesCliente = clientesUnicos.map(cliente => ({
      value: cliente,
      selected: false
    }));
  }

  // Métodos para manejar el filtro de Clave
  aplicarFiltroClave(valoresFiltro: string[]) {
    this.filtroClaveActivo = valoresFiltro;
    this.aplicarFiltros();
  }

  limpiarFiltroClave() {
    this.filtroClaveActivo = [];
    this.aplicarFiltros();
  }

  // Métodos para manejar el filtro de EVAC
  aplicarFiltroEvac(valoresFiltro: string[]) {
    this.filtroEvacActivo = valoresFiltro;
    this.aplicarFiltros();
  }

  limpiarFiltroEvac() {
    this.filtroEvacActivo = [];
    this.aplicarFiltros();
  }

  // Métodos para manejar el filtro de Cliente
  aplicarFiltroCliente(valoresFiltro: string[]) {
    this.filtroClienteActivo = valoresFiltro;
    this.aplicarFiltros();
  }

  limpiarFiltroCliente() {
    this.filtroClienteActivo = [];
    this.aplicarFiltros();
  }

  // Método principal que aplica todos los filtros
  aplicarFiltros() {
    let clientesFiltrados = [...this.clientesOriginales];

    if (this.filtroClaveActivo.length > 0) {
      clientesFiltrados = clientesFiltrados.filter(cliente =>
        cliente.clave && this.filtroClaveActivo.includes(cliente.clave)
      );
    }

    // Aplicar filtro de EVAC
    if (this.filtroEvacActivo.length > 0) {
      clientesFiltrados = clientesFiltrados.filter(cliente =>
        cliente.evac && this.filtroEvacActivo.includes(cliente.evac)
      );
    }

    if (this.filtroClienteActivo.length > 0) {
      clientesFiltrados = clientesFiltrados.filter(cliente =>
        cliente.cliente_razon_social &&
        this.filtroClienteActivo.some(filtro =>
          cliente.cliente_razon_social.toLowerCase() === filtro.toLowerCase()
        )
      );
    }

    this.clientesPaginados = clientesFiltrados;
    this.recalcularAvances(); // <-- Añade esta línea
  }

  // Nueva función para recalcular todos los avances
  recalcularAvances() {
    // Guardia contra condicion de carrera: la cadena de carga en vivo
    // (clientes -> facturas -> recalcular -> guardar en backend -> recargar)
    // tarda varios segundos. Si el usuario ya cambio a modo historico
    // mientras esa cadena seguia en curso, no debe sobreescribir los datos
    // historicos que ya se cargaron.
    if (this.modoHistorico) {
      return;
    }
    this.calcularAvanceGlobalScott();
    this.calcularAvanceGlobalSyncros();
    this.calcularAvanceGlobalApparel();
    this.calcularAvanceGlobalVittoria();
    this.calcularAvanceGlobalBold();
    this.calcularAvanceGlobalSoloJulio();
    this.calcularAvanceGlobalSoloAgosto();
    this.calcularAvanceGlobalSoloSeptiembre();
    this.calcularAvanceGlobalSoloOctubre();
    this.calcularAvanceGlobalSoloNoviembre();
    this.calcularAvanceGlobalSoloDiciembre();
    this.calcularAvanceGlobalSoloEnero();
    this.calcularAvanceGlobalSoloFebrero();
    this.calcularAvanceGlobalSoloMarzo();
    this.calcularAvanceGlobalSoloAbril();
    this.calcularAvanceGlobalSoloMayo();
    this.calcularAvanceGlobalSoloJunio();
  }

  actualizarDatosEnBackend() {
    // Misma guardia que recalcularAvances(): si el usuario ya esta viendo una
    // temporada historica, no se debe reescribir la tabla `multimarcas` en
    // vivo con lo que haya en clientesPaginados en este momento (podrian ser
    // los datos historicos que se acaban de cargar).
    if (this.modoHistorico) {
      return;
    }

    this.cargando = true;

    // Primero recalcula todos los avances para asegurar datos actualizados
    this.recalcularAvances();

    // Preparamos los datos para enviar (simplificado)
    const datosParaEnviar = this.clientesPaginados.map(cliente => {
      // Crear objeto con todos los campos necesarios
      const datosCliente: any = {
        clave: cliente.clave,
        evac: cliente.evac,
        cliente_razon_social: cliente.cliente_razon_social
      };

      // Añadir todos los campos numéricos
      const camposNumericos = [
        'avance_global_scott', 'avance_global_syncros', 'avance_global_apparel',
        'avance_global_vittoria', 'avance_global_bold', 'total_facturas_julio',
        'total_facturas_agosto', 'total_facturas_septiembre', 'total_facturas_octubre',
        'total_facturas_noviembre', 'total_facturas_diciembre', 'total_facturas_enero',
        'total_facturas_febrero', 'total_facturas_marzo', 'total_facturas_abril',
        'total_facturas_mayo', 'total_facturas_junio'
      ];

      camposNumericos.forEach(campo => {
        datosCliente[campo] = cliente[campo] || 0;
      });

      return datosCliente;
    });

    // Llamamos al servicio
    this.multimarcasService.actualizarMultimarcas(datosParaEnviar).subscribe({
      next: (response) => {
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
      }
    });
  }

  calcularAvanceGlobalScott() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFiltradas = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const fechaInicio = new Date(this.temporadaActualInicio);
        const fechaFin = new Date(this.temporadaActualFin);

        return factura.marca === 'SCOTT' &&
          factura.apparel === 'NO' &&
          fechaFactura >= fechaInicio &&
          fechaFactura <= fechaFin;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasFiltradas.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_scott: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_scott: avance
      };
    });
  }

  calcularAvanceGlobalSyncros() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFiltradas = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const fechaInicio = new Date(this.temporadaActualInicio);
        const fechaFin = new Date(this.temporadaActualFin);

        return factura.marca === 'SYNCROS' &&
          fechaFactura >= fechaInicio &&
          fechaFactura <= fechaFin;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasFiltradas.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_syncros: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_syncros: avance
      };
    });
  }

  calcularAvanceGlobalApparel() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFiltradas = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const fechaInicio = new Date(this.temporadaActualInicio);
        const fechaFin = new Date(this.temporadaActualFin);

        return factura.apparel === 'SI' &&
          factura.marca === 'SCOTT' &&
          fechaFactura >= fechaInicio &&
          fechaFactura <= fechaFin;
      } catch (e) {
        return false;
      }
    });

    // Sumamos los montos por cliente
    facturasFiltradas.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      // Buscar cliente por clave primero
      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      // Si no encuentra por clave, buscar por nombre
      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        // Usar la clave del cliente encontrado (importante para consistencia)
        const claveClienteEncontrado = clienteCoincidente.clave;

        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });


    // Actualizamos los clientes con los avances calculados
    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_apparel: avance
      };
    });

    // También actualizar clientesOriginales para mantener consistencia
    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_apparel: avance
      };
    });
  }

  calcularAvanceGlobalVittoria() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFiltradas = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const fechaInicio = new Date(this.temporadaActualInicio);
        const fechaFin = new Date(this.temporadaActualFin);

        return factura.marca === 'VITTORIA' &&
          fechaFactura >= fechaInicio &&
          fechaFactura <= fechaFin;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasFiltradas.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_vittoria: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_vittoria: avance
      };
    });
  }

  calcularAvanceGlobalBold() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFiltradas = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const fechaInicio = new Date(this.temporadaActualInicio);
        const fechaFin = new Date(this.temporadaActualFin);

        return factura.marca === 'BOLD' &&
          fechaFactura >= fechaInicio &&
          fechaFactura <= fechaFin;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasFiltradas.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_bold: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        avance_global_bold: avance
      };
    });
  }

  calcularAvanceGlobalSoloJulio() {
    const avancesPorCliente = new Map<string, number>();

    const facturasJulio = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioJulio, fin: finJulio } = this.rangoMesTemporada(0);

        return fechaFactura >= inicioJulio &&
          fechaFactura <= finJulio;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasJulio.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_julio: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_julio: avance
      };
    });
  }

  calcularAvanceGlobalSoloAgosto() {
    const avancesPorCliente = new Map<string, number>();

    const facturasAgosto = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioAgosto, fin: finAgosto } = this.rangoMesTemporada(1);

        return fechaFactura >= inicioAgosto &&
          fechaFactura <= finAgosto;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasAgosto.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_agosto: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_agosto: avance
      };
    });
  }

  calcularAvanceGlobalSoloSeptiembre() {
    const avancesPorCliente = new Map<string, number>();

    const facturasSeptiembre = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioSeptiembre, fin: finSeptiembre } = this.rangoMesTemporada(2);

        return fechaFactura >= inicioSeptiembre &&
          fechaFactura <= finSeptiembre;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasSeptiembre.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_septiembre: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_septiembre: avance
      };
    });
  }

  calcularAvanceGlobalSoloOctubre() {
    const avancesPorCliente = new Map<string, number>();

    const facturasOctubre = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioOctubre, fin: finOctubre } = this.rangoMesTemporada(3);

        return fechaFactura >= inicioOctubre &&
          fechaFactura <= finOctubre;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasOctubre.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_octubre: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_octubre: avance
      };
    });
  }

  calcularAvanceGlobalSoloNoviembre() {
    const avancesPorCliente = new Map<string, number>();

    const facturasNoviembre = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioNoviembre, fin: finNoviembre } = this.rangoMesTemporada(4);

        return fechaFactura >= inicioNoviembre &&
          fechaFactura <= finNoviembre;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasNoviembre.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_noviembre: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_noviembre: avance
      };
    });
  }

  calcularAvanceGlobalSoloDiciembre() {
    const avancesPorCliente = new Map<string, number>();

    const facturasDiciembre = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioDiciembre, fin: finDiciembre } = this.rangoMesTemporada(5);

        return fechaFactura >= inicioDiciembre &&
          fechaFactura <= finDiciembre;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasDiciembre.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_diciembre: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_diciembre: avance
      };
    });
  }

  calcularAvanceGlobalSoloEnero() {
    const avancesPorCliente = new Map<string, number>();

    const facturasEnero = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioEnero, fin: finEnero } = this.rangoMesTemporada(6);

        return fechaFactura >= inicioEnero &&
          fechaFactura <= finEnero;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasEnero.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_enero: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_enero: avance
      };
    });
  }

  calcularAvanceGlobalSoloFebrero() {
    const avancesPorCliente = new Map<string, number>();

    const facturasFebrero = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioFebrero, fin: finFebrero } = this.rangoMesTemporada(7);

        return fechaFactura >= inicioFebrero &&
          fechaFactura <= finFebrero;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasFebrero.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_febrero: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_febrero: avance
      };
    });
  }

  calcularAvanceGlobalSoloMarzo() {
    const avancesPorCliente = new Map<string, number>();

    const facturasMarzo = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioMarzo, fin: finMarzo } = this.rangoMesTemporada(8);

        return fechaFactura >= inicioMarzo &&
          fechaFactura <= finMarzo;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasMarzo.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_marzo: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_marzo: avance
      };
    });
  }

  calcularAvanceGlobalSoloAbril() {
    const avancesPorCliente = new Map<string, number>();

    const facturasAbril = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioAbril, fin: finAbril } = this.rangoMesTemporada(9);

        return fechaFactura >= inicioAbril &&
          fechaFactura <= finAbril;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasAbril.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_abril: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_abril: avance
      };
    });
  }

  calcularAvanceGlobalSoloMayo() {
    const avancesPorCliente = new Map<string, number>();

    const facturasMayo = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioMayo, fin: finMayo } = this.rangoMesTemporada(10);

        return fechaFactura >= inicioMayo &&
          fechaFactura <= finMayo;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasMayo.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_mayo: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_mayo: avance
      };
    });
  }

  calcularAvanceGlobalSoloJunio() {
    const avancesPorCliente = new Map<string, number>();

    const facturasJunio = this.facturasOriginales.filter(factura => {
      try {
        const fechaFactura = new Date(factura.fecha_factura);
        const { inicio: inicioJunio, fin: finJunio } = this.rangoMesTemporada(11);

        return fechaFactura >= inicioJunio &&
          fechaFactura <= finJunio;
      } catch (e) {
        console.warn('Factura con fecha inválida:', factura);
        return false;
      }
    });

    facturasJunio.forEach(factura => {
      const claveFactura = factura.contacto_referencia;
      const nombreFactura = factura.contacto_nombre;
      const monto = parseFloat(factura.venta_total) || 0;

      let clienteCoincidente = this.clientesOriginales.find(cliente =>
        cliente.clave === claveFactura
      );

      if (!clienteCoincidente) {
        clienteCoincidente = this.clientesOriginales.find(cliente =>
          cliente.cliente_razon_social &&
          cliente.cliente_razon_social.trim().toLowerCase() === nombreFactura.trim().toLowerCase()
        );
      }

      if (clienteCoincidente) {
        const claveClienteEncontrado = clienteCoincidente.clave;
        const totalActual = avancesPorCliente.get(claveClienteEncontrado) || 0;
        avancesPorCliente.set(claveClienteEncontrado, totalActual + monto);
      }
    });

    this.clientesPaginados = this.clientesPaginados.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_junio: avance
      };
    });

    this.clientesOriginales = this.clientesOriginales.map(cliente => {
      const avance = avancesPorCliente.get(cliente.clave) || 0;
      return {
        ...cliente,
        total_facturas_junio: avance
      };
    });
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /* Excel */

  exportarAExcel() {
    this.cargando = true;

    this.multimarcasService.getMultimarcasTodo().pipe(
      finalize(() => this.cargando = false)
    ).subscribe({
      next: (data) => {
        // Preparar los datos para Excel
        const datosParaExcel = data.map((item: any) => {
          return {
            'Clave': item.clave || '',
            'EVAC': item.evac || '',
            'Cliente - Razón Social': item.cliente_razon_social || '',
            'Avance GLOBAL': this.parsearNumero(item.avance_global),
            'Avance Global Scott': this.parsearNumero(item.avance_global_scott),
            'Avance Global Syncros': this.parsearNumero(item.avance_global_syncros),
            'Avance Global Apparel': this.parsearNumero(item.avance_global_apparel),
            'Avance Global Vittoria': this.parsearNumero(item.avance_global_vittoria),
            'Avance Global Bold': this.parsearNumero(item.avance_global_bold),
            'Julio 25': this.parsearNumero(item.total_facturas_julio),
            'Agosto 25': this.parsearNumero(item.total_facturas_agosto),
            'Septiembre 25': this.parsearNumero(item.total_facturas_septiembre),
            'Octubre 25': this.parsearNumero(item.total_facturas_octubre),
            'Noviembre 25': this.parsearNumero(item.total_facturas_noviembre),
            'Diciembre 25': this.parsearNumero(item.total_facturas_diciembre),
            'Enero 26': this.parsearNumero(item.total_facturas_enero),
            'Febrero 26': this.parsearNumero(item.total_facturas_febrero),
            'Marzo 26': this.parsearNumero(item.total_facturas_marzo),
            'Abril 26': this.parsearNumero(item.total_facturas_abril),
            'Mayo 26': this.parsearNumero(item.total_facturas_mayo),
            'Junio 26': this.parsearNumero(item.total_facturas_junio)
          };
        });

        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datosParaExcel);

        // Aplicar formato y ajustar columnas
        this.ajustarExcel(ws, datosParaExcel);

        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Multimarcas');

        // Generar archivo y descargar
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Multimarcas_${fecha}.xlsx`);
      },
      error: (error) => {
        console.error('Error al obtener datos para exportar:', error);
      }
    });
  }

  private parsearNumero(valor: any): number {
    if (valor === undefined || valor === null || valor === '') return 0;
    return typeof valor === 'string' ? parseFloat(valor) || 0 : Number(valor) || 0;
  }

  // Función para formatear números con separadores de miles y 2 decimales
  private formatearNumero(valor: number): string {
    return valor.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Función para aplicar todos los ajustes al Excel
  private ajustarExcel(ws: XLSX.WorkSheet, data: any[]) {
    if (!data.length) return;

    // Definir las columnas que son numéricas
    const columnasNumericas = [
      'Avance GLOBAL',
      'Avance Global Scott', 'Avance Global Syncros', 'Avance Global Apparel',
      'Avance Global Vittoria', 'Avance Global Bold',
      'Julio 25', 'Agosto 25', 'Septiembre 25', 'Octubre 25',
      'Noviembre 25', 'Diciembre 25', 'Enero 26', 'Febrero 26',
      'Marzo 26', 'Abril 26', 'Mayo 26', 'Junio 26'
    ];

    // Obtener el rango de celdas
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z1');

    // Aplicar formato a las celdas numéricas
    columnasNumericas.forEach(col => {
      const colIndex = Object.keys(data[0]).indexOf(col);
      if (colIndex === -1) return;

      // Aplicar formato solo a las filas de datos (saltando el header)
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
        if (ws[cellAddress]) {
          // Asegurarse de que el valor sea numérico
          const cellValue = ws[cellAddress].v;
          if (typeof cellValue === 'number' || !isNaN(parseFloat(cellValue))) {
            ws[cellAddress].v = typeof cellValue === 'number' ? cellValue : parseFloat(cellValue);
            ws[cellAddress].t = 'n';
            ws[cellAddress].z = '#,##0.00';
          }
        }
      }
    });

    // Ajustar el ancho de las columnas automáticamente
    const headers = Object.keys(data[0]);
    const columnWidths: XLSX.ColInfo[] = [];

    headers.forEach((header, i) => {
      // Calcular el ancho máximo basado en el contenido
      let maxLength = header.length;

      data.forEach(row => {
        const value = row[header];
        let length = 0;

        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            length = this.formatearNumero(value).length;
          } else {
            length = String(value).length;
          }
        }

        if (length > maxLength) maxLength = length;
      });

      // Ajustar el ancho de la columna (añadiendo espacio extra y aplicando límites)
      columnWidths[i] = { wch: Math.min(Math.max(maxLength + 3, 12), 40) };
    });

    // Asignar los anchos de columna calculados
    ws['!cols'] = columnWidths;
  }
}