import { TestBed } from '@angular/core/testing';

import { CellState, GameStatus } from '../models/game.types';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameService);
    service.startGame('ACTION');
  });

  it('revele seulement la premiere lettre sur la ligne active au demarrage', () => {
    expect(service.board[0].letters[0]).toBe('A');
    expect(service.board[0].states[0]).toBe(CellState.ABSENT);

    for (let i = 1; i < service.board.length; i += 1) {
      expect(service.board[i].letters[0]).toBe('');
      expect(service.board[i].states[0]).toBe(CellState.EMPTY);
    }
  });

  it('termine en victoire quand le mot est correct', () => {
    for (const letter of 'CTION') {
      service.handleInput(letter);
    }

    const result = service.handleInput('ENTER');

    expect(result.accepted).toBeTrue();
    expect(service.status).toBe(GameStatus.WON);
    expect(service.board[0].states.every(state => state === CellState.CORRECT)).toBeTrue();
  });

  it('retourne une erreur si la proposition est incomplete', () => {
    service.handleInput('C');

    const result = service.handleInput('ENTER');

    expect(result.accepted).toBeFalse();
    expect(result.message).toContain('incomplet');
  });

  it('revele la premiere lettre sur la ligne suivante apres une proposition validee', () => {
    for (const letter of 'ZZZZZ') {
      service.handleInput(letter);
    }

    const rejected = service.handleInput('ENTER');
    expect(rejected.accepted).toBeFalse();
    expect(service.currentRowIndex).toBe(0);
    expect(service.board[1].letters[0]).toBe('');

    service.handleInput('BACKSPACE');
    service.handleInput('BACKSPACE');
    service.handleInput('BACKSPACE');
    service.handleInput('BACKSPACE');
    service.handleInput('BACKSPACE');

    for (const letter of 'NANAS') {
      service.handleInput(letter);
    }

    const accepted = service.handleInput('ENTER');

    expect(accepted.accepted).toBeTrue();
    expect(service.currentRowIndex).toBe(1);
    expect(service.board[1].letters[0]).toBe('A');
    expect(service.board[1].states[0]).toBe(CellState.ABSENT);
  });

  it('retourne une erreur si le mot n est pas dans le dictionnaire', () => {
    for (const letter of 'ZZZZZ') {
      service.handleInput(letter);
    }

    const result = service.handleInput('ENTER');

    expect(result.accepted).toBeFalse();
    expect(result.message).toContain('non autorise');
    expect(service.currentRowIndex).toBe(0);
  });

  it('bloque la validation si la saisie contient des points', () => {
    service.handleInput('.');
    service.handleInput('.');
    service.handleInput('.');
    service.handleInput('.');
    service.handleInput('.');

    const result = service.handleInput('ENTER');

    expect(result.accepted).toBeFalse();
    expect(result.message).toContain('points');
    expect(service.currentRowIndex).toBe(0);
  });

  it('insere un point avec la touche espace', () => {
    service.handleInput(' ');

    expect(service.board[0].letters[1]).toBe('.');
  });

  it('ignore la premiere lettre du mot si elle est tapee en debut de ligne', () => {
    // 'A' est la première lettre de 'ACTION', déjà verrouillee en position 0
    service.handleInput('A');
    service.handleInput('A');
    service.handleInput('A');

    // Aucun A ne doit avoir été inséré en position 1+
    expect(service.board[0].letters.slice(1)).toEqual(['', '', '', '', '']);

    // Taper une lettre différente doit s'insérer normalement
    service.handleInput('C');
    expect(service.board[0].letters[1]).toBe('C');
  });
});
