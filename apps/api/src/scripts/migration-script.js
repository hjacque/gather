import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating or finding Alpha set...");

  // const productSet = await prisma.productSet.create({
  //   data: {
  //     name: "SV-P Promotional",
  //     code: "SV-P",
  //     releaseDate: new Date("2022-11-18"),
  //     franchise: "pokemon",
  //   },
  // });
  const productSet = await prisma.productSet.findFirst({
    where: {
      code: "SV-P",
    },
  });
  console.log("Found product set:", productSet);

  const products = await prisma.product.createMany({
      data: [
        {
          name: "Taipei's Pikachu Pokemon Center Taipei",
          productSetId: productSet.id,
          type: "single",
          rarity: "promo",
          cardMarketLink: "https://www.cardmarket.com/en/Pokemon/Products/Singles/Traditional-Chinese-Products/Taipeis-Pikachu-SV-P057",
          psaLink: "https://www.psacard.com/pop/tcg-cards/2023/pokemon-traditional-chinese-sv-p-promo/230303",
          imageUrl: "https://pokecardex-scans.b-cdn.net/sets_jp/EXHKTW/3.jpg?class=hd",
          releaseDate: new Date("2023-12-08"),
          tags: [],
          number: "057",
          regions: ["taiwan_hong_kong"],
        },
      ]
    });

  console.log("✅ Products:", products);

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
