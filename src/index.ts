import { initRepository } from "./repository/init.repository";
import { initApplication } from "./application/init.application";
import { initTransport } from "./transport/init.transport";
import { initServices } from "./services/init.services";

type DanglingConnections = {
  close: () => Promise<void> | void;
};
let danglingConnections: DanglingConnections[] = [];

const run = async () => {
  // repositories
  const { close: repositoryClose, repositories } = await initRepository();
  danglingConnections.push({ close: repositoryClose });

  // application
  const usecases = initApplication(repositories);

  // services
  // const services = initServices({syncUsecase: usecases.syncUsecase});
  // await services.syncSchedulerService.execute();

  // transport
  const { close: transportClose } = await initTransport(usecases);
  danglingConnections.push({ close: transportClose });

  console.info("Server started");
};

run().catch((e) => {
  console.log(e);
  process.exit(1);
});

[
  "SIGINT",
  "SIGTERM",
  "SIGQUIT",
  "SIGHUP",
  "uncaughtException",
  "unhandledRejection",
].forEach((signal) => {
  process.on(signal, async () => {
    // Prevents the server from hanging on exit
    setTimeout(() => {
      console.info(
        "[graceful shutown] Forced exit after server hanged on close",
      );
      process.exit(1);
    }, 5000);

    console.info(`[graceful shutdown] Received ${signal}, exiting...`);

    for (const connection of danglingConnections) {
      try {
        await connection.close();
      } catch (e) {
        console.log(`[graceful shutdown] Cannot close service`, e);
      }
    }

    process.exit(0);
  });
});
