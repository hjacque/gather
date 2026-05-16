import { Block, Franchise } from "@gather/types";

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
