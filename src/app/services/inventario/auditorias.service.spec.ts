import { TestBed } from '@angular/core/testing';

import { AuditoriasService } from './auditorias.service';

describe('AuditoriasService', () => {
  let service: AuditoriasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditoriasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
