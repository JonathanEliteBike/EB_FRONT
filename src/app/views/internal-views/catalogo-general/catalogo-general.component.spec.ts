import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoGeneralComponent } from './catalogo-general.component';

describe('CatalogoGeneralComponent', () => {
  let component: CatalogoGeneralComponent;
  let fixture: ComponentFixture<CatalogoGeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoGeneralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogoGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
