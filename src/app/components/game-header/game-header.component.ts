import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GameStatus } from '../../models/game.types';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss',
})
export class GameHeaderComponent {
  private gameService = inject(GameService);

  @Input({ required: true }) targetWord!: string;
  @Input({ required: true }) gameStatus!: GameStatus;

  displayGameRules(): void {
    this.gameService.displayGameRulesModal();
  }

  displayResults(): void {
    this.gameService.displayResultsModal();
  }

  protected readonly GameStatus = GameStatus;
}
