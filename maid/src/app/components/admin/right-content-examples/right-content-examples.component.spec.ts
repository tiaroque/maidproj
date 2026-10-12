import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightContentExamplesComponent } from './right-content-examples.component';

describe('RightContentExamplesComponent', () => {
  let component: RightContentExamplesComponent;
  let fixture: ComponentFixture<RightContentExamplesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightContentExamplesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RightContentExamplesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
