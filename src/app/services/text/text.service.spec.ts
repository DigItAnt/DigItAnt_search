import { TestBed } from '@angular/core/testing';

import { TextsService } from './text.service';

describe('TextsService', () => {
  let service: TextsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
