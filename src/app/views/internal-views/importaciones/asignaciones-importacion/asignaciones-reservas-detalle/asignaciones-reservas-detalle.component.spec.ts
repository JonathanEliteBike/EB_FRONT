import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionesReservasDetalleComponent } from './asignaciones-reservas-detalle.component';
import {
  AsignacionesImportacionService, ReservaEmbarque,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesReservasDetalleComponent', () => {
  let fixture: ComponentFixture<AsignacionesReservasDetalleComponent>;
  let component: AsignacionesReservasDetalleComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const reservas: ReservaEmbarque[] = [
    {
      id: 1, importacion_producto_id: 10, clave_cliente: 'LC657', mes_objetivo: '2026-10',
      origen: 'INICIAL', estado: 'RESERVADA', cantidad_asignada: 3,
      odoo_order_id: 3001, odoo_order_name: 'S00042',
      sku: 'SKU-1', descripcion: 'Bici X', periodo: '2026-2027',
    },
    {
      id: 2, importacion_producto_id: 11, clave_cliente: 'MC677', mes_objetivo: '2026-11',
      origen: 'REASIGNACION', estado: 'PENDIENTE_CONFIRMACION', cantidad_asignada: 2,
      odoo_order_id: null, odoo_order_name: null,
      sku: 'SKU-2', descripcion: 'Bici Y', periodo: '2026-2027',
    },
  ];

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['reservasEmbarque']);
    svcSpy.reservasEmbarque.and.returnValue(of(reservas));

    await TestBed.configureTestingModule({
      imports: [AsignacionesReservasDetalleComponent],
      providers: [{ provide: AsignacionesImportacionService, useValue: svcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesReservasDetalleComponent);
    component = fixture.componentInstance;
    component.importacionId = 1;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('carga todas las reservas del embarque al iniciar (sin filtrar en el backend)', () => {
    expect(svcSpy.reservasEmbarque).toHaveBeenCalledWith(1);
    expect(component.reservas.length).toBe(2);
    expect(component.cargando).toBeFalse();
  });

  it('preselecciona el filtro de estado si se abrió con uno', async () => {
    const f2 = TestBed.createComponent(AsignacionesReservasDetalleComponent);
    f2.componentInstance.importacionId = 1;
    f2.componentInstance.estadoInicial = 'PENDIENTE_CONFIRMACION';
    f2.detectChanges();
    expect(f2.componentInstance.filtroEstado).toBe('PENDIENTE_CONFIRMACION');
  });

  it('reservasFiltradas() filtra por estado', () => {
    component.filtroEstado = 'RESERVADA';
    expect(component.reservasFiltradas().map((r) => r.id)).toEqual([1]);
  });

  it('reservasFiltradas() filtra por texto (cliente, sku, descripción u orden de Odoo)', () => {
    component.filtroTexto = 's00042';
    expect(component.reservasFiltradas().map((r) => r.id)).toEqual([1]);
    component.filtroTexto = 'mc677';
    expect(component.reservasFiltradas().map((r) => r.id)).toEqual([2]);
  });

  it('totalCantidad() suma la cantidad de las filas filtradas', () => {
    expect(component.totalCantidad()).toBe(5);
    component.filtroEstado = 'RESERVADA';
    expect(component.totalCantidad()).toBe(3);
  });

  it('formatoMes() convierte YYYY-MM a nombre de mes en español', () => {
    expect(component.formatoMes('2026-10')).toBe('Octubre 2026');
    expect(component.formatoMes(null)).toBe('—');
  });

  it('reporta el error del backend si falla la carga', () => {
    svcSpy.reservasEmbarque.and.returnValue(throwError(() => ({ error: { error: { message: 'Falló' } } })));
    const f3 = TestBed.createComponent(AsignacionesReservasDetalleComponent);
    f3.componentInstance.importacionId = 1;
    f3.detectChanges();
    expect(f3.componentInstance.error).toBe('Falló');
    expect(f3.componentInstance.cargando).toBeFalse();
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
