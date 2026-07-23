import { TestBed } from '@angular/core/testing';

import { DashboardInventarioService } from './dashboard-inventario.service';

describe('DashboardInventarioService', () => {
  let service: DashboardInventarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardInventarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
