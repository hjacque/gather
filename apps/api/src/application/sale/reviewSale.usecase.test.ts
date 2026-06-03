import { ReviewSaleUsecase } from "./reviewSale.usecase";
import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";

// Minimal fake recording the markReviewed calls the use case makes.
function makeFakeRepo() {
  const calls: { saleId: string; edits: { psaGrade?: number; price?: number } }[] =
    [];
  const repo = {
    markReviewed: jest.fn(async (saleId: string, edits) => {
      calls.push({ saleId, edits });
    }),
  } as unknown as SaleRepositoryPort;
  return { repo, calls };
}

describe("ReviewSaleUsecase", () => {
  it("approve with no edits stamps the Sale reviewed and changes no field", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo);

    await usecase.approve("sale-1");

    expect(repo.markReviewed).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ saleId: "sale-1", edits: {} });
  });

  it("applies a corrected grade on approve", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo);

    await usecase.approve("sale-1", { psaGrade: 9 });

    expect(calls[0]).toEqual({ saleId: "sale-1", edits: { psaGrade: 9 } });
  });

  it("applies a Best-Offer's true price on approve", async () => {
    const { repo, calls } = makeFakeRepo();
    const usecase = new ReviewSaleUsecase(repo);

    await usecase.approve("sale-1", { price: 480.5 });

    expect(calls[0]).toEqual({ saleId: "sale-1", edits: { price: 480.5 } });
  });

  it.each([0, -5])(
    "rejects a non-positive price (%p) without touching the repo",
    async (price) => {
      const { repo } = makeFakeRepo();
      const usecase = new ReviewSaleUsecase(repo);

      await expect(usecase.approve("sale-1", { price })).rejects.toThrow();
      expect(repo.markReviewed).not.toHaveBeenCalled();
    }
  );

  it.each([0, 11, 5.5])(
    "rejects an out-of-range grade (%p) without touching the repo",
    async (psaGrade) => {
      const { repo } = makeFakeRepo();
      const usecase = new ReviewSaleUsecase(repo);

      await expect(usecase.approve("sale-1", { psaGrade })).rejects.toThrow();
      expect(repo.markReviewed).not.toHaveBeenCalled();
    }
  );
});
