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

  const clienteLC657: ClientePrioridad = { clave: 'LC657', nombre: 'Víctor Hugo Villanueva Guzman', prioridad: 1 };
  const clienteMC677: ClientePrioridad = { clave: 'MC677', nombre: 'BICICLETAS SCJM', prioridad: 2 };
  const clientes: ClientePrioridad[] = [clienteMC677, clienteLC657];

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
          proyectado_total: 3, sugerido_total: 3, faltante_total: 0,
          meses: [{ mes: '2026-10', proyectado: 3, vigente: 0, sugerido: 3 }],
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

  it('clientesFiltrados() excluye a los ya elegidos', () => {
    component.elegirCliente(clienteLC657);
    expect(component.clientesFiltrados().map((c) => c.clave)).toEqual(['MC677']);
  });

  it('elegirCliente() agrega el cliente a la selección y limpia el buscador', () => {
    component.elegirCliente(clienteLC657);
    expect(component.clientesElegidos).toEqual([clienteLC657]);
    expect(component.busquedaCliente).toBe('');
    expect(component.mostrarLista).toBeFalse();

    component.elegirCliente(clienteMC677);
    expect(component.clientesElegidos).toEqual([clienteLC657, clienteMC677]);
  });

  it('quitarCliente() lo saca de la selección', () => {
    component.elegirCliente(clienteLC657);
    component.elegirCliente(clienteMC677);
    component.quitarCliente(clienteLC657);
    expect(component.clientesElegidos).toEqual([clienteMC677]);
  });

  it('agregarTodosFiltrados() agrega de un tiro todos los que calzan con la búsqueda', () => {
    component.busquedaCliente = 'scjm';
    component.agregarTodosFiltrados();
    expect(component.clientesElegidos).toEqual([clienteMC677]);
    expect(component.busquedaCliente).toBe('');
    expect(component.mostrarLista).toBeFalse();
  });

  it('agregarTodosFiltrados() sin búsqueda agrega absolutamente todos', () => {
    component.agregarTodosFiltrados();
    expect(component.clientesElegidos.map((c) => c.clave).sort()).toEqual(['LC657', 'MC677']);
  });

  it('agregarTodosFiltrados() no hace nada si ya no queda ningún candidato', () => {
    component.elegirCliente(clienteLC657);
    component.elegirCliente(clienteMC677);
    component.agregarTodosFiltrados();
    expect(component.clientesElegidos).toEqual([clienteLC657, clienteMC677]);
  });

  it('quitarTodosClientes() vacía toda la selección', () => {
    component.elegirCliente(clienteLC657);
    component.elegirCliente(clienteMC677);
    component.quitarTodosClientes();
    expect(component.clientesElegidos).toEqual([]);
  });

  it('onKeydownCliente() navega con flechas, selecciona con Enter y quita con Backspace vacío', () => {
    component.busquedaCliente = '';
    component.mostrarLista = true;
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onKeydownCliente(down);
    expect(component.indiceActivo).toBe(0);

    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onKeydownCliente(enter);
    expect(component.clientesElegidos.map((c) => c.clave)).toEqual([clientes[0].clave]);

    const backspace = new KeyboardEvent('keydown', { key: 'Backspace' });
    component.onKeydownCliente(backspace);
    expect(component.clientesElegidos.length).toBe(0);
  });

  it('calcular() exige al menos un cliente elegido antes de llamar al servicio', () => {
    component.calcular();
    expect(component.errorForm).toContain('cliente');
    expect(svcSpy.recalcular).not.toHaveBeenCalled();
  });

  it('calcular() llama a recalcular() sin periodo y filtra las filas a los clientes elegidos', () => {
    svcSpy.recalcular.and.returnValue(of(propuestaMock));
    component.elegirCliente(clienteLC657);
    component.mesDesde = 'octubre';
    component.mesHasta = 'noviembre';

    component.calcular();

    expect(svcSpy.recalcular).toHaveBeenCalledWith(1, 'octubre', 'noviembre');
    expect(component.filas.map((f) => [f.clave_cliente, f.sku, f.mes, f.sugerido])).toEqual([
      ['LC657', 'SKU-1', '2026-10', 5],
      ['LC657', 'SKU-1', '2026-11', 2],
    ]);
    expect(component.paso).toBe('resumen');
  });

  it('calcular() con varios clientes elegidos junta las filas de todos, ordenadas por prioridad y mes', () => {
    svcSpy.recalcular.and.returnValue(of(propuestaMock));
    component.elegirCliente(clienteMC677); // prioridad 2
    component.elegirCliente(clienteLC657); // prioridad 1

    component.calcular();

    expect(component.filas.map((f) => [f.clave_cliente, f.mes])).toEqual([
      ['LC657', '2026-10'],
      ['LC657', '2026-11'],
      ['MC677', '2026-10'],
    ]);
  });

  it('totalGeneralSugerido() suma lo sugerido de todas las filas', () => {
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 1, sku: 'A', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 2, sku: 'B', descripcion: null, mes: '2026-11', proyectado: 2, vigente: 0, sugerido: 2 },
    ];
    expect(component.totalGeneralSugerido()).toBe(7);
  });

  it('mesesDisponibles() devuelve los meses únicos en el orden en que aparecen', () => {
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 1, sku: 'A', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 2, sku: 'B', descripcion: null, mes: '2026-11', proyectado: 2, vigente: 0, sugerido: 2 },
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 3, sku: 'C', descripcion: null, mes: '2026-10', proyectado: 1, vigente: 0, sugerido: 1 },
    ];
    expect(component.mesesDisponibles()).toEqual(['2026-10', '2026-11']);
  });

  it('filasFiltradas() combina el filtro de mes y el de cliente', () => {
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 1, sku: 'A', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 2, sku: 'B', descripcion: null, mes: '2026-11', proyectado: 2, vigente: 0, sugerido: 2 },
      { clave_cliente: 'MC677', nombre_cliente: 'Y', prioridad: 2, producto_id: 1, sku: 'A', descripcion: null, mes: '2026-10', proyectado: 3, vigente: 0, sugerido: 3 },
    ];
    expect(component.filasFiltradas().length).toBe(3);

    component.filtroMes = '2026-10';
    expect(component.filasFiltradas().map((f) => f.clave_cliente)).toEqual(['LC657', 'MC677']);

    component.filtroCliente = 'MC677';
    expect(component.filasFiltradas().map((f) => f.sku)).toEqual(['A']);
  });

  it('reservarTodo() agrupa por producto e incluye la clave de cada fila (varios clientes en un mismo producto)', () => {
    svcSpy.reservar.and.returnValue(of({ producto_id: 10, disponible_restante: 0, ordenes_odoo: [] }));
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
      { clave_cliente: 'MC677', nombre_cliente: 'Y', prioridad: 2, producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 3, vigente: 0, sugerido: 3 },
    ];

    component.reservarTodo();

    expect(svcSpy.reservar).toHaveBeenCalledTimes(1);
    expect(svcSpy.reservar).toHaveBeenCalledWith(1, 10, [
      { clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 5, proyectado: 5 },
      { clave_cliente: 'MC677', mes_objetivo: '2026-10', cantidad: 3, proyectado: 3 },
    ]);
    expect(component.paso).toBe('terminado');
  });

  it('reservarTodo() no llama al servicio si no hay nada sugerido y muestra un error', () => {
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 5, sugerido: 0 },
    ];
    component.reservarTodo();
    expect(svcSpy.reservar).not.toHaveBeenCalled();
    expect(component.errorResumen).toContain('sugerida');
  });

  it('reservarTodo() reporta el error de un producto sin bloquear el resto y muestra la orden de Odoo en éxito', () => {
    svcSpy.reservar.and.returnValue(throwError(() => ({ error: { error: { message: 'Sin disponible' } } })));
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
    ];
    component.reservarTodo();
    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: false, error: 'Sin disponible' }]);
  });

  it('reservarTodo() incluye el nombre de la orden de Odoo en el resultado exitoso', () => {
    svcSpy.reservar.and.returnValue(of({
      producto_id: 10, disponible_restante: 0,
      ordenes_odoo: [{ clave_cliente: 'LC657', mes_objetivo: '2026-10', order_id: 1, order_name: 'S00042' }],
    }));
    component.filas = [
      { clave_cliente: 'LC657', nombre_cliente: 'X', prioridad: 1, producto_id: 10, sku: 'SKU-1', descripcion: null, mes: '2026-10', proyectado: 5, vigente: 0, sugerido: 5 },
    ];
    component.reservarTodo();
    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: true, ordenesOdoo: ['S00042'] }]);
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
