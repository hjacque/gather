import { ObjectId } from "mongodb";
import {
  PerformancePeriodType,
  PerformanceType,
} from "../../../entities/performance.entity";

export type PerformanceModel = {
  _id: ObjectId;
  productId: ObjectId;
  date: Date;
  value: number | null;
  periodType: PerformancePeriodType;
  type: PerformanceType;
};
