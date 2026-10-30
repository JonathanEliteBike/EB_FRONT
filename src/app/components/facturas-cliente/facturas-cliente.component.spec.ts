import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { FacturasClienteComponent } from './facturas-cliente.component';
import { ClientesService } from '../../services/clientes.service';
import { AuthService } from '../../services/auth.service';

describe('FacturasClienteComponent', () => {
  let component: FacturasClienteComponent;
  let fixture: ComponentFixture<FacturasClienteComponent>;
  let clientesSpy: jasmine.SpyObj<ClientesService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    clientesSpy = jasmine.createSpyObj('ClientesService', [
      'getDetalleComprasCliente',
      'getFacturasGrupo',
      'getInfoClienteActual',
    ]);
    authSpy = jasmine.createSpyObj('AuthService', ['debeOcultarMontos']);
    authSpy.debeOcultarMontos.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [FacturasClienteComponent],
      providers: [
        { provide: ClientesService, useValue: clientesSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(FacturasClienteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ignora la respuesta tardía de un cliente anterior al cambiar rápido a otro cliente', () => {
    const subLiving = new Subject<any>();
    const subVictor = new Subject<any>();
    clientesSpy.getDetalleComprasCliente.and.returnValues(
      subLiving.asObservable(),
      subVictor.asObservable()
    );

    component.isOpen = true;
    component.clienteClave = 'LIVING';
    component.ngOnChanges();

    // Cambia de cliente antes de que la petición de "Living" resuelva
    component.clienteClave = 'VICTOR';
    component.ngOnChanges();

    // La respuesta vieja de "Living" llega tarde
    subLiving.next({ success: true, rows: [], cliente: { nombre_cliente: 'LIVING FOR BIKES' } });
    expect(component.infoCliente?.nombre_cliente).not.toBe('LIVING FOR BIKES');

    // La respuesta de "Victor" sí debe reflejarse
    subVictor.next({ success: true, rows: [], cliente: { nombre_cliente: 'VICTOR GARNIER' } });
    expect(component.infoCliente?.nombre_cliente).toBe('VICTOR GARNIER');
  });

  it('limpia el nombre del cliente anterior al cambiar a una vista de grupo integral', () => {
    const subLiving = new Subject<any>();
    const subGrupo = new Subject<any>();
    clientesSpy.getDetalleComprasCliente.and.returnValues(
      subLiving.asObservable(),
      subGrupo.asObservable()
    );

    component.isOpen = true;
    component.clienteClave = 'LIVING';
    component.ngOnChanges();
    subLiving.next({ success: true, rows: [], cliente: { nombre_cliente: 'LIVING FOR BIKES' } });
    expect(component.infoCliente?.nombre_cliente).toBe('LIVING FOR BIKES');

    // Cambia a una vista de grupo integral
    component.clienteClave = null;
    component.idGrupoOdoo = 99;
    component.ngOnChanges();

    // Antes de que llegue cualquier respuesta, ya no debe mostrar el nombre anterior
    expect(component.infoCliente?.nombre_cliente).not.toBe('LIVING FOR BIKES');

    subGrupo.next({ success: true, rows: [], cliente: { nombre_cliente: 'GRUPO INTEGRAL X' } });
    expect(component.infoCliente?.nombre_cliente).toBe('GRUPO INTEGRAL X');
  });
});
