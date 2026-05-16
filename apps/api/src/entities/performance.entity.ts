import { PerformancePeriod, PerformanceType } from "@gather/types";

export type PerformanceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  periodType: PerformancePeriod;
  type: PerformanceType;
};

export type NewPerformanceEntity = {
  id: string;
  productId: string;
  date: Date;
  value: number | null;
  periodType: PerformancePeriod;
  type: PerformanceType;
  createdAt: Date;
  updatedAt: Date;
};
