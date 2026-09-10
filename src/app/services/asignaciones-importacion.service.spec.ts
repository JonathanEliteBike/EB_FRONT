import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { AsignacionesImportacionService, AsignacionesResumen } from './asignaciones-importacion.service';

describe('AsignacionesImportacionService', () => {
  let service: AsignacionesImportacionService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/importaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AsignacionesImportacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('resumen() hace GET y desenvuelve data', () => {
    const mockResumen: AsignacionesResumen = {
      embarque: { id: 1, referencia: 'IMP-001', nombre: 'Test', estado: 'activo' },
      kpis: {
        unidades_embarcadas: 10, unidades_reservadas: 5, unidades_asignadas: 5,
        reservado_inicial: 5, reservado_reasignacion_pendiente: 0, reservado_confirmado: 0,
        unidades_sobrantes: 5, unidades_vendidas: 0, unidades_disponibles: 5,
      },
      productos: [],
    };

    service.resumen(1).subscribe(res => expect(res).toEqual(mockResumen));

    const req = httpMock.expectOne(`${base}/1/asignaciones`);
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true, data: mockResumen });
  });

  it('crearProducto() hace POST con el body correcto', () => {
    const body = { sku: 'SKU-1', cantidad_embarcada: 10, periodo: '2026-2027' };

    service.crearProducto(1, body).subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/productos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ok: true, data: { id: 10, ...body } });
  });

  it('recalcular() hace POST con la ventana de meses', () => {
    service.recalcular(1, 'octubre', 'diciembre', '2026-2027').subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/recalcular`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mes_desde: 'octubre', mes_hasta: 'diciembre', periodo: '2026-2027' });
    req.flush({ ok: true, data: [] });
  });

  it('reservar() hace POST a /reservar con { reservas }', () => {
    const reservas = [{ clave_cliente: 'LC657', mes_objetivo: '2026-10', cantidad: 3, proyectado: 5 }];

    service.reservar(1, 10, reservas).subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/productos/10/reservar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reservas });
    req.flush({ ok: true, data: { producto_id: 10, disponible_restante: 2 } });
  });

  it('proponerReasignacion() hace POST a /asignaciones/reasignar', () => {
    service.proponerReasignacion(1, 'diciembre', '2026-2027').subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/reasignar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ventana_desde: 'diciembre', periodo: '2026-2027' });
    req.flush({ ok: true, data: [] });
  });

  it('resolverReserva() hace POST a /asignaciones/reservas/<id>/resolver', () => {
    service.resolverReserva(1, 9, 'ACEPTADA').subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/reservas/9/resolver`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decision: 'ACEPTADA' });
    req.flush({ ok: true, data: {} });
  });

  it('prioridadClientes() hace GET a /clientes/prioridad (sin envolver en data)', () => {
    service.prioridadClientes().subscribe(res => expect(res.length).toBe(1));

    const req = httpMock.expectOne(`${environment.apiUrl}/clientes/prioridad`);
    expect(req.request.method).toBe('GET');
    req.flush([{ clave: 'LC657', nombre: 'Test', prioridad: 1 }]);
  });
});
