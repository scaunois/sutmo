import { Component, inject, signal } from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [],
  templateUrl: './error-message.component.html',
  styleUrl: './error-message.component.scss',
})
export class ErrorMessageComponent {
  private gameService = inject(GameService);

  errorMessage = this.gameService.errorMessage.asReadonly();
}
