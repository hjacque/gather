import express from "express";
import { Usecases } from "../../application/init.application";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import { errorHandler } from "./middlewares/http.errors";
require("express-async-errors");

const app = express();
const port = 3000;

export const http = async ({
  syncUsecase,
  getBestRatioCardsTodayUsecase,
}: Usecases) => {
  // middlewares
  app.use(express.json());

  // error handling
  app.use(errorHandler);

  app.get("/sync", async (req, res) => {
    const result = await syncUsecase.execute();

    res.status(200);
    res.json(result);
  });

  app.get("/ratio-today", async (req, res) => {
    const result = await getBestRatioCardsTodayUsecase.execute();

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
