import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

import { TiemposEstimadosService, TiempoEstimado, TiempoEstimadoPayload } from './tiempos-estimados.service';

describe('TiemposEstimadosService', () => {
  let service: TiemposEstimadosService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/importaciones/tiempos-estimados`;

  const regla: TiempoEstimado = {
    id: 1,
    origen: 'TAIWAN',
    tipo_producto: 'Bicicleta',
    via_transporte: 'MARITIMO',
    dias_hasta_booking: 15,
    dias_booking_a_puerto: 23,
    dias_puerto_a_destino: 15,
    dias_destino_a_almacen: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TiemposEstimadosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listar() hace GET a la base', () => {
    service.listar().subscribe(res => expect(res).toEqual([regla]));
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([regla]);
  });

  it('crear() hace POST con el payload', () => {
    const payload: TiempoEstimadoPayload = {
      origen: 'TAIWAN', tipo_producto: 'Bicicleta', via_transporte: 'MARITIMO',
      dias_hasta_booking: 15, dias_booking_a_puerto: 23,
      dias_puerto_a_destino: 15, dias_destino_a_almacen: 2,
    };
    service.crear(payload).subscribe(res => expect(res).toEqual({ ok: true, id: 1 }));
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ok: true, id: 1 });
  });

  it('actualizar() hace PUT al id correspondiente', () => {
    const payload: TiempoEstimadoPayload = {
      origen: 'TAIWAN', tipo_producto: 'Bicicleta', via_transporte: 'MARITIMO',
      dias_hasta_booking: 16, dias_booking_a_puerto: 23,
      dias_puerto_a_destino: 15, dias_destino_a_almacen: 2,
    };
    service.actualizar(1, payload).subscribe(res => expect(res).toEqual({ ok: true }));
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('eliminar() hace DELETE al id correspondiente', () => {
    service.eliminar(1).subscribe(res => expect(res).toEqual({ ok: true }));
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });
});
