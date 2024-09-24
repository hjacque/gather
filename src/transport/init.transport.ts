import { Usecases } from "../application/init.application";
import { http } from "./http/http.transport";

export const initTransport = async (
  usecases: Usecases,
): Promise<{
  close: () => void;
}> => {
  const HTTP = await http(usecases);

  return {
    close: () => {
      HTTP.close();
    },
  };
};
