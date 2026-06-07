import { CardEntity } from "../../entities/card.entity";
import { CardMapper } from "./mappers/card.mapper.pg";
import {
  GetCardsFilter,
  CardRepositoryPort,
} from "../ports/card.repository.port";
import { CardSetEntity } from "entities/cardSet.entity";
import { CardSetMapper } from "./mappers/cardSet.mapper.pg";
import { PrismaClient } from "@prisma/client";

export class CardRepositoryPg implements CardRepositoryPort {
  private cardMapper: CardMapper;
  private cardSetMapper: CardSetMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.cardMapper = new CardMapper();
    this.cardSetMapper = new CardSetMapper();
  }

  async getCards(
    filters?: GetCardsFilter,
    pagination?: {
      take?: number;
      page?: number;
    },
  ): Promise<(CardEntity & {cardSet: CardSetEntity})[]> {
    const take = pagination?.take ?? undefined;
    const skip = pagination?.page ? (pagination.page - 1) * (take || 1) : 0;

    const include = { cardSet: true } as const;
    const cards = await this.prisma.card.findMany({
        where: {
          cardSet: filters?.set ? { name: filters.set } : undefined,
          tags: filters?.tags ? (typeof filters.tags === "string" ? { has: filters.tags } : { hasSome: filters.tags }) : undefined,
          regions: filters?.region ? (typeof filters.region === "string" ? { has: filters.region } : { hasSome: filters.region }) : undefined,
        },
        orderBy: [
          { cardSet: { releaseDate: 'desc' } },
          { name: 'asc' },
        ],
        include,
        take,
        skip,
    });

    if (!cards) {
      return [];
    }

    return cards.map((card) => {
      return {
        ...this.cardMapper.toEntity(card),
        cardSet: this.cardSetMapper.toEntity(card.cardSet),
      };
    });
  }

  async getCard(cardId: string): Promise<(CardEntity & {cardSet: CardSetEntity})> {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: {
        cardSet: true,
      },
    });

    return {
        ...this.cardMapper.toEntity(card),
        cardSet: this.cardSetMapper.toEntity(card.cardSet)
      };
  }

  async updateCardNote(cardId: string, note: string | null): Promise<void> {
    await this.prisma.card.update({
      where: { id: cardId },
      data: { note },
    });
  }
}
