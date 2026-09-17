import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AsignacionesDetalleProductoComponent } from './asignaciones-detalle-producto.component';
import {
  AsignacionesImportacionService, DetalleProducto, AsignacionesProducto, PropuestaProducto,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesDetalleProductoComponent', () => {
  let fixture: ComponentFixture<AsignacionesDetalleProductoComponent>;
  let component: AsignacionesDetalleProductoComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const producto: AsignacionesProducto = {
    id: 10, importacion_id: 1, periodo: '2026-2027', sku: 'SKU-1', sku_norm: 'SKU1',
    descripcion: 'Bici X', cantidad_embarcada: 10, cantidad_asignada: 3, cantidad_reservada: 3,
    reservado_inicial: 3, reservado_reasignacion_pendiente: 0, reservado_confirmado: 0, reservado_total: 3,
    cantidad_vendida: 0, cantidad_sobrante: 7, cantidad_disponible: 7, created_at: '', updated_at: '',
  };

  const detalleMock: DetalleProducto = {
    producto, proyecciones: [], asignaciones: [], reservas: [], sobrantes_ventas: [],
  };

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

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', [
      'detalleProducto', 'recalcular', 'proponerReasignacion', 'reservar', 'confirmarReasignacion',
      'resolverReserva', 'cancelarAsignacion', 'ventaSobrante', 'validarOdoo', 'cancelarVenta', 'movimientos',
    ]);
    svcSpy.detalleProducto.and.returnValue(of(detalleMock));
    svcSpy.recalcular.and.returnValue(of([propMock]));
    svcSpy.proponerReasignacion.and.returnValue(of([{ ...propMock, origen: 'REASIGNACION' }]));
    svcSpy.reservar.and.returnValue(of({ producto_id: 10, disponible_restante: 0, ordenes_odoo: [] }));
    svcSpy.confirmarReasignacion.and.returnValue(of({ producto_id: 10, disponible_restante: 0, ordenes_odoo: [] }));
    svcSpy.resolverReserva.and.returnValue(of({} as any));

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

  it('recalcular() aplana la propuesta en filas por (cliente, mes) con sugerido como cantidad', () => {
    component.recalcular();
    expect(svcSpy.recalcular).toHaveBeenCalledWith(1, component.mesDesde, component.mesHasta, '2026-2027');
    expect(component.modo).toBe('inicial');
    expect(component.filas.map((f) => [f.clave_cliente, f.mes, f.proyectado, f.vigente, f.cantidad])).toEqual([
      ['LC657', '2026-10', 5, 0, 5],
      ['LC657', '2026-11', 4, 0, 2],
    ]);
    expect(component.totalAReservar()).toBe(7);
  });

  it('reasignar() carga la propuesta de reasignación y cambia el modo', () => {
    component.reasignar();
    expect(svcSpy.proponerReasignacion).toHaveBeenCalledWith(1, component.mesDesde, '2026-2027');
    expect(component.modo).toBe('reasignacion');
  });

  it('guardar() no llama al servicio si no hay filas con cantidad > 0', () => {
    component.propuesta = propMock;
    component.filas = [{ clave_cliente: 'LC657', nombre_cliente: 'x', prioridad: 1, mes: '2026-10',
                        proyectado: 5, vigente: 0, sugerido: 0, cantidad: 0 }];
    component.guardar();
    expect(component.errorGuardar).toContain('cantidad');
    expect(svcSpy.reservar).not.toHaveBeenCalled();
  });

  it('guardar() en modo inicial usa reservar(); en modo reasignación usa confirmarReasignacion()', () => {
    component.recalcular();
    component.guardar();
    expect(svcSpy.reservar).toHaveBeenCalled();
    const reservas = svcSpy.reservar.calls.mostRecent().args[2];
    expect(reservas).toEqual([
      { clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 5, proyectado: 5 },
      { clave_cliente: 'LC657', mes_objetivo: '2026-11', cantidad: 2, proyectado: 4 },
    ]);

    component.reasignar();
    component.guardar();
    expect(svcSpy.confirmarReasignacion).toHaveBeenCalled();
  });

  it('resolver() llama a resolverReserva con la decisión', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const r: any = { id: 9, clave_cliente: 'LC657', cantidad_asignada: 6, mes_objetivo: '2026-11' };
    component.resolver(r, 'RECHAZADA');
    expect(svcSpy.resolverReserva).toHaveBeenCalledWith(1, 9, 'RECHAZADA');
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
