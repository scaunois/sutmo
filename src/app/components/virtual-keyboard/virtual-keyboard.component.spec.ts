import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualKeyboardComponent } from './virtual-keyboard.component';

describe('VirtualKeyboardComponent', () => {
  let fixture: ComponentFixture<VirtualKeyboardComponent>;
  let component: VirtualKeyboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualKeyboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualKeyboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('affiche des touches speciales lisibles', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('ENTREE');
    expect(compiled.textContent).toContain('EFFACER');
  });

  it('emet une valeur lorsqu on clique une touche', () => {
    spyOn(component.keyPress, 'emit');
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();

    expect(component.keyPress.emit).toHaveBeenCalled();
  });
});

