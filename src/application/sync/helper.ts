import { DEFAULT_USD_TO_EUR } from "../../constants";

export const getEurToUsdRate = async (): Promise<number> => {
    try {
        const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR")
              .then(res => res.json())
              .then(data => data.rates.EUR);
        return res;
    } catch (error) {
        console.error("Failed to fetch EUR to USD exchange rate, using default value.", error);
        return DEFAULT_USD_TO_EUR;
    }
}