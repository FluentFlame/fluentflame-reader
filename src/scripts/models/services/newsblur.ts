import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RootState } from "../../reducer";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";
import { RSSSource } from "../source";

export interface NewsBlurConfig extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: string; // url
    username: string;
    password: string;
    _lastRefresh?: Date;
}

export type testFetchFunction = (url: URL, options: RequestInit) => string;

// According to newblur documentation
const MIN_WAIT_SECONDS = 60;

async function fetchGetAPI(
    configs: NewsBlurConfig,
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
    configs: NewsBlurConfig,
    path: string,
    params: Record<string, string>,
) {
    // set url
    while (path.startsWith("/")) path = path.substring(1); // remove leading slash
    const url = new URL(configs.endpoint + path);
    // set headers
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    // set body & encode params
    const body = new URLSearchParams(params);
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

export async function newsblurFetchItems(configs: NewsBlurConfig) {
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
    errors: Record<string /*reason*/, string /*long reason*/> | null /*ok*/;
    result: "ok";
    authenticated: boolean;
    user_id: number;
    feeds?: any;
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
 **/
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
    authenticate: async (configs: NewsBlurConfig) => {
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
            // minTime to avoid overwhelming the server
            configs._lastRefresh = new Date();
            // correct?
            return json.authenticated === true;
        } catch {
            return false;
        }
    },

    updateSources: () => async (dispatch, getState: () => RootState) => {
        const configs = getState().service as NewsBlurConfig;
        const response = await fetchGetAPI(configs, "/reader/feeds", {})
            // parse
            .then((res) => res.json());

        const feeds: Record<string, NewsblurFeed> | undefined = response.feeds;

        if (feeds === undefined) {
            throw APIError("property 'feeds' is undefined");
        }

        const sources: RSSSource[] = [];
        for (const key in feeds) {
            const feed = feeds[key];
            const source = new RSSSource(feed.feed_address, feed.feed_title);
            sources.push(source);
        }

        return [sources, undefined /* Apparently no groups in Newsblur */];
    },

    // get remote read and star state of articles, for local sync
    syncItems: () => async (_, getState) => {
        const configs = getState().service as NewsBlurConfig;
        const unread = new Set<string>();
        const starred = new Set<string>();

        // get all rss sources with unread posts. Call only once a minute !!!
        // (Should I hardcode-ly enforce min wait time?)
        const response = await fetchGetAPI(configs, "/reader/refresh_feeds", {})
            // parse
            .then((res) => res.json());

        const feeds: Record<string, NewsblurFeedSummary> | undefined =
            response.feeds;
        if (feeds === undefined) {
            throw APIError("property 'feeds' is undefined");
        }

        // get unread
        let unreadPromises: Promise<string[]>[] = Object.values(feeds).map(
            (feed) =>
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

        // get starred
        let starredPromise = fetchGetAPI(configs, "/reader/starred_stories", {})
            .then((res) => res.json())
            .then((res: NewsblurFeedResponse) => res.stories ?? [])
            .then((stories) => stories.map((story) => story.id));

        // wait for values
        for (const unreadPromise of unreadPromises) {
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
        throw new Error("todo!");
    },

    markAllRead: (sids, date, before) => async (_, getState) => {
        throw new Error("todo!");
    },

    markRead: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    markUnread: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    star: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    unstar: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },
};
