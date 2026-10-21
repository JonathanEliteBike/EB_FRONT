import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoPermisosComponent } from './catalogo-permisos.component';

describe('CatalogoPermisosComponent', () => {
  let component: CatalogoPermisosComponent;
  let fixture: ComponentFixture<CatalogoPermisosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoPermisosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogoPermisosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
