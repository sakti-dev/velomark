import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const consumerRoot = path.join(repoRoot, "test-consumer");
const vendorRoot = path.join(consumerRoot, "vendor");

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    env: {
      ...process.env,
      CI: "true",
      npm_config_ignore_workspace: "true",
    },
    stdio: "inherit",
  });
}

rmSync(vendorRoot, { force: true, recursive: true });
mkdirSync(vendorRoot, { recursive: true });

run("pnpm", ["run", "build"], repoRoot);
run("pnpm", ["pack", "--pack-destination", vendorRoot], repoRoot);
run("pnpm", ["install", "--ignore-workspace", "--no-frozen-lockfile"], consumerRoot);
run("pnpm", ["run", "build"], consumerRoot);
run("node", ["smoke.mjs"], consumerRoot);

const builtHtmlPath = path.join(consumerRoot, "dist", "index.html");
if (!existsSync(builtHtmlPath)) {
  throw new Error(`Expected consumer build output at ${builtHtmlPath}`);
}
