import { CardEntity } from "../../entities/card.entity";

export abstract class CardRepositoryPort {
  abstract getCards(
    set?: "alpha" | "arabian_nights" | "antiquities" | "legends" | "the_dark",
    take?: number,
    page?: number
  ): Promise<CardEntity[] | undefined>;
}
