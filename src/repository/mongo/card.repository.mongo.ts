import { BSON, Collection } from "mongodb";
import { CardEntity } from "../../entities/card.entity";
import { CardMapper } from "./mappers/card.mapper.mongo";
import { CardModel } from "./models/card.model.mongo";
import { CardRepositoryPort } from "../ports/card.repository.port";

export class CardRepositoryMongo implements CardRepositoryPort {
  private cardMapper: CardMapper;

  constructor(private readonly cardCollection: Collection<CardModel>) {
    this.cardMapper = new CardMapper();
  }

  async getCards(
    set?: "arabian_nights" | "antiquities" | "legends" | "the_dark",
    take?: number,
    page?: number
  ): Promise<CardEntity[]> {
    const where = set ? { set } : {};
    const cards = await this.cardCollection
      .find(where, { sort: { name: 1 }, limit: take, skip: page })
      .toArray();
    return cards.map((card) => this.cardMapper.toEntity(card));
  }
}
