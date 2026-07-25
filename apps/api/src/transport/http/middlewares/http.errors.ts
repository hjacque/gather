import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { CustomError } from "../../../errors/customError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ZodError) {
    return res.status(400).send({
      errors: err.issues.map((issue) => ({
        message: issue.message,
        context: { path: issue.path },
      })),
    });
  }

  if (err instanceof CustomError) {
    const { statusCode, errors, logging } = err;
    if (logging) {
      console.error(
        JSON.stringify(
          {
            code: err.statusCode,
            errors: err.errors,
            stack: err.stack,
          },
          null,
          2,
        ),
      );
    }

    return res.status(statusCode).send({ errors });
  }

  console.error(err);
  return res
    .status(500)
    .send({ errors: [{ message: "Something went wrong" }] });
};
