import { assert } from "chai";
import { SyncService } from "../../../../src/schema-types";
import {
    type NewsblurAuthResponse,
    type NewsBlurConfigs,
    newsblurServiceHooks,
} from "../../../../src/scripts/models/services/newsblur";

const CONFIGS: NewsBlurConfigs = {
    username: "yeah",
    password: "maracuyeah",
    endpoint: new URL("https://newsblur.com/"),
    type: SyncService.NewsBlur,
};

const NEWSBLUR_AUTH_SUCCESS: NewsblurAuthResponse = {
    authenticated: true,
    code: 1,
    errors: null,
    user_id: 10,
};

let original: typeof fetch | null = null;
const mockFetch = (fn: () => Promise<Response | never>) => {
    if (original != null) {
        original = fetch;
    }
    global.fetch = fn;
};
const unmock = () => {
    if (original) {
        global.fetch = original;
    }
    original = null;
};

describe("newsblurServiceHooks", () => {
    // 1. can authenticate
    it("can authenticate", async () => {
        mockFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(NEWSBLUR_AUTH_SUCCESS)),
            ),
        );
        const authenticated =
            await newsblurServiceHooks.authenticate?.(CONFIGS);
        assert(authenticated);
        unmock();
    });
    // 2. can get sources
    // 3. can sync with service
    // 4. can fetch from/to service
    // 5. can mark unreads and start
});
