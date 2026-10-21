import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AsignacionesPanelComponent } from './asignaciones-panel.component';
import {
  AsignacionesImportacionService,
  AsignacionesGlobalResumen,
  AsignacionesProductosGlobal,
} from '../../../../../services/asignaciones-importacion.service';

describe('AsignacionesPanelComponent', () => {
  let fixture: ComponentFixture<AsignacionesPanelComponent>;
  let component: AsignacionesPanelComponent;
  let svcSpy: jasmine.SpyObj<AsignacionesImportacionService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const resumenMock: AsignacionesGlobalResumen = {
    embarques: [
      { id: 12, referencia: 'IMP-012', nombre: 'Scott', estado: 'activo', n_productos: 2, n_periodos: 1,
        kpis: { embarcadas: 30, asignadas: 18, pendientes: 6, sobrantes: 12, vendidas: 2, disponibles: 10 },
        ultima_actividad: null },
    ],
    totales: { embarcadas: 30, asignadas: 18, pendientes: 6, sobrantes: 12, vendidas: 2, disponibles: 10, n_embarques: 1 },
  };
  const productosMock: AsignacionesProductosGlobal = {
    productos: [],
    totales: { embarcadas: 0, asignadas: 0, pendientes: 0, sobrantes: 0, vendidas: 0, disponibles: 0 },
    total_filas: 0, limite: 500, offset: 0,
  };

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('AsignacionesImportacionService', ['resumenGlobal', 'productosGlobal']);
    svcSpy.resumenGlobal.and.returnValue(of(resumenMock));
    svcSpy.productosGlobal.and.returnValue(of(productosMock));
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AsignacionesPanelComponent, HttpClientTestingModule],
      providers: [
        { provide: AsignacionesImportacionService, useValue: svcSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignacionesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la vista por embarque al iniciar', () => {
    expect(svcSpy.resumenGlobal).toHaveBeenCalledTimes(1);
    expect(component.resumen).toEqual(resumenMock);
  });

  it('cambiarVista("productos") consulta el endpoint de productos', () => {
    component.cambiarVista('productos');
    expect(svcSpy.productosGlobal).toHaveBeenCalledTimes(1);
    expect(component.vista).toBe('productos');
  });

  it('propaga los filtros heredados y el "solo con disponible"', () => {
    component.estado = 'activo';
    component.busqueda = ' scott ';
    component.soloDisponible = true;
    component.cargar();
    const args = svcSpy.resumenGlobal.calls.mostRecent().args[0];
    expect(args).toEqual(jasmine.objectContaining({ estado: 'activo', q: 'scott', solo_con_disponible: true }));
  });

  it('los inputs de texto recargan con debounce', fakeAsync(() => {
    svcSpy.resumenGlobal.calls.reset();
    component.pedirRecarga();
    component.pedirRecarga();
    tick(300);
    expect(svcSpy.resumenGlobal).toHaveBeenCalledTimes(1);
  }));

  it('irAEmbarque navega a la pantalla por embarque marcando el origen dashboard', () => {
    component.irAEmbarque(12);
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/importaciones', 12, 'asignaciones'],
      { queryParams: { from: 'dashboard', tab: 'asignaciones' } },
    );
  });

  it('abrirDetalle() abre el panel de reserva sin navegar', () => {
    const p: any = {
      importacion_id: 12, referencia: 'IMP-012', embarque_nombre: 'Scott', embarque_estado: 'activo',
      producto_id: 100, sku: 'AB-1', descripcion: 'Bici', periodo: '2026-2027',
      cantidad_embarcada: 20, cantidad_asignada: 15, cantidad_pendiente: 4,
      cantidad_sobrante: 5, cantidad_vendida: 0, cantidad_disponible: 4,
    };
    component.abrirDetalle(p);
    expect(component.detalleImportacionId).toBe(12);
    expect(component.detalleProducto?.id).toBe(100);
    expect(component.detalleProducto?.reservado_total).toBe(15);
    expect(component.detalleProducto?.reservado_reasignacion_pendiente).toBe(4);
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    component.cerrarDetalle();
    expect(component.detalleProducto).toBeNull();
  });

  it('abrirWizard()/cerrarWizard() controlan la visibilidad del asistente de importación', () => {
    expect(component.wizardAbierto).toBeFalse();
    component.abrirWizard();
    expect(component.wizardAbierto).toBeTrue();
    component.cerrarWizard();
    expect(component.wizardAbierto).toBeFalse();
  });

  it('onCambioEnWizard() recarga el panel', () => {
    svcSpy.resumenGlobal.calls.reset();
    component.onCambioEnWizard();
    expect(svcSpy.resumenGlobal).toHaveBeenCalledTimes(1);
  });
});
