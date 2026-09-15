import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionesReservasClienteComponent } from './asignaciones-reservas-cliente.component';
import {
  AsignacionesImportacionService, ClientePrioridad, ReservaEmbarque,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesReservasClienteComponent', () => {
  let fixture: ComponentFixture<AsignacionesReservasClienteComponent>;
  let component: AsignacionesReservasClienteComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const clientes: ClientePrioridad[] = [
    { clave: 'MC677', nombre: 'BICICLETAS SCJM', prioridad: 2 },
    { clave: 'LC657', nombre: 'Víctor Hugo Villanueva Guzman', prioridad: 1 },
  ];

  const reservasMock: ReservaEmbarque[] = [
    {
      id: 1, importacion_producto_id: 10, sku: 'SKU-1', descripcion: 'Bici X', periodo: '2026-2027',
      clave_cliente: 'LC657', mes_objetivo: '2026-12', origen: 'INICIAL', estado: 'RESERVADA',
      cantidad_asignada: 5, cantidad_proyectada: 5, prioridad: 1,
    },
  ];

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['prioridadClientes', 'reservasEmbarque']);
    svcSpy.prioridadClientes.and.returnValue(of(clientes));

    await TestBed.configureTestingModule({
      imports: [AsignacionesReservasClienteComponent],
      providers: [{ provide: AsignacionesImportacionService, useValue: svcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesReservasClienteComponent);
    component = fixture.componentInstance;
    component.importacionId = 1;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('carga la lista de clientes ordenada por prioridad al iniciar', () => {
    expect(svcSpy.prioridadClientes).toHaveBeenCalled();
    expect(component.clientes.map((c) => c.clave)).toEqual(['LC657', 'MC677']);
    expect(component.cargandoClientes).toBeFalse();
  });

  it('onClienteChange() no llama al servicio si no hay cliente seleccionado', () => {
    component.claveSeleccionada = '';
    component.onClienteChange();
    expect(svcSpy.reservasEmbarque).not.toHaveBeenCalled();
  });

  it('onClienteChange() pide las reservas de ese cliente en este embarque', () => {
    svcSpy.reservasEmbarque.and.returnValue(of(reservasMock));
    component.claveSeleccionada = 'LC657';
    component.onClienteChange();
    expect(svcSpy.reservasEmbarque).toHaveBeenCalledWith(1, 'LC657');
    expect(component.reservas).toEqual(reservasMock);
    expect(component.cargando).toBeFalse();
  });

  it('onClienteChange() reporta el error del backend', () => {
    svcSpy.reservasEmbarque.and.returnValue(throwError(() => ({ error: { error: { message: 'Falló' } } })));
    component.claveSeleccionada = 'LC657';
    component.onClienteChange();
    expect(component.error).toBe('Falló');
  });

  it('formatoMes() convierte YYYY-MM a nombre de mes en español', () => {
    expect(component.formatoMes('2026-12')).toBe('Diciembre 2026');
    expect(component.formatoMes('2026-05')).toBe('Mayo 2026');
    expect(component.formatoMes(null)).toBe('—');
  });

  it('totalReservado() suma la cantidad asignada de todas las reservas', () => {
    component.reservas = [reservasMock[0], { ...reservasMock[0], id: 2, cantidad_asignada: 3 }];
    expect(component.totalReservado()).toBe(8);
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
