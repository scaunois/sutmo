import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BoardRow, CellState } from '../../models/game.types';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
export class GameBoardComponent {
  @Input({ required: true }) board: BoardRow[] = [];
  @Input({ required: true }) currentRowIndex = 0;
  @Input({ required: true }) revealIndexByRow: number[] = [];

  getCellClass(rowIndex: number, colIndex: number): string {
    const state = this.board[rowIndex]?.states[colIndex] ?? CellState.EMPTY;
    const revealIndex = this.revealIndexByRow[rowIndex] ?? -1;

    if (
      (state === CellState.CORRECT || state === CellState.PRESENT || state === CellState.ABSENT) &&
      colIndex > revealIndex
    ) {
      return `cell-${CellState.EMPTY}`;
    }

    return `cell-${state}`;
  }
}
