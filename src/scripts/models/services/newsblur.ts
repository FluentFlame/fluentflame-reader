/* WORK IN PROGRESS... */

/*
Newsblur Dictionary:

| Newsblur | Fluentflame |
|----------|-------------|
| feed     | source      |
| story    | item        |
| folders  | groups?     |
*/

import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RootState } from "../../reducer";
import { generateThumbnailAttrList } from "../../thumb-utils";
import { htmlDecode } from "../../utils";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";
import { RSSSource } from "../source";
import { ParamsObject, pathParams, toSearchParams } from "./service-utils";

export interface NewsBlurConfigs extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: URL; // url
    username: string;
    password: string;
}

// Basic fetch functions

async function fetchGetAPI(
    configs: NewsBlurConfigs,
    path: string,
    params: Record<string, string>,
) {
    // set url
    const url = new URL(configs.endpoint);
    url.pathname = path;
    // set params
    const searchParams = new URLSearchParams(params);
    url.search = searchParams.toString();
    // set headers
    const headers = new Headers();
    // options
    const options: RequestInit = { headers, credentials: "include" };
    // send
    const response = await fetch(url, options);
    // return or throw
    const json: NewsblurResponse = await response.json();
    if (json.errors == null) {
        return json;
    } else {
        throw new NewsblurError(json.errors);
    }
}

async function fetchPostAPI(
    configs: NewsBlurConfigs,
    path: string,
    params: ParamsObject,
) {
    // set url
    const url = new URL(configs.endpoint);
    url.pathname = path;
    // set params
    const body = toSearchParams(params);
    // set headers
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    // options
    const options: RequestInit = {
        method: "POST",
        headers: headers,
        body: body,
        credentials: "include",
    };
    // send
    const response = await fetch(url, options);
    // return or throw
    const json: NewsblurResponse = await response.json();
    if (json.errors == null) {
        return json;
    } else {
        throw new NewsblurError(json.errors);
    }
}

// Fetch direct API endpoints

export const NewsblurAPI = {
    /**
     * Newsblur docs:
     *
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
    async authenticate(configs: NewsBlurConfigs): Promise<boolean> {
        const response = await fetchPostAPI(configs, "/api/login", {
            username: configs.username,
            password: configs.password,
        });
        return Boolean(response.authenticated);
    },
    async fetchFeeds(configs: NewsBlurConfigs): Promise<NewsblurFeed[]> {
        const response = (await fetchGetAPI(configs, "/reader/feeds", {
            flat: "true",
        })) as NewsblurFeedsResponse;
        return Object.values(response.feeds);
    },
    async fetchStoriesInFeed(
        configs: NewsBlurConfigs,
        feedId: string | number,
    ): Promise<NewsblurStory[]> {
        const response = (await fetchGetAPI(
            configs,
            pathParams("/reader/feed/:id", {
                id: feedId.toString(),
            }),
            {},
        )) as NewsblurStoriesResponse;
        return Object.values(response.stories);
    },
    async fetchUnreadStoriesInFeed(
        configs: NewsBlurConfigs,
        feedId: string | number,
    ): Promise<NewsblurStory[]> {
        const response = (await fetchGetAPI(
            configs,
            pathParams("/reader/feed/:id", {
                id: feedId.toString(),
            }),
            { read_filter: "unread" },
        )) as NewsblurStoriesResponse;
        return Object.values(response.stories);
    },
    async fetchAllStarredStories(
        configs: NewsBlurConfigs,
    ): Promise<NewsblurStory[]> {
        const response = (await fetchGetAPI(
            configs,
            "/reader/starred_stories",
            {},
        )) as NewsblurStoriesResponse;
        return Object.values(response.stories);
    },
    async fetchAllStories(configs: NewsBlurConfigs): Promise<NewsblurStory[]> {
        const feeds = await NewsblurAPI.fetchFeeds(configs);
        const promises = feeds.flatMap(async (feed) =>
            NewsblurAPI.fetchStoriesInFeed(configs, feed.id),
        );
        return (await Promise.all(promises)).flat();
    },
};

// Types

export class NewsblurError extends Error {
    constructor(errors: Record<string, string>, options?: ErrorOptions) {
        super(Object.values(errors)[0], options);
        this.newsblurError = errors;
    }
    newsblurError: Record<string, string>;
}

export interface NewsblurResponse {
    errors: Record</*reason*/ string, /*long reason*/ string> | null /*ok*/;
    authenticated: boolean;
    user_id: number;
}

export interface NewsblurAuthResponse extends NewsblurResponse {
    code: -1 /*error*/ | 1 /*ok*/;
}

export interface NewsblurFeedsResponse extends NewsblurResponse {
    feeds: Record</* id: */ string, NewsblurFeed>;
}

interface NewsblurStoriesResponse extends NewsblurResponse {
    stories: NewsblurStory[];
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
        try {
            return await NewsblurAPI.authenticate(configs);
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    ///////////////////
    // GET REQUESTS //
    ///////////////////

    /** get remote sources */
    updateSources: () => async (_, getState: () => RootState) => {
        const configs = getState().service as NewsBlurConfigs;

        // fetch
        const sources: RSSSource[] = await NewsblurAPI.fetchFeeds(configs).then(
            (feeds) =>
                Object.entries(feeds).map(([id, f]) => {
                    const source = new RSSSource(f.feed_address, f.feed_title);
                    source.serviceRef = id;
                    return source;
                }),
        );

        return [sources, new Map() /* No groups in Newsblur */];
    },

    /** get and set remote unreads and starreds */
    syncItems: () => async (_, getState) => {
        const configs = getState().service as NewsBlurConfigs;
        const unread = new Set<string>();
        const starred = new Set<string>();

        // get all rss sources with unread posts. Call only once a minute !!!
        const unreadsPromise: Promise<string[]> = (async () => {
            const feeds = await NewsblurAPI.fetchFeeds(configs);

            // get unread
            const unreadPromises: Promise<string[]>[] = // keep
                Object.values(feeds).map((feed) =>
                    // call to each feed
                    NewsblurAPI.fetchUnreadStoriesInFeed(configs, feed.id).then(
                        (stories) => stories.map((story) => story.id),
                    ),
                );
            return (await Promise.all(unreadPromises)).flat();
        })();

        // get starred
        let starredsPromise = NewsblurAPI.fetchAllStarredStories(configs).then(
            (stories) => stories.map((story) => story.id),
        );

        // wait for values
        for (const unreadId of await unreadsPromise) {
            unread.add(unreadId);
        }
        for (const id of await starredsPromise) {
            starred.add(id);
        }

        return [unread, starred];
    },

    // get and set remote items
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
        const promise = NewsblurAPI.fetchFeeds(configs).then((feeds) =>
            feeds.map((feed) =>
                NewsblurAPI.fetchStoriesInFeed(configs, feed.id).then(
                    (stories) =>
                        stories.map((story) => {
                            const source = sourceMap.get(feed.feed_address);

                            // parse item
                            let parsedItem = {
                                source: source?.sid,
                                title: story.story_title,
                                link: story.id,
                                date: new Date(parseInt(story.story_timestamp)),
                                fetchedDate: new Date(),
                                content: story.story_content,
                                snippet: htmlDecode(story.story_content).trim(),
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
        let parsedItems: RSSItem[] = (await Promise.all(await promise)).flat();

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
