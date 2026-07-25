import { CardEntity } from "../../entities/card.entity";
import { CardMapper } from "./mappers/card.mapper.pg";
import {
  GetCardsFilter,
  CardRepositoryPort,
} from "../ports/card.repository.port";
import { CardSetEntity } from "entities/cardSet.entity";
import { CardSetMapper } from "./mappers/cardSet.mapper.pg";
import { Prisma, PrismaClient } from "@prisma/client";

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

    const conditions: Prisma.Sql[] = [];
    if (filters?.set) {
      conditions.push(Prisma.sql`s."name" = ${filters.set}`);
    }
    if (filters?.tags) {
      const tags = typeof filters.tags === "string" ? [filters.tags] : filters.tags;
      conditions.push(Prisma.sql`c."tags" && ${tags}::text[]`);
    }
    if (filters?.region) {
      const regions = typeof filters.region === "string" ? [filters.region] : filters.region;
      conditions.push(Prisma.sql`c."regions" && ${regions}::"Region"[]`);
    }

    // A Card's own releaseDate is nullable (most only carry their Set's date),
    // so order on the coalesced date — an undated Card sorts with its Set, not
    // at the very end. Prisma's orderBy can't express COALESCE, hence the raw
    // id query; the rows themselves still come back through findMany.
    const ordered = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c."id"
      FROM "Card" c
      JOIN "CardSet" s ON s."id" = c."cardSetId"
      ${conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty}
      ORDER BY COALESCE(c."releaseDate", s."releaseDate") DESC, c."name" ASC, c."id" ASC
      ${take !== undefined ? Prisma.sql`LIMIT ${take}` : Prisma.empty}
      OFFSET ${skip}
    `);

    if (!ordered.length) {
      return [];
    }

    const ids = ordered.map(({ id }) => id);
    const rows = await this.prisma.card.findMany({
      where: { id: { in: ids } },
      include: { cardSet: true },
    });
    const byId = new Map(rows.map((card) => [card.id, card]));
    const cards = ids
      .map((id) => byId.get(id))
      .filter((card): card is (typeof rows)[number] => card !== undefined);

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
