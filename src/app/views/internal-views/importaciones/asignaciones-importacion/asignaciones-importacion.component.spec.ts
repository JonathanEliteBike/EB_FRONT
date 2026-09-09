import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AsignacionesImportacionComponent } from './asignaciones-importacion.component';
import { AsignacionesImportacionService, AsignacionesResumen } from '../../../../services/asignaciones-importacion.service';

describe('AsignacionesImportacionComponent', () => {
  let fixture: ComponentFixture<AsignacionesImportacionComponent>;
  let component: AsignacionesImportacionComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const resumenMock: AsignacionesResumen = {
    embarque: { id: 1, referencia: 'IMP-001', nombre: 'Test', estado: 'activo' },
    kpis: { unidades_embarcadas: 10, unidades_asignadas: 4, unidades_sobrantes: 6, unidades_vendidas: 0, unidades_disponibles: 6 },
    productos: [],
  };

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['resumen', 'crearProducto']);
    svcSpy.resumen.and.returnValue(of(resumenMock));

    await TestBed.configureTestingModule({
      imports: [AsignacionesImportacionComponent, HttpClientTestingModule],
      providers: [
        { provide: AsignacionesImportacionService, useValue: svcSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesImportacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('carga el resumen al iniciar', () => {
    expect(svcSpy.resumen).toHaveBeenCalledWith(1);
    expect(component.resumen).toEqual(resumenMock);
    expect(component.cargando).toBeFalse();
  });

  it('agregarProducto() valida campos obligatorios antes de llamar al servicio', () => {
    component.nuevoProducto = { sku: '', cantidad_embarcada: null, periodo: '', descripcion: '' };
    component.agregarProducto();
    expect(component.errorProducto).toContain('obligatorios');
    expect(svcSpy.crearProducto).not.toHaveBeenCalled();
  });

  it('abrirDetalle() setea productoSeleccionado', () => {
    const producto = { id: 5 } as any;
    component.abrirDetalle(producto);
    expect(component.productoSeleccionado).toBe(producto);
  });

  it('cerrarDetalle() limpia productoSeleccionado', () => {
    component.productoSeleccionado = { id: 5 } as any;
    component.cerrarDetalle();
    expect(component.productoSeleccionado).toBeNull();
  });
});
