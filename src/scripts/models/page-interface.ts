import { type FeedFilter } from "./feed";
import { ViewType, ViewConfig } from "../../schema-types";
import { type RSSItem } from "./item";

export const SELECT_PAGE = "SELECT_PAGE";
export const SWITCH_VIEW = "SWITCH_VIEW";
export const SET_VIEW_CONFIG = "SET_VIEW_CONFIG";
export const SHOW_ITEM = "SHOW_ITEM";
export const SHOW_OFFSET_ITEM = "SHOW_OFFSET_ITEM";
export const DISMISS_ITEM = "DISMISS_ITEM";
export const APPLY_FILTER = "APPLY_FILTER";
export const TOGGLE_SEARCH = "TOGGLE_SEARCH";

export const enum PageType {
    AllArticles,
    Sources,
    Page,
}

export interface SelectPageAction {
    type: typeof SELECT_PAGE;
    pageType: PageType;
    init: boolean;
    keepMenu: boolean;
    filter: FeedFilter;
    sids?: number[];
    menuKey?: string;
    title?: string;
}

export interface SwitchViewAction {
    type: typeof SWITCH_VIEW;
    viewType: ViewType;
}

export interface SetViewConfigAction {
    type: typeof SET_VIEW_CONFIG;
    config: ViewConfig;
}

export interface ShowItemAction {
    type: typeof SHOW_ITEM;
    feedId: string;
    item: RSSItem;
}

export interface ApplyFilterAction {
    type: typeof APPLY_FILTER;
    filter: FeedFilter;
}

export interface DismissItemAction {
    type: typeof DISMISS_ITEM;
}

export interface ToggleSearchAction {
    type: typeof TOGGLE_SEARCH;
}

export type PageActionTypes =
    | SelectPageAction
    | SwitchViewAction
    | ShowItemAction
    | DismissItemAction
    | ApplyFilterAction
    | ToggleSearchAction
    | SetViewConfigAction;
