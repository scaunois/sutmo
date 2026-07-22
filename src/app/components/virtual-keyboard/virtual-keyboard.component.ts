import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KeyboardState } from '../../models/game.types';

@Component({
  selector: 'app-virtual-keyboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './virtual-keyboard.component.html',
  styleUrl: './virtual-keyboard.component.scss',
})
export class VirtualKeyboardComponent {
  @Input({ required: true }) keyboardState: Record<string, KeyboardState> = {};
  @Output() keyPress = new EventEmitter<string>();

  readonly keyboardStates = KeyboardState;

  readonly rows = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', '.', 'BACKSPACE'],
  ];

  readonly labels: Record<string, string> = {
    ENTER: 'ENTREE',
    BACKSPACE: 'EFFACER',
    '.': '·',
  };
}
