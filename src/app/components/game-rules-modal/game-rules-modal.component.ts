import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-game-rules-modal',
  standalone: true,
  imports: [],
  templateUrl: './game-rules-modal.component.html',
})
export class GameRulesModalComponent {
  private readonly activeModal = inject(NgbActiveModal);

  close(): void {
    this.activeModal.dismiss();
  }
}

