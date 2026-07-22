import { Component, inject, Input, input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BoardRow, CellState, GameStatus, MAX_ATTEMPTS } from '../../models/game.types';

@Component({
  selector: 'app-game-results-modal',
  standalone: true,
  imports: [],
  templateUrl: './game-results-modal.component.html',
})
export class GameResultsModalComponent {
  private activeModal = inject(NgbActiveModal);

  readonly WON = GameStatus.WON;

  @Input({ required: true }) status!: GameStatus;
  @Input({ required: true }) board!: BoardRow[];
  @Input({ required: true }) targetWord!: string;
  @Input({ required: true }) attempts!: number;

  get resultAsIcons(): string {
    const emoji: Record<CellState, string> = {
      [CellState.CORRECT]: '🟪',
      [CellState.PRESENT]: '🟣',
      [CellState.ABSENT]: '⬜',
      [CellState.EMPTY]: '⬜',
    };

    const lines = this.board
      .filter(row => row.states.some(s => s !== CellState.EMPTY))
      .map(row => row.states.map(s => emoji[s]).join(''));

    return lines.join('\n');
  }

  copyToClipboard(): void {
    let shareText = `SUTOM - ${this.attempts}/${MAX_ATTEMPTS} \n\n`;
    shareText += this.resultAsIcons;
    navigator.clipboard.writeText(shareText);
  }

  close(): void {
    this.activeModal.dismiss();
  }
}
