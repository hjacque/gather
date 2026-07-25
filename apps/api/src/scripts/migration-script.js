import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating or finding set...");

  // const cardSet = await prisma.cardSet.create({
  //   data: {
  //     name: "M-P Promotional",
  //     code: "M-P",
  //     releaseDate: new Date("2025-07-31"),
  //   },
  // });
  const cardSet = await prisma.cardSet.findFirst({
    where: {
      code: "M-P",
    },
  });
  console.log("Found card set:", cardSet);

  const cards = await prisma.card.createMany({
      data: [
        // {
        //   name: "Taipei's Pikachu Pokemon Center Taipei",
        //   cardSetId: cardSet.id,
        //   foilPattern: "rareHolo",
        //   cardMarketLink: "https://www.cardmarket.com/en/Pokemon/Products/Singles/M-P-Promos/Magikarp-M-P040",
        //   psaLink: "https://www.psacard.com/pop/tcg-cards/2026/pokemon-korean-m-p-promo/338019", // waiting for official entry
        //   imageUrl: "https://archives.bulbagarden.net/media/upload/9/98/MagikarpMPromo40.jpg",
        //   releaseDate: new Date("2026-05-01"),
        //   tags: [],
        //   number: "040",
        //   regions: ["korea"],
        // },
        {
          name: "Celebratory Fanfare '24-'25 Season Championship Point Reward",
          cardSetId: cardSet.id,
          foilPattern: "rareHolo",
          cardMarketLink: "https://www.cardmarket.com/en/Pokemon/Products/Singles/M-P-Promos/Celebratory-Fanfare-M-P033",
          psaLink: "https://www.psacard.com/pop/tcg-cards/2025/pokemon-japanese-m-p-promo/312898",
          imageUrl: "https://pokecardex-scans.b-cdn.net/sets_jp/MP/33.jpg?class=hd",
          releaseDate: new Date("2024-09-01"),
          tags: [],
          number: "033",
          regions: ["japan"],
        },
      ]
    });

  console.log("✅ Cards:", cards);

  return;

  console.log("✅ Import completed.");
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
