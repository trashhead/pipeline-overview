import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
// For a dev server this is the time the server started, for a build the time of the build.
const buildTime = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig(({ mode, command }) => {
  // Empty prefix: also load ADO_* variables, which are not exposed to the browser by default.
  const env = loadEnv(mode, process.cwd(), "");
  const personalAccessToken = env.ADO_PAT;
  const isDevServer = command === "serve";
  const hasLiveSettings = Boolean(personalAccessToken && env.ADO_ORG && env.ADO_PROJECT);
  // Never bake live settings into a build: the package must not contain org or project names.
  const useLiveData = isDevServer && hasLiveSettings;

  const basicAuthValue = Buffer.from(`:${personalAccessToken}`).toString("base64");

  return {
    plugins: [react()],
    // Azure DevOps serves the extension from a sub-path, so assets must be relative.
    base: "./",
    build: {
      outDir: "dist",
    },
    // Only the organization and project names reach the browser. The token stays here.
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __ADO_LIVE__: JSON.stringify(useLiveData),
      __ADO_ORG__: JSON.stringify(useLiveData ? env.ADO_ORG : ""),
      __ADO_PROJECT__: JSON.stringify(useLiveData ? env.ADO_PROJECT : ""),
    },
    server: {
      proxy: useLiveData
        ? {
            "/ado": {
              target: "https://dev.azure.com",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/ado/, ""),
              headers: { Authorization: `Basic ${basicAuthValue}` },
            },
          }
        : undefined,
    },
  };
});
