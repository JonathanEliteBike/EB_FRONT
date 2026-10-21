import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportacionesService } from './importaciones.service';
import { environment } from '../../environments/environment';

describe('ImportacionesService.obtenerAuditoria', () => {
  let service: ImportacionesService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/importaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ImportacionesService],
    });
    service = TestBed.inject(ImportacionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('hace GET a /importaciones/:id/auditoria', () => {
    service.obtenerAuditoria(42).subscribe();
    const req = httpMock.expectOne(`${base}/42/auditoria`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('obtenerAuditoriaResumen() hace GET a /importaciones/auditoria-resumen', () => {
    service.obtenerAuditoriaResumen().subscribe();
    const req = httpMock.expectOne(`${base}/auditoria-resumen`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
