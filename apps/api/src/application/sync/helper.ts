import { DEFAULT_USD_TO_EUR } from "../../constants";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRate: number | null = null;
let cacheExpiresAt = 0;

export const getEurToUsdRate = async (): Promise<number> => {
    if (cachedRate !== null && Date.now() < cacheExpiresAt) {
        return cachedRate;
    }
    try {
        const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR")
              .then(res => res.json())
              .then(data => data.rates.EUR);
        cachedRate = res;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return res;
    } catch (error) {
        console.error("Failed to fetch EUR to USD exchange rate, using default value.", error);
        return cachedRate ?? DEFAULT_USD_TO_EUR;
    }
}