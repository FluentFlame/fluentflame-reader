import { assert } from "chai";
import { SyncService } from "../../../../src/schema-types";
import {
    type NewsblurAuthResponse,
    type NewsBlurConfigs,
    NewsblurFeedsResponse,
    newsblurServiceHooks,
    NewsblurStoriesResponse,
} from "../../../../src/scripts/models/services/newsblur";
import { afterEach } from "mocha";

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

const FEED_XKCD_ID = "8268588";
const FEED_PIVOT_ID = "8356326";

const NEWSBLUR_FETCH_FEEDS: NewsblurFeedsResponse = {
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

const NEWSBLUR_FETCH_STORIES_XKCD: NewsblurStoriesResponse = {
    stories: [
        {
            story_hash: "8268588:2ff858",
            story_timestamp: "1792108800",
            story_authors: "",
            story_title: "Momentum Demonstration",
            story_content:
                '<img alt="&quot;I\'m doing really well on the Hertzsprung-Russell academic diagram, which has spectral class on one axis and Rate My Professors rating on the other.&quot;" src="https://imgs.xkcd.com/comics/momentum_demonstration.png" title="&quot;I\'m doing really well on the Hertzsprung-Russell academic diagram, which has spectral class on one axis and Rate My Professors rating on the other.&quot;" />',
            image_urls: [
                "https://imgs.xkcd.com/comics/momentum_demonstration.png",
            ],
            secure_image_urls: {
                "https://imgs.xkcd.com/comics/momentum_demonstration.png":
                    "https://imageproxy.newsblur.com/sc,sBGIwcWeIutxkA_3NmNkDScPoVrOYG1C11fL8aDVzCU0=/https://imgs.xkcd.com/comics/momentum_demonstration.png",
            },
            secure_image_thumbnails: {
                "https://imgs.xkcd.com/comics/momentum_demonstration.png":
                    "https://imageproxy.newsblur.com/192,sc,sBGIwcWeIutxkA_3NmNkDScPoVrOYG1C11fL8aDVzCU0=/https://imgs.xkcd.com/comics/momentum_demonstration.png",
            },
            story_feed_id: 8268588,
            id: "https://xkcd.com/3312/",
            score: 0,
            read_status: 0,
        },
        {
            story_hash: "8268588:e7b90f",
            story_timestamp: "1791936000",
            story_authors: "",
            story_title: "Planet Database",
            story_content:
                '<img alt="Atmospheric transmission spectroscopy has revealed that the sunsets from the observatory are really pretty." src="https://imgs.xkcd.com/comics/planet_database.png" title="Atmospheric transmission spectroscopy has revealed that the sunsets from the observatory are really pretty." />',
            image_urls: ["https://imgs.xkcd.com/comics/planet_database.png"],
            secure_image_urls: {
                "https://imgs.xkcd.com/comics/planet_database.png":
                    "https://imageproxy.newsblur.com/sc,swBb0H7aLJ4-qWHlcMql9mGdK-1Ya0s6ZVJjpqZE3c90=/https://imgs.xkcd.com/comics/planet_database.png",
            },
            secure_image_thumbnails: {
                "https://imgs.xkcd.com/comics/planet_database.png":
                    "https://imageproxy.newsblur.com/192,sc,swBb0H7aLJ4-qWHlcMql9mGdK-1Ya0s6ZVJjpqZE3c90=/https://imgs.xkcd.com/comics/planet_database.png",
            },
            story_feed_id: 8268588,
            id: "https://xkcd.com/3311/",
            score: 0,
            read_status: 0,
        },
    ],
    authenticated: true,
    user_id: 753313,
};

const NEWSBLUR_FETCH_STORIES_PIVOT: NewsblurStoriesResponse = {
    stories: [
        {
            story_hash: "8356326:56e7b7",
            story_timestamp: "1788900032",
            story_authors: "Bifan Sun",
            story_title:
                "L’immigration est-elle la cause du manque d’espace dans les écoles?",
            story_content:
                '<p class="wp-block-paragraph"><strong>Le chef du Parti qu&eacute;b&eacute;cois, Paul St-Pierre Plamondon, lie l&rsquo;immigration et le manque d&rsquo;espace dans les &eacute;coles pour justifier une baisse &laquo;&nbsp;significative&nbsp;&raquo; du seuil d&rsquo;immigration. Des partis d&rsquo;opposition et des chercheur&middot;euses soulignent cependant que le probl&egrave;me rel&egrave;ve de multiples facteurs et qu&rsquo;il d&eacute;coule surtout d&rsquo;une n&eacute;gligence de longue date en mati&egrave;re d&rsquo;infrastructures scolaires.</strong></p>',
            image_urls: [
                "https://public.flourish.studio/visualisation/30192227/thumbnail",
                "https://public.flourish.studio/visualisation/30193225/thumbnail",
                "https://public.flourish.studio/visualisation/30193135/thumbnail",
                "https://public.flourish.studio/visualisation/30192959/thumbnail",
            ],
            secure_image_urls: {
                "https://public.flourish.studio/visualisation/30192227/thumbnail":
                    "https://imageproxy.newsblur.com/sc,sL2SefEt70DIsmcQ_I0cm1nxmNja8pM8dJMKll4be23I=/https://public.flourish.studio/visualisation/30192227/thumbnail",
                "https://public.flourish.studio/visualisation/30193225/thumbnail":
                    "https://imageproxy.newsblur.com/sc,sSIRWtqZbv43qxchGAL11gl3zlHxG0nOSPD5Bx5uQTTg=/https://public.flourish.studio/visualisation/30193225/thumbnail",
                "https://public.flourish.studio/visualisation/30193135/thumbnail":
                    "https://imageproxy.newsblur.com/sc,sjPjrfsexbLKckoFN4v29NeD7RjPfd9QJPWqvLLrNw4E=/https://public.flourish.studio/visualisation/30193135/thumbnail",
                "https://public.flourish.studio/visualisation/30192959/thumbnail":
                    "https://imageproxy.newsblur.com/sc,sEIOIPDpNzgI0AF6exh0UxmSL8wH6gTB4RfMzS4PvhrA=/https://public.flourish.studio/visualisation/30192959/thumbnail",
            },
            secure_image_thumbnails: {},
            story_feed_id: 8356326,
            id: "https://pivot.quebec/?p=11641",
            score: 0,
            read_status: 0,
        },
        {
            story_hash: "8356326:0b5f06",
            story_timestamp: "1788813396",
            story_authors: "Ludvic Moquin-Beaudry",
            story_title: "Épisode 2 – Le début d’une tendance?",
            story_content:
                '<p class="wp-block-paragraph">Cette semaine, Ludvic Isaac et Gabrielle discutent du d&eacute;but de campagne difficile pour le PQ et le PLQ, des signaux positifs pour la CAQ et QS et du PCQ qui peinture dans un coin.&nbsp;</p><p class="wp-block-paragraph"><a href="https://youtu.be/CF9r-DvBZVk" rel="noopener" target="_blank">Suivez-nous aussi sur Youtube</a></p><p class="wp-block-paragraph">Bonne &eacute;coute!&nbsp;</p>',
            image_urls: [],
            secure_image_urls: {},
            secure_image_thumbnails: {},
            story_feed_id: 8356326,
            id: "https://pivot.quebec/?p=11628",
            score: 0,
            read_status: 0,
        },
    ],
    authenticated: true,
    user_id: 753313,
};

const NEWSBLUR_FETCH_STARRED: NewsblurStoriesResponse = {
    stories: [
        {
            story_hash: "8268588:e4087c",
            story_timestamp: "1782259200",
            story_authors: "",
            story_title: "Baryon Asymmetry",
            story_content:
                "<img alt=\"Wait, what do you mean, 'dark matter'? It's not dark, it interacts with high-energy gamma rays ... right? Oh jeez, did I forget to make it interact?\" src=\"https://imgs.xkcd.com/comics/baryon_asymmetry.png\" title=\"Wait, what do you mean, 'dark matter'? It's not dark, it interacts with high-energy gamma rays ... right? Oh jeez, did I forget to make it interact?\" />",
            image_urls: ["https://imgs.xkcd.com/comics/baryon_asymmetry.png"],
            secure_image_urls: {
                "https://imgs.xkcd.com/comics/baryon_asymmetry.png":
                    "https://imageproxy.newsblur.com/sc,sg7KEFIhuxjBwPJBO7xlREP6hGiz0Rwk909FipjavmJE=/https://imgs.xkcd.com/comics/baryon_asymmetry.png",
            },
            secure_image_thumbnails: {
                "https://imgs.xkcd.com/comics/baryon_asymmetry.png":
                    "https://imageproxy.newsblur.com/192,sc,sg7KEFIhuxjBwPJBO7xlREP6hGiz0Rwk909FipjavmJE=/https://imgs.xkcd.com/comics/baryon_asymmetry.png",
            },
            story_feed_id: 8268588,
            id: "https://xkcd.com/3263/",
            read_status: 0,
            starred: true,
        },
    ],
    authenticated: true,
    user_id: 753313,
};

// Mock

let original = {
    fetch: null as null | typeof fetch,
    consoleError: null as null | typeof console.error,
};
const mockFetch = (fn: typeof fetch) => {
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
        mockFetch(() => makeResponse(NEWSBLUR_AUTH_SUCCESS));
        const authenticated =
            await newsblurServiceHooks.authenticate?.(CONFIGS);
        assert.equal(authenticated, true);
    });
    it("wont authenticate", async () => {
        mockFetch(() => makeBadResponse(NEWSBLUR_AUTH_ERROR));
        mockConsoleError((err) => {
            assert.exists(err);
        });
        const authenticated =
            await newsblurServiceHooks.authenticate?.(CONFIGS);
        assert.equal(authenticated, false);
    });
    // 2. can get sources
    it("can update sources", async () => {
        mockFetch(() => makeResponse(NEWSBLUR_FETCH_FEEDS));
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
    it("can sync with service", async () => {
        mockFetch((req, _) => {
            const url = //
                req instanceof URL
                    ? req
                    : new URL(req instanceof Request ? req.url : req);
            if (url.pathname == "/reader/feeds") {
                return makeResponse(NEWSBLUR_FETCH_FEEDS);
            } else if (url.pathname.startsWith("/reader/feed/")) {
                switch (url.pathname.split("/").at(-1)) {
                    case FEED_PIVOT_ID:
                        return makeResponse(NEWSBLUR_FETCH_STORIES_PIVOT);
                    case FEED_XKCD_ID:
                        return makeResponse(NEWSBLUR_FETCH_STORIES_XKCD);
                }
            } else if (url.pathname == "/reader/starred_stories") {
                return makeResponse(NEWSBLUR_FETCH_STARRED);
            }
            return makeBadResponse("Url not recognized");
        });

        assert.exists(newsblurServiceHooks.syncItems);

        const mockDispatch: any = (_d: any, _payload: any) => null;
        const mockGetState: any = () => ({ service: CONFIGS });
        const [unreads, starreds] = await newsblurServiceHooks.syncItems()(
            mockDispatch,
            mockGetState,
            undefined,
        );
        assert.equal(
            unreads.size,
            NEWSBLUR_FETCH_STORIES_PIVOT.stories.length +
                NEWSBLUR_FETCH_STORIES_XKCD.stories.length,
        );
        assert.equal(starreds.size, NEWSBLUR_FETCH_STARRED.stories.length);
    });
    // 4. can fetch from/to service
    // 5. can mark unreads and start
});

// Helpers

const makeResponse = (object: object) =>
    Promise.resolve(new Response(JSON.stringify(object)));

const makeBadResponse = (object?: object | string) =>
    Promise.reject(new Response(JSON.stringify(object)));
