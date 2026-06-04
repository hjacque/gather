import { PrismaClient } from "@prisma/client";
import { SellerRepositoryPort, SellerRecord } from "../ports/seller.repository.port";

export class SellerRepositoryPg implements SellerRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findBySlug(slug: string): Promise<SellerRecord | null> {
    const row = await this.prisma.seller.findUnique({ where: { slug } });
    if (!row) return null;
    return { slug: row.slug, trusted: row.trusted, checkedAt: row.checkedAt };
  }

  async upsert(seller: SellerRecord): Promise<void> {
    await this.prisma.seller.upsert({
      where: { slug: seller.slug },
      create: { slug: seller.slug, trusted: seller.trusted, checkedAt: seller.checkedAt },
      update: { trusted: seller.trusted, checkedAt: seller.checkedAt },
    });
  }
}
