import express from "express";
import { Usecases } from "../../application/init.application";
import { z } from "zod";
import { errorHandler } from "./middlewares/http.errors";
import { SyncUsecaseInputDto } from "application/sync/sync.usecase";
import type { UpdateCardNoteRequest, UpsertCollectionEntryRequest } from "@gather/api-contract";
import { REGIONS } from "@gather/types";
require("express-async-errors");

const app = express();
const port = 3000;

export const http = async ({
  syncUsecase,
  getCardsUsecase,
  getCardUsecase,
  syncSingleCardCardMarketUsecase,
  syncSingleCardPsaUsecase,
  syncPsaPopReportsUsecase,
  syncSalesUsecase,
  updateCardNoteUsecase,
  upsertCollectionEntryUsecase,
  deleteCollectionEntryUsecase,
}: Usecases) => {
  // middlewares
  app.use(express.json());

  // error handling
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
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    const result = await syncSingleCardCardMarketUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.get("/sync/card/:cardid/psa", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
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

  app.get("/sync/psa", async (req, res) => {
    await syncPsaPopReportsUsecase.execute();

    res.status(200);
    res.json({ success: true });
  });

  app.get("/sync/sales/card/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
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

  app.get("/cards", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");

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
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    const result = await getCardUsecase.execute(req.params.cardid);

    res.status(200);
    res.json(result);
  });

  app.patch("/cards/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    const bodySchema = z.object({
      note: z.string().max(1000).nullable(),
    });
    const { note } = bodySchema.parse(req.body) as UpdateCardNoteRequest;
    await updateCardNoteUsecase.execute(req.params.cardid, note);
    res.status(204).end();
  });

  app.put("/collection/:cardid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
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
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
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
