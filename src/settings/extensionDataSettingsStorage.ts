import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  type IExtensionDataManager,
  type IExtensionDataService,
} from "azure-devops-extension-api";
import type { DashboardSettings, SettingsStorage } from "../types";

const SETTINGS_KEY = "dashboard-settings";

/** "User" scope: each user has their own settings, which follow them between computers. */
const USER_SCOPE = { scopeType: "User" };

/** Stores settings with the Azure DevOps extension data service. */
export class ExtensionDataSettingsStorage implements SettingsStorage {
  private dataManagerRequest?: Promise<IExtensionDataManager>;

  async load(): Promise<unknown> {
    const dataManager = await this.getDataManager();
    return dataManager.getValue(SETTINGS_KEY, USER_SCOPE);
  }

  async save(settings: DashboardSettings): Promise<void> {
    const dataManager = await this.getDataManager();
    await dataManager.setValue(SETTINGS_KEY, settings, USER_SCOPE);
  }

  private getDataManager(): Promise<IExtensionDataManager> {
    this.dataManagerRequest ??= this.createDataManager();
    return this.dataManagerRequest;
  }

  private async createDataManager(): Promise<IExtensionDataManager> {
    const dataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService,
    );
    const accessToken = await SDK.getAccessToken();
    return dataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
  }
}
