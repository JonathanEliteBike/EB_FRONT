import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionesImportarWizardComponent } from './asignaciones-importar-wizard.component';
import {
  AsignacionesImportacionService, ImportacionResultado, PropuestaProducto,
} from '../../../../../../services/asignaciones-importacion.service';
import { ImportacionesService, Importacion } from '../../../../../../services/importaciones.service';

describe('AsignacionesImportarWizardComponent', () => {
  let fixture: ComponentFixture<AsignacionesImportarWizardComponent>;
  let component: AsignacionesImportarWizardComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;
  let importacionesSvcSpy: jasmine.SpyObj<ImportacionesService>;

  const embarques: Importacion[] = [
    { id: 2, referencia: 'R26-002', nombre: 'Segundo', estado: 'activo', created_at: '', updated_at: '' },
    { id: 1, referencia: 'R26-001', nombre: 'Primero', estado: 'activo', created_at: '', updated_at: '' },
    { id: 3, referencia: 'R26-000', nombre: 'Cerrado', estado: 'cerrado', created_at: '', updated_at: '' },
  ];

  const resultadoImport: ImportacionResultado = { insertados: 2, actualizados: 1, total_filas: 3, errores: [] };

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
      'importarProductos', 'recalcular', 'reservar', 'periodosActivos', 'crearSiguientePeriodoActivo',
    ]);
    svcSpy.periodosActivos.and.returnValue(of(['2026-2027']));
    importacionesSvcSpy = jasmine.createSpyObj('ImportacionesService', ['listar']);
    importacionesSvcSpy.listar.and.returnValue(of(embarques));

    await TestBed.configureTestingModule({
      imports: [AsignacionesImportarWizardComponent],
      providers: [
        { provide: AsignacionesImportacionService, useValue: svcSpy },
        { provide: ImportacionesService, useValue: importacionesSvcSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesImportarWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('carga, filtra solo activos y ordena los embarques al iniciar', () => {
    expect(importacionesSvcSpy.listar).toHaveBeenCalled();
    expect(component.embarques.map((e) => e.referencia)).toEqual(['R26-001', 'R26-002']);
    expect(component.cargandoEmbarques).toBeFalse();
  });

  it('importarYCalcular() valida que estén los 4 campos antes de llamar al servicio', () => {
    component.importarYCalcular();
    expect(component.errorForm).toContain('embarque');
    expect(svcSpy.importarProductos).not.toHaveBeenCalled();
  });

  it('importarYCalcular() importa el Excel y luego calcula la propuesta para la ventana elegida', () => {
    svcSpy.importarProductos.and.returnValue(of(resultadoImport));
    svcSpy.recalcular.and.returnValue(of([propMock]));

    component.embarqueId = 1;
    component.periodo = '2026-2027';
    component.mesDesde = 'octubre';
    component.mesHasta = 'noviembre';
    component.archivo = new File(['x'], 'plan.xlsx');

    component.importarYCalcular();

    expect(svcSpy.importarProductos).toHaveBeenCalledWith(1, component.archivo, '2026-2027');
    expect(svcSpy.recalcular).toHaveBeenCalledWith(1, 'octubre', 'noviembre', '2026-2027');
    expect(component.resultadoImport).toEqual(resultadoImport);
    expect(component.propuesta).toEqual([propMock]);
    expect(component.paso).toBe('resumen');
  });

  it('importarYCalcular() muestra el error del backend si falla la importación o el cálculo', () => {
    svcSpy.importarProductos.and.returnValue(throwError(() => ({ error: { error: { message: 'Periodo inválido' } } })));

    component.embarqueId = 1;
    component.periodo = '2026-2027';
    component.mesDesde = 'octubre';
    component.mesHasta = 'noviembre';
    component.archivo = new File(['x'], 'plan.xlsx');
    component.importarYCalcular();

    expect(component.errorForm).toBe('Periodo inválido');
    expect(component.paso).toBe('form');
  });

  it('totalSugerido()/totalProyectado()/totalFaltante() suman por cliente', () => {
    expect(component.totalProyectado(propMock)).toBe(9);
    expect(component.totalSugerido(propMock)).toBe(7);
    expect(component.totalFaltante(propMock)).toBe(2);
  });

  it('reservarTodo() reserva cada producto con cantidad sugerida > 0 y reporta el resultado', () => {
    svcSpy.reservar.and.returnValue(of({ producto_id: 10, disponible_restante: 0 }));
    component.embarqueId = 1;
    component.propuesta = [propMock];

    component.reservarTodo();

    expect(svcSpy.reservar).toHaveBeenCalledWith(1, 10, [
      { clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 5, proyectado: 5 },
      { clave_cliente: 'LC657', mes_objetivo: '2026-11', cantidad: 2, proyectado: 4 },
    ]);
    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: true }]);
    expect(component.paso).toBe('terminado');
  });

  it('reservarTodo() no llama al servicio si no hay nada sugerido y muestra un error', () => {
    component.embarqueId = 1;
    component.propuesta = [{
      ...propMock,
      propuesta: [{ ...propMock.propuesta[0], meses: propMock.propuesta[0].meses.map((m) => ({ ...m, sugerido: 0 })) }],
    }];

    component.reservarTodo();

    expect(svcSpy.reservar).not.toHaveBeenCalled();
    expect(component.errorResumen).toContain('sugerida');
  });

  it('reservarTodo() reporta el error de un producto sin bloquear el resto', () => {
    svcSpy.reservar.and.returnValue(throwError(() => ({ error: { error: { message: 'Sin disponible' } } })));
    component.embarqueId = 1;
    component.propuesta = [propMock];

    component.reservarTodo();

    expect(component.resultados).toEqual([{ sku: 'SKU-1', ok: false, error: 'Sin disponible' }]);
    expect(component.paso).toBe('terminado');
  });

  it('cerrarPanel() emite el evento cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.cerrarPanel();
    expect(component.cerrar.emit).toHaveBeenCalled();
  });

  it('carga los periodos activos al iniciar', () => {
    expect(svcSpy.periodosActivos).toHaveBeenCalled();
    expect(component.periodos).toEqual(['2026-2027']);
  });

  it('siguientePeriodoPreview() calcula el periodo cronológicamente siguiente al más reciente', () => {
    component.periodos = ['2025-2026', '2026-2027'];
    expect(component.siguientePeriodoPreview()).toBe('2027-2028');
  });

  it('crearSiguientePeriodo() actualiza la lista y preselecciona el nuevo periodo', () => {
    svcSpy.crearSiguientePeriodoActivo.and.returnValue(of(['2026-2027', '2027-2028']));
    component.crearSiguientePeriodo();
    expect(component.periodos).toEqual(['2026-2027', '2027-2028']);
    expect(component.periodo).toBe('2027-2028');
    expect(component.creandoSiguientePeriodo).toBeFalse();
  });
});
