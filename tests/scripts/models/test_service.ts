// Must come first before any db imports.
import "fake-indexeddb/auto";

import { expect, assert } from "chai"
import { JSDOM } from "jsdom"
import { ServiceConfigs, SyncService } from "../../../src/schema-types";
import { FeverConfigs } from "../../../src/scripts/models/services/fever";
import { getServiceHooks, syncWithService } from "../../../src/scripts/models/service";

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
    beforeEach(() => {
        const window = (new JSDOM()).window;
        window["settings"] = {
            saveGroups: (_x: any) => {},
        };
        global.window = window;
    })

    it("can run getServiceHooks", () => {
        const mockGetState: () => any = () => {
            return {service: FEVER_CONFIGS};
        };
        const hooks = getServiceHooks()(undefined, mockGetState, undefined);
        // We aren't doing enough mocking to actually run any hook here.
        expect(hooks.authenticate).to.not.equal(undefined);
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
        };
        assert.isTrue(await syncWithService()(
            mockDispatch as any,
            mockGetState,
            undefined
        ));
    });
})
