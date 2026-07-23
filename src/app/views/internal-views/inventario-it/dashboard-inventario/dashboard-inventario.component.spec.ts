import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardInventarioComponent } from './dashboard-inventario.component';

describe('DashboardInventarioComponent', () => {
  let component: DashboardInventarioComponent;
  let fixture: ComponentFixture<DashboardInventarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardInventarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardInventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
