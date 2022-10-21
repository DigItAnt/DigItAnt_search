import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConcordancesComponent } from './concordances.component';

describe('ConcordancesComponent', () => {
  let component: ConcordancesComponent;
  let fixture: ComponentFixture<ConcordancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConcordancesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConcordancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
