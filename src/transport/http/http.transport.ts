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
      mode: { headless: false },
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
      mode: { headless: false },
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

    const result = await getProductsUsecase.execute(req.query);

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
