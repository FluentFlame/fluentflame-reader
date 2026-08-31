/* WORK IN PROGRESS... */

import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RootState } from "../../reducer";
import { generateThumbnailAttrList } from "../../thumb-utils";
import { htmlDecode } from "../../utils";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";
import { RSSSource } from "../source";

export interface NewsBlurConfigs extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: string; // url
    username: string;
    password: string;
}

export type testFetchFunction = (url: URL, options: RequestInit) => string;

// According to newsblur documentation
const MIN_WAIT_SECONDS = 60;

async function fetchGetAPI(
    configs: NewsBlurConfigs,
    path: string,
    params: Record<string, string>,
) {
    // encode params
    const paramsSearch = new URLSearchParams(params);
    // set url
    while (path.startsWith("/")) path = path.substring(1); // remove leading slash
    const url = new URL(configs.endpoint + path);
    url.search = paramsSearch.toString();
    // set headers
    const headers = new Headers();
    // options
    const options: RequestInit = { headers, credentials: "include" };
    // send
    const response = await fetch(url, options);
    // return
    return response;
}

async function fetchPostAPI(
    configs: NewsBlurConfigs,
    path: string,
    params: ParamsObject,
) {
    // set url
    while (path.startsWith("/")) path = path.substring(1); // remove leading slash
    const url = new URL(configs.endpoint + path);
    // set headers
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    // set body & encode params
    const body = objectToSearchParams(params);
    // options
    const options: RequestInit = {
        method: "POST",
        headers: headers,
        body: body,
        credentials: "include",
    };
    // send
    const response = await fetch(url, options);
    return response;
}

type ParamsObject = Record<string, string | string[]>;
function objectToSearchParams(object: ParamsObject): URLSearchParams {
    const params = new URLSearchParams();
    for (const key in object) {
        const value = object[key];
        if (Array.isArray(value)) {
            for (const innerValue of value) {
                params.append(key, innerValue.toString());
            }
        } else {
            params.set(key, value.toString());
        }
    }
    return params;
}

function APIError(msg?: string) {
    if (msg) {
        return new Error(`APIError: Failed to connect to NewsblurAPI: ${msg}`);
    } else {
        return new Error("APIError: Failed to connect to NewsblurAPI service");
    }
}

function printErrors(response: NewsBlurResponse) {
    if (response.errors) {
        for (const error in response.errors) {
            console.error(
                `[service: NewsBlur] ${error}: ${response.errors[error]}`,
            );
        }
    }
}

export async function newsblurFetchItems(configs: NewsBlurConfigs) {
    const response = await fetchGetAPI(configs, "/reader/feeds", {});
    // parse response
    const json: NewsBlurResponse = await response.json();
    // errors
    printErrors(json);
    // return feeds
    return json;
}

function pathParams(path: string, params: Record<string, string>) {
    let finalPath = path;
    for (const param in params) {
        const value = params[param];
        finalPath = finalPath.replace(`:${param}`, encodeURIComponent(value));
    }
    return finalPath;
}

export interface NewsBlurResponse {
    code: -1 /*error*/ | 1 /*ok*/;
    errors: Record</*reason*/ string, /*long reason*/ string> | null /*ok*/;
    result: "ok";
    authenticated: boolean;
    user_id: number;
    feeds?: NewsblurFeed[];
}

/** A string with a date in format YYYY-MM-DDThh:mm:ss (T is just a T) */
type dateString = string;

interface NewsblurFeed {
    id: number;
    feed_title: string;
    feed_address: string;
    feed_link: string;
    last_story_date: dateString;
}

/**
 * Summary is a count of unread stories in each feed.
 *
 * Counts are broken into three. Add them up for a
 * total, but you shouldn't show or count the hidden
 * stories.
 */
interface NewsblurFeedSummary {
    /** id of feed */
    id: number;
    /** positive/focus count */
    ps: number;
    /** neutral/unread count */
    nt: number;
    /** negative/hidden count */
    ng: number;
}

interface NewsblurFeedResponse {
    stories: NewsblurStory[];
}

interface NewsblurStory {
    story_hash: string;
    story_timestamp: string;
    story_authors: string;
    score: number;
    read_status: 0 | 1;
    id: string;
    story_feed_id: string; // id of rss source
    story_title: string;
    story_content: string;
    starred: boolean;
}

