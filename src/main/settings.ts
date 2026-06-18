import Store from "electron-store";
import {
    AnimationMotionPref,
    SchemaTypes,
    SourceGroup,
    ThemeSettings,
    SearchEngines,
    SyncService,
    ServiceConfigs,
    SourceOpenTarget,
    ViewConfig,
    ThumbnailTypePref,
    defaultViewConfig,
} from "../schema-types";
import { ipcMain, session, nativeTheme, app } from "electron";
import { WindowManager } from "./window";

let STORE = undefined;

/**
 * Return the electron-store singleton.
 */
export function getStore(): Store<SchemaTypes> {
    if (STORE === undefined) {
        STORE = new Store<SchemaTypes>();
    }
    return STORE;
}

const GROUPS_STORE_KEY = "sourceGroups";
ipcMain.handle("set-groups", (_, groups: SourceGroup[]) => {
    getStore().set(GROUPS_STORE_KEY, groups);
});
ipcMain.on("get-groups", (event) => {
    event.returnValue = getStore().get(GROUPS_STORE_KEY, []);
});

const MENU_STORE_KEY = "menuOn";
ipcMain.on("get-menu", (event) => {
    event.returnValue = getStore().get(MENU_STORE_KEY, false);
});
ipcMain.handle("set-menu", (_, state: boolean) => {
    getStore().set(MENU_STORE_KEY, state);
});

const PAC_STORE_KEY = "pac";
const PAC_STATUS_KEY = "pacOn";
function getProxyStatus() {
    return getStore().get(PAC_STATUS_KEY, false);
}
function toggleProxyStatus() {
    getStore().set(PAC_STATUS_KEY, !getProxyStatus());
    setProxy();
}
function getProxy() {
    return getStore().get(PAC_STORE_KEY, "");
}
function setProxy(address = null) {
    if (!address) {
        address = getProxy();
    } else {
        getStore().set(PAC_STORE_KEY, address);
    }
    if (getProxyStatus()) {
        let rules = { pacScript: address };
        session.defaultSession.setProxy(rules);
        session.fromPartition("sandbox").setProxy(rules);
    }
}
ipcMain.on("get-proxy-status", (event) => {
    event.returnValue = getProxyStatus();
});
ipcMain.on("toggle-proxy-status", () => {
    toggleProxyStatus();
});
ipcMain.on("get-proxy", (event) => {
    event.returnValue = getProxy();
});
ipcMain.handle("set-proxy", (_, address = null) => {
    setProxy(address);
});

const THEME_STORE_KEY = "theme";
ipcMain.on("get-theme", (event) => {
    event.returnValue = getStore().get(THEME_STORE_KEY, ThemeSettings.Default);
});
ipcMain.handle("set-theme", (_, theme: ThemeSettings) => {
    getStore().set(THEME_STORE_KEY, theme);
    nativeTheme.themeSource = theme;
});
ipcMain.on("get-theme-dark-color", (event) => {
    event.returnValue = nativeTheme.shouldUseDarkColors;
});
export function setThemeListener(manager: WindowManager) {
    nativeTheme.removeAllListeners();
    nativeTheme.on("updated", () => {
        if (manager.hasWindow()) {
            let contents = manager.mainWindow.webContents;
            if (!contents.isDestroyed()) {
                contents.send("theme-updated", nativeTheme.shouldUseDarkColors);
            }
        }
    });
}

const ANIMATION_MOTION_PREF_KEY = "animationMotionPref";
ipcMain.on("get-animation-motion-pref", (event) => {
    event.returnValue = getStore().get(
        ANIMATION_MOTION_PREF_KEY,
        AnimationMotionPref.System,
    );
});
ipcMain.handle("set-animation-motion-pref", (_, pref: AnimationMotionPref) => {
    getStore().set(ANIMATION_MOTION_PREF_KEY, pref);
});

const USE_NATIVE_WINDOW_FRAME_KEY = "useNativeWindowFramePref";
export function getNativeWindowFramePref(): boolean {
    return getStore().get(USE_NATIVE_WINDOW_FRAME_KEY, false);
}
ipcMain.on("get-window-native-frame-pref", (event) => {
    event.returnValue = getNativeWindowFramePref();
});
ipcMain.handle("set-window-native-frame-pref", (_, pref: boolean) => {
    getStore().set(USE_NATIVE_WINDOW_FRAME_KEY, pref);
});

