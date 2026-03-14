import * as fetchPool from "../../src/scripts/fetch-pool";
import { expect, assert } from "chai";

describe("fetchPool", () => {
    const mocks: any = {};

    beforeEach(() => {
        mocks.fetch = global.fetch;
        global.fetch = async (_a: any, _b: any) => {
            return null;
        };
    });

    afterEach(() => {
        global.fetch = mocks.fetch;
    });

    it("can fetch", () => {
        const pool: fetchPool.Pool = {
            total: 2,
            refill_rate: 0,
            __available: 2,
            __started: true,
        };
        return fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
    });

    it("can fetch twice", async () => {
        const pool: fetchPool.Pool = {
            total: 2,
            refill_rate: 0,
            __available: 2,
            __started: true,
        };
        await fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
        return fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
    });

    it("can't fetch thrice", async () => {
        const pool: fetchPool.Pool = {
            total: 2,
            refill_rate: 0,
            __available: 2,
            __started: true,
        };
        await fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
        await fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
        try {
            await fetchPool.fetchPool("hello", undefined, 10, pool);
        } catch (e) {
            expect(e.message).contains("fetchPool: Timeout");
            return;
        }
        assert.fail("Fetched three times");
    });

    it("can't fetch with none available", async () => {
        const pool: fetchPool.Pool = {
            total: 1,
            refill_rate: 0,
            __available: 0,
            __started: true,
        };
        try {
            await fetchPool.fetchPool(
                "https://a.url.here",
                undefined,
                50,
                pool,
            );
        } catch (e) {
            expect(e.message).contains("fetchPool: Timeout");
            return;
        }
        assert.fail("Should not be able to fetch");
    });

    it("can refill", async () => {
        const pool: fetchPool.Pool = {
            total: 1,
            refill_rate: 1000,
            __available: 0,
            __started: false,
        };
        const timeout = fetchPool.startPool(pool);
        await fetchPool.fetchPool("https://a.url.here", undefined, 0, pool);
        fetchPool.stopPool(timeout);
    });
});
