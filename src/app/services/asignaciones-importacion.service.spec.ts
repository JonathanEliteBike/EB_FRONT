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
        unidades_embarcadas: 10, unidades_asignadas: 5, unidades_sobrantes: 5,
        unidades_vendidas: 0, unidades_disponibles: 5,
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

  it('asignar() hace POST a la ruta de asignar del producto', () => {
    const asignaciones = [{ clave_cliente: 'LC657', cantidad: 3 }];

    service.asignar(1, 10, asignaciones).subscribe();

    const req = httpMock.expectOne(`${base}/1/asignaciones/productos/10/asignar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ asignaciones });
    req.flush({ ok: true, data: { producto_id: 10, disponible_restante: 2 } });
  });

  it('prioridadClientes() hace GET a /clientes/prioridad (sin envolver en data)', () => {
    service.prioridadClientes().subscribe(res => expect(res.length).toBe(1));

    const req = httpMock.expectOne(`${environment.apiUrl}/clientes/prioridad`);
    expect(req.request.method).toBe('GET');
    req.flush([{ clave: 'LC657', nombre: 'Test', prioridad: 1 }]);
  });
});
