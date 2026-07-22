import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GameStatus } from '../../models/game.types';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss',
})
export class GameHeaderComponent {
  @Input({ required: true }) targetWord!: string;
}
