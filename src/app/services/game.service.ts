import { effect, inject, Injectable, signal } from '@angular/core';

import { DICTIONARY_WORDS } from '../data/dictionary-words';
import {
  BoardRow,
  CellState,
  Game,
  GAME_START_DATE,
  GameProgress,
  GameStatus,
  KeyboardState,
  MAX_ATTEMPTS,
  WordCheckResult,
} from '../models/game.types';
import { TARGET_WORDS } from '../data/target-words';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { GameResultsModalComponent } from '../components/game-results-modal/game-results-modal.component';
import { GameRulesModalComponent } from '../components/game-rules-modal/game-rules-modal.component';

@Injectable({ providedIn: 'root' })
export class GameService {
  private modalService = inject(NgbModal);

  status = signal(GameStatus.PLAYING);
  errorMessage = signal<string | null>(null);

  private readonly _game: Game;
  private readonly revealDelayMs = 300;
  private allowedWords = new Set<string>(); // avoid using all dictionary words, by using only words matching the target's length
  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // determine whether the game has already been started today or not
    const playerProgress = localStorage.getItem('player-progress')
      ? (JSON.parse(localStorage.getItem('player-progress')!) as GameProgress)
      : null;
    const isTodayGameInProgress = playerProgress?.gameId === btoa(new Date().toISOString().slice(0, 10));

    this._game = isTodayGameInProgress ? this.initGame(playerProgress) : this.initGame();
    if (isTodayGameInProgress) {
      this.status.set(playerProgress.gameStatus);
    }
    this.initView();

    // Reacts to game status changes
    effect(() => {
      const status = this.status();
      if (status !== GameStatus.PLAYING) {
        // display results modal after a short delay
        setTimeout(() => {
          this.displayResultsModal();
        }, 500);
      }
    });
  }

  get game(): Game {
    return this._game;
  }

  handleInput(character: string) {
    if (this.game.isRevealing) {
      return;
    }

    const isLetter = /^[A-Z]$/.test(character);
    const isAllowedSpecial = /^(ENTER|BACKSPACE|DELETE|SHIFT|\.| )$/.test(character);
    if (!isLetter && !isAllowedSpecial) {
      this.setError('Caractère invalide');
      return;
    }

    // Shift key is allowed but should not trigger any action
    // (it is only accepted to allow the key combination 'Shift + ;' to insert a '.',
    // otherwise, the first key press will trigger the error message)
    if (character === 'SHIFT') {
      return;
    }

    if (character === 'BACKSPACE' || character === 'DELETE') {
      this.deleteLastLetter();
    } else if (character === '.' || character === ' ') {
      this.insertLetter('.');
    } else if (character === 'ENTER') {
      this.submitGuess();
    } else {
      // If the user tries to type the word's first letter into the second cell, ignore it
      if (this.game.currentCellIndex === 1 && character === this.game.targetWord[0]) {
        return;
      }

      this.insertLetter(character);
    }
  }

  displayGameRulesModal(): void {
    this.modalService.open(GameRulesModalComponent, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
  }

  displayResultsModal(): void {
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

  /**
   * Initializes the game state, including the target word, allowed words, and the game board.
   * Either create it from scratch, or retrieve it from local storage in a game has already been started.
   */
  private initGame(playerProgress?: GameProgress): Game {
    const targetWord = this.pickWord();

    this.allowedWords = new Set(DICTIONARY_WORDS.filter(word => word.length === targetWord.length));

    return {
      board: playerProgress?.board ?? [...Array(MAX_ATTEMPTS)].map(() => this.createEmptyRow(targetWord.length)),
      keyboard: playerProgress?.keyboard ?? {},
      currentRowIndex: playerProgress?.currentRowIndex ?? 0,
      currentCellIndex: 1, // the first letter is always displayed (at index 0), so it's readonly (writable from index 1)
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

  /**
   * Render initial view, whether if it's a new game, or a resumed game
   */
  private initView(): void {
    if (this.game.board[0].letters[0] !== '') {
      // an in progress game has been found --> re-render revealed letters for all attempts
      for (let i = 0; i < this.game.board.length; i++) {
        const row = this.game.board[i];
        for (let j = 0; j < row.letters.length; j++) {
          if (row.letters[j] !== '') {
            this.game.revealIndexByRow[i] = j;
          }
        }
      }
    } else {
      // it's a fresh game, no game in progress found in local storage --> display first letter of the target word
      this.game.board[0].letters[0] = this.game.targetWord[0];
    }
  }

  private insertLetter(letter: string): void {
    const currentCellIndex = this.game.currentCellIndex;
    const row = this.game.board[this.game.currentRowIndex];

    // if the last letter has been typed, prevent the player from typing another letter
    // (he should either delete the last letter or press Enter to validate his attempt)
    const isLastLetterTyped =
      currentCellIndex === this.game.targetWord.length - 1 && row.letters[currentCellIndex] !== '';
    if (isLastLetterTyped) {
      return;
    }

    row.letters[currentCellIndex] = letter;
    if (currentCellIndex !== this.game.targetWord.length - 1) {
      this.game.currentCellIndex++;
    }
  }

  private deleteLastLetter(): void {
    const row = this.game.board[this.game.currentRowIndex];
    let removalIndex = -1;

    for (let i = this.game.targetWord.length - 1; i > 0; i--) {
      if (row.letters[i] !== '' && i > 0) {
        removalIndex = i;
        break;
      }
    }

    if (removalIndex !== -1) {
      this.game.board[this.game.currentRowIndex].letters[removalIndex] = '';
      this.game.currentCellIndex = removalIndex;
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
    const targetWordLength = this.game.targetWord.length;
    for (let i = 0; i < targetWordLength; i += 1) {
      window.setTimeout(
        () => {
          this.game.revealIndexByRow[this.game.currentRowIndex] = i;

          if (i === targetWordLength - 1) {
            this.finishRevealedRow(guess);
          }
        },
        this.revealDelayMs * (i + 1),
      );
    }
  }

  private finishRevealedRow(guess: string): void {
    this.updateKeyboard(guess);

    if (guess === this.game.targetWord) {
      this.status.set(GameStatus.WON);
      this.game.isRevealing = false;
    }

    if (this.game.currentRowIndex === MAX_ATTEMPTS - 1) {
      this.status.set(GameStatus.LOST);
      this.game.isRevealing = false;
    }

    if (this.status() === GameStatus.PLAYING) {
      // game is not finished yet --> prepare next line
      this.game.currentRowIndex++;
      this.game.currentCellIndex = 1;
      const newRow = this.game.board[this.game.currentRowIndex];
      newRow.letters[0] = this.game.targetWord[0];
      // Pre-fill correct letters from ALL previous rows (not just the last one)
      for (let rowIdx = 0; rowIdx < this.game.currentRowIndex; rowIdx++) {
        const pastRow = this.game.board[rowIdx];
        for (let i = 0; i < newRow.letters.length; i++) {
          if (pastRow.states[i] === CellState.CORRECT) {
            newRow.letters[i] = pastRow.letters[i];
          }
        }
      }
    }

    // save player's progress in local storage, to allow resuming the game
    const playerProgress: GameProgress = {
      gameId: btoa(new Date().toISOString().slice(0, 10)), // today's date encoded in base44
      gameStatus: this.status(),
      board: this.game.board,
      currentRowIndex: this.game.currentRowIndex,
      keyboard: this.game.keyboard,
    };
    localStorage.setItem('player-progress', JSON.stringify(playerProgress));

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
}
