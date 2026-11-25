import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as SDK from "azure-devops-extension-sdk";
import { App } from "./App";
import { AzureDevOpsApi } from "./api/azureDevOpsApi";
import { DevProxyApi } from "./api/devProxyApi";
import { MockApi } from "./api/mockApi";
import type { DashboardApi } from "./types";
import "./styles.css";

function isRunningInsideAzureDevOps(): boolean {
  return window.parent !== window;
}

async function start() {
  let api: DashboardApi;

  if (isRunningInsideAzureDevOps()) {
    await SDK.init({ loaded: false });
    await SDK.ready();
    api = new AzureDevOpsApi();
  } else if (__ADO_LIVE__) {
    api = new DevProxyApi(__ADO_ORG__, __ADO_PROJECT__);
  } else {
    api = new MockApi();
  }

  const rootElement = document.getElementById("root") as HTMLElement;
  createRoot(rootElement).render(
    <StrictMode>
      <App api={api} />
    </StrictMode>,
  );

  if (isRunningInsideAzureDevOps()) {
    SDK.notifyLoadSucceeded();
  }
}

start();