const THUMBNAIL_TYPE_PREF = "thumbnailTypePref";
ipcMain.on("get-thumbnail-type-pref", (event) => {
    event.returnValue = getStore().get(
        THUMBNAIL_TYPE_PREF,
        ThumbnailTypePref.OpenGraph,
    );
});
ipcMain.handle("set-thumbnail-type-pref", (_, pref: ThumbnailTypePref) => {
    getStore().set(THUMBNAIL_TYPE_PREF, pref);
});

const LOCALE_STORE_KEY = "locale";
ipcMain.handle("set-locale", (_, option: string) => {
    getStore().set(LOCALE_STORE_KEY, option);
});
function getLocaleSettings() {
    return getStore().get(LOCALE_STORE_KEY, "default");
}
ipcMain.on("get-locale-settings", (event) => {
    event.returnValue = getLocaleSettings();
});
ipcMain.on("get-locale", (event) => {
    let setting = getLocaleSettings();
    let locale = setting === "default" ? app.getLocale() : setting;
    event.returnValue = locale;
});

const FONT_SIZE_STORE_KEY = "fontSize";
ipcMain.on("get-font-size", (event) => {
    event.returnValue = getStore().get(FONT_SIZE_STORE_KEY, 16);
});
ipcMain.handle("set-font-size", (_, size: number) => {
    getStore().set(FONT_SIZE_STORE_KEY, size);
});

const FONT_STORE_KEY = "fontFamily";
ipcMain.on("get-font", (event) => {
    event.returnValue = getStore().get(FONT_STORE_KEY, "");
});
ipcMain.handle("set-font", (_, font: string) => {
    getStore().set(FONT_STORE_KEY, font);
});

ipcMain.on("get-all-settings", (event) => {
    let output = {};
    for (let [key, value] of getStore()) {
        output[key] = value;
    }
    event.returnValue = output;
});

const DEFAULT_OPEN_TARGET_STORE_KEY = "defaultOpenTarget";
ipcMain.handle("get-default-open-target-pref", () => {
    return getStore().get(
        DEFAULT_OPEN_TARGET_STORE_KEY,
        SourceOpenTarget.Local,
    );
});
ipcMain.handle(
    "set-default-open-target-pref",
    (_, openTarget: SourceOpenTarget) => {
        getStore().set(DEFAULT_OPEN_TARGET_STORE_KEY, openTarget);
    },
);

const FETCH_INTEVAL_STORE_KEY = "fetchInterval";
ipcMain.on("get-fetch-interval", (event) => {
    event.returnValue = getStore().get(FETCH_INTEVAL_STORE_KEY, 0);
});
ipcMain.handle("set-fetch-interval", (_, interval: number) => {
    getStore().set(FETCH_INTEVAL_STORE_KEY, interval);
});

const SEARCH_ENGINE_STORE_KEY = "searchEngine";
ipcMain.on("get-search-engine", (event) => {
    event.returnValue = getStore().get(
        SEARCH_ENGINE_STORE_KEY,
        SearchEngines.Startpage,
    );
});
ipcMain.handle("set-search-engine", (_, engine: SearchEngines) => {
    getStore().set(SEARCH_ENGINE_STORE_KEY, engine);
});

const SERVICE_CONFIGS_STORE_KEY = "serviceConfigs";
ipcMain.on("get-service-configs", (event) => {
    event.returnValue = getStore().get(SERVICE_CONFIGS_STORE_KEY, {
        type: SyncService.None,
    });
});
ipcMain.handle("set-service-configs", (_, configs: ServiceConfigs) => {
    getStore().set(SERVICE_CONFIGS_STORE_KEY, configs);
});

const FILTER_TYPE_STORE_KEY = "filterType";
ipcMain.on("get-filter-type", (event) => {
    event.returnValue = getStore().get(FILTER_TYPE_STORE_KEY, null);
});
ipcMain.handle("set-filter-type", (_, filterType: number) => {
    getStore().set(FILTER_TYPE_STORE_KEY, filterType);
});

const VIEW_CONFIG_STORE_KEY = "viewConfig";
ipcMain.on("get-view-config", (event) => {
    event.returnValue = getStore().get(
        VIEW_CONFIG_STORE_KEY,
        defaultViewConfig(),
    );
});
ipcMain.handle("set-view-config", (_, config: ViewConfig) => {
    getStore().set(VIEW_CONFIG_STORE_KEY, config);
});
