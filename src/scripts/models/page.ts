import {
    ALL,
    SOURCE,
    loadMore,
    FeedFilter,
    FilterType,
    initFeeds,
    FeedActionTypes,
    INIT_FEED,
} from "./feed";
import { getWindowBreakpoint, AppThunk, ActionStatus } from "../utils";
import { RSSItem, markRead } from "./item";
import { SourceActionTypes, DELETE_SOURCE } from "./source";
import { toggleMenu } from "./app";
import { ViewType, ViewConfig, defaultViewConfig } from "../../schema-types";
import {
    APPLY_FILTER,
    DISMISS_ITEM,
    PageActionTypes,
    PageType,
    SELECT_PAGE,
    SET_VIEW_CONFIG,
    SHOW_ITEM,
    TOGGLE_SEARCH,
} from "./page-interface";

export function selectAllArticles(init = false): AppThunk {
    return (dispatch, getState) => {
        dispatch({
            type: SELECT_PAGE,
            keepMenu: getWindowBreakpoint(),
            filter: getState().page.filter,
            pageType: PageType.AllArticles,
            init: init,
        } as PageActionTypes);
    };
}

export function selectSources(
    sids: number[],
    menuKey: string,
    title: string,
): AppThunk {
    return (dispatch, getState) => {
        if (getState().app.menuKey !== menuKey) {
            dispatch({
                type: SELECT_PAGE,
                pageType: PageType.Sources,
                keepMenu: getWindowBreakpoint(),
                filter: getState().page.filter,
                sids: sids,
                menuKey: menuKey,
                title: title,
                init: true,
            } as PageActionTypes);
        }
    };
}

/**
 * Generic way to set the settings view config and the state.
 */
export function setViewConfig(config: ViewConfig): AppThunk<void> {
    return (dispatch, _getState) => {
        window.settings.setViewConfig(config);
        dispatch({
            type: SET_VIEW_CONFIG,
            config: config,
        });
    };
}

/**
 * Wrapper around setViewConfig to switch the view.
 */
export function switchView(view: ViewType): AppThunk {
    return (dispatch, getState) => {
        const currentViewConfig = getState().page.viewConfig;
        const newConfig = { ...currentViewConfig, currentView: view };
        dispatch(setViewConfig(newConfig));
    };
}

export function showItem(feedId: string, item: RSSItem): AppThunk {
    return (dispatch, getState) => {
        const state = getState();
        if (
            state.items.hasOwnProperty(item.iid) &&
            state.sources.hasOwnProperty(item.source)
        ) {
            dispatch({
                type: SHOW_ITEM,
                feedId: feedId,
                item: item,
            });
        }
    };
}
export function showItemFromId(iid: number): AppThunk {
    return (dispatch, getState) => {
        const state = getState();
        const item = state.items[iid];
        if (!item.hasRead) dispatch(markRead(item));
        if (item) dispatch(showItem(null, item));
    };
}

export const dismissItem = (): PageActionTypes => ({ type: DISMISS_ITEM });

export const toggleSearch = (): AppThunk => {
    return (dispatch, getState) => {
        let state = getState();
        dispatch({ type: TOGGLE_SEARCH });
        if (!getWindowBreakpoint() && state.app.menu) {
            dispatch(toggleMenu());
        }
        if (state.page.searchOn) {
            dispatch(
                applyFilter({
                    ...state.page.filter,
                    search: "",
                }),
            );
        }
    };
};

