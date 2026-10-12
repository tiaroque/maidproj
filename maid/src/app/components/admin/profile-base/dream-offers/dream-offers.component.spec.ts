import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DreamOffersComponent } from './dream-offers.component';

describe('DreamOffersComponent', () => {
  let component: DreamOffersComponent;
  let fixture: ComponentFixture<DreamOffersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DreamOffersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DreamOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
