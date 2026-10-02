import { assert } from "chai";
import { SyncService } from "../../../../src/schema-types";
import {
    type NewsblurAuthResponse,
    type NewsBlurConfigs,
    NewsblurFeedsResponse,
    newsblurServiceHooks,
} from "../../../../src/scripts/models/services/newsblur";
import { afterEach } from "mocha";
import { RSSSource } from "../../../../src/scripts/models/source";

// Configs

const CONFIGS: NewsBlurConfigs = {
    username: "yeah",
    password: "maracuyeah",
    endpoint: new URL("https://newsblur.com/"),
    type: SyncService.NewsBlur,
};

// Possible responses

const NEWSBLUR_AUTH_SUCCESS: NewsblurAuthResponse = {
    authenticated: true,
    code: 1,
    errors: null,
    user_id: 10,
};

const NEWSBLUR_AUTH_ERROR: NewsblurAuthResponse = {
    authenticated: false,
    code: -1,
    errors: {
        __all__: ["Whoopsy-daisy, wrong password. Try again."],
    },
    user_id: 10,
};

const NEWSBLUR_UPDATE_SOURCES: NewsblurFeedsResponse = {
    feeds: {
        "8268588": {
            id: 8268588,
            feed_title: "xkcd.com",
            feed_address: "https://xkcd.com/atom.xml",
            feed_link: "https://xkcd.com/",
            last_story_date: "2026-07-06T00:00:00",
        },
        "8356326": {
            id: 8356326,
            feed_title: "Pivot",
            feed_address: "https://pivot.quebec/feed/",
            feed_link: "https://pivot.quebec/",
            last_story_date: "2026-07-06T20:40:59",
        },
    },
    user_id: 753313,
    authenticated: true,
};

// Mock

let original = {
    fetch: null as null | typeof fetch,
    consoleError: null as null | typeof console.error,
};
const mockFetch = (fn: () => Promise<Response | never>) => {
    if (original.fetch == null) {
        original.fetch = fetch;
        global.fetch = fn;
    } else {
        throw new Error("fetch already mocked");
    }
};
const mockConsoleError = (fn: typeof console.error) => {
    if (original.consoleError == null) {
        original.consoleError = console.error;
        console.error = fn;
    } else {
        throw new Error("console.error already mocked");
    }
};
const unmock = () => {
    if (original.fetch != null) {
        global.fetch = original.fetch;
        original.fetch = null;
    }
    if (original.consoleError != null) {
        console.error = original.consoleError;
        original.consoleError = null;
    }
};

// Tests

describe("newsblurServiceHooks", () => {
    afterEach(unmock);
    // 1. can authenticate
    it("can authenticate", async () => {
        mockFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(NEWSBLUR_AUTH_SUCCESS)),
            ),
        );
        const authenticated =
            await newsblurServiceHooks.authenticate?.(CONFIGS);
        assert.equal(authenticated, true);
    });
    it("wont authenticate", async () => {
        mockFetch(() =>
            Promise.reject(new Response(JSON.stringify(NEWSBLUR_AUTH_ERROR))),
        );
        mockConsoleError((err) => {
            assert.exists(err);
        });
        const authenticated =
            await newsblurServiceHooks.authenticate?.(CONFIGS);
        assert.equal(authenticated, false);
    });
    // 2. can get sources
    it("can update sources", async () => {
        mockFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(NEWSBLUR_UPDATE_SOURCES)),
            ),
        );
        const updater = newsblurServiceHooks.updateSources?.();
        assert.exists(updater);
        const mockDispatch: any = (_d: any, _payload: any) => {
            return null;
        };
        const mockGetState: () => any = () => {
            return {
                service: CONFIGS,
            };
        };
        const result = await updater(mockDispatch, mockGetState, null);
        assert.equal(result.length, 2);
        const [sources] = result;
        assert.equal(sources.length, 2);
        assert.equal(sources[0].name, "xkcd.com");
        assert.equal(sources[1].serviceRef, "8356326");
    });
    // 3. can sync with service
    // 4. can fetch from/to service
    // 5. can mark unreads and start
});
