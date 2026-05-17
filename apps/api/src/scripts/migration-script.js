import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating or finding Alpha set...");

  const productSet = await prisma.productSet.create({
    data: {
      name: "Unnumbered Promos",
      code: "UNP",
      releaseDate: new Date("1996-10-01"),
      franchise: "pokemon",
    },
  });
  // const productSet = await prisma.productSet.findFirst({
  //   where: {
  //     code: "OP01",
  //   },
  // });
  console.log("Found product set:", productSet);
  // return;

  await prisma.product.create({
    data: {
      name: "University Magikarp Tamamushi University Prize",
      productSetId: productSet.id,
      type: "single",
      rarity: "promo",
      cardMarketLink:
        "https://www.cardmarket.com/en/Pokemon/Products/Singles/Unnumbered-Promos/Magikarp",
      psaLink: "https://www.psacard.com/pop/tcg-cards/1998/pokemon-japanese-promo/79839",
      tags: [],
    },
  });

  // const products = await prisma.product.findMany({
  //   where: {
  //     productSetId: productSet.id,
  //     tags: { has: "basic-land" },
  //   },
  // });

  // for (const product of products) {
  //   console.log(
  //     "Updating product:",
  //     product.name,
  //     product.cardkingdomBuyListLink
  //   );
  //   const res = await prisma.product.update({
  //     where: { id: product.id },
  //     data: {
  //       cardkingdomBuyListLink: product.cardkingdomBuyListLink.replace(
  //         "beta",
  //         "Unlimited"
  //       ),
  //     },
  //   });
  //   console.log("Updated:", res);
  // }

  // const products = await prisma.product.createMany({
  //     data: [
  //       {
  //         name: "Animate Dead",
  //         productSetId: productSet.id,
  //         type: "single",
  //         rarity: "uncommon",
  //         cardMarketLink: "https://www.cardmarket.com/en/Magic/Products/Singles/Revised/Animate+Dead?language=1&minCondition=2&isSigned=N&isAltered=N",
  //         cardkingdomBuyListLink: "https://www.cardkingdom.com/purchasing/mtg_singles?filter%5Bsort%5D=price_desc&filter%5Bsearch%5D=mtg_advanced&filter%5Bname%5D=Animate-Dead&filter%5Bedition%5D=3rd-edition&filter%5Bformat%5D=&filter%5Bfoils%5D=1&filter%5Bsingles%5D=1&filter%5Bprice_op%5D=&filter%5Bprice%5D=",
  //         abugamesBuyListLink: 'https://abugames.com/buylist?search=Animate%20Dead&magic_edition=%5B%22Revised%22%5D',
  //         tags: ["OS"]
  //       }
  //     ]
  //   });

  // console.log("✅ Products:", products);

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
