// Must come first before any db imports.
import "fake-indexeddb/auto";

import { assert, expect } from "chai";
import { JSDOM } from "jsdom";
import { RSSSource } from "../../../../src/scripts/models/source";
import { SyncService } from "../../../../src/schema-types";
import {
    FeverConfigs,
    feverServiceHooks,
} from "../../../../src/scripts/models/services/fever";
import { syncWithService } from "../../../../src/scripts/models/service";

// FIXTURES ---------------------------------------------------------------------------------------

const FEVER_PHP_API = {
    request: {
        request_url: "https://rss.example.net/api/fever.php?api",
        request_method: "POST",
    },
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 0,
    },
};

const FEVER_PHP_UNREAD_ITEM_IDS = {
    request: {
        request_url:
            "https://rss.example.net/api/fever.php?api&unread_item_ids",
        request_method: "POST",
    },
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 1773472029,
        unread_item_ids: "",
    },
};

const FEVER_PHP_FEEDS = {
    request: {
        request_url: "https://rss.example.net/api/fever.php?api&feeds",
        request_method: "POST",
    },
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 0,
        feeds: [
            {
                id: 2,
                favicon_id: 2,
                title: "My Feed Title",
                url: "https:\/\/feed_example.net\/article_feed.atom",
                site_url: "https:\/\/feed_example.net\/",
                is_spark: 0,
                last_updated_on_time: 1772845035,
            },
            {
                id: 1,
                favicon_id: 1,
                title: "FreshRSS releases",
                url: "https:\/\/github.com\/FreshRSS\/FreshRSS\/releases.atom",
                site_url: "https:\/\/github.com\/FreshRSS\/FreshRSS\/",
                is_spark: 0,
                last_updated_on_time: 0,
            },
        ],
        feeds_groups: [
            {
                group_id: 2,
                feed_ids: "2",
            },
            {
                group_id: 1,
                feed_ids: "1",
            },
        ],
    },
};

const FEVER_PHP_GROUPS = {
    request: {
        request_url: "https://rss.example.net/api/fever.php?api&groups",
        request_method: "POST",
    },
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 0,
        groups: [
            {
                id: 2,
                title: "Test",
            },
            {
                id: 1,
                title: "Uncategorized",
            },
        ],
        feeds_groups: [
            {
                group_id: 2,
                feed_ids: "2",
            },
            {
                group_id: 1,
                feed_ids: "1",
            },
        ],
    },
};

const FEVER_PHP_SAVED_ITEM_IDS = {
    request: {
        request_url: "https://rss.example.net/api/fever.php?api&saved_item_ids",
        request_method: "POST",
    },
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 1773472029,
        saved_item_ids: "",
    },
};

const FEVER_PHP_ITEMS = {
    response: {
        api_version: 4,
        auth: 1,
        last_refreshed_on_time: 0,
        // Might want to add some real items here, but this is sufficient for now.
        items: [],
    },
};

const FEVER_CONFIGS: FeverConfigs = {
    type: SyncService.Fever,
    endpoint: "https://rss.example.net/api/fever.php",
    username: "TwilightSparkle",
    apiKey: "abcedefghijk12345",
    fetchLimit: 5,
    lastId: 0,
    useInt32: false,
};

// UTILS ------------------------------------------------------------------------------------------

async function mockFetch(
    resource: string | URL | Request,
    _options: any,
): Promise<Response> {
    let realResource: string;
    if (typeof resource === "string") {
        realResource = resource;
    } else if (resource.toString != undefined) {
        realResource = resource.toString();
    } else {
        throw Error("Can't handle Requests; this is a problem with the test.");
    }

    if (realResource === FEVER_PHP_API.request.request_url) {
        return new Response(JSON.stringify(FEVER_PHP_API.response));
    }
    if (realResource === FEVER_PHP_FEEDS.request.request_url) {
        return new Response(JSON.stringify(FEVER_PHP_FEEDS.response));
    }
    if (realResource === FEVER_PHP_GROUPS.request.request_url) {
        return new Response(JSON.stringify(FEVER_PHP_GROUPS.response));
    }
    if (realResource === FEVER_PHP_SAVED_ITEM_IDS.request.request_url) {
        return new Response(JSON.stringify(FEVER_PHP_SAVED_ITEM_IDS.response));
    }
    if (realResource == FEVER_PHP_UNREAD_ITEM_IDS.request.request_url) {
        return new Response(JSON.stringify(FEVER_PHP_UNREAD_ITEM_IDS.response));
    }
    if (
        realResource.startsWith(
            "https://rss.example.net/api/fever.php?api&items",
        )
    ) {
        return new Response(JSON.stringify(FEVER_PHP_ITEMS.response));
    }
    throw Error(`Not a valid resource: ${resource}`);
}

// TESTS ------------------------------------------------------------------------------------------

describe("feverServiceHooks", () => {
    const mocks: any = {};

    beforeEach(() => {
        mocks.fetch = global.fetch;
        global.fetch = mockFetch;

        const window = new JSDOM().window;
        window["settings"] = {
            saveGroups: (_x: any) => {},
        } as any;
        mocks.window = global.window;
        global.window = window as any;
    });

    afterEach(() => {
        global.fetch = mocks.fetch;
        global.window = mocks.window;
    });

    it("can authenticate", async () => {
        const result = await feverServiceHooks.authenticate(FEVER_CONFIGS);
        expect(result).to.equal(true);
    });

    it("can update sources", async () => {
        const updater = feverServiceHooks.updateSources();
        const mockDispatch: any = (_d: any, _payload: any) => {
            return null;
        };
        const mockGetState: () => any = () => {
            return {
                service: FEVER_CONFIGS,
                sources: {
                    1: {
                        sid: 1,
                    },
                    2: {
                        sid: 2,
                    },
                },
            };
        };
        const result = await updater(mockDispatch, mockGetState, null);
        const sourceFromFeedResponse: (resp: any) => RSSSource = (
            resp: any,
        ) => {
            const source = new RSSSource(resp.url, resp.title);
            source.serviceRef = String(resp.id);
            return source;
        };
        const expectedFeeds: RSSSource[] = FEVER_PHP_FEEDS.response.feeds.map(
            sourceFromFeedResponse,
        );
        expect(result[0].length).to.equal(expectedFeeds.length);
        for (let i = 0; i < result[0].length; i++) {
            expect(result[0][i].hidden).to.equal(expectedFeeds[i].hidden);
            expect(result[0][i].name).to.equal(expectedFeeds[i].name);
            expect(result[0][i].serviceRef).to.equal(
                expectedFeeds[i].serviceRef,
            );
            expect(result[0][i].url).to.equal(expectedFeeds[i].url);
        }
    });

    it("can sync with service", async () => {
        const mockGetState: () => any = () => {
            return {
                app: {
                    settings: {
                        saving: false,
                    },
                },
                service: FEVER_CONFIGS,
                sources: {
                    1: {
                        sid: 1,
                    },
                    2: {
                        sid: 2,
                    },
                },
            };
        };
        function mockDispatch(d: any, _payload: any): any {
            if (typeof d === "function") {
                return d(mockDispatch, mockGetState);
            }
            return null;
        }
        assert.isTrue(
            await syncWithService()(
                mockDispatch as any,
                mockGetState,
                undefined,
            ),
        );
    });
});
