import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionesReservasClienteComponent } from './asignaciones-reservas-cliente.component';
import {
  AsignacionesImportacionService, ClientePrioridad, PropuestaProducto,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesReservasClienteComponent', () => {
  let fixture: ComponentFixture<AsignacionesReservasClienteComponent>;
  let component: AsignacionesReservasClienteComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const clientes: ClientePrioridad[] = [
    { clave: 'MC677', nombre: 'BICICLETAS SCJM', prioridad: 2 },
    { clave: 'LC657', nombre: 'Víctor Hugo Villanueva Guzman', prioridad: 1 },
  ];

  const propuestaMock: PropuestaProducto[] = [
    {
      producto_id: 10, sku: 'SKU-1', descripcion: 'Bici X', periodo: '2026-2027',
      cantidad_embarcada: 10, disponible: 7, proyecciones_disponibles: true, origen: 'INICIAL',
      ventana: { desde: '2026-10', hasta: '2026-11' }, sobrante_estimado: 0,
      propuesta: [
        {
          clave_cliente: 'LC657', nombre_cliente: 'Víctor Hugo Villanueva Guzman', prioridad: 1,
          proyectado_total: 9, sugerido_total: 7, faltante_total: 2,
          meses: [
            { mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
            { mes: '2026-11', proyectado: 4, vigente: 0, sugerido: 2 },
          ],
        },
        {
          clave_cliente: 'MC677', nombre_cliente: 'BICICLETAS SCJM', prioridad: 2,
          proyectado_total: 0, sugerido_total: 0, faltante_total: 0,
          meses: [{ mes: '2026-10', proyectado: 0, vigente: 0, sugerido: 0 }],
        },
      ],
    },
  ];

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['prioridadClientes', 'recalcular', 'reservar']);
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
  });

  it('clientesFiltrados() filtra por nombre o clave sin importar mayúsculas', () => {
    component.busquedaCliente = 'scjm';
    expect(component.clientesFiltrados().map((c) => c.clave)).toEqual(['MC677']);
    component.busquedaCliente = 'lc657';
    expect(component.clientesFiltrados().map((c) => c.clave)).toEqual(['LC657']);
  });

  it('elegirCliente() fija el cliente y escribe su etiqueta en el input', () => {
    component.elegirCliente(clientes[1]);
    expect(component.clienteElegido).toEqual(clientes[1]);
    expect(component.busquedaCliente).toBe('Víctor Hugo Villanueva Guzman (LC657)');
    expect(component.mostrarLista).toBeFalse();
  });

  it('onInputCliente() limpia la selección si el texto ya no calza con la etiqueta elegida', () => {
    component.elegirCliente(clientes[1]);
    component.busquedaCliente = 'otra cosa';
    component.onInputCliente();
    expect(component.clienteElegido).toBeNull();
  });

  it('onKeydownCliente() navega con flechas y selecciona con Enter', () => {
    component.busquedaCliente = '';
    component.mostrarLista = true;
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onKeydownCliente(down);
    expect(component.indiceActivo).toBe(0);

    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onKeydownCliente(enter);
    expect(component.clienteElegido?.clave).toBe(clientes[0].clave);
  });

  it('calcular() exige un cliente elegido antes de llamar al servicio', () => {
    component.calcular();
    expect(component.errorForm).toContain('cliente');
    expect(svcSpy.recalcular).not.toHaveBeenCalled();
  });

  it('calcular() llama a recalcular() sin periodo y filtra las filas al cliente elegido', () => {
    svcSpy.recalcular.and.returnValue(of(propuestaMock));
    component.elegirCliente(clientes[1]); // LC657
    component.mesDesde = 'octubre';
    component.mesHasta = 'noviembre';

    component.calcular();

    expect(svcSpy.recalcular).toHaveBeenCalledWith(1, 'octubre', 'noviembre');
    expect(component.filas.map((f) => [f.sku, f.mes, f.sugerido])).toEqual([
      ['SKU-1', '2026-10', 5],
      ['SKU-1', '2026-11', 2],
    ]);
    expect(component.paso).toBe('resumen');
  });

  it('totalGeneralSugerido() suma lo sugerido de todas las filas', () => {
    component.filas = [
      { producto_id: 1, sku: 'A', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { producto_id: 2, sku: 'B', descripcion: null, mes: '2026-11', proyectado: 2, vigente: 0, sugerido: 2 },
    ];
    expect(component.totalGeneralSugerido()).toBe(7);
  });

  it('reservarTodo() agrupa las filas por producto y llama a reservar() una vez por SKU', () => {
    svcSpy.reservar.and.returnValue(of({ producto_id: 10, disponible_restante: 0 }));
    component.elegirCliente(clientes[1]); // LC657
    component.filas = [
      { producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-11', proyectado: 4, vigente: 0, sugerido: 2 },
    ];

    component.reservarTodo();

    expect(svcSpy.reservar).toHaveBeenCalledTimes(1);
    expect(svcSpy.reservar).toHaveBeenCalledWith(1, 10, [
      { clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 5, proyectado: 5 },
      { clave_cliente: 'LC657', mes_objetivo: '2026-11', cantidad: 2, proyectado: 4 },
    ]);
    expect(component.paso).toBe('terminado');
  });

  it('reservarTodo() no llama al servicio si no hay nada sugerido y muestra un error', () => {
    component.elegirCliente(clientes[1]);
    component.filas = [
      { producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 5, sugerido: 0 },
    ];
    component.reservarTodo();
    expect(svcSpy.reservar).not.toHaveBeenCalled();
    expect(component.errorResumen).toContain('sugerida');
  });

  it('reservarTodo() reporta el error de un producto sin bloquear el resto', () => {
    svcSpy.reservar.and.returnValue(throwError(() => ({ error: { error: { message: 'Sin disponible' } } })));
    component.elegirCliente(clientes[1]);
    component.filas = [
      { producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
    ];
    component.reservarTodo();
    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: false, error: 'Sin disponible' }]);
  });

  it('formatoMes() convierte YYYY-MM a nombre de mes en español', () => {
    expect(component.formatoMes('2026-12')).toBe('Diciembre 2026');
    expect(component.formatoMes(null)).toBe('—');
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
