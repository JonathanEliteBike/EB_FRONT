import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculadoraRetroactivosComponent } from './calculadora-retroactivos.component';

describe('CalculadoraRetroactivosComponent', () => {
  let component: CalculadoraRetroactivosComponent;
  let fixture: ComponentFixture<CalculadoraRetroactivosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculadoraRetroactivosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalculadoraRetroactivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
