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
  // await services.syncSchedulerService.execute();

  const { close: transportClose } = await initTransport(usecases);
  danglingConnections.push({ close: transportClose });

  console.info("Server started");
};

run().catch((e) => {
  console.log(e);
  process.exit(1);
});

const shutdown = async (reason: string, exitCode: number) => {
  // Prevents the server from hanging on exit
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

// uncaughtException / unhandledRejection hand the *error* to the listener, not a
// signal name — log it before shutting down so the crash isn't swallowed, and
// exit non-zero since the process is in an undefined state.
process.on("uncaughtException", (error) => {
  console.error("[fatal] Uncaught exception:", error);
  void shutdown("Uncaught exception", 1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Unhandled rejection:", reason);
  void shutdown("Unhandled rejection", 1);
});