// Hooks (the api)
export const newsblurServiceHooks: ServiceHooks = {
    authenticate: async (serviceConfigs) => {
        const configs = serviceConfigs as NewsBlurConfigs;
        /*
         * POST /api/login
         *
         * Login as an existing user.
         * | Parameter | Description         | Example    |
         * |-----------|---------------------|------------|
         * | username  | Username (required) | samuelclay |
         * | password  | Password            | new$blur   |
         *
         * Tips:
         * - If a user has no password set, you cannot just send any old password. This is not Instapaper.
         */
        try {
            // get and parse response
            const response = await fetchPostAPI(configs, "/api/login", {
                username: configs.username,
                password: configs.password,
            });
            // parse body
            const json: NewsBlurResponse = await response.json();
            printErrors(json);
            // correct
            return json.authenticated == true;
        } catch (e) {
            console.error(APIError("authentication error").message);
            console.error(e);
            return false;
        }
    },

    ///////////////////
    // GET REQUESTS //
    ///////////////////

    updateSources: () => async (dispatch, getState: () => RootState) => {
        const configs = getState().service as NewsBlurConfigs;
        const response = await fetchGetAPI(configs, "/reader/feeds", {})
            // parse
            .then((res) => res.json());

        const feeds: Record<string, NewsblurFeed> | undefined = response.feeds;

        if (feeds == null) {
            throw APIError("property 'feeds' is undefined");
        }

        const sources: RSSSource[] = Object.values(feeds).map(
            (f) => new RSSSource(f.feed_address, f.feed_title),
        );

        return [sources, undefined as any /* No groups in Newsblur */];
    },

    // get remote read and star state of articles, for local sync
    syncItems: () => async (_, getState) => {
        const configs = getState().service as NewsBlurConfigs;
        const unread = new Set<string>();
        const starred = new Set<string>();

        // get all rss sources with unread posts. Call only once a minute !!!
        // (How should this be enforced?)
        const unreadPromises: Promise<Promise<string[]>[]> = (async () => {
            const response = await fetchGetAPI(
                configs,
                "/reader/refresh_feeds",
                {},
            )
                // parse
                .then((res) => res.json());

            const feeds: Record<string, NewsblurFeedSummary> | undefined =
                response.feeds;
            if (feeds === undefined) {
                throw APIError("property 'feeds' is undefined");
            }

            // get unread
            const unreadPromises: Promise<string[]>[] = // keep
                Object.values(feeds).map((feed) =>
                    // call to each feed
                    fetchGetAPI(
                        configs,
                        pathParams("/reader/feed/:id", {
                            id: feed.id.toString(),
                        }),
                        {
                            read_filter: "unread",
                        },
                    )
                        .then((res) => res.json())
                        .then((res: NewsblurFeedResponse) => res.stories ?? [])
                        .then((stories) => stories.map((story) => story.id)),
                );
            return unreadPromises;
        })();

        // get starred
        let starredPromise = fetchGetAPI(configs, "/reader/starred_stories", {})
            .then((res) => res.json())
            .then((res: NewsblurFeedResponse) => res.stories ?? [])
            .then((stories) => stories.map((story) => story.id));

        // wait for values
        for (const unreadPromise of await unreadPromises) {
            for (const id of await unreadPromise) {
                unread.add(id);
            }
        }
        for (const id of await starredPromise) {
            starred.add(id);
        }

        return [unread, starred];
    },

    fetchItems: () => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        // get sources that possess ref/id given by service, associate new items
        const sourceMap = new Map<string, RSSSource>();
        for (let source of Object.values(state.sources)) {
            if (source.serviceRef) {
                sourceMap.set(source.serviceRef, source);
            }
        }

        // get all feed sources
        const promise = fetchGetAPI(configs, "/reader/feeds", {
            // Returns a flat folder structure instead of nested folders.
            // Useful when displaying all folders in a single depth without recursive descent.
            flat: "true",
        })
            .then((res) => res.json())
            .then((res: NewsBlurResponse) => res.feeds ?? [])
            .then((feeds) =>
                // get items for each feed
                feeds.map((feed) =>
                    fetchGetAPI(
                        configs,
                        pathParams("/reader/feed/:id", {
                            id: feed.id.toString(),
                        }),
                        {},
                    )
                        .then((res) => res.json())
                        .then((res: NewsblurFeedResponse) => res.stories)
                        .then((stories) =>
                            stories.map((story) => {
                                const source = sourceMap.get(feed.feed_address);

                                // parse item
                                let parsedItem = {
                                    source: source?.sid,
                                    title: story.story_title,
                                    link: story.id,
                                    date: new Date(
                                        parseInt(story.story_timestamp),
                                    ),
                                    fetchedDate: new Date(),
                                    content: story.story_content,
                                    snippet: htmlDecode(
                                        story.story_content,
                                    ).trim(),
                                    creator: story.story_authors,
                                    hasRead: Boolean(story.read_status === 1),
                                    starred: Boolean(story.starred),
                                    hidden: false,
                                    notify: false,
                                    serviceRef: String(story.story_hash),
                                } as RSSItem;

                                parsedItem.thumbnailJobs =
                                    generateThumbnailAttrList({
                                        targetLink: parsedItem.link,
                                        content: parsedItem.content,
                                    });

                                return parsedItem;
                            }),
                        ),
                ),
            );

        // collect
        let parsedItems: RSSItem[] = [];
        for (const feed of await promise) {
            for (const item of await feed) {
                parsedItems.push(item);
            }
        }

        return [parsedItems, /*RSSItem[]*/ configs /*ServiceConfigs*/];
    },

    ///////////////////
    // POST REQUESTS //
    ///////////////////

    markAllRead: (sids, date, before) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        const res = await fetchPostAPI(configs, "/reader/mark_all_as_read", {});

        throw new Error("TODO! deal with res");
    },

    // Marks one story as read
    // Note: could be optimized if instead of making
    // one request for each RSSItem, it makes one request
    // with the hashes of all RSSItem's at once
    markRead: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            const res = await fetchPostAPI(
                configs,
                "/reader/mark_story_hashes_as_read",
                {
                    story_hash: [item.serviceRef],
                },
            );
        }

        throw new Error("todo!");
    },

    markUnread: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            const res = await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_unread",
                {
                    story_hash: [item.serviceRef],
                },
            );
        }

        throw new Error("todo!");
    },

    star: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            const res = await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_starred",
                {
                    story_hash: item.serviceRef,
                },
            );
        }

        throw new Error("todo!");
    },

    unstar: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            const res = await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_unstarred",
                {
                    story_hash: item.serviceRef,
                },
            );
        }

        throw new Error("todo!");
    },
};
