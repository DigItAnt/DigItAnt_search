import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubdateComponent } from './subdate.component';

describe('SubdateComponent', () => {
  let component: SubdateComponent;
  let fixture: ComponentFixture<SubdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubdateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
