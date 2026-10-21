import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Selector de rango de fechas (desde/hasta) con calendario popover.
 * Mismo estilo visual que el selector de fecha de Garantías (garantias-tickets).
 */
@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.css'
})
export class DateRangePickerComponent implements OnChanges {
  ngOnChanges(): void {
    // Si los filtros externos se limpian, la siguiente selección comienza en INICIO.
    if (!this.fechaDesde && !this.fechaHasta) this.seleccionando = 'inicio';
  }

  @Input() fechaDesde: string | null = null;
  @Input() fechaHasta: string | null = null;
  @Input() placeholder = 'Filtrar por fecha';
  @Input() disabled = false;

  @Output() fechaDesdeChange = new EventEmitter<string | null>();
  @Output() fechaHastaChange = new EventEmitter<string | null>();
  /** Emite {desde, hasta} justo cuando ambas fechas ya quedaron seleccionadas. */
  @Output() rangoCompleto = new EventEmitter<{ desde: string; hasta: string }>();
  @Output() limpiar = new EventEmitter<void>();

  readonly NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly DIAS_SEM = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

  mostrarCalendario = false;
  calMes = new Date().getMonth();
  calAnio = new Date().getFullYear();
  calVista: 'dias' | 'meses' | 'anios' = 'dias';
  calDecadaInicio = Math.floor(new Date().getFullYear() / 12) * 12;
  seleccionando: 'inicio' | 'fin' = 'inicio';

  @ViewChild('drWrap') drWrapEl!: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.mostrarCalendario && !this.drWrapEl?.nativeElement.contains(e.target as Node)) {
      this.mostrarCalendario = false;
    }
  }

  toggleCalendario(e: MouseEvent): void {
    e.stopPropagation();
    if (this.disabled) return;
    if (!this.mostrarCalendario) this.calVista = 'dias';
    this.mostrarCalendario = !this.mostrarCalendario;
  }

  diasDelMes(): (number | null)[] {
    const primerDia = new Date(this.calAnio, this.calMes, 1).getDay();
    const totalDias = new Date(this.calAnio, this.calMes + 1, 0).getDate();
    const dias: (number | null)[] = Array(primerDia).fill(null);
    for (let i = 1; i <= totalDias; i++) dias.push(i);
    return dias;
  }

  private diaAFecha(dia: number): string {
    return `${this.calAnio}-${String(this.calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  seleccionarDia(dia: number): void {
    const fecha = this.diaAFecha(dia);

    if (this.seleccionando === 'inicio') {
      this.fechaDesde = fecha;
      this.fechaHasta = null;
      this.fechaDesdeChange.emit(this.fechaDesde);
      this.fechaHastaChange.emit(this.fechaHasta);
      this.seleccionando = 'fin';
      return;
    }

    if (this.fechaDesde && fecha < this.fechaDesde) {
      this.fechaHasta = this.fechaDesde;
      this.fechaDesde = fecha;
      this.fechaDesdeChange.emit(this.fechaDesde);
    } else {
      this.fechaHasta = fecha;
    }
    this.fechaHastaChange.emit(this.fechaHasta);
    this.seleccionando = 'inicio';
    this.mostrarCalendario = false;

    if (this.fechaDesde && this.fechaHasta) {
      this.rangoCompleto.emit({ desde: this.fechaDesde, hasta: this.fechaHasta });
    }
  }

  esInicio(dia: number | null): boolean {
    return !!dia && !!this.fechaDesde && this.diaAFecha(dia) === this.fechaDesde;
  }

  esFin(dia: number | null): boolean {
    return !!dia && !!this.fechaHasta && this.diaAFecha(dia) === this.fechaHasta;
  }

  enRango(dia: number | null): boolean {
    if (!dia || !this.fechaDesde || !this.fechaHasta) return false;
    const f = this.diaAFecha(dia);
    return f > this.fechaDesde && f < this.fechaHasta;
  }

  esHoy(dia: number | null): boolean {
    return !!dia && this.diaAFecha(dia) === new Date().toISOString().slice(0, 10);
  }

  mesAnterior(): void {
    if (this.calVista === 'anios') { this.calDecadaInicio -= 12; }
    else if (this.calVista === 'meses') { this.calAnio--; }
    else {
      if (this.calMes === 0) { this.calMes = 11; this.calAnio--; }
      else this.calMes--;
    }
  }

  mesSiguiente(): void {
    if (this.calVista === 'anios') { this.calDecadaInicio += 12; }
    else if (this.calVista === 'meses') { this.calAnio++; }
    else {
      if (this.calMes === 11) { this.calMes = 0; this.calAnio++; }
      else this.calMes++;
    }
  }

  abrirVistaMeses(): void {
    this.calVista = 'meses';
  }

  abrirVistaAnios(): void {
    this.calDecadaInicio = Math.floor(this.calAnio / 12) * 12;
    this.calVista = 'anios';
  }

  seleccionarMes(mes: number): void {
    this.calMes = mes;
    this.calVista = 'dias';
  }

  seleccionarAnio(anio: number): void {
    this.calAnio = anio;
    this.calVista = 'meses';
  }

  aniosDecada(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.calDecadaInicio + i);
  }

  esMesActual(mes: number): boolean {
    const h = new Date();
    return this.calAnio === h.getFullYear() && mes === h.getMonth();
  }

  esAnioActual(anio: number): boolean {
    return anio === new Date().getFullYear();
  }

  limpiarFechas(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.seleccionando = 'inicio';
    this.mostrarCalendario = false;
    this.fechaDesdeChange.emit(null);
    this.fechaHastaChange.emit(null);
    this.limpiar.emit();
  }

  formatDisplayDate(fecha: string | null): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  }
}
