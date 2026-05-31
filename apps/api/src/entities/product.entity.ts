export { ProductEntity } from "@gather/types";

export const enum MtgSet {
  alpha = "alpha",
  beta = "beta",
  unlimited = "unlimited",
  arabian_nights = "arabian_nights",
  antiquities = "antiquities",
  legends = "legends",
  the_dark = "the_dark",
}
export const enum PokemonSet {
  scarlet_and_violet = "scarlet_and_violet",
  sword_and_shield = "sword_and_shield",
}

export type Set = keyof typeof MtgSet & keyof typeof PokemonSet;
