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
        const pool = new fetchPool.Pool(2, 0, 2);
        pool.__started = true;
        return pool.fetch("https://a.url.here");
    });

    it("can fetch twice", async () => {
        const pool = new fetchPool.Pool(2, 0, 2);
        pool.__started = true;
        await pool.fetch("https://a.url.here");
        return pool.fetch("https://a.url.here");
    });

    it("can't fetch thrice", async () => {
        const pool = new fetchPool.Pool(2, 0, 2);
        pool.__started = true;
        await pool.fetch("https://a.url.here");
        await pool.fetch("https://a.url.here");
        try {
            await pool.fetch("hello", undefined, 10);
        } catch (e) {
            expect(e.message).contains("fetchPool: Timeout");
            return;
        }
        assert.fail("Fetched three times");
    });

    it("can't fetch with none available", async () => {
        const pool: fetchPool.Pool = new fetchPool.Pool(1, 0, 0);
        pool.__started = true;
        try {
            await pool.fetch("https://a.url.here", undefined, 50);
        } catch (e) {
            expect(e.message).contains("fetchPool: Timeout");
            return;
        }
        assert.fail("Should not be able to fetch");
    });

    it("can refill", async () => {
        const pool = new fetchPool.Pool(1, 1000, 0);
        fetchPool.startPool(pool);
        await pool.fetch("https://a.url.here");
        fetchPool.stopPool(pool);
    });
});
