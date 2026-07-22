import { effect, inject, Injectable, signal } from '@angular/core';

import { DICTIONARY_WORDS } from '../data/dictionary-words';
import {
  BoardRow,
  CellState,
  Game,
  GAME_START_DATE,
  GameStatus,
  KeyboardState,
  MAX_ATTEMPTS,
  WordCheckResult,
} from '../models/game.types';
import { TARGET_WORDS } from '../data/target-words';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { GameResultsModalComponent } from '../components/game-results-modal/game-results-modal.component';

@Injectable({ providedIn: 'root' })
export class GameService {
  private modalService = inject(NgbModal);

  status = signal(GameStatus.PLAYING);
  errorMessage = signal<string | null>(null);

  private readonly _game: Game;
  private readonly revealDelayMs = 300;
  private allowedWords = new Set<string>(); // avoid using all dictionary words, by using only words matching the target's length
  private revealSequence = 0;
  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this._game = this.buildNewGame();

    // Display first letter of the target word
    this.game.board[0].letters[0] = this._game.targetWord[0];

    this.revealSequence += 1;

    // Reacts to game status changes
    effect(() => {
      const status = this.status();
      if (status !== GameStatus.PLAYING) {
        this.displayResultsModal();
      }
    });
  }

  get game(): Game {
    return this._game;
  }

  handleInput(character: string) {
    if (this._game.isRevealing) {
      return;
    }

    const isLetter = /^[A-Z]$/.test(character);
    const isAllowedSpecial = /^(ENTER|BACKSPACE|SHIFT|\.| )$/.test(character);
    if (!isLetter && !isAllowedSpecial) {
      this.setError('Caractère invalide');
      return;
    }

    // Shift key is allowed but should not trigger any action
    // (it is only accepted to allow the key combination 'Shift + ;è to insert a '.',
    // otherwise, the first key press will trigger the error message)
    if (character === 'SHIFT') {
      return;
    }

    if (character === 'BACKSPACE') {
      this.deleteLastLetter();
    } else if (character === '.' || character === ' ') {
      this.insertLetter('.');
    } else if (character === 'ENTER') {
      this.submitGuess();
    } else {
      // Si l'utilisateur tape la première lettre du mot alors que le curseur
      // est encore en position 1 (rien de saisi), on l'ignore silencieusement.
      const row = this._game.board[this._game.currentRowIndex];
      const cursorAtStart = row.letters.slice(1).every(l => l === '');
      if (character === this._game.targetWord[0] && cursorAtStart) {
        return;
      }

      this.insertLetter(character);
    }
  }

  private buildNewGame(): Game {
    const targetWord = this.pickWord();

    this.allowedWords = new Set(DICTIONARY_WORDS.filter(word => word.length === targetWord.length));

    return {
      board: [...Array(MAX_ATTEMPTS)].map(() => this.createEmptyRow(targetWord.length)),
      keyboard: {},
      currentRowIndex: 0,
      targetWord,
      isRevealing: false,
      revealIndexByRow: new Array(MAX_ATTEMPTS).fill(-1),
    };
  }

  private pickWord(): string {
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - GAME_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
    return TARGET_WORDS[daysSinceStart % TARGET_WORDS.length];
  }

  private createEmptyRow(targetWordLength: number): BoardRow {
    return {
      letters: Array.from({ length: targetWordLength }, () => ''),
      states: Array.from({ length: targetWordLength }, () => CellState.EMPTY),
    };
  }

  private insertLetter(letter: string): void {
    const row = this._game.board[this._game.currentRowIndex];
    const nextIndex = row.letters.findIndex((value, index) => index > 0 && value === '');

    if (nextIndex !== -1) {
      row.letters[nextIndex] = letter;
    }
  }

  private deleteLastLetter(): void {
    const row = this._game.board[this._game.currentRowIndex];

    for (let i = this.game.targetWord.length - 1; i >= 1; i -= 1) {
      if (row.letters[i] !== '') {
        row.letters[i] = '';
        break;
      }
    }
  }

  private submitGuess(): void {
    // First, check if the entered word is complete and exists in the dictionary
    const row = this.game.board[this.game.currentRowIndex];
    const guess = row.letters.join('');
    const wordCheckResult = this.checkGuess(guess);
    if (!wordCheckResult.accepted) {
      this.setError(wordCheckResult.message!);
      return;
    }

    // Then, check it against the target word and update the UI accordingly
    this.evaluateGuess(guess);
    this.game.isRevealing = true;
    this.game.revealIndexByRow[this.game.currentRowIndex] = -1;
    this.revealEvaluation(guess);
  }

  private checkGuess(guess: string): WordCheckResult {
    if (guess.length !== this.game.targetWord.length || guess.includes('.')) {
      return { accepted: false, message: 'Saisie incomplète.' };
    }

    if (!this.allowedWords.has(guess)) {
      return { accepted: false, message: 'Mot absent du dictionnaire.' };
    }

    return { accepted: true };
  }

  private revealEvaluation(guess: string): void {
    const sequence = ++this.revealSequence;

    const targetWordLength = this.game.targetWord.length;
    for (let i = 0; i < targetWordLength; i += 1) {
      window.setTimeout(
        () => {
          if (sequence !== this.revealSequence) {
            return;
          }

          this.game.revealIndexByRow[this.game.currentRowIndex] = i;

          if (i === targetWordLength - 1) {
            this.finishRevealedRow(guess, sequence);
          }
        },
        this.revealDelayMs * (i + 1),
      );
    }
  }

  private finishRevealedRow(guess: string, sequence: number): void {
    if (sequence !== this.revealSequence) {
      return;
    }

    this.updateKeyboard(guess);

    if (guess === this._game.targetWord) {
      this.status.set(GameStatus.WON);
      this.game.isRevealing = false;
      return;
    }

    if (this.game.currentRowIndex === MAX_ATTEMPTS - 1) {
      this.status.set(GameStatus.LOST);
      this.game.isRevealing = false;
      return;
    }

    // Prepare next line
    this.game.currentRowIndex++;
    this.game.board[this.game.currentRowIndex].letters[0] = this.game.targetWord[0];

    this.game.isRevealing = false;
  }

  private evaluateGuess(guess: string): void {
    const targetWordLength = this.game.targetWord.length;
    const result: CellState[] = Array.from({ length: targetWordLength }, () => CellState.ABSENT);
    const remaining: Record<string, number> = {};

    for (let i = 0; i < targetWordLength; i += 1) {
      const targetLetter = this.game.targetWord[i];
      if (guess[i] === targetLetter) {
        result[i] = CellState.CORRECT;
      } else {
        remaining[targetLetter] = (remaining[targetLetter] ?? 0) + 1;
      }
    }

    for (let i = 0; i < targetWordLength; i += 1) {
      if (result[i] === CellState.CORRECT) {
        continue;
      }

      const letter = guess[i];
      if ((remaining[letter] ?? 0) > 0) {
        result[i] = CellState.PRESENT;
        remaining[letter] -= 1;
      }
    }

    this.game.board[this.game.currentRowIndex].states = result;
  }

  private updateKeyboard(guess: string): void {
    for (let i = 0; i < guess.length; i += 1) {
      const letter = guess[i];
      const existing = this.game.keyboard[letter] ?? KeyboardState.UNKNOWN;
      const next = this.cellToKeyboardState(this.game.board[this.game.currentRowIndex].states[i]);
      this.game.keyboard[letter] = this.bestKeyboardState(existing, next);
    }
  }

  private cellToKeyboardState(state: CellState): KeyboardState {
    if (state === CellState.CORRECT) {
      return KeyboardState.CORRECT;
    }
    if (state === CellState.PRESENT) {
      return KeyboardState.PRESENT;
    }
    if (state === CellState.ABSENT) {
      return KeyboardState.ABSENT;
    }
    return KeyboardState.UNKNOWN;
  }

  private bestKeyboardState(current: KeyboardState, next: KeyboardState): KeyboardState {
    const rank: Record<KeyboardState, number> = {
      [KeyboardState.UNKNOWN]: 0,
      [KeyboardState.ABSENT]: 1,
      [KeyboardState.PRESENT]: 2,
      [KeyboardState.CORRECT]: 3,
    };

    return rank[next] > rank[current] ? next : current;
  }

  private setError(message: string): void {
    this.errorMessage.set(message);

    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.errorMessage.set(null);
      this.errorTimeout = null;
    }, 3000);
  }

  private displayResultsModal(): void {
    const modalRef = this.modalService.open(GameResultsModalComponent, {
      centered: true,
      backdrop: 'static',
      windowClass: `game-result-modal ${this.status() === GameStatus.WON ? 'success' : 'failure'}`,
    });

    const modalInstance = modalRef.componentInstance as GameResultsModalComponent;
    modalInstance.status = this.status();
    modalInstance.board = this.game.board;
    modalInstance.targetWord = this.game.targetWord;
    modalInstance.attempts = this.game.currentRowIndex + 1;

    modalRef.closed.subscribe(result => {
      console.log('confirmed', result);
    });

    modalRef.dismissed.subscribe(reason => {
      console.log('cancelled', reason);
    });
  }
}
