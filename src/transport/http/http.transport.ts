import express from "express";
import { Usecases } from "../../application/init.application";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import { errorHandler } from "./middlewares/http.errors";
import { SyncUsecaseInputDto } from "application/core/sync.usecase";
import { GetProductOfTheDayUsecaseInputDto } from "application/core/getProductOfTheDay.usecase";
require("express-async-errors");

const app = express();
const port = 3000;
// const port = 3008;

export const http = async ({
  syncUsecase,
  getProductsUsecase,
  getProductUsecase,
  getProductOfTheDayUsecase,
  syncSingleProductUsecase,
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

  app.get("/sync/product/:productid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    const result = await syncSingleProductUsecase.execute(req.params.productid);

    res.status(200);
    res.json(result);
  });

  app.get("/sync", async (req, res) => {
    const { set, type, franchise } = req.query;
    const result = await syncUsecase.execute({
      filter: { set, type, franchise },
      mode: { headless: true },
    } as SyncUsecaseInputDto);

    res.status(200);
    res.json(result);
  });

  app.get("/product-of-the-day", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");

    const { set, type, franchise } = req.query;
    const result = await getProductOfTheDayUsecase.execute({
      set,
      type,
      franchise,
    } as GetProductOfTheDayUsecaseInputDto);

    res.status(200);
    res.json(result);
  });

  app.get("/products", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");

    const dtoSchema = z.object({
      set: z.string().optional(),
      type: z.union([z.array(z.enum(["booster_box", "single", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"])), z.enum(["booster_box", "single", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"])]).optional(),
      franchise: z.enum(["mtg", "pokemon"]),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
    });
    const dto = dtoSchema.parse(req.query);

    const result = await getProductsUsecase.execute(dto);

    res.status(200);
    res.json(result);
  });

  app.get("/products/:productid", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    const result = await getProductUsecase.execute(req.params.productid);

    res.status(200);
    res.json(result);
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
