import { fluentDB } from "../db";
import intl from "react-intl-universal";
import type { MyParserItem, ThumbnailAttributes } from "../utils";
import {
    htmlDecode,
    ActionStatus,
    AppThunk,
    dateCompare,
    platformCtrl,
} from "../utils";
import { RSSSource, updateSource, updateUnreadCounts } from "./source";
import { FeedActionTypes, INIT_FEED, LOAD_MORE, dismissItems } from "./feed";
import {
    pushNotification,
    setupAutoFetch,
    SettingsActionTypes,
    FREE_MEMORY,
} from "./app";
import {
    getServiceHooks,
    syncWithService,
    ServiceActionTypes,
    SYNC_LOCAL_ITEMS,
} from "./service";
import { ThumbnailTypePref } from "../../schema-types";

export class RSSItem {
    iid: number;
    source: number;
    title: string;
    link: string;
    date: Date;
    fetchedDate: Date;
    thumb?: string;
    thumbnails?: ThumbnailAttributes[];
    content: string;
    snippet: string;
    creator?: string;
    hasRead: boolean;
    starred: boolean;
    hidden: boolean;
    notify: boolean;
    serviceRef?: string;

    constructor(item: MyParserItem, source: RSSSource) {
        for (let field of ["title", "link", "creator"]) {
            const content = item[field];
            if (content && typeof content !== "string") delete item[field];
        }
        this.source = source.sid;
        this.title = item.title || intl.get("article.untitled");
        this.link = item.link || "";
        this.fetchedDate = new Date();
        this.date = new Date(item.isoDate ?? item.pubDate ?? this.fetchedDate);
        this.creator = item.creator;
        this.hasRead = false;
        this.starred = false;
        this.hidden = false;
        this.notify = false;
    }

    static async fetchHead(url: string): Promise<string> {
        const controller = new AbortController();
        const response = await fetch(url, { signal: controller.signal });
        let result = "";
        if (!response.ok || !response.body) return result;
        const stream = response.body.pipeThrough(new TextDecoderStream());
        const headRegex = /<\/head>/i;
        for await (const value of stream) {
            result += value;
            if (headRegex.test(value)) {
                controller.abort();
                return result;
            }
        }
        return result;
    }

    private static async opengraphThumbnail(
        head: string,
    ): Promise<ThumbnailAttributes[]> {
        const dom = new DOMParser().parseFromString(head, "text/html");
        const elements = [
            ...dom.head.querySelectorAll(
                "meta[property*='og:image'],meta[property*='og:video']",
            ),
        ].map((e: HTMLMetaElement) => {
            return { tag: e.getAttribute("property"), content: e.content };
        });

        const queries = [
            "og:image",
            "og:image:url",
            "og:image:secure_url",
            "og:video",
            "og:video:url",
            "og:video:secure_url",
        ];
        const result: ThumbnailAttributes[] = [];
        for (const query of queries) {
            const element =
                elements.find((e) => e.tag === query)?.content ?? null;
            if (element !== null)
                result.push(
                    await this.urlToThumbnailAttributes(
                        element,
                        query.startsWith("og:image") ? "image" : "video",
                        ThumbnailTypePref.OpenGraph,
                    ),
                );
        }
        return result;
    }

