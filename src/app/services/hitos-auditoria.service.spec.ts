import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HitosAuditoriaService } from './hitos-auditoria.service';
import { environment } from '../../environments/environment';

describe('HitosAuditoriaService', () => {
  let service: HitosAuditoriaService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/importaciones/hitos-auditoria`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HitosAuditoriaService],
    });
    service = TestBed.inject(HitosAuditoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar() hace GET a /importaciones/hitos-auditoria', () => {
    service.listar().subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crear() hace POST con el payload', () => {
    const payload = { seccion: 'logistica', orden_hito: 1, etiqueta: 'x', campo_dato: 'log_contenedor', campo_ancla: null, dias_esperados: 1 };
    service.crear(payload).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ok: true, id: 1 });
  });

  it('actualizar() hace PUT a /hitos-auditoria/:id', () => {
    const payload = { seccion: 'logistica', orden_hito: 1, etiqueta: 'x', campo_dato: 'log_contenedor', campo_ancla: null, dias_esperados: 1 };
    service.actualizar(5, payload).subscribe();
    const req = httpMock.expectOne(`${base}/5`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('eliminar() hace DELETE a /hitos-auditoria/:id', () => {
    service.eliminar(5).subscribe();
    const req = httpMock.expectOne(`${base}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });
});
