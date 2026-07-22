# Sutmo

Application Angular standalone inspirée de Sutom.

## Fonctionnalités

- Grille en 6 essais avec premiere lettre imposée
- Evaluation des lettres (`correct`, `present`, `absent`)
- Clavier virtuel coloré selon les informations connues
- Support clavier physique (`A-Z`, `Enter`, `Backspace`)
- Bouton pour relancer une partie

## Prerequis

- Node.js 20+
- npm 10+

## Lancer le projet

```bash
npm install
npm start
```

Puis ouvrir `http://localhost:4200`.

## Lancer les tests

```bash
npm test
```

## Build production

```bash
npm run build
```

## Formater le code

```bash
npm run format
```

Verifier le formatage sans modifier les fichiers:

```bash
npm run format:check
```

## Structure principale

- `src/app/services/game.service.ts`: logique complète du jeu
- `src/app/components/game-board.component.ts`: grille de jeu
- `src/app/components/virtual-keyboard.component.ts`: clavier virtuel
- `src/app/components/game-header.component.ts`: statut et actions
