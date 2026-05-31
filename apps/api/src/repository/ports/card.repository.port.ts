import { CardSetEntity } from "../../entities/cardSet.entity";
import {
  CardEntity,
  Set,
} from "../../entities/card.entity";
import { Region } from "@gather/types";

export type GetCardsFilter = {
  set?: string;
  tags?: string | string[];
  region?: Region | Region[];
};

export abstract class CardRepositoryPort {
  abstract getCards(
    filters?: GetCardsFilter,
    pagination?: {
      take?: number;
      page?: number;
    },
  ): Promise<(CardEntity & {cardSet: CardSetEntity})[]>;

  abstract getCard(cardId: string): Promise<CardEntity & {cardSet: CardSetEntity}>;

  abstract updateCardNote(cardId: string, note: string | null): Promise<void>;
}
