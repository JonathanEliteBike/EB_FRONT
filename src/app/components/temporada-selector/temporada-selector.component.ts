import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/** Valor especial emitido por la opción "Histórico completo" (solo si
 *  `incluirHistorico` está activo) -- distinto de '' (temporada actual) y de
 *  una etiqueta real de temporada cerrada, para que el consumidor pueda
 *  distinguir los tres casos sin ambigüedad. */
export const TEMPORADA_HISTORICO = '__HISTORICO__';

/**
 * Selector custom de temporada (actual vs. temporadas cerradas). Reemplaza
 * el <select> nativo -- el menu desplegado de un <select> usa el estilo del
 * SO y no se puede tematizar, rompiendo el tema oscuro de la app. Mismo
 * patron de popover que app-date-picker (click-outside via HostListener,
 * OnPush + markForCheck).
 *
 * Emite '' para "temporada actual", o la etiqueta (ej. '2025-2026') para una
 * temporada cerrada -- mismo contrato que ya esperan los metodos
 * verTemporadaPasada(temporada: string) existentes en cada pantalla.
 *
 * `incluirHistorico` es opt-in (default false) para no alterar las pantallas
 * que ya consumen este componente (caratulas, monitor, multimarcas) -- si se
 * activa, aparece una opción extra que emite TEMPORADA_HISTORICO.
 */
@Component({
  selector: 'app-temporada-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temporada-selector.component.html',
  styleUrl: './temporada-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemporadaSelectorComponent {
  @Input() temporadas: string[] = [];
  @Input() seleccionada: string | null = null;
  @Input() disabled = false;
  @Input() incluirHistorico = false;

  readonly HISTORICO = TEMPORADA_HISTORICO;

  @Output() cambio = new EventEmitter<string>();

  abierto = false;

  constructor(private cdr: ChangeDetectorRef, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.abierto && !this.el.nativeElement.contains(e.target as Node)) {
      this.cerrar();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto) this.cerrar();
  }

  toggle(e: MouseEvent): void {
    if (this.disabled) return;
    e.stopPropagation();
    this.abierto = !this.abierto;
    this.cdr.markForCheck();
  }

  private cerrar(): void {
    this.abierto = false;
    this.cdr.markForCheck();
  }

  elegir(temporada: string): void {
    this.cerrar();
    if (temporada !== (this.seleccionada ?? '')) {
      this.cambio.emit(temporada);
    }
  }

  get etiquetaActual(): string {
    if (this.seleccionada === this.HISTORICO) return 'Histórico completo';
    return this.seleccionada || 'Temporada actual';
  }
}
