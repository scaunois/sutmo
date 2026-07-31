import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';

import { GameBoardComponent } from './components/game-board/game-board.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';
import { VirtualKeyboardComponent } from './components/virtual-keyboard/virtual-keyboard.component';
import { GameService } from './services/game.service';
import { ErrorMessageComponent } from './components/error-message/error-message.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, GameBoardComponent, VirtualKeyboardComponent, ErrorMessageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private gameService = inject(GameService);

  game = this.gameService.game;
  gameStatus = this.gameService.status.asReadonly();

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    const input = event.key.toUpperCase();
    this.gameService.handleInput(input);
  }

  onVirtualKey(input: string): void {
    this.gameService.handleInput(input);
  }
}
