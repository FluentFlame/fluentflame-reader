import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";

export interface NewsBlurConfig extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: string; // url
    username: string;
    password: string;
    fetchLimit: number;
    lastId?: number;
}

async function fetchGetAPI(
    configs: NewsBlurConfig,
    params: Record<string, string>,
) {
    // encode params
    const paramsSearch = new URLSearchParams(params);
    // set url
    const url = new URL(configs.endpoint);
    url.search = paramsSearch.toString();
    // set headers
    const headers = new Headers();
    // ...
    // send
    const response = await fetch(url, { headers });
    // return
    return response;
}

async function fetchPostAPI(
    configs: NewsBlurConfig,
    params: Record<string, string>,
) {
    // set url
    const url = new URL(configs.endpoint);
    // set headers
    const headers = new Headers();
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    // set body & encode params
    const body = new URLSearchParams(params);
    // send
    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
    });
    // parse response
    const json = await response.json();
    // print errors
    printErrors(json);

    return json;
}

function printErrors(response: NewsBlurResponse) {
    if (response.errors) return;
    for (const error in response.errors) {
        console.error(
            `[service: NewsBlur] ${error}: ${response.errors[error]}`,
        );
    }
}

interface NewsBlurResponse {
    code: -1 /*error*/ | 1 /*ok*/;
    errors: Record<string /*reason*/, string /*long reason*/> | null /*ok*/;
    result: "ok";
    authenticated: boolean;
    user_id: number;
}

// Hooks (the api)
export const newsblurServiceHooks: ServiceHooks = {
    authenticate: async (configs: NewsBlurConfig) => {
        /*
         * POST /api/login
         *
         * Login as an existing user.
         * | Parameter | Description         | Example    |
         * |-----------|---------------------|------------|
         * | username  | Username (required) | samuelclay |
         * | password  | Password            | new$blur   |
         *
         * Tips:
         * - If a user has no password set, you cannot just send any old password. This is not Instapaper.
         */
        try {
            // get and parse response
            const response = await fetchPostAPI(configs, {
                username: configs.username,
                password: configs.password,
            });
            // correct?
            return response.authenticated === true;
        } catch {
            return false;
        }
    },

    updateSources: () => async (dispatch, getState) => {
        throw new Error("todo!");
    },

    syncItems: () => async (_, getState) => {
        throw new Error("todo!");
    },

    fetchItems: () => async (_, getState) => {
        throw new Error("todo!");
    },

    markAllRead: (sids, date, before) => async (_, getState) => {
        throw new Error("todo!");
    },

    markRead: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    markUnread: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    star: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },

    unstar: (item: RSSItem) => async (_, getState) => {
        throw new Error("todo!");
    },
};