export function showOffsetItem(offset: number): AppThunk {
    return (dispatch, getState) => {
        let state = getState();
        if (!state.page.itemFromFeed) return;
        let [itemId, feedId] = [state.page.itemId, state.page.feedId];
        let feed = state.feeds[feedId];
        let iids = feed.iids;
        let itemIndex = iids.indexOf(itemId);
        let newIndex = itemIndex + offset;
        if (itemIndex < 0) {
            let item = state.items[itemId];
            let prevs = feed.iids
                .map(
                    (id, index) =>
                        [state.items[id], index] as [RSSItem, number],
                )
                .filter(([i, _]) => i.date > item.date);
            if (prevs.length > 0) {
                let prev = prevs[0];
                for (let j = 1; j < prevs.length; j += 1) {
                    if (prevs[j][0].date < prev[0].date) prev = prevs[j];
                }
                newIndex = prev[1] + offset + (offset < 0 ? 1 : 0);
            } else {
                newIndex = offset - 1;
            }
        }
        if (newIndex >= 0) {
            if (newIndex < iids.length) {
                let item = state.items[iids[newIndex]];
                dispatch(markRead(item));
                dispatch(showItem(feedId, item));
                return;
            } else if (!feed.allLoaded) {
                dispatch(loadMore(feed))
                    .then(() => {
                        dispatch(showOffsetItem(offset));
                    })
                    .catch(() => dispatch(dismissItem()));
                return;
            }
        }
        dispatch(dismissItem());
    };
}

const applyFilterDone = (filter: FeedFilter): PageActionTypes => ({
    type: APPLY_FILTER,
    filter: filter,
});

function applyFilter(filter: FeedFilter): AppThunk {
    return (dispatch, getState) => {
        const oldFilterType = getState().page.filter.type;
        if (filter.type !== oldFilterType)
            window.settings.setFilterType(filter.type);
        dispatch(applyFilterDone(filter));
        dispatch(initFeeds(true));
    };
}

export function switchFilter(filter: FilterType): AppThunk {
    return (dispatch, getState) => {
        let oldFilter = getState().page.filter;
        let oldType = oldFilter.type;
        let newType = filter | (oldType & FilterType.Toggles);
        if (oldType != newType) {
            dispatch(
                applyFilter({
                    ...oldFilter,
                    type: newType,
                }),
            );
        }
    };
}

export function toggleFilter(filter: FilterType): AppThunk {
    return (dispatch, getState) => {
        let nextFilter = { ...getState().page.filter };
        nextFilter.type ^= filter;
        dispatch(applyFilter(nextFilter));
    };
}

export function performSearch(query: string): AppThunk {
    return (dispatch, getState) => {
        let state = getState();
        if (state.page.searchOn) {
            dispatch(
                applyFilter({
                    ...state.page.filter,
                    search: query,
                }),
            );
        }
    };
}

export class PageState {
    viewConfig: ViewConfig =
        window.settings.getViewConfig() ?? defaultViewConfig();
    filter = new FeedFilter();
    feedId: string = ALL;
    itemId = null as number;
    itemFromFeed = true;
    searchOn = false;
}

export function pageReducer(
    state: PageState = new PageState(),
    action: PageActionTypes | SourceActionTypes | FeedActionTypes,
): PageState {
    switch (action.type) {
        case SELECT_PAGE:
            switch (action.pageType) {
                case PageType.AllArticles:
                    return {
                        ...state,
                        feedId: ALL,
                        itemId: null,
                    };
                case PageType.Sources:
                    return {
                        ...state,
                        feedId: SOURCE,
                        itemId: null,
                    };
                default:
                    return state;
            }
        case SET_VIEW_CONFIG:
            return {
                ...state,
                viewConfig: action.config,
                itemId: null,
            };
        case APPLY_FILTER:
            return {
                ...state,
                filter: action.filter,
            };
        case SHOW_ITEM:
            return {
                ...state,
                itemId: action.item.iid,
                itemFromFeed: Boolean(action.feedId),
            };
        case INIT_FEED:
            switch (action.status) {
                case ActionStatus.Success:
                    return {
                        ...state,
                        itemId:
                            action.feed.iid === state.feedId &&
                            action.items.filter((i) => i.iid === state.itemId)
                                .length === 0
                                ? null
                                : state.itemId,
                    };
                default:
                    return state;
            }
        case DELETE_SOURCE:
        case DISMISS_ITEM:
            return {
                ...state,
                itemId: null,
            };
        case TOGGLE_SEARCH:
            return {
                ...state,
                searchOn: !state.searchOn,
            };
        default:
            return state;
    }
}
