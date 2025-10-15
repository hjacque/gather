import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting...');

//   const products = await prisma.product.findMany({
//     where: {
//       type: 'collector_booster_box',
//     },
//     include: {
//       productSet: true,
//     }
//   });
    const products = [
        await prisma.product.findUnique({
            where: { id: "400dc0ac-95e4-4880-9443-c281d999ed01" },
            include: { productSet: true },
        }),
    ]

  const dateToFix = new Date('2025-10-14');
  console.log('Fixing prices for date:', dateToFix.toISOString().split('T')[0]);
  for (const product of products) {
    const yesterday = new Date(dateToFix);
    yesterday.setUTCDate(dateToFix.getUTCDate() - 1);
    console.log({ yesterday: yesterday.toISOString().split('T')[0] });

    const yesterdayCardmarketPrice = await prisma.price.findUnique({
      where: {
        productId_date_type: {
            productId: product.id,
            date: yesterday.toISOString(),
            type: 'cardmarket',
        }
      },
    });
    console.log(`Fixing ${product.name} (${product.productSet.code})...`, { yesterdayCardmarketPrice: yesterdayCardmarketPrice.value });

    await prisma.price.update({
      where: { 
        productId_date_type: {
            productId: product.id,
            date: dateToFix.toISOString(),
            type: 'cardmarket',
        }
       },
      data: { value: yesterdayCardmarketPrice?.value },
    });
    await prisma.price.update({
      where: { 
        productId_date_type: {
            productId: product.id,
            date: dateToFix.toISOString(),
            type: 'market',
        }
       },
      data: { value: yesterdayCardmarketPrice?.value },
    });
  }

  console.log('✅ Completed.');

  return ;
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
