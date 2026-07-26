import { hostname } from "node:os";
import { lstatSync, readlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const SINGLETON_FILES = ["SingletonLock", "SingletonSocket", "SingletonCookie"];

export type ProfileLockDeps = {
  isPidAlive?: (pid: number) => boolean;
  currentHost?: () => string;
};

function defaultIsPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readLockTarget(userDataDir: string): string | null {
  const lockPath = join(userDataDir, "SingletonLock");
  try {
    if (!lstatSync(lockPath).isSymbolicLink()) return null;
    return readlinkSync(lockPath);
  } catch {
    return null;
  }
}

export function clearStaleProfileLock(
  userDataDir: string,
  deps: ProfileLockDeps = {}
): { cleared: boolean; reason: string } {
  const isPidAlive = deps.isPidAlive ?? defaultIsPidAlive;
  const currentHost = deps.currentHost ?? hostname;

  const target = readLockTarget(userDataDir);
  if (!target) return { cleared: false, reason: "no lock" };

  const match = target.match(/^(.*)-(\d+)$/);
  if (!match) return { cleared: false, reason: `unparsable lock (${target})` };

  const [, host, pidText] = match;
  if (host !== currentHost())
    return { cleared: false, reason: `lock owned by another host (${host})` };

  const pid = Number(pidText);
  if (isPidAlive(pid))
    return { cleared: false, reason: `Chrome still running (pid ${pid})` };

  for (const file of SINGLETON_FILES) {
    try {
      unlinkSync(join(userDataDir, file));
    } catch {
      continue;
    }
  }
  return { cleared: true, reason: `stale lock from dead pid ${pid}` };
}
