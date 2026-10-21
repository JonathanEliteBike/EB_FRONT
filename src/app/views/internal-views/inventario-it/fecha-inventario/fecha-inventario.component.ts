import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePickerComponent } from '../../../../components/date-picker/date-picker.component';
import { DateRangePickerComponent } from '../../../../components/date-range-picker/date-range-picker.component';

/**
 * Reutiliza los calendarios del portal (estilo Garantías).
 * Contratos: fecha y rango YYYY-MM-DD, fecha/hora YYYY-MM-DDTHH:mm.
 * No transforma fechas usando UTC; conserva la hora local del formulario.
 */
@Component({
  selector: 'app-fecha-inventario',
  standalone: true,
  imports: [CommonModule, DatePickerComponent, DateRangePickerComponent],
  templateUrl: './fecha-inventario.component.html',
  styleUrl: './fecha-inventario.component.css'
})
export class FechaInventarioComponent {
  @Input() mode: 'range' | 'single' | 'datetime' = 'single';
  @Input() value = '';
  @Input() desde = '';
  @Input() hasta = '';
  @Input() placeholder = 'Elegir fecha';
  @Input() disabled = false;

  @Output() dateChange = new EventEmitter<string>();
  @Output() desdeChange = new EventEmitter<string>();
  @Output() hastaChange = new EventEmitter<string>();
  /** Al concluir el rango o al limpiarlo. */
  @Output() rangeChange = new EventEmitter<{desde: string; hasta: string}>();

  get fecha(): string { return (this.value || '').slice(0, 10); }
  get hora(): string { return (this.value || '').slice(11, 16); }

  cambiarFecha(fecha: string): void {
    if (this.mode === 'single') {
      this.dateChange.emit(fecha);
    } else {
      this.dateChange.emit(fecha ? `${fecha}T${this.hora || '00:00'}` : '');
    }
  }

  cambiarHora(hora: string): void {
    if (this.fecha && hora) this.dateChange.emit(`${this.fecha}T${hora}`);
  }

  limpiarRango(): void {
    this.desdeChange.emit('');
    this.hastaChange.emit('');
    this.rangeChange.emit({desde:'', hasta:''});
  }
}
