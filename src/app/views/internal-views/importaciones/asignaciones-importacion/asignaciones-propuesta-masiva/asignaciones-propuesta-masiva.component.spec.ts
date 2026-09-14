import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionesPropuestaMasivaComponent } from './asignaciones-propuesta-masiva.component';
import {
  AsignacionesImportacionService, AsignacionesProducto, PropuestaProducto,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesPropuestaMasivaComponent', () => {
  let fixture: ComponentFixture<AsignacionesPropuestaMasivaComponent>;
  let component: AsignacionesPropuestaMasivaComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const prodBase: AsignacionesProducto = {
    id: 10, importacion_id: 1, periodo: '2026-2027', sku: 'SKU-1', sku_norm: 'SKU1',
    descripcion: 'Bici X', cantidad_embarcada: 10, cantidad_asignada: 3, cantidad_reservada: 3,
    reservado_inicial: 3, reservado_reasignacion_pendiente: 0, reservado_confirmado: 0, reservado_total: 3,
    cantidad_vendida: 0, cantidad_sobrante: 7, cantidad_disponible: 7, created_at: '', updated_at: '',
  };
  const prodBase2: AsignacionesProducto = { ...prodBase, id: 11, sku: 'SKU-2' };

  const propMock: PropuestaProducto = {
    producto_id: 10, sku: 'SKU-1', descripcion: 'Bici X', periodo: '2026-2027',
    cantidad_embarcada: 10, disponible: 7, proyecciones_disponibles: true, origen: 'INICIAL',
    ventana: { desde: '2026-10', hasta: '2026-11' }, sobrante_estimado: 0,
    propuesta: [{
      clave_cliente: 'LC657', nombre_cliente: 'Cliente Uno', prioridad: 1,
      proyectado_total: 9, sugerido_total: 7, faltante_total: 2,
      meses: [
        { mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
        { mes: '2026-11', proyectado: 4, vigente: 0, sugerido: 2 },
      ],
    }],
  };
  const propMock2: PropuestaProducto = { ...propMock, producto_id: 11, sku: 'SKU-2' };

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['recalcular', 'reservar']);

    await TestBed.configureTestingModule({
      imports: [AsignacionesPropuestaMasivaComponent],
      providers: [{ provide: AsignacionesImportacionService, useValue: svcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesPropuestaMasivaComponent);
    component = fixture.componentInstance;
    component.importacionId = 1;
    component.productos = [prodBase, prodBase2];
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('detecta el periodo comun de los productos seleccionados al iniciar', () => {
    expect(component.periodoComun).toBe('2026-2027');
    expect(component.errorPeriodo).toBe('');
    expect(component.paso).toBe('form');
  });

  it('bloquea el calculo si los productos seleccionados tienen periodos distintos', () => {
    component.productos = [prodBase, { ...prodBase2, periodo: '2025-2026' }];
    component.ngOnChanges();
    expect(component.periodoComun).toBeNull();
    expect(component.errorPeriodo).toContain('periodos distintos');
  });

  it('calcular() llama a recalcular y filtra la propuesta solo a los productos seleccionados', () => {
    svcSpy.recalcular.and.returnValue(of([propMock, propMock2, { ...propMock, producto_id: 999, sku: 'OTRO' }]));
    component.mesDesde = 'octubre';
    component.mesHasta = 'noviembre';

    component.calcular();

    expect(svcSpy.recalcular).toHaveBeenCalledWith(1, 'octubre', 'noviembre', '2026-2027');
    expect(component.filas.map((f) => f.producto.sku)).toEqual(['SKU-1', 'SKU-2']);
    expect(component.filas.every((f) => !!f.prop)).toBeTrue();
    expect(component.paso).toBe('resumen');
  });

  it('calcular() marca prop=null para un producto seleccionado que no viene en la propuesta', () => {
    svcSpy.recalcular.and.returnValue(of([propMock]));
    component.calcular();
    const filaSinPropuesta = component.filas.find((f) => f.producto.sku === 'SKU-2');
    expect(filaSinPropuesta?.prop).toBeNull();
    expect(component.totalSugerido(filaSinPropuesta!.prop)).toBe(0);
  });

  it('totalProyectado()/totalSugerido()/totalFaltante() suman por cliente', () => {
    expect(component.totalProyectado(propMock)).toBe(9);
    expect(component.totalSugerido(propMock)).toBe(7);
    expect(component.totalFaltante(propMock)).toBe(2);
  });

  it('reservarTodo() reserva cada producto con propuesta y cantidad sugerida > 0', () => {
    svcSpy.recalcular.and.returnValue(of([propMock, propMock2]));
    svcSpy.reservar.and.returnValue(of({ producto_id: 10, disponible_restante: 0 }));
    component.calcular();

    component.reservarTodo();

    expect(svcSpy.reservar).toHaveBeenCalledTimes(2);
    expect(svcSpy.reservar).toHaveBeenCalledWith(1, 10, [
      { clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 5, proyectado: 5 },
      { clave_cliente: 'LC657', mes_objetivo: '2026-11', cantidad: 2, proyectado: 4 },
    ]);
    expect(component.resultados.length).toBe(2);
    expect(component.paso).toBe('terminado');
  });

  it('reservarTodo() no llama al servicio si no hay nada sugerido y muestra un error', () => {
    component.filas = [{
      producto: prodBase,
      prop: { ...propMock, propuesta: [{ ...propMock.propuesta[0], meses: propMock.propuesta[0].meses.map((m) => ({ ...m, sugerido: 0 })) }] },
    }];
    component.reservarTodo();
    expect(svcSpy.reservar).not.toHaveBeenCalled();
    expect(component.errorResumen).toContain('sugerida');
  });

  it('reservarTodo() reporta el error de un producto sin bloquear el resto', () => {
    svcSpy.recalcular.and.returnValue(of([propMock]));
    svcSpy.reservar.and.returnValue(throwError(() => ({ error: { error: { message: 'Sin disponible' } } })));
    component.calcular();

    component.reservarTodo();

    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: false, error: 'Sin disponible' }]);
    expect(component.paso).toBe('terminado');
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
