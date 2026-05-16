import { Block } from "../types/block";
import { Franchise } from "../types/franchise";

export type ProductSetEntity = {
    id: string;
    name: string;
    code: string;
    franchise: Franchise;
    releaseDate: Date;
    block: Block | null;
    createdAt: Date;
    updatedAt: Date;
}