    private static async urlToThumbnailAttributes(
        url: string,
        medium: "image" | "video" | "unknown",
        type: ThumbnailTypePref,
    ): Promise<ThumbnailAttributes> {
        if (medium === "image" || medium === "video") {
            return {
                url,
                medium,
                type,
            };
        }
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok)
            return {
                url,
                medium: "image", //assume image as a fallback
                type,
            };
        const contentType = response.headers.get("content-type");
        medium = contentType.startsWith("video/") ? "video" : "image";
        return {
            url,
            medium,
            type,
        };
    }

    static async parseContent(item: RSSItem, parsed: MyParserItem) {
        for (let field of ["thumb", "content", "fullContent"]) {
            const content = parsed[field];
            if (content && typeof content !== "string") delete parsed[field];
        }
        if (parsed.fullContent) {
            item.content = parsed.fullContent;
            item.snippet = htmlDecode(parsed.fullContent);
        } else {
            item.content = parsed.content || "";
            item.snippet = htmlDecode(parsed.contentSnippet || "");
        }
        item.thumbnails = [];
        if (parsed.link) {
            const head = await this.fetchHead(parsed.link);
            if (/og:(?:image|video)/gi.test(head))
                item.thumbnails.push(...(await this.opengraphThumbnail(head)));
        }
        if (parsed.mediaThumbnails) {
            const images = parsed.mediaThumbnails.filter((t) => t.$?.url);
            for (const image of images)
                item.thumbnails.push(
                    await this.urlToThumbnailAttributes(
                        image.$.url,
                        "unknown",
                        ThumbnailTypePref.MediaThumbnail,
                    ),
                );
        }
        if (parsed.thumb) {
            item.thumbnails.push(
                await this.urlToThumbnailAttributes(
                    parsed.thumb,
                    "unknown",
                    ThumbnailTypePref.Thumb,
                ),
            );
        }
        if (parsed.image?.$?.url) {
            item.thumbnails.push(
                await this.urlToThumbnailAttributes(
                    parsed.image.$.url,
                    "image",
                    ThumbnailTypePref.Other,
                ),
            );
        }
        if (parsed.image && typeof parsed.image === "string") {
            item.thumbnails.push(
                await this.urlToThumbnailAttributes(
                    parsed.image,
                    "image",
                    ThumbnailTypePref.Other,
                ),
            );
        }
        if (parsed.mediaContent) {
            let images = parsed.mediaContent.filter(
                (c) =>
                    c.$ &&
                    (c.$.medium === "image" ||
                        (typeof c.$.type === "string" &&
                            c.$.type.startsWith("image/"))) &&
                    c.$.url,
            );
            for (const image of images)
                item.thumbnails.push(
                    await this.urlToThumbnailAttributes(
                        image.$.url,
                        image.$.medium,
                        ThumbnailTypePref.Other,
                    ),
                );
        }
        if (item.content) {
            let dom = new DOMParser().parseFromString(
                item.content,
                "text/html",
            );
            let baseEl = dom.createElement("base");
            baseEl.setAttribute(
                "href",
                item.link.split("/").slice(0, 3).join("/"),
            );
            dom.head.append(baseEl);
            let img = dom.querySelector("img");
            if (img && img.src)
                item.thumbnails.push(
                    await this.urlToThumbnailAttributes(
                        img.src,
                        "image",
                        ThumbnailTypePref.Other,
                    ),
                );
        }
        item.thumbnails = item.thumbnails.map((t) => {
            return {
                medium: t.medium,
                type: t.type,
                url: new URL(t.url, item.link).toString(),
            };
        });
        item.thumb = item.thumbnails.at(0)?.url;
        if (
            item.thumb &&
            !item.thumb.startsWith("https://") &&
            !item.thumb.startsWith("http://")
        ) {
            delete item.thumb;
        }
    }
}

export type ItemState = {
    [iid: number]: RSSItem;
};

export const FETCH_ITEMS = "FETCH_ITEMS";
export const MARK_READ = "MARK_READ";
export const MARK_ALL_READ = "MARK_ALL_READ";
export const MARK_UNREAD = "MARK_UNREAD";
export const TOGGLE_STARRED = "TOGGLE_STARRED";
export const TOGGLE_HIDDEN = "TOGGLE_HIDDEN";

interface FetchItemsAction {
    type: typeof FETCH_ITEMS;
    status: ActionStatus;
    fetchCount?: number;
    items?: RSSItem[];
    itemState?: ItemState;
    errSource?: RSSSource;
    err?;
}

interface MarkReadAction {
    type: typeof MARK_READ;
    item: RSSItem;
}

interface MarkAllReadAction {
    type: typeof MARK_ALL_READ;
    sids: number[];
    time?: number;
    before?: boolean;
}

interface MarkUnreadAction {
    type: typeof MARK_UNREAD;
    item: RSSItem;
}

interface ToggleStarredAction {
    type: typeof TOGGLE_STARRED;
    item: RSSItem;
}

interface ToggleHiddenAction {
    type: typeof TOGGLE_HIDDEN;
    item: RSSItem;
}

export type ItemActionTypes =
    | FetchItemsAction
    | MarkReadAction
    | MarkAllReadAction
    | MarkUnreadAction
    | ToggleStarredAction
    | ToggleHiddenAction;

export function fetchItemsRequest(fetchCount = 0): ItemActionTypes {
    return {
        type: FETCH_ITEMS,
        status: ActionStatus.Request,
        fetchCount: fetchCount,
    };
}

export function fetchItemsSuccess(
    items: RSSItem[],
    itemState: ItemState,
): ItemActionTypes {
    return {
        type: FETCH_ITEMS,
        status: ActionStatus.Success,
        items: items,
        itemState: itemState,
    };
}

export function fetchItemsFailure(source: RSSSource, err): ItemActionTypes {
    return {
        type: FETCH_ITEMS,
        status: ActionStatus.Failure,
        errSource: source,
        err: err,
    };
}

export function fetchItemsIntermediate(): ItemActionTypes {
    return {
        type: FETCH_ITEMS,
        status: ActionStatus.Intermediate,
    };
}

export async function insertItems(items: RSSItem[]): Promise<RSSItem[]> {
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    const keys = await fluentDB.items.bulkAdd(items, { allKeys: true });
    let itemIdx = 0;
    for (const key of keys) {
        items[itemIdx].iid = key;
        itemIdx++;
    }
    return items;
}

