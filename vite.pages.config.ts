import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const project = path.dirname(fileURLToPath(import.meta.url));
const [owner, repository] = (process.env.GITHUB_REPOSITORY || "").split("/");
const isUserSite = repository?.toLowerCase() === `${owner}.github.io`.toLowerCase();
const inferredBase = repository && !isUserSite ? `/${repository}/` : "/";
const configuredBase = process.env.PAGES_BASE_PATH || inferredBase;
if (!configuredBase.startsWith("/") || !configuredBase.endsWith("/") || configuredBase.includes("..")) {
  throw new Error("PAGES_BASE_PATH must be a slash-delimited path such as /siden-sidst/ or /.");
}

// This build is intentionally independent of the Worker and Site identity.
export default defineConfig({
  root: path.join(project, "web"),
  publicDir: path.join(project, "public"),
  base: configuredBase,
  plugins: [react()],
  build: {
    outDir: path.join(project, "dist-pages"),
    emptyOutDir: true,
  },
});
