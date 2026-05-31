import { CardRepositoryPort } from "../../repository/ports/card.repository.port";

export class UpdateCardNoteUsecase {
  constructor(private readonly cardRepository: CardRepositoryPort) {}

  async execute(cardId: string, note: string | null): Promise<void> {
    await this.cardRepository.updateCardNote(cardId, note);
  }
}
