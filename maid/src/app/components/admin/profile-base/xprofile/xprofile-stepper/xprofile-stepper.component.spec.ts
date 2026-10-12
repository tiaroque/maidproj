import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XprofileStepperComponent } from './xprofile-stepper.component';

describe('XprofileStepperComponent', () => {
  let component: XprofileStepperComponent;
  let fixture: ComponentFixture<XprofileStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [XprofileStepperComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(XprofileStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