export function fetchItems(
    background = false,
    sids: number[] = null,
): AppThunk<Promise<void>> {
    return async (dispatch, getState) => {
        let promises = new Array<Promise<RSSItem[]>>();
        const initState = getState();
        if (!initState.app.fetchingItems && !initState.app.syncing) {
            if (
                sids === null ||
                sids.filter(
                    (sid) => initState.sources[sid].serviceRef !== undefined,
                ).length > 0
            )
                await dispatch(syncWithService(background));
            let timenow = new Date().getTime();
            const sourcesState = getState().sources;
            let sources =
                sids === null
                    ? Object.values(sourcesState).filter((s) => {
                          let last = s.lastFetched
                              ? s.lastFetched.getTime()
                              : 0;
                          return (
                              !s.serviceRef &&
                              (last > timenow ||
                                  last + (s.fetchFrequency || 0) * 60000 <=
                                      timenow)
                          );
                      })
                    : sids
                          .map((sid) => sourcesState[sid])
                          .filter((s) => !s.serviceRef);
            for (let source of sources) {
                let promise = RSSSource.fetchItems(source);
                promise.then(() =>
                    dispatch(
                        updateSource({ ...source, lastFetched: new Date() }),
                    ),
                );
                promise.finally(() => dispatch(fetchItemsIntermediate()));
                promises.push(promise);
            }
            dispatch(fetchItemsRequest(promises.length));
            const results = await Promise.allSettled(promises);
            return await new Promise<void>((resolve, reject) => {
                let items = new Array<RSSItem>();
                results.map((r, i) => {
                    if (r.status === "fulfilled") items.push(...r.value);
                    else {
                        console.log(r.reason);
                        dispatch(fetchItemsFailure(sources[i], r.reason));
                    }
                });
                insertItems(items)
                    .then((inserted) => {
                        dispatch(
                            fetchItemsSuccess(
                                inserted.reverse(),
                                getState().items,
                            ),
                        );
                        resolve();
                        if (background) {
                            for (let item of inserted) {
                                if (item.notify) {
                                    dispatch(pushNotification(item));
                                }
                            }
                            if (inserted.length > 0) {
                                window.utils.requestAttention();
                            }
                        } else {
                            dispatch(dismissItems());
                        }
                        dispatch(setupAutoFetch());
                    })
                    .catch((err) => {
                        dispatch(fetchItemsSuccess([], getState().items));
                        window.utils.showErrorBox(
                            "A database error has occurred.",
                            String(err),
                        );
                        console.log(err);
                        reject(err);
                    });
            });
        }
    };
}

const markReadDone = (item: RSSItem): ItemActionTypes => ({
    type: MARK_READ,
    item: item,
});

const markUnreadDone = (item: RSSItem): ItemActionTypes => ({
    type: MARK_UNREAD,
    item: item,
});

export function markRead(item: RSSItem): AppThunk {
    return (dispatch, getState) => {
        item = getState().items[item.iid];
        if (!item.hasRead) {
            fluentDB.items.update(item.iid, { hasRead: true });
            dispatch(markReadDone(item));
            if (item.serviceRef) {
                dispatch(dispatch(getServiceHooks()).markRead?.(item));
            }
        }
    };
}

export function markAllRead(
    sids: number[] = null,
    date: Date = null,
    before = true,
): AppThunk<Promise<void>> {
    return async (dispatch, getState) => {
        let state = getState();
        if (sids === null) {
            let feed = state.feeds[state.page.feedId];
            sids = feed.sids;
        }
        const action = dispatch(getServiceHooks()).markAllRead?.(
            sids,
            date,
            before,
        );
        if (action) {
            await dispatch(action);
        }
        // NOTE: Uncertain if this requires an 'await'.
        fluentDB.transaction("rw", fluentDB.items, async () => {
            const items = await fluentDB.items
                .where("sids")
                .anyOf(sids)
                .and((itemRow) => {
                    if (itemRow.hasRead) {
                        return false;
                    }
                    if (date && !dateCompare(itemRow.date, date, before)) {
                        return false;
                    }
                    return true;
                })
                .toArray();
            for (const item of items) {
                item.hasRead = true;
            }
            await fluentDB.items.bulkPut(items);
        });
        if (date) {
            dispatch({
                type: MARK_ALL_READ,
                sids: sids,
                time: date.getTime(),
                before: before,
            });
            dispatch(updateUnreadCounts());
        } else {
            dispatch({
                type: MARK_ALL_READ,
                sids: sids,
            });
        }
    };
}

/**
 * Update a single item in the database with a given update partial object.
 */
async function updateItemInDB(
    item: RSSItem,
    updateObj: Partial<RSSItem>,
): Promise<void> {
    await fluentDB.items.update(item.iid, updateObj);
}

