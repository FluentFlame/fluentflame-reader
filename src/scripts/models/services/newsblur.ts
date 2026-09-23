/*
Newsblur Dictionary:

| Newsblur | Fluentflame |
|----------|-------------|
| feed     | source      |
| story    | item        |
| folders  | -           |

*/

import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RootState } from "../../reducer";
import { generateThumbnailAttrList } from "../../thumb-utils";
import { htmlDecode } from "../../utils";
import { RSSItem } from "../item";
import { SourceRule } from "../rule";
import { ServiceHooks } from "../service";
import { RSSSource } from "../source";
import { ParamsObject, pathParams, toSearchParams } from "./service-utils";

export interface NewsBlurConfigs extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: URL; // url
    username: string;
    password: string;
}

export namespace NewsblurAPI {
    // Basic fetch functions (not exported)

    async function fetchGetAPI(
        configs: NewsBlurConfigs,
        path: string,
        params: Record<string, string>,
    ): Promise<NewsblurResponse> {
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
        return json;
    }

    async function fetchPostAPI(
        configs: NewsBlurConfigs,
        path: string,
        params: ParamsObject,
    ): Promise<NewsblurPostResponse> {
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
        const json: NewsblurPostResponse = await response.json();
        return json;
    }

    // Direct API endpoints (exported)

    export async function authenticate(
        configs: NewsBlurConfigs,
    ): Promise<boolean> {
        const response = await fetchPostAPI(configs, "/api/login", {
            username: configs.username,
            password: configs.password,
        });
        return Boolean(response.authenticated);
    }

    export async function fetchFeeds(
        configs: NewsBlurConfigs,
    ): Promise<NewsblurFeed[]> {
        const response = (await fetchGetAPI(configs, "/reader/feeds", {
            flat: "true",
        })) as NewsblurFeedsResponse;
        return Object.values(response.feeds);
    }

    export async function fetchStoriesInFeed(
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
    }

    export async function fetchUnreadStoriesInFeed(
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
    }

    export async function fetchAllStarredStories(
        configs: NewsBlurConfigs,
    ): Promise<NewsblurStory[]> {
        const response = (await fetchGetAPI(
            configs,
            "/reader/starred_stories",
            {},
        )) as NewsblurStoriesResponse;
        return Object.values(response.stories);
    }

    export async function fetchAllStories(
        configs: NewsBlurConfigs,
    ): Promise<NewsblurStory[]> {
        const feeds = await NewsblurAPI.fetchFeeds(configs);
        const promises = feeds.map((feed) =>
            NewsblurAPI.fetchStoriesInFeed(configs, feed.id),
        );
        return (await Promise.all(promises)).flat();
    }

    export async function setRead(
        configs: NewsBlurConfigs,
        serviceRef: string,
        isRead: boolean,
    ) {
        if (isRead) {
            // For some reason, `.code` is always 1.
            // Even when hash is incorrect
            await fetchPostAPI(configs, "/reader/mark_story_hashes_as_read", {
                story_hash: serviceRef,
            });
        } else {
            const res = (await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_unread",
                {
                    story_hash: [serviceRef],
                },
            )) as NewsblurUnreadResponse;
            if (res.code == -1) {
                throw new NewsblurError([res.message!]);
            }
        }
    }

    export async function setStar(
        configs: NewsBlurConfigs,
        serviceRef: string,
        isStarred: boolean,
    ): Promise<void> {
        if (isStarred) {
            const res = (await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_starred",
                {
                    story_hash: serviceRef,
                },
            )) as NewsblurStarResponse;
            if (res.code == -1) {
                throw new NewsblurError([res.message]);
            }
        } else {
            const res = (await fetchPostAPI(
                configs,
                "/reader/mark_story_hash_as_unstarred",
                {
                    story_hash: serviceRef,
                },
            )) as NewsblurUnstarResponse;
            if (res.code == -1) {
                throw new NewsblurError(res.messages);
            }
        }
    }

    export async function markAllAsRead(
        configs: NewsBlurConfigs,
    ): Promise<void> {
        await fetchPostAPI(configs, "/reader/mark_all_as_read", {});
    }
}

// Types

export class NewsblurError extends Error {
    constructor(errors: string[], options?: ErrorOptions) {
        super(errors[0], options);
        this.newsblurErrors = errors;
    }
    newsblurErrors: string[];
}

export interface NewsblurResponse {
    authenticated: boolean;
    user_id: number;
}

export interface NewsblurPostResponse extends NewsblurResponse {
    code: -1 /*error*/ | 1 /*ok*/;
}

