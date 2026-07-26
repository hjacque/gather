import { lstatSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStaleProfileLock } from "./browserProfile";

function pathExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function makeProfile(lockTarget?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "gather-profile-"));
  if (lockTarget) {
    symlinkSync(lockTarget, join(dir, "SingletonLock"));
    symlinkSync("/tmp/whatever/SingletonSocket", join(dir, "SingletonSocket"));
    symlinkSync("123456789", join(dir, "SingletonCookie"));
  }
  return dir;
}

describe("clearStaleProfileLock", () => {
  it("removes the singleton files when the owning pid is dead", () => {
    const dir = makeProfile("h-Blade-15-65478");

    const result = clearStaleProfileLock(dir, {
      isPidAlive: () => false,
      currentHost: () => "h-Blade-15",
    });

    expect(result.cleared).toBe(true);
    expect(pathExists(join(dir, "SingletonLock"))).toBe(false);
    expect(pathExists(join(dir, "SingletonSocket"))).toBe(false);
    expect(pathExists(join(dir, "SingletonCookie"))).toBe(false);
  });

  it("keeps the lock when Chrome is still running", () => {
    const dir = makeProfile("h-Blade-15-65478");

    const result = clearStaleProfileLock(dir, {
      isPidAlive: () => true,
      currentHost: () => "h-Blade-15",
    });

    expect(result.cleared).toBe(false);
    expect(result.reason).toContain("65478");
    expect(pathExists(join(dir, "SingletonLock"))).toBe(true);
  });

  it("keeps a lock owned by another host", () => {
    const dir = makeProfile("other-machine-42");

    const result = clearStaleProfileLock(dir, {
      isPidAlive: () => false,
      currentHost: () => "h-Blade-15",
    });

    expect(result.cleared).toBe(false);
    expect(result.reason).toContain("another host");
    expect(pathExists(join(dir, "SingletonLock"))).toBe(true);
  });

  it("is a no-op on a profile with no lock", () => {
    expect(clearStaleProfileLock(makeProfile()).cleared).toBe(false);
  });

  it("leaves a lock that is a regular file rather than a symlink", () => {
    const dir = makeProfile();
    writeFileSync(join(dir, "SingletonLock"), "not a symlink");

    const result = clearStaleProfileLock(dir, { isPidAlive: () => false });

    expect(result.cleared).toBe(false);
    expect(pathExists(join(dir, "SingletonLock"))).toBe(true);
  });

  it("parses a hostname that itself contains digits and dashes", () => {
    const dir = makeProfile("h-Blade-15-2024-777");
    const seen: number[] = [];

    clearStaleProfileLock(dir, {
      isPidAlive: (pid) => {
        seen.push(pid);
        return true;
      },
      currentHost: () => "h-Blade-15-2024",
    });

    expect(seen).toEqual([777]);
  });
});
