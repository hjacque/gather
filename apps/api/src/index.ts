import 'dotenv/config';
import { initRepository } from "./repository/init.repository";
import { initApplication } from "./application/init.application";
import { initTransport } from "./transport/init.transport";
import { initServices } from "./services/init.services";

type DanglingConnections = {
  close: () => Promise<void> | void;
};
let danglingConnections: DanglingConnections[] = [];

const run = async () => {
  const { close: repositoryClose, repositories } = await initRepository();
  danglingConnections.push({ close: repositoryClose });

  const usecases = initApplication(repositories);

  const services = initServices({
    syncUsecase: usecases.syncUsecase,
    syncPsaPopReportsUsecase: usecases.syncPsaPopReportsUsecase,
    syncAuctionsUsecase: usecases.syncAuctionsUsecase,
  });

  const { close: transportClose } = await initTransport(usecases);
  danglingConnections.push({ close: transportClose });

  console.info("Server started");
};

run().catch((e) => {
  console.log(e);
  process.exit(1);
});

const shutdown = async (reason: string, exitCode: number) => {
  setTimeout(() => {
    console.info("[graceful shutown] Forced exit after server hanged on close");
    process.exit(1);
  }, 5000);

  console.info(`[graceful shutdown] ${reason}, exiting...`);

  for (const connection of danglingConnections) {
    try {
      await connection.close();
    } catch (e) {
      console.log(`[graceful shutdown] Cannot close service`, e);
    }
  }

  process.exit(exitCode);
};

["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP"].forEach((signal) => {
  process.on(signal, () => shutdown(`Received ${signal}`, 0));
});

process.on("uncaughtException", (error) => {
  console.error("[fatal] Uncaught exception:", error);
  void shutdown("Uncaught exception", 1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Unhandled rejection:", reason);
  void shutdown("Unhandled rejection", 1);
});
