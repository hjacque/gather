import { ReviewSaleUsecase } from "./reviewSale.usecase";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { MarketSalePriceSnapshotService } from "./marketSalePriceSnapshot";

const fakeSale = {
  id: "sale-1",
  cardId: "card-1",
  soldAt: new Date("2025-01-01"),
  platform: "ebay" as const,
  itemId: "item-1",
  psaGrade: 10,
  price: 100,
  currency: "EUR",
  title: "",
  isBestOffer: false,
  seller: null,
  status: "pending" as const,
  verificationStage: "unverified" as const,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeFakeRepo() {
  const calls: { saleId: string; edits: { psaGrade?: number; price?: number } }[] =
    [];
  const repo = {
    getSaleById: jest.fn(async () => fakeSale),
    markReviewed: jest.fn(async (saleId: string, edits) => {
      calls.push({ saleId, edits });
    }),
  } as unknown as SaleRepositoryPort;
  return { repo, calls };
}

const noopSnapshot = {
  recompute: jest.fn(async () => {}),
} as unknown as MarketSalePriceSnapshotService;

describe("ReviewSaleUsecase", () => {
  it("approve with no edits stamps the Sale reviewed and changes no field", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo, noopSnapshot);

    await usecase.approve("sale-1");

    expect(repo.markReviewed).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ saleId: "sale-1", edits: {} });
  });

  it("applies a corrected grade on approve", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo, noopSnapshot);

    await usecase.approve("sale-1", { psaGrade: 9 });

    expect(calls[0]).toEqual({ saleId: "sale-1", edits: { psaGrade: 9 } });
  });

  it("applies a Best-Offer's true price on approve", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo, noopSnapshot);

    await usecase.approve("sale-1", { price: 480.5 });

    expect(calls[0]).toEqual({ saleId: "sale-1", edits: { price: 480.5 } });
  });

  it.each([0, -5])(
    "rejects a non-positive price (%p) without touching the repo",
    async (price) => {
      const { repo } = makeFakeRepo();
      const usecase = new ReviewSaleUsecase(repo, noopSnapshot);

      await expect(usecase.approve("sale-1", { price })).rejects.toThrow();
      expect(repo.markReviewed).not.toHaveBeenCalled();
    }
  );

  it.each([0, 11, 5.5])(
    "rejects an out-of-range grade (%p) without touching the repo",
    async (psaGrade) => {
      const { repo } = makeFakeRepo();
      const usecase = new ReviewSaleUsecase(repo, noopSnapshot);

      await expect(usecase.approve("sale-1", { psaGrade })).rejects.toThrow();
      expect(repo.markReviewed).not.toHaveBeenCalled();
    }
  );
});
