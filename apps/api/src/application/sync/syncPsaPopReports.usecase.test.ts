import { SyncPsaPopReportsUsecase } from "./syncPsaPopReports.usecase";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import type { PsaGrades } from "./sources/psa.source";
import { CardEntity } from "../../entities/card.entity";
import { CardSetEntity } from "../../entities/cardSet.entity";

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

type CardWithSet = CardEntity & { cardSet: CardSetEntity };

function makeCard(id: string, psaLink: string | null): CardWithSet {
  return {
    id,
    name: `Card ${id}`,
    psaLink,
    cardSetId: "set-1",
    imageUrl: null,
    cardMarketLink: null,
    ebayLink: null,
    number: null,
    note: null,
    releaseDate: null,
    tags: [],
    foilPattern: null,
    regions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    cardSet: {
      id: "set-1",
      name: "Promo Set",
      code: "PROMO",
      releaseDate: new Date(),
      block: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe("SyncPsaPopReportsUsecase", () => {
  let cardRepo: jest.Mocked<CardRepositoryPort>;
  let psaPopReportRepo: jest.Mocked<PsaPopReportRepositoryPort>;
  let usecase: SyncPsaPopReportsUsecase;

  beforeEach(() => {
    jest.clearAllMocks();

    cardRepo = {
      getCards: jest.fn(),
      getCard: jest.fn(),
    } as unknown as jest.Mocked<CardRepositoryPort>;

    psaPopReportRepo = {
      upsert: jest.fn().mockResolvedValue(undefined),
      findByCardId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<PsaPopReportRepositoryPort>;

    usecase = new SyncPsaPopReportsUsecase(cardRepo, psaPopReportRepo);
  });

  it("calls upsert once for each card with a psaLink", async () => {
    const card1 = makeCard("card-1", "https://www.psacard.com/pop/1");
    const card2 = makeCard("card-2", "https://www.psacard.com/pop/2");

    cardRepo.getCards.mockResolvedValue([card1, card2]);

    await usecase.execute();

    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(2);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({ grade10: 10 }),
      expect.any(Date)
    );
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "card-2",
      expect.objectContaining({ grade10: 10 }),
      expect.any(Date)
    );
  });

  it("skips cards without a psaLink", async () => {
    const cardNoLink = makeCard("card-1", null);
    const cardWithLink = makeCard("card-2", "https://www.psacard.com/pop/2");

    cardRepo.getCards.mockResolvedValue([cardNoLink, cardWithLink]);

    await usecase.execute();

    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(1);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "card-2",
      expect.any(Object),
      expect.any(Date)
    );
  });

  it("continues processing remaining cards if one scrape fails", async () => {
    const { scrapePsaPopReport } = require("./sources/psa.source");
    const card1 = makeCard("card-1", "https://psa.com/1");
    const card2 = makeCard("card-2", "https://psa.com/2");

    cardRepo.getCards.mockResolvedValue([card1, card2]);

    // Make card-1 scrape fail but card-2 succeed
    (scrapePsaPopReport as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        grade1: null, grade2: null, grade3: null, grade4: null, grade5: null,
        grade6: null, grade7: null, grade8: null, grade9: null, grade10: 5,
      } as PsaGrades);

    await usecase.execute();

    // Only card-2 should have been upserted (card-1 scrape threw, upsert not reached)
    expect(psaPopReportRepo.upsert).toHaveBeenCalledTimes(1);
    expect(psaPopReportRepo.upsert).toHaveBeenCalledWith(
      "card-2",
      expect.any(Object),
      expect.any(Date)
    );
  });
});