export function markUnread(item: RSSItem): AppThunk {
    return (dispatch, getState) => {
        item = getState().items[item.iid];
        if (item.hasRead) {
            updateItemInDB(item, { hasRead: false });
            dispatch(markUnreadDone(item));
            if (item.serviceRef) {
                dispatch(dispatch(getServiceHooks()).markUnread?.(item));
            }
        }
    };
}

const toggleStarredDone = (item: RSSItem): ItemActionTypes => ({
    type: TOGGLE_STARRED,
    item: item,
});

export function toggleStarred(item: RSSItem): AppThunk {
    return (dispatch) => {
        updateItemInDB(item, { starred: !item.starred });
        dispatch(toggleStarredDone(item));
        if (item.serviceRef) {
            const hooks = dispatch(getServiceHooks());
            if (item.starred) dispatch(hooks.unstar?.(item));
            else dispatch(hooks.star?.(item));
        }
    };
}

const toggleHiddenDone = (item: RSSItem): ItemActionTypes => ({
    type: TOGGLE_HIDDEN,
    item: item,
});

export function toggleHidden(item: RSSItem): AppThunk {
    return (dispatch) => {
        updateItemInDB(item, { hidden: !item.hidden });
        dispatch(toggleHiddenDone(item));
    };
}

export function itemShortcuts(item: RSSItem, e: KeyboardEvent): AppThunk {
    return (dispatch) => {
        if (e.metaKey) return;
        switch (e.key) {
            case "m":
            case "M":
                if (item.hasRead) dispatch(markUnread(item));
                else dispatch(markRead(item));
                break;
            case "b":
            case "B":
                if (!item.hasRead) dispatch(markRead(item));
                window.utils.openExternal(item.link, platformCtrl(e));
                break;
            case "s":
            case "S":
                dispatch(toggleStarred(item));
                break;
            case "h":
            case "H":
                if (!item.hasRead && !item.hidden) dispatch(markRead(item));
                dispatch(toggleHidden(item));
                break;
        }
    };
}

export function applyItemReduction(item: RSSItem, type: string) {
    let nextItem = { ...item };
    switch (type) {
        case MARK_READ:
        case MARK_UNREAD: {
            nextItem.hasRead = type === MARK_READ;
            break;
        }
        case TOGGLE_STARRED: {
            nextItem.starred = !item.starred;
            break;
        }
        case TOGGLE_HIDDEN: {
            nextItem.hidden = !item.hidden;
            break;
        }
    }
    return nextItem;
}

export function itemReducer(
    state: ItemState = {},
    action:
        | ItemActionTypes
        | FeedActionTypes
        | ServiceActionTypes
        | SettingsActionTypes,
): ItemState {
    switch (action.type) {
        case FETCH_ITEMS:
            switch (action.status) {
                case ActionStatus.Success: {
                    let newMap = {};
                    for (let i of action.items) {
                        newMap[i.iid] = i;
                    }
                    return { ...newMap, ...state };
                }
                default:
                    return state;
            }
        case MARK_UNREAD:
        case MARK_READ:
        case TOGGLE_STARRED:
        case TOGGLE_HIDDEN: {
            return {
                ...state,
                [action.item.iid]: applyItemReduction(
                    state[action.item.iid],
                    action.type,
                ),
            };
        }
        case MARK_ALL_READ: {
            let nextState = { ...state };
            let sids = new Set(action.sids);
            for (let item of Object.values(state)) {
                if (sids.has(item.source) && !item.hasRead) {
                    if (
                        !action.time ||
                        (action.before
                            ? item.date.getTime() <= action.time
                            : item.date.getTime() >= action.time)
                    ) {
                        nextState[item.iid] = {
                            ...item,
                            hasRead: true,
                        };
                    }
                }
            }
            return nextState;
        }
        case LOAD_MORE:
        case INIT_FEED: {
            switch (action.status) {
                case ActionStatus.Success: {
                    let nextState = { ...state };
                    for (let i of action.items) {
                        nextState[i.iid] = i;
                    }
                    return nextState;
                }
                default:
                    return state;
            }
        }
        case SYNC_LOCAL_ITEMS: {
            let nextState = { ...state };
            for (let item of Object.values(state)) {
                if (item.hasOwnProperty("serviceRef")) {
                    const nextItem = { ...item };
                    nextItem.hasRead = !action.unreadIds.has(item.serviceRef);
                    nextItem.starred = action.starredIds.has(item.serviceRef);
                    nextState[item.iid] = nextItem;
                }
            }
            return nextState;
        }
        case FREE_MEMORY: {
            const nextState: ItemState = {};
            for (let item of Object.values(state)) {
                if (action.iids.has(item.iid)) nextState[item.iid] = item;
            }
            return nextState;
        }
        default:
            return state;
    }
}
