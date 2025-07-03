import { ObjectId } from "mongodb";

export type ProductModel = {
  _id: ObjectId;
  type: "single" | "booster_box" | "collector_booster_box";
  franchise: "mtg" | "pokemon";
  name: string;
  releaseDate?: Date;
  msrp?: number;
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
  cardMarketLink: string;
  priceChartingLink: string;
  cardkingdomBuyListLink: string;
  abugamesBuyListLink: string;
  starcitygamesBuyListLink: string;
};
