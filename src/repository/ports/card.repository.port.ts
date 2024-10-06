import { CardEntity } from "../../entities/card.entity";

export abstract class CardRepositoryPort {
  abstract getCards(
    set?:
      | "alpha"
      | "beta"
      | "unlimited"
      | "arabian_nights"
      | "antiquities"
      | "legends"
      | "the_dark",
    take?: number,
    page?: number
  ): Promise<CardEntity[]>;

  abstract getCard(cardId: string): Promise<CardEntity>;
}
