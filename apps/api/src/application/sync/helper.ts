import { DEFAULT_USD_TO_EUR } from "../../constants";

const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedRate: number | null = null;
let cacheExpiresAt = 0;

export const getUsdToEurRate = async (): Promise<number> => {
    if (cachedRate !== null && Date.now() < cacheExpiresAt) {
        return cachedRate;
    }
    try {
        const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR");
        if (!res.ok) {
            throw new Error(`Exchange rate API returned ${res.status}`);
        }
        const data = await res.json();
        const rate = data?.rates?.EUR;
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
            throw new Error(`Unusable USD to EUR rate: ${JSON.stringify(rate)}`);
        }
        cachedRate = rate;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return rate;
    } catch (error) {
        console.error("Failed to fetch USD to EUR exchange rate, using fallback.", error);
        return cachedRate ?? DEFAULT_USD_TO_EUR;
    }
}
