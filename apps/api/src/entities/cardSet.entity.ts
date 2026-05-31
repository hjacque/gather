import { Block } from "@gather/types";

export type CardSetEntity = {
    id: string;
    name: string;
    code: string;
    releaseDate: Date;
    block: Block | null;
    createdAt: Date;
    updatedAt: Date;
}
