import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarioItComponent } from './inventario-it.component';

describe('InventarioItComponent', () => {
  let component: InventarioItComponent;
  let fixture: ComponentFixture<InventarioItComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioItComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioItComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
