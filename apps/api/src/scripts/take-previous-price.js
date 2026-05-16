import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting...");

  const products = await prisma.product.findMany({
    where: {
      type: {
        in: ["minifigure"],
      },
    },
    include: {
      productSet: true,
    },
  });
  console.log(`Found ${products.length} products to process.`);
  // console.log(products);
  // return;
  // const products = [
  //     await prisma.product.findUnique({
  //         where: { id: "a7143318-2f7b-4ace-b7d3-f35e17ef3dae" },
  //         include: { productSet: true },
  //     }),
  // ]

  const dateToFix = new Date("2026-04-12");
  console.log("Fixing prices for date:", dateToFix.toISOString().split("T")[0]);
  for (const product of products) {
    const yesterday = new Date(dateToFix);
    yesterday.setUTCDate(dateToFix.getUTCDate() - 1);
    console.log({ yesterday: yesterday.toISOString().split("T")[0] });

    const yesterdayCardmarketPrice = await prisma.price.findUnique({
      where: {
        productId_date_type: {
          productId: product.id,
          date: yesterday.toISOString(),
          type: "cardmarket",
        },
      },
    });
    console.log(`Fixing ${product.name} (${product.productSet.code})...`, {
      yesterdayCardmarketPrice: yesterdayCardmarketPrice?.value,
    });
    const yesterdayAvailability = await prisma.price.findUnique({
      where: {
        productId_date_type: {
          productId: product.id,
          date: yesterday.toISOString(),
          type: "cardmarketListingCount",
        },
      },
    });
    const yesterdayBricklinkAveragePrice = await prisma.price.findUnique({
      where: {
        productId_date_type: {
          productId: product.id,
          date: yesterday.toISOString(),
          type: "bricklinkAverage",
        },
      },
    });

    // if (!yesterdayCardmarketPrice) {
    //   continue;
    // }

    await prisma.price.upsert({
      where: {
        productId_date_type: {
          productId: product.id,
          date: dateToFix.toISOString(),
          type: "cardmarket",
        },
      },
      update: { value: yesterdayCardmarketPrice?.value },
      create: {
        productId: product.id,
        date: dateToFix,
        type: "cardmarket",
        value: yesterdayCardmarketPrice?.value,
      },
    });
    await prisma.price.upsert({
      where: {
        productId_date_type: {
          productId: product.id,
          date: dateToFix.toISOString(),
          type: "market",
        },
      },
      update: { value: yesterdayCardmarketPrice?.value },
      create: {
        productId: product.id,
        date: dateToFix,
        type: "market",
        value: yesterdayCardmarketPrice?.value,
      },
    });
    await prisma.price.upsert({
      where: {
        productId_date_type: {
          productId: product.id,
          date: dateToFix.toISOString(),
          type: "cardmarketListingCount",
        },
      },
      update: { value: yesterdayAvailability?.value },
      create: {
        productId: product.id,
        date: dateToFix,
        type: "cardmarketListingCount",
        value: yesterdayAvailability?.value,
      },
    });
    await prisma.price.upsert({
      where: {
        productId_date_type: {
          productId: product.id,
          date: dateToFix.toISOString(),
          type: "bricklinkAverage",
        },
      },
      update: { value: yesterdayBricklinkAveragePrice?.value },
      create: {
        productId: product.id,
        date: dateToFix,
        type: "bricklinkAverage",
        value: yesterdayBricklinkAveragePrice?.value,
      },
    });
  }

  console.log("✅ Completed.");

  return;
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