export interface NewsblurAuthResponse extends NewsblurPostResponse {
    errors: Record</*reason*/ string, /*long reason*/ string> | null /*ok*/;
}

export interface NewsblurFeedsResponse extends NewsblurResponse {
    feeds: Record</* id: */ string, NewsblurFeed>;
}

export interface NewsblurStoriesResponse extends NewsblurResponse {
    stories: NewsblurStory[];
}

export interface NewsblurStarResponse extends NewsblurPostResponse {
    /** is empty string `""` if `.code` is `1` */
    message: string;
}

export interface NewsblurReadResponse extends NewsblurPostResponse {
    /** Alwasy 1. Never fails for some reason. */
    code: 1;
    story_hashes: string[];
    feed_ids: string[];
}

export interface NewsblurUnreadResponse extends NewsblurPostResponse {
    /** is empty string `""` if `.code` is `1` */
    code: 1 | -1;
    story_hash: string;
    feed_id: string;
    message: string | undefined;
}

export interface NewsblurUnstarResponse extends NewsblurPostResponse {
    /** is empty array `[]` if `.code` is `1` */
    messages: string[];
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

interface NewsblurStory {
    story_hash: string;
    story_timestamp: string;
    story_authors: string;
    score: number;
    read_status: 0 | 1;
    id: string;
    story_feed_id: number; // serviceRef of RSSSource
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
                feeds.map((f) => {
                    const source = new RSSSource(f.feed_address, f.feed_title);
                    source.serviceRef = String(f.id);
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
        for (const source of Object.values(state.sources)) {
            if (source.serviceRef) {
                sourceMap.set(source.serviceRef, source);
            }
        }

        // parse stories
        const stories = await NewsblurAPI.fetchAllStories(configs).then(
            (stories) =>
                stories.map((story): RSSItem => {
                    const source = sourceMap.get(String(story.story_feed_id));

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
                        hasRead: Boolean(story.read_status == 1),
                        starred: Boolean(story.starred),
                        hidden: false,
                        notify: false,
                        serviceRef: String(story.story_hash),
                        // will allow page to load, and get the images
                        // async eventually
                        thumbnailJobs: generateThumbnailAttrList({
                            targetLink: story.id, // url
                            content: story.story_content,
                        }),
                    } as RSSItem;

                    // Apply rules and sync back
                    // prettier-ignore
                    if (source?.rules) {
                        SourceRule.applyAll(source.rules, parsedItem);
                        const readChanged = Boolean(story.read_status == 1) !== parsedItem.hasRead;
                        const starChanged = Boolean(story.starred) !== parsedItem.starred;
                        if (readChanged) NewsblurAPI.setRead(configs, parsedItem.serviceRef, parsedItem.hasRead);
                        if (starChanged) NewsblurAPI.setStar(configs, parsedItem.serviceRef, parsedItem.starred);
                    }

                    return parsedItem;
                }),
        );

        // collect
        let parsedItems: RSSItem[] = (await Promise.all(stories)).flat();

        return [/*RSSItem[]*/ parsedItems, /*ServiceConfigs*/ configs];
    },

    ///////////////////
    // POST REQUESTS //
    ///////////////////

    markAllRead: (_sids, date, _before) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (date == null) {
            // mark all
            await NewsblurAPI.markAllAsRead(configs);
        } else {
            // mark only those after date
            const requests = state.feeds[state.page.feedId].iids
                .map((iid) => state.items[iid])
                .filter((i) => !i.hasRead && i.date.getTime() >= date.getTime())
                .map(async (item) => {
                    // prettier-ignore
                    if (item.serviceRef) {
                        await NewsblurAPI.setRead(configs, item.serviceRef, true);
                    }
                });
            await Promise.all(requests);
        }
    },

    markRead: (item: RSSItem) => async (_, getState) => {
        // Note: could be optimized if instead of making
        // one request for each RSSItem, it makes one request
        // with the hashes of all RSSItem's at once
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            await NewsblurAPI.setRead(configs, item.serviceRef, true);
        }
    },

    markUnread: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            await NewsblurAPI.setRead(configs, item.serviceRef, false);
        }
    },

    star: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            await NewsblurAPI.setStar(configs, item.serviceRef, true);
        }
    },

    unstar: (item: RSSItem) => async (_, getState) => {
        const state = getState();
        const configs = state.service as NewsBlurConfigs;

        if (item.serviceRef) {
            await NewsblurAPI.setStar(configs, item.serviceRef, false);
        }
    },
};
