export const GAME_START_DATE = new Date(2026, 0, 1, 0, 0, 0);
export const MAX_ATTEMPTS = 6;

export interface Game {
  targetWord: string;
  board: BoardRow[];
  currentRowIndex: number;
  keyboard: Record<string, KeyboardState>;
  // indicates that the UI is updating to show correct/present letters
  isRevealing: boolean;
  // TODO comment
  revealIndexByRow: number[];
}

export enum CellState {
  EMPTY = 'empty',
  CORRECT = 'correct',
  PRESENT = 'present',
  ABSENT = 'absent',
}

export enum KeyboardState {
  UNKNOWN = 'unknown',
  CORRECT = 'correct',
  PRESENT = 'present',
  ABSENT = 'absent',
}

export enum GameStatus {
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}

export interface BoardRow {
  // list has same length as target word, each letter is either empty string or a single uppercase letter
  letters: string[];
  // list has same length as target word, each state matches a letter in `letters`
  states: CellState[];
}

export interface WordCheckResult {
  accepted: boolean; // whether the word is accepted or not
  message?: string; // reason why the word is not accepted
}
