export type SellerRecord = {
  slug: string;
  trusted: boolean;
  checkedAt: Date;
};

export abstract class SellerRepositoryPort {
  abstract findBySlug(slug: string): Promise<SellerRecord | null>;
  abstract upsert(seller: SellerRecord): Promise<void>;
}
