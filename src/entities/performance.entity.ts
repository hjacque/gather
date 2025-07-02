import { z } from "zod";

export enum PerformancePeriodType {
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
}

export enum PerformanceType {
  market = "market",
  buylist = "buylist",
  ratio = "ratio",
}

export const PerformanceEntitySchema = z.object({
  id: z.string(),
  productId: z.string(),
  date: z.date(),
  value: z.number().nullable(),
  periodType: z.union([
    z.literal("daily"),
    z.literal("weekly"),
    z.literal("monthly"),
  ]),
  type: z.union([
    z.literal("buylist"),
    z.literal("market"),
    z.literal("ratio"),
  ]),
});

export type PerformanceEntity = z.infer<typeof PerformanceEntitySchema>;
