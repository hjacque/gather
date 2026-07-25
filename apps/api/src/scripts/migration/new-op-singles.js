import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating or finding Alpha set...");

  const productSet = await prisma.productSet.findFirst({
    where: {
      name: "Star Wars",
    },
  });

  console.log("Found product set:", productSet);

  await prisma.product.createMany({
    data: [
      {
        name: "sw0076 - Bib Fortuna - Dark Blue Robe, Tan Skin",
        productSetId: productSet.id,
        type: "minifigure",
        bricklinkLink:
          "https://www.bricklink.com/v2/catalog/catalogitem.page?M=sw0076",
      },
    ],
  });

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
