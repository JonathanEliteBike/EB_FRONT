import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AsignacionesImportacionComponent } from './asignaciones-importacion.component';
import { AsignacionesImportacionService, AsignacionesResumen } from '../../../../services/asignaciones-importacion.service';

function activatedRouteMock(id: string, queryParams: Record<string, string> = {}) {
  return {
    snapshot: {
      paramMap: { get: () => id },
      queryParamMap: { get: (k: string) => queryParams[k] ?? null },
    },
  };
}

describe('AsignacionesImportacionComponent', () => {
  let fixture: ComponentFixture<AsignacionesImportacionComponent>;
  let component: AsignacionesImportacionComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;

  const resumenMock: AsignacionesResumen = {
    embarque: { id: 1, referencia: 'IMP-001', nombre: 'Test', estado: 'activo' },
    kpis: {
      unidades_embarcadas: 10, unidades_reservadas: 4, unidades_asignadas: 4,
      reservado_inicial: 4, reservado_reasignacion_pendiente: 0, reservado_confirmado: 0,
      unidades_sobrantes: 6, unidades_vendidas: 0, unidades_disponibles: 6,
    },
    productos: [],
  };

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', [
      'resumen', 'importarProductos', 'periodosActivos', 'crearSiguientePeriodoActivo',
    ]);
    svcSpy.resumen.and.returnValue(of(resumenMock));
    svcSpy.periodosActivos.and.returnValue(of(['2026-2027']));

    await TestBed.configureTestingModule({
      imports: [AsignacionesImportacionComponent, HttpClientTestingModule],
      providers: [
        { provide: AsignacionesImportacionService, useValue: svcSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock('1') },
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

  it('importarExcel() exige periodo antes de llamar al servicio', () => {
    component.periodoImport = '';
    component.archivoImport = new File(['x'], 'c.xlsx');
    component.importarExcel();
    expect(component.errorImport).toContain('periodo');
    expect(svcSpy.importarProductos).not.toHaveBeenCalled();
  });

  it('importarExcel() exige archivo antes de llamar al servicio', () => {
    component.periodoImport = '2026-2027';
    component.archivoImport = null;
    component.importarExcel();
    expect(component.errorImport).toContain('archivo');
    expect(svcSpy.importarProductos).not.toHaveBeenCalled();
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

  it('volver() sin query params regresa al detalle del embarque', () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    TestBed.overrideProvider(Router, { useValue: routerSpy });
    component.volver();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/importaciones/1');
  });

  it('volver() con from=dashboard regresa a la pestana del dashboard, no al embarque', async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    await TestBed.resetTestingModule().configureTestingModule({
      imports: [AsignacionesImportacionComponent, HttpClientTestingModule],
      providers: [
        { provide: AsignacionesImportacionService, useValue: svcSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock('1', { from: 'dashboard', tab: 'asignaciones' }) },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(AsignacionesImportacionComponent);
    f.detectChanges();
    f.componentInstance.volver();

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/importaciones/dashboard?tab=asignaciones');
  });

  describe('selección múltiple para la propuesta consolidada', () => {
    beforeEach(() => {
      component.resumen = {
        ...resumenMock,
        productos: [
          { id: 1, sku: 'A' } as any,
          { id: 2, sku: 'B' } as any,
        ],
      };
    });

    it('toggleSeleccion() agrega y quita del set', () => {
      component.toggleSeleccion(1);
      expect(component.seleccionados.has(1)).toBeTrue();
      component.toggleSeleccion(1);
      expect(component.seleccionados.has(1)).toBeFalse();
    });

    it('todosSeleccionados() es true solo cuando están todos marcados', () => {
      expect(component.todosSeleccionados()).toBeFalse();
      component.toggleSeleccion(1);
      component.toggleSeleccion(2);
      expect(component.todosSeleccionados()).toBeTrue();
    });

    it('toggleTodos() marca o desmarca todos los productos', () => {
      component.toggleTodos({ target: { checked: true } } as unknown as Event);
      expect(component.seleccionados.size).toBe(2);
      component.toggleTodos({ target: { checked: false } } as unknown as Event);
      expect(component.seleccionados.size).toBe(0);
    });

    it('abrirPropuestaMasiva() fija un snapshot de los productos seleccionados', () => {
      component.toggleSeleccion(2);
      component.abrirPropuestaMasiva();
      expect(component.productosParaPropuesta.map((p) => p.sku)).toEqual(['B']);
      expect(component.propuestaMasivaAbierta).toBeTrue();
    });

    it('cerrarPropuestaMasiva() cierra el modal y limpia la selección', () => {
      component.toggleSeleccion(1);
      component.propuestaMasivaAbierta = true;
      component.cerrarPropuestaMasiva();
      expect(component.propuestaMasivaAbierta).toBeFalse();
      expect(component.seleccionados.size).toBe(0);
    });

    it('onCambioEnPropuestaMasiva() recarga el resumen sin cerrar el modal', () => {
      svcSpy.resumen.calls.reset();
      component.propuestaMasivaAbierta = true;
      component.onCambioEnPropuestaMasiva();
      expect(svcSpy.resumen).toHaveBeenCalled();
      expect(component.propuestaMasivaAbierta).toBeTrue();
    });
  });

  it('abrirReservasCliente()/cerrarReservasCliente() controlan el buscador por cliente', () => {
    expect(component.reservasClienteAbierto).toBeFalse();
    component.abrirReservasCliente();
    expect(component.reservasClienteAbierto).toBeTrue();
    component.cerrarReservasCliente();
    expect(component.reservasClienteAbierto).toBeFalse();
  });

  it('abrirReservasDetalle()/cerrarReservasDetalle() controlan el detalle de las tarjetas de KPI', () => {
    expect(component.reservasDetalleAbierto).toBeFalse();
    component.abrirReservasDetalle('PENDIENTE_CONFIRMACION');
    expect(component.reservasDetalleAbierto).toBeTrue();
    expect(component.reservasDetalleEstadoInicial).toBe('PENDIENTE_CONFIRMACION');
    component.cerrarReservasDetalle();
    expect(component.reservasDetalleAbierto).toBeFalse();
  });

  it('abrirReservasDetalle() sin argumento no preselecciona estado', () => {
    component.abrirReservasDetalle();
    expect(component.reservasDetalleEstadoInicial).toBeUndefined();
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
    expect(component.periodoImport).toBe('2027-2028');
    expect(component.creandoSiguientePeriodo).toBeFalse();
  });
});
