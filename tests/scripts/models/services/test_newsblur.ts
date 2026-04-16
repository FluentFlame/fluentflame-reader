import { expect } from "chai";
import {
    NewsBlurConfig,
    newsblurFetchItems,
    NewsBlurResponse,
    newsblurServiceHooks,
} from "../../../../src/scripts/models/services/newsblur";
import { SyncService } from "../../../../src/schema-types";

const CONFIGS: NewsBlurConfig = {
    type: SyncService.NewsBlur,
    endpoint: "https://newsblur.com/",
    username: "test",
    password: "test",
    _test: false,
};

const NEWSBLUR_LOGIN_RESPONSE_OK = {
    code: 1,
    errors: null,
    result: "ok",
    authenticated: true,
    user_id: 10000,
};

const NEWSBLUR_LOGIN_RESPONSE_WRONG = {
    code: -1,
    errors: { __all__: ["Whoopsy-daisy, wrong password. Try again."] },
    result: "ok",
    authenticated: false,
};

/**
 * This is an example of a response returned by Newsblur
 */
const NEWSBLUR_FEEDS_RESPONSE = {
    feeds: {
        "8356326": {
            id: 8356326,
            feed_title: "Pivot",
            feed_address: "https://pivot.quebec/feed/",
            feed_link: "https://pivot.quebec/",
            num_subscribers: 12,
            updated: "7 minutes",
            updated_seconds_ago: 447,
            fs_size_bytes: 10587111,
            archive_count: 350,
            last_story_date: "2026-04-02T20:07:55",
            last_story_seconds_ago: 271017,
            stories_last_month: 33,
            average_stories_per_month: 39,
            min_to_decay: 15,
            subs: 12,
            is_push: false,
            is_newsletter: false,
            is_webfeed: false,
            is_daily_briefing: false,
            fetched_once: true,
            search_indexed: true,
            discover_indexed: null,
            not_yet_fetched: false,
            favicon_color: "00FF33",
            favicon_fade: "00FF33",
            favicon_border: "00FF33",
            favicon_text_color: "white",
            favicon_fetching: false,
            favicon_url:
                "https://s3.amazonaws.com/icons.newsblur.com/10000.png",
            s3_page: false,
            s3_icon: true,
            disabled_page: false,
            similar_feeds: [252476, 6669234, 8148957, 6256945, 1198076],
            ps: 0,
            nt: 29,
            ng: 0,
            active: true,
            feed_opens: 6,
            subscribed: true,
        },
    },
    social_feeds: [],
    social_profile: {
        id: "social:10000",
        user_id: 10000,
        username: "user",
        photo_url:
            "https://www.newsblur.com/media/img/reader/default_profile_photo.png",
        large_photo_url:
            "https://www.newsblur.com/media/img/reader/default_profile_photo.png",
        location: null,
        num_subscribers: 0,
        feed_title: "user's blurblog",
        feed_address: "http://www.newsblur.com/social/rss/10000/user",
        feed_link: "https://user.newsblur.com/",
        protected: null,
        private: null,
        active: true,
        bio: null,
        website: null,
        shared_stories_count: 0,
        following_count: 0,
        follower_count: 0,
        popular_publishers: null,
        stories_last_month: 0,
        average_stories_per_month: 0,
        photo_service: null,
        following_user_ids: [],
        follower_user_ids: [],
    },
    social_services: {
        twitter: {
            twitter_username: null,
            twitter_picture_url: null,
            twitter_uid: null,
            syncing: false,
        },
        facebook: {
            facebook_uid: null,
            facebook_picture_url: null,
            syncing: false,
        },
        gravatar: {
            gravatar_picture_url:
                "https://www.gravatar.com/avatar/3xample4vatarur1",
        },
        upload: {
            upload_picture_url: null,
        },
    },
    user_profile: {
        is_premium: true,
        is_archive: false,
        is_pro: false,
        is_premium_trial: true,
        trial_days_remaining: 27,
        can_start_trial: false,
        premium_expire: 1777773971,
        preferences: {
            briefing_enabled: true,
            intro_page: "3",
        },
        tutorial_finished: false,
        hide_getting_started: false,
        hide_trial_module: false,
        has_setup_feeds: true,
        has_found_friends: true,
        has_trained_intelligence: false,
        dashboard_date: "2026-04-03 02:06:11.114409",
    },
    is_staff: false,
    user_id: 10000,
    folders: [8356326],
    starred_count: 0,
    starred_counts: [
        {
            tag: null,
            count: 0,
            is_highlights: null,
            feed_address:
                "https://www.newsblur.com/reader/starred_rss/10000/abcdef12345/",
            active: true,
            feed_id: null,
        },
    ],
    saved_searches: [],
    dashboard_rivers: [
        {
            river_id: "river:",
            river_side: "left",
            river_order: 0,
        },
        {
            river_id: "river:infrequent",
            river_side: "left",
            river_order: 1,
        },
        {
            river_id: "river:global",
            river_side: "left",
            river_order: 2,
        },
    ],
    categories: null,
    folder_icons: {},
    feed_icons: {},
    folder_auto_mark_read: {},
    playback_state: null,
    share_ext_token: "abcdef12345",
    result: "ok",
    authenticated: true,
};

describe("newsblurServiceHooks", () => {
    let configs: NewsBlurConfig = CONFIGS;

    it("auth correct", async () => {
        configs._test = (url) => {
            expect(url.toString()).to.equal("https://newsblur.com/api/login");
            return JSON.stringify(NEWSBLUR_LOGIN_RESPONSE_OK);
        };
        const result = await newsblurServiceHooks.authenticate(configs);
        expect(result).to.equal(true);
    });

    it("auth incorrect", async () => {
        configs._test = (url) => {
            expect(url.toString()).to.equal("https://newsblur.com/api/login");
            return JSON.stringify(NEWSBLUR_LOGIN_RESPONSE_WRONG);
        };
        const result = await newsblurServiceHooks.authenticate(configs);
        expect(result).to.equal(false);
    });

    it("fetchesFeeds", async () => {
        configs._test = (url) => {
            expect(url.toString()).to.equal(
                "https://newsblur.com/reader/feeds",
            );
            return JSON.stringify(NEWSBLUR_FEEDS_RESPONSE);
        };
        const response: NewsBlurResponse = await newsblurFetchItems(configs);
        expect(response.result).to.equal("ok");
        expect(response.authenticated).to.equal(true);
        expect(Object.keys(response.feeds).length).to.be.greaterThan(0);
    });
});
