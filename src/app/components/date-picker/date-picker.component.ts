import {
  Component, Input, Output, EventEmitter, OnChanges,
  HostListener, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent implements OnChanges {
  @Input() mode: 'single' | 'range' = 'single';
  @Input() placeholder = 'Seleccionar fecha';
  /** Single mode: value in YYYY-MM-DD */
  @Input() value = '';
  /** Range mode: start date YYYY-MM-DD */
  @Input() desde = '';
  /** Range mode: end date YYYY-MM-DD */
  @Input() hasta = '';

  @Output() dateChange  = new EventEmitter<string>();
  @Output() rangeChange = new EventEmitter<{ desde: string; hasta: string }>();

  mostrarCalendario = false;
  calVista: 'dias' | 'meses' | 'anios' = 'dias';
  calMes    = new Date().getMonth();
  calAnio   = new Date().getFullYear();
  calDecadaInicio = Math.floor(new Date().getFullYear() / 12) * 12;
  seleccionando: 'inicio' | 'fin' = 'inicio';
  fechaDesde  = '';
  fechaHasta  = '';
  fechaSingle = '';
  textoFecha  = '';

  readonly NOMBRES_MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ];
  readonly DIAS_SEM = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

  constructor(private cdr: ChangeDetectorRef, private el: ElementRef) {}

  ngOnChanges(): void {
    if (this.mode === 'single') {
      this.fechaSingle = this.value || '';
      this.textoFecha  = this._isoATexto(this.fechaSingle);
      if (this.fechaSingle) {
        const d = new Date(this.fechaSingle + 'T00:00:00');
        this.calMes  = d.getMonth();
        this.calAnio = d.getFullYear();
      }
    } else {
      this.fechaDesde = this.desde || '';
      this.fechaHasta = this.hasta || '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.mostrarCalendario && !this.el.nativeElement.contains(e.target as Node)) {
      this.mostrarCalendario = false;
      this.cdr.markForCheck();
    }
  }

  toggleCalendario(e: MouseEvent): void {
    e.stopPropagation();
    if (!this.mostrarCalendario) this.calVista = 'dias';
    this.mostrarCalendario = !this.mostrarCalendario;
    this.cdr.markForCheck();
  }

  diasDelMes(): (number | null)[] {
    const primerDia = new Date(this.calAnio, this.calMes, 1).getDay();
    const totalDias = new Date(this.calAnio, this.calMes + 1, 0).getDate();
    const dias: (number | null)[] = Array(primerDia).fill(null);
    for (let i = 1; i <= totalDias; i++) dias.push(i);
    return dias;
  }

  diaAFecha(dia: number): string {
    return `${this.calAnio}-${String(this.calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  seleccionarDia(dia: number): void {
    const fecha = this.diaAFecha(dia);
    if (this.mode === 'single') {
      this.fechaSingle       = fecha;
      this.textoFecha        = this._isoATexto(fecha);
      this.mostrarCalendario = false;
      this.dateChange.emit(fecha);
    } else {
      if (this.seleccionando === 'inicio') {
        this.fechaDesde    = fecha;
        this.fechaHasta    = '';
        this.seleccionando = 'fin';
      } else {
        if (fecha < this.fechaDesde) {
          [this.fechaDesde, this.fechaHasta] = [fecha, this.fechaDesde];
        } else {
          this.fechaHasta = fecha;
        }
        this.seleccionando    = 'inicio';
        this.mostrarCalendario = false;
        this.rangeChange.emit({ desde: this.fechaDesde, hasta: this.fechaHasta });
      }
    }
    this.cdr.markForCheck();
  }

  esInicio(dia: number | null): boolean {
    if (!dia) return false;
    const f = this.diaAFecha(dia);
    return this.mode === 'single' ? f === this.fechaSingle : f === this.fechaDesde;
  }

  esFin(dia: number | null): boolean {
    return this.mode === 'range' && !!dia && !!this.fechaHasta && this.diaAFecha(dia) === this.fechaHasta;
  }

  enRango(dia: number | null): boolean {
    if (this.mode === 'single' || !dia || !this.fechaDesde || !this.fechaHasta) return false;
    const f = this.diaAFecha(dia);
    return f > this.fechaDesde && f < this.fechaHasta;
  }

  esHoy(dia: number | null): boolean {
    return !!dia && this.diaAFecha(dia) === new Date().toISOString().slice(0, 10);
  }

  mesAnterior(): void {
    if      (this.calVista === 'anios')  { this.calDecadaInicio -= 12; }
    else if (this.calVista === 'meses')  { this.calAnio--; }
    else if (this.calMes === 0)          { this.calMes = 11; this.calAnio--; }
    else                                 { this.calMes--; }
    this.cdr.markForCheck();
  }

  mesSiguiente(): void {
    if      (this.calVista === 'anios')  { this.calDecadaInicio += 12; }
    else if (this.calVista === 'meses')  { this.calAnio++; }
    else if (this.calMes === 11)         { this.calMes = 0; this.calAnio++; }
    else                                 { this.calMes++; }
    this.cdr.markForCheck();
  }

  abrirVistaMeses(): void { this.calVista = 'meses'; this.cdr.markForCheck(); }

  abrirVistaAnios(): void {
    this.calDecadaInicio = Math.floor(this.calAnio / 12) * 12;
    this.calVista = 'anios';
    this.cdr.markForCheck();
  }

  seleccionarMes(mes: number): void { this.calMes   = mes;  this.calVista = 'dias';  this.cdr.markForCheck(); }
  seleccionarAnio(a: number):  void { this.calAnio  = a;    this.calVista = 'meses'; this.cdr.markForCheck(); }

  aniosDecada(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.calDecadaInicio + i);
  }

  esMesActual(mes: number): boolean {
    const h = new Date();
    return this.calAnio === h.getFullYear() && mes === h.getMonth();
  }

  esAnioActual(a: number): boolean { return a === new Date().getFullYear(); }

  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9/]/g, '');
    // Auto-insert slashes: after day (pos 2) and month (pos 5)
    if (val.length === 2 && !val.includes('/')) val += '/';
    else if (val.length === 5 && val.split('/').length === 2) val += '/';
    // Clamp day and month when segment is complete (2 digits)
    const parts = val.split('/');
    if (parts[0]?.length === 2) {
      const dd = parseInt(parts[0]);
      if (dd > 31) parts[0] = '31';
      else if (dd < 1) parts[0] = '01';
    }
    if (parts[1]?.length === 2) {
      const mm = parseInt(parts[1]);
      if (mm > 12) parts[1] = '12';
      else if (mm < 1) parts[1] = '01';
    }
    val = parts.join('/');
    if (input.value !== val) input.value = val;
    this.textoFecha = val;
  }

  onInputBlur(event: FocusEvent): void {
    const val = (event.target as HTMLInputElement).value.trim();
    if (!val) { if (this.fechaSingle) this.limpiar(); return; }
    const iso = this._textoAIso(val);
    if (iso) {
      this.fechaSingle = iso;
      this.textoFecha  = val;
      const d = new Date(iso + 'T00:00:00');
      this.calMes  = d.getMonth();
      this.calAnio = d.getFullYear();
      this.dateChange.emit(iso);
      this.cdr.markForCheck();
    } else {
      this.textoFecha = this._isoATexto(this.fechaSingle);
      (event.target as HTMLInputElement).value = this.textoFecha;
      this.cdr.markForCheck();
    }
  }

  private _isoATexto(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  private _textoAIso(txt: string): string | null {
    const parts = txt.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yy] = parts.map(Number);
    if (!dd || !mm || !yy || mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 1900 || yy > 2200) return null;
    const date = new Date(yy, mm - 1, dd);
    if (date.getDate() !== dd || date.getMonth() !== mm - 1) return null;
    return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  limpiar(): void {
    if (this.mode === 'single') {
      this.fechaSingle = '';
      this.textoFecha  = '';
      this.dateChange.emit('');
    } else {
      this.fechaDesde    = '';
      this.fechaHasta    = '';
      this.seleccionando = 'inicio';
      this.rangeChange.emit({ desde: '', hasta: '' });
    }
    this.mostrarCalendario = false;
    this.cdr.markForCheck();
  }

  formatFecha(f: string): string {
    if (!f) return '';
    const parts = f.split('-');
    if (parts.length !== 3) return f;
    const [y, m, d] = parts;
    const day = parseInt(d);
    const mon = parseInt(m) - 1;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    if (isNaN(day) || isNaN(mon) || mon < 0 || mon > 11) return f;
    return `${day} ${meses[mon]} ${y}`;
  }

  get tieneValor(): boolean {
    return this.mode === 'single'
      ? !!this.fechaSingle
      : !!(this.fechaDesde || this.fechaHasta);
  }
}
