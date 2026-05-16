import { PerformancePeriod } from "types/performancePeriod";
import { PerformanceType } from "types/performanceType";
import { z } from "zod";

export enum PerformancePeriodType {
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
  yearly = "yearly"
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
    z.literal("yearly")
  ]),
  type: z.union([
    z.literal("buylist"),
    z.literal("market"),
  ]),
});

export type PerformanceEntity = z.infer<typeof PerformanceEntitySchema>;


// model Performance {
//   id          String           @id @default(uuid())
//   product     Product          @relation("ProductPerformances", fields: [productId], references: [id])
//   productId   String
//   date        DateTime
//   value       Float?
//   periodType  PerformancePeriodType
//   type        PerformanceType

//   createdAt   DateTime  @default(now())
//   updatedAt   DateTime  @updatedAt

//   @@unique([productId, date, type])
// }

export type NewPerformanceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  periodType: PerformancePeriod;
  type: PerformanceType;
  createdAt: Date;
  updatedAt: Date;
}