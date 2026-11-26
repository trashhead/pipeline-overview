import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as SDK from "azure-devops-extension-sdk";
import { App } from "./App";
import { AzureDevOpsApi } from "./api/azureDevOpsApi";
import { DevProxyApi } from "./api/devProxyApi";
import { MockApi } from "./api/mockApi";
import { ExtensionDataSettingsStorage } from "./settings/extensionDataSettingsStorage";
import { LocalSettingsStorage } from "./settings/localSettingsStorage";
import { useDashboardStore } from "./store/dashboardStore";
import type { DashboardApi, SettingsStorage } from "./types";
import "./styles.css";

function isRunningInsideAzureDevOps(): boolean {
  return window.parent !== window;
}

async function start() {
  let api: DashboardApi;
  let settingsStorage: SettingsStorage = new LocalSettingsStorage();

  if (isRunningInsideAzureDevOps()) {
    await SDK.init({ loaded: false });
    await SDK.ready();
    api = new AzureDevOpsApi();
    settingsStorage = new ExtensionDataSettingsStorage();
  } else if (__ADO_LIVE__) {
    api = new DevProxyApi(__ADO_ORG__, __ADO_PROJECT__);
  } else {
    api = new MockApi();
  }

  // Restored before the first render, so the default choices do not flash by.
  await useDashboardStore.getState().restoreSettings(settingsStorage);

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
