import { expect } from "chai";
import {
    NewsBlurConfig,
    newsblurFetchItems,
    NewsBlurResponse,
    newsblurServiceHooks,
} from "../../../../src/scripts/models/services/newsblur";
import { SyncService } from "../../../../src/schema-types";

if (!process.env.NEWSBLUR_USERNAME || !process.env.NEWSBLUR_PASSWORD) {
    console.error(
        "Cannot do NEWSBLUR tests. Environment variables are incorrect.",
    );
    process.exit(1);
}

const CONFIGS: NewsBlurConfig = {
    type: SyncService.NewsBlur,
    endpoint: "https://newsblur.com/",
    username: process.env.NEWSBLUR_USERNAME,
    password: process.env.NEWSBLUR_PASSWORD,
};

describe("newsblurServiceHooks", () => {
    let configs: NewsBlurConfig = Object.assign(CONFIGS);

    it("authenticates", async () => {
        const result = await newsblurServiceHooks.authenticate(configs);
        expect(result).to.equal(true);
        expect(configs._cookie.length).to.be.greaterThan(0);
    });

    it("fetchesFeeds", async () => {
        const response: NewsBlurResponse = await newsblurFetchItems(configs);
        expect(response.result).to.equal("ok");
        expect(response.authenticated).to.equal(true);
    });
});
