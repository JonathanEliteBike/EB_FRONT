import { TestBed } from '@angular/core/testing';

import { AdminSistemaService } from './admin-sistema.service';

describe('AdminSistemaService', () => {
  let service: AdminSistemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSistemaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
