import "dotenv/config";
import cluster from "cluster";
import os from "os";

const RESTART_DELAY_MS = 1000;

const getWorkerCount = () => {
  const requested =
    Number(process.env.WEB_CONCURRENCY) || os.availableParallelism();

  // Without the Redis adapter each worker only sees its own sockets and rooms.
  if (requested > 1 && !process.env.REDIS_HOST) {
    console.warn(
      "REDIS_HOST is not set, starting a single process instead of a cluster",
    );
    return 1;
  }
  return requested;
};

const runPrimary = (workerCount: number) => {
  let alive = 0;
  let shuttingDown = false;

  const fork = () => {
    if (shuttingDown) {
      return;
    }
    cluster.fork();
    alive++;
  };

  cluster.on("exit", (worker, code, signal) => {
    alive--;
    if (shuttingDown) {
      if (alive === 0) {
        process.exit(0);
      }
      return;
    }
    console.error(
      `Worker ${worker.process.pid} exited (${signal ?? code}), restarting`,
    );
    setTimeout(fork, RESTART_DELAY_MS);
  });

  const shutdown = () => {
    shuttingDown = true;
    if (alive === 0) {
      process.exit(0);
    }
    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.kill("SIGTERM");
    }
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log(`Starting ${workerCount} workers`);
  for (let i = 0; i < workerCount; i++) {
    fork();
  }
};

const workerCount = getWorkerCount();

if (workerCount > 1 && cluster.isPrimary) {
  runPrimary(workerCount);
} else {
  void import("./app");
}
