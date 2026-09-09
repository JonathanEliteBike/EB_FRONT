import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AsignacionesDetalleProductoComponent } from './asignaciones-detalle-producto.component';
import { AsignacionesImportacionService, DetalleProducto, AsignacionesProducto } from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesDetalleProductoComponent', () => {
  let fixture: ComponentFixture<AsignacionesDetalleProductoComponent>;
  let component: AsignacionesDetalleProductoComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const producto: AsignacionesProducto = {
    id: 10, importacion_id: 1, periodo: '2026-2027', sku: 'SKU-1', sku_norm: 'SKU1',
    descripcion: null, cantidad_embarcada: 10, cantidad_asignada: 3, cantidad_vendida: 0,
    cantidad_sobrante: 7, cantidad_disponible: 7, created_at: '', updated_at: '',
  };

  const detalleMock: DetalleProducto = {
    producto, proyecciones: [], asignaciones: [], sobrantes_ventas: [],
  };

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', [
      'detalleProducto', 'recalcular', 'asignar', 'ventaSobrante', 'validarOdoo', 'cancelarVenta', 'movimientos',
    ]);
    svcSpy.detalleProducto.and.returnValue(of(detalleMock));

    await TestBed.configureTestingModule({
      imports: [AsignacionesDetalleProductoComponent],
      providers: [{ provide: AsignacionesImportacionService, useValue: svcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesDetalleProductoComponent);
    component = fixture.componentInstance;
    component.importacionId = 1;
    component.producto = producto;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('carga el detalle al recibir el producto', () => {
    expect(svcSpy.detalleProducto).toHaveBeenCalledWith(1, 10);
    expect(component.detalle).toEqual(detalleMock);
  });

  it('recalcular() precarga formAsignacion con la propuesta sugerida', () => {
    svcSpy.recalcular.and.returnValue(of([
      {
        producto_id: 10, sku: 'SKU-1', periodo: '2026-2027', cantidad_embarcada: 10, disponible: 7,
        proyecciones_disponibles: true, sobrante_estimado: 2,
        propuesta: [{ clave_cliente: 'LC657', prioridad: 1, cantidad_proyectada: 5, cantidad_sugerida: 5 }],
      },
    ]));

    component.recalcular();

    expect(component.formAsignacion).toEqual([{ clave_cliente: 'LC657', cantidad: 5 }]);
  });

  it('confirmarAsignacion() no llama al servicio si no hay filas válidas', () => {
    component.formAsignacion = [{ clave_cliente: '', cantidad: 0 }];
    component.confirmarAsignacion();
    expect(component.errorAsignacion).toContain('al menos una asignación');
    expect(svcSpy.asignar).not.toHaveBeenCalled();
  });

  it('registrarVenta() valida cliente y cantidad antes de llamar al servicio', () => {
    component.nuevaVenta = { clave_cliente: '', cantidad: null, numero_pedido_odoo: '' };
    component.registrarVenta();
    expect(component.errorVenta).toContain('obligatorios');
    expect(svcSpy.ventaSobrante).not.toHaveBeenCalled();
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
