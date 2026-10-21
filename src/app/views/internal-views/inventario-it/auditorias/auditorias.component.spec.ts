import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditoriasComponent } from './auditorias.component';

describe('AuditoriasComponent', () => {
  let component: AuditoriasComponent;
  let fixture: ComponentFixture<AuditoriasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditoriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
