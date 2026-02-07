export class SourceGroup {
    isMultiple: boolean;
    sids: number[];
    name?: string;
    expanded?: boolean;
    index?: number; // available only from menu or groups tab container

    constructor(sids: number[], name: string = null) {
        name = (name && name.trim()) || "Source group";
        if (sids.length == 1) {
            this.isMultiple = false;
        } else {
            this.isMultiple = true;
            this.name = name;
            this.expanded = true;
        }
        this.sids = sids;
    }
}

// From https://www.electronjs.org/docs/latest/api/system-preferences#systempreferencesgetanimationsettings
export interface AnimationSettingsResponse {
    shouldRenderRichAnimation: boolean;
    scrollAnimationsEnabledBySystem: boolean;
    prefersReducedMotion: boolean;
}

export const enum ViewType {
    Cards,
    List,
    Magazine,
    Compact,
    Customized,
}

export const enum ListViewConfigs {
    ShowCover = 1 << 0,
    ShowSnippet = 1 << 1,
    FadeRead = 1 << 2,
}

export interface ViewConfig {
    currentView: ViewType;
    listViewConfigs: ListViewConfigs;
}

export function defaultViewConfig(): ViewConfig {
    return {
        currentView: ViewType.Cards,
        listViewConfigs: ListViewConfigs.ShowCover,
    };
}

export const enum ThemeSettings {
    Default = "system",
    Light = "light",
    Dark = "dark",
}

export enum AnimationMotionPref {
    System = "system",
    On = "on",
    Reduced = "reduced",
    Off = "off",
}

export enum ThumbnailTypePref {
    OpenGraph = "opengraph",
    MediaThumbnail = "mediaThumbnail",
    Thumb = "thumb",
    Other = "other",
}

export const enum SearchEngines {
    Google,
    Bing,
    Baidu,
    DuckDuckGo,
    Startpage,
}

export const enum ImageCallbackTypes {
    OpenExternal,
    OpenExternalBg,
    SaveAs,
    Copy,
    CopyLink,
}

export const enum SyncService {
    None,
    Fever,
    Feedbin,
    GReader,
    Inoreader,
    Miniflux,
    Nextcloud,
}

export interface ServiceConfigs {
    type: SyncService;
    importGroups?: boolean;
}

export const enum WindowStateListenerType {
    Maximized,
    Focused,
    Fullscreen,
}

export interface TouchBarTexts {
    menu: string;
    search: string;
    refresh: string;
    markAll: string;
    notifications: string;
}

export type SchemaTypes = {
    animationMotionPref: AnimationMotionPref;
    version: string;
    theme: ThemeSettings;
    pac: string;
    pacOn: boolean;
    locale: string;
    sourceGroups: SourceGroup[];
    fontSize: number;
    fontFamily: string;
    menuOn: boolean;
    fetchInterval: number;
    searchEngine: SearchEngines;
    serviceConfigs: ServiceConfigs;
    filterType: number;
    viewConfig: ViewConfig;
    thumbnailTypePref: ThumbnailTypePref;
    useNativeWindowFramePref: boolean;
};
