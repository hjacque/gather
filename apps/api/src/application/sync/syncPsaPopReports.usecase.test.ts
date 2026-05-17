import { SyncPsaPopReportsUsecase } from "./syncPsaPopReports.usecase";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import type { PsaGrades } from "./sources/psa.source";
import { ProductEntity } from "../../entities/product.entity";
import type { Rarity } from "@gather/types";
import { ProductSetEntity } from "../../entities/productSet.entity";

// Mock puppeteer-real-browser so tests don't need a browser
jest.mock("puppeteer-real-browser", () => ({
  connect: jest.fn().mockResolvedValue({
    browser: { close: jest.fn().mockResolvedValue(undefined) },
    page: {
      close: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue("<html></html>"),
    },
  }),
}));

// Mock the PSA scraper so we control what grades are returned
jest.mock("./sources/psa.source", () => ({
  scrapePsaPopReport: jest.fn().mockResolvedValue({
    grade1: 1,
    grade2: 2,
    grade3: 3,
    grade4: 4,
    grade5: 5,
    grade6: 6,
    grade7: 7,
    grade8: 8,
    grade9: 9,
    grade10: 10,
  } as PsaGrades),
}));

jest.mock("puppeteer-extra-plugin-stealth", () => jest.fn(() => ({})));

type ProductWithSet = ProductEntity & { productSet: ProductSetEntity };

function makeProduct(id: string, psaLink: string | null, rarity: Rarity = "promo"): ProductWithSet {
  return {
    id,
    name: `Product ${id}`,
    type: "single",
    rarity,
    psaLink,
    productSetId: "set-1",
    boosterCount: null,
    msrp: null,
    imageUrl: null,
    cardMarketLink: null,
    cardkingdomBuyListLink: null,
    abugamesBuyListLink: null,
    fullSetLink: null,
    tcgpLink: null,
    bricklinkLink: null,
    tags: [],
    keyword: null,
    blocked: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    productSet: {
      id: "set-1",
      name: "Promo Set",
      code: "PROMO",
      franchise: "pokemon",
      releaseDate: new Date(),
      block: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe("SyncPsaPopReportsUsecase", () => {
  let productRepo: jest.Mocked<ProductRepositoryPort>;
  let psaPopReportRepo: jest.Mocked<PsaPopReportRepositoryPort>;
  let usecase: SyncPsaPopReportsUsecase;

  beforeEach(() => {
    jest.clearAllMocks();

    productRepo = {
      getProducts: jest.fn(),
      getProduct: jest.fn(),
    } as unknown as jest.Mocked<ProductRepositoryPort>;

    psaPopReportRepo = {
      upsert: jest.fn().mockResolvedValue(undefined),
      findByProductId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<PsaPopReportRepositoryPort>;

    usecase = new SyncPsaPopReportsUsecase(productRepo, psaPopReportRepo);
  });

  it("calls upsert once for each product with a psaLink", async () => {
    const product1 = makeProduct("product-1", "https://www.psacard.com/pop/1");
    const product2 = makeProduct("product-2", "https://www.psacard.com/pop/2");

    productRepo.getProducts.mockResolvedValue([product1, product2]);

    await usecase.execute();

    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(2);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ grade10: 10 }),
      expect.any(Date)
    );
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "product-2",
      expect.objectContaining({ grade10: 10 }),
      expect.any(Date)
    );
  });

  it("skips products without a psaLink", async () => {
    const productNoLink = makeProduct("product-1", null);
    const productWithLink = makeProduct("product-2", "https://www.psacard.com/pop/2");

    productRepo.getProducts.mockResolvedValue([productNoLink, productWithLink]);

    await usecase.execute();

    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(1);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "product-2",
      expect.any(Object),
      expect.any(Date)
    );
  });

  it("skips products with rarity other than promo", async () => {
    const rareSingle = makeProduct("product-rare", "https://psa.com/1", "holo_rare");
    const promoSingle = makeProduct("product-promo", "https://psa.com/2", "promo");

    productRepo.getProducts.mockResolvedValue([rareSingle, promoSingle]);

    await usecase.execute();

    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(1);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "product-promo",
      expect.any(Object),
      expect.any(Date)
    );
  });

  it("continues processing remaining products if one scrape fails", async () => {
    const { scrapePsaPopReport } = require("./sources/psa.source");
    const product1 = makeProduct("product-1", "https://psa.com/1");
    const product2 = makeProduct("product-2", "https://psa.com/2");

    productRepo.getProducts.mockResolvedValue([product1, product2]);

    // Make product-1 scrape fail but product-2 succeed
    (scrapePsaPopReport as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        grade1: null, grade2: null, grade3: null, grade4: null, grade5: null,
        grade6: null, grade7: null, grade8: null, grade9: null, grade10: 5,
      } as PsaGrades);

    await usecase.execute();

    // Only product-2 should have been upserted (product-1 scrape threw, upsert not reached)
    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(1);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "product-2",
      expect.any(Object),
      expect.any(Date)
    );
  });
});
