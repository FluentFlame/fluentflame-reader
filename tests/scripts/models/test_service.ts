// Must come first before any db imports.
import "fake-indexeddb/auto";

import { expect } from "chai"
import { JSDOM } from "jsdom"
import { SyncService } from "../../../src/schema-types";
import { FeverConfigs } from "../../../src/scripts/models/services/fever";
import { getServiceHooks } from "../../../src/scripts/models/service";

const FEVER_CONFIGS: FeverConfigs = {
    type: SyncService.Fever,
    endpoint: "https://rss.example.net/api/fever.php",
    username: "RainbowDash",
    apiKey: "abcedefghijk12345",
    fetchLimit: 5,
    lastId: 0,
    useInt32: false,
};

describe("service", () => {
    const mocks: any = {};

    beforeEach(() => {
        const window = (new JSDOM()).window;
        window["settings"] = {
            saveGroups: (_x: any) => {},
        } as any;
        mocks.window = global.window;
        global.window = window as any;
    });

    afterEach(() => {
        global.window = mocks.window;
    });

    it("can run getServiceHooks", () => {
        const mockGetState: () => any = () => {
            return {service: FEVER_CONFIGS};
        };
        const hooks = getServiceHooks()(undefined, mockGetState, undefined);
        // We aren't doing enough mocking to actually run any hook here.
        expect(hooks.authenticate).to.not.equal(undefined);
    });
})
