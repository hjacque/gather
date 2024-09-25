import { set } from "zod";
import { CARDMARKET_FEE } from "../../constants";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";

export class GetOpportunitiesUsecase {
  constructor(private readonly cardRepository: CardRepositoryPort) {}

  async execute() {
    const cards = await this.cardRepository.getCards();
    if (!cards) {
      return [];
    }
    const opportunities = cards
      .filter((card) =>
        [
          "Bazaar of Baghdad",
          "Library of Alexandria",
          "Diamond Valley",
          "Guardian Beast",
          "City of Brass",
          "Drop of Honey",
          "Shahrazad",
          "Island of Wak-Wak",
          "City in a Bottle",
          "Erhnam Djinn",
          "Old Man of the Sea",
          "Elephant Graveyard",
          "Singing Tree",
          "Ifh-Bíff Efreet",
          "King Suleiman",
          "Khabál Ghoul",
          "Merchant Ship",
          "Mishra's Factory white",
          "Transmute Artifact",
          "Argivian Archaeologist",
          "Triskelion",
          "Tawnos's Coffin",
          "Gate to Phyrexia",
          "Citanul Druid",
          "Hurkyl's Recall",
          "Ivory Tower",
          "Mishra's Factory green",
          "Mishra's Workshop",
          "Power Artifact",
          "Powerleech",
          "Shatterstorm",
          "Strip Mine",
          "Strip Mine",
          "Strip Mine",
          "Strip Mine",
          "Su-Chi",
          "Tetravus",
          "Candelabra of Tawnos",
          "All Hallow's Eve",
          "Nether Void",
          "The Abyss",
          "Chains of Mephistopheles",
          "Land Equilibrium",
          "Mirror Universe",
          "Acid Rain",
          "The Tabernacle at Pendrell Vale",
          "Living Plane",
          "Goblin Wizard",
          "Season of the Witch",
          "Mana Vortex",
          "Eater of the Dead",
          "Exorcist",
          "Martyr's Cry",
          "Eternal Flame",
          "Psychic Allergy",
          "Uncle Istvan",
        ].includes(card.name)
      )
      .map((card) => {
        if (
          !card.cardMarketPrice ||
          !card.marketPrice ||
          (card.cardMarketPrice && card.cardMarketPrice < 15)
        ) {
          return;
        }
        const buyPrice = card.cardMarketPrice / (1 - CARDMARKET_FEE);
        const sellPrice = card.marketPrice;
        const profit = sellPrice - buyPrice;
        if (profit < 0) {
          return;
        }
        return {
          cardName: card.name,
          set: card.set,
          buyPrice,
          sellPrice,
          profit,
          link:
            card.cardMarketLink +
            "?language=1&minCondition=2&isSigned=N&isAltered=N",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.profit - b!.profit);
    if (opportunities.length) {
      console.log("opportunities", opportunities);
    }

    return opportunities;
  }
}
