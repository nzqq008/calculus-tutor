import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
const root = resolve("..");
mkdirSync(resolve(root, ".local"), { recursive: true });
const python = resolve(
  root,
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
);
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.E2E_EXTERNAL_SERVERS === "1"
      ? undefined
      : [
          {
            command: `"${python}" -m uvicorn calculus_tutor.api.main:app --host 127.0.0.1 --port 8000`,
            cwd: root,
            url: "http://127.0.0.1:8000/api/v1/health",
            reuseExistingServer: !process.env.CI,
            env: {
              MOCK_LLM: "true",
              DATABASE_URL: "sqlite:///./.local/frontend-e2e.db",
              CORS_ORIGINS: "http://127.0.0.1:5173,http://127.0.0.1:4173",
            },
            timeout: 30000,
          },
          {
            command:
              "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
        ],
});
