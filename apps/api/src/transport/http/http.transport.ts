import express from "express";
import { Usecases } from "../../application/init.application";
import { z } from "zod";
import { errorHandler } from "./middlewares/http.errors";
import { SyncUsecaseInputDto } from "application/sync/sync.usecase";
import type { UpdateCardNoteRequest, UpsertCollectionEntryRequest } from "@gather/api-contract";
import { REGIONS } from "@gather/types";
require("express-async-errors");

const app = express();
const port = 4200;

export const http = async ({
  syncUsecase,
  getCardsUsecase,
  getCardUsecase,
  syncSingleCardCardMarketUsecase,
  syncSingleCardPsaUsecase,
  syncPsaPopReportsUsecase,
  syncSalesUsecase,
  syncListingsUsecase,
  syncSingleListingUsecase,
  syncAuctionsUsecase,
  getAuctionsUsecase,
  refreshAuctionBidUsecase,
  moderateAuctionUsecase,
  invalidateSaleUsecase,
  invalidateListingUsecase,
  reviewSaleUsecase,
  getUnreviewedSalesUsecase,
  updateCardNoteUsecase,
  upsertCollectionEntryUsecase,
  deleteCollectionEntryUsecase,
  getOpportunitiesUsecase,
}: Usecases) => {
  app.use(express.json());
  app.use(errorHandler);

  app.get("/sync/set/:set", async (req, res) => {
    const result = await syncUsecase.execute({
      filter: { set: req.params.set as any },
      mode: { headless: true },
    });

    res.status(200);
    res.json(result);
  });

  app.get("/sync/card/:cardid/cardmarket", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncSingleCardCardMarketUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.get("/sync/card/:cardid/psa", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncSingleCardPsaUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.get("/sync", async (req, res) => {
    const { set, tags } = req.query;
    const result = await syncUsecase.execute({
      filter: { set, tags },
      mode: { headless: true },
    } as SyncUsecaseInputDto);

    res.status(200);
    res.json(result);
  });

  app.get("/sync/listings", async (req, res) => {
    const { set, tags } = req.query;
    const result = await syncUsecase.execute({
      filter: { set, tags },
      mode: { headless: true },
      skipSales: true,
    } as SyncUsecaseInputDto);

    res.status(200);
    res.json(result);
  });

  app.get("/sync/psa", async (req, res) => {
    await syncPsaPopReportsUsecase.execute();

    res.status(200);
    res.json({ success: true });
  });

  app.get("/sync/listings/card/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncListingsUsecase.executeForCard(req.params.cardid);
    res.status(200).json(result);
  });

  app.get("/sync/listings/:listingid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncSingleListingUsecase.execute(req.params.listingid);
    res.status(200).json(result);
  });

  app.get("/sync/auctions", async (req, res) => {
    const { set, tags } = req.query;
    const result = await syncAuctionsUsecase.executeBatch({
      set: set as string | undefined,
      tags: tags as string | string[] | undefined,
    });
    res.status(200).json(result);
  });

  app.get("/sync/auctions/card/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncAuctionsUsecase.executeForCard(req.params.cardid);
    res.status(200).json(result);
  });

  app.get("/auctions", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const querySchema = z.object({
      grade: z.coerce.number().int().min(1).max(10).optional(),
      sort: z.enum(["ending", "bid", "bids"]).optional(),
    });
    const params = querySchema.parse(req.query);
    const result = await getAuctionsUsecase.execute(params);
    res.status(200).json(result);
  });

  app.get("/auctions/:auctionid/refresh-bid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await refreshAuctionBidUsecase.execute(req.params.auctionid);
    res.status(200).json(result);
  });

  app.patch("/auctions/:auctionid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const bodySchema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("invalidate") }),
      z.object({ action: z.literal("invalidateByItem") }),
      z.object({
        action: z.literal("editGrade"),
        psaGrade: z.number().int().min(1).max(10),
      }),
    ]);
    const body = bodySchema.parse(req.body);
    if (body.action === "invalidate") {
      await moderateAuctionUsecase.invalidate(req.params.auctionid);
    } else if (body.action === "invalidateByItem") {
      await moderateAuctionUsecase.invalidateByItem(req.params.auctionid);
    } else {
      await moderateAuctionUsecase.editGrade(req.params.auctionid, body.psaGrade);
    }
    res.status(204).end();
  });

  app.get("/sync/sales/card/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await syncSalesUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.get("/sync/sales", async (req, res) => {
    const { set, tags } = req.query;
    const result = await syncSalesUsecase.executeBatch({
      set: set as string | undefined,
      tags: tags as string | string[] | undefined,
    });

    res.status(200);
    res.json(result);
  });

  app.get("/sales/unreviewed/count", async (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await getUnreviewedSalesUsecase.count();

    res.status(200);
    res.json(result);
  });

  app.get("/sales/unreviewed", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(20),
    });
    const { page, pageSize } = querySchema.parse(req.query);
    const result = await getUnreviewedSalesUsecase.execute(page, pageSize);

    res.status(200);
    res.json(result);
  });

  app.patch("/sales/:saleid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const bodySchema = z.discriminatedUnion("action", [
      z.object({
        action: z.literal("approve"),
        psaGrade: z.number().int().min(1).max(10).optional(),
        price: z.number().positive().optional(),
      }),
      z.object({ action: z.literal("invalidate") }),
    ]);
    const body = bodySchema.parse(req.body);
    if (body.action === "invalidate") {
      await invalidateSaleUsecase.execute(req.params.saleid);
    } else {
      await reviewSaleUsecase.approve(req.params.saleid, {
        psaGrade: body.psaGrade,
        price: body.price,
      });
    }
    res.status(204).end();
  });

  app.patch("/listings/:listingid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const bodySchema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("invalidate") }),
      z.object({ action: z.literal("invalidateByItem") }),
    ]);
    const body = bodySchema.parse(req.body);
    if (body.action === "invalidate") {
      await invalidateListingUsecase.execute(req.params.listingid);
    } else {
      await invalidateListingUsecase.executeByItem(req.params.listingid);
    }
    res.status(204).end();
  });

  app.get("/opportunities", async (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await getOpportunitiesUsecase.execute();
    res.status(200).json(result);
  });

  app.get("/cards", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");

    const dtoSchema = z.object({
      set: z.string().optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      region: z
        .union([z.array(z.enum(REGIONS)), z.enum(REGIONS)])
        .optional(),
    });
    const dto = dtoSchema.parse(req.query);

    const result = await getCardsUsecase.execute(dto);

    res.status(200);
    res.json(result);
  });

  app.get("/cards/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const result = await getCardUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.patch("/cards/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const bodySchema = z.object({
      note: z.string().max(1000).nullable(),
    });
    const { note } = bodySchema.parse(req.body) as UpdateCardNoteRequest;
    await updateCardNoteUsecase.execute(req.params.cardid, note);
    res.status(204).end();
  });

  app.put("/collection/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    const bodySchema = z.object({
      isOwned: z.boolean(),
      isWanted: z.boolean(),
    });
    const body = bodySchema.parse(req.body) as UpsertCollectionEntryRequest;
    await upsertCollectionEntryUsecase.execute(req.params.cardid, {
      isOwned: body.isOwned,
      isWanted: body.isWanted,
    });
    res.status(204).end();
  });

  app.delete("/collection/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:42001");
    await deleteCollectionEntryUsecase.execute(req.params.cardid);
    res.status(204).end();
  });

  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });

  return {
    close: () => {
      server.close();
    },
  };
};
