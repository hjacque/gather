import { ObjectId } from "mongodb";

export type CardModel = {
  _id: ObjectId;
  number: number;
  name: string;
  set:
    | "alpha"
    | "beta"
    | "unlimited"
    | "arabian_nights"
    | "antiquities"
    | "legends"
    | "the_dark"
    | "fallen_empires"
    | "ice_age"
    | "chronicles"
    | "homelands"
    | "alliances"
    | "mirage"
    | "visions"
    | "weatherlight"
    | "portal"
    | "stronghold"
    | "exodus"
    | "urzas_saga"
    | "urzas_legacy"
    | "urzas_destiny";
  rarity: "common" | "uncommon" | "rare";
  cardMarketPrice: number;
  priceChartingPrice: number;
  ckBuyListPrice: number;
  abugamesBuyListPrice: number;
  marketPrice: number;
  cardMarketLink: string;
  priceChartingLink: string;
  ckBuyListLink: string;
  abugamesBuyListLink: string;
};
