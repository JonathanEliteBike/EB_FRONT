import { Directive, HostListener, Self } from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
  selector: 'input[type="text"][ngModel]:not([appRaw]), textarea[ngModel]:not([appRaw])',
  standalone: true,
})
export class TitleCaseDirective {
  constructor(@Self() private model: NgModel) {}

  @HostListener('blur')
  onBlur(): void {
    const val = String(this.model.value ?? '');
    if (!val.trim()) return;
    const result = val.replace(/(\S+)/g, w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
    if (result !== val) this.model.control.setValue(result);
  }
}
