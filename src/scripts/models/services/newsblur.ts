import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";

export interface NewsBlurConfig extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: string; // url
    username: string;
    password: string;
    // fetchLimit: number;
    lastId?: number;
    _cookie?: string;
    _minWaitSeconds?: number;
    _lastRefresh?: Date;
}

async function fetchGetAPI(
    configs: NewsBlurConfig,
    path: string,
    params: Record<string, string>,
) {
    // encode params
    const paramsSearch = new URLSearchParams(params);
    // set url
    while (path.startsWith("/")) path = path.substring(1); // remove leading slash
    console.log(configs.endpoint + path);
    const url = new URL(configs.endpoint + path);
    url.search = paramsSearch.toString();
    // set headers
    const headers = new Headers();
    // if, in node, add cookies
    if (process !== undefined) {
        headers.set("Cookie", configs._cookie.split(";")[0]);
    }
    // send
    const response = await fetch(url, { headers, credentials: "include" });
    // return
    return response;
}

async function fetchPostAPI(
    configs: NewsBlurConfig,
    path: string,
    params: Record<string, string>,
) {
    // set url
    while (path.startsWith("/")) path = path.substring(1); // remove leading slash
    const url = new URL(configs.endpoint + path);
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
        credentials: "include",
    });
    return response;
}

function printErrors(response: NewsBlurResponse) {
    if (response.errors) return;
    for (const error in response.errors) {
        console.error(
            `[service: NewsBlur] ${error}: ${response.errors[error]}`,
        );
    }
}

function safeSetAuthCookie(headers: Headers, configs: NewsBlurConfig) {
    const cookies = headers.getSetCookie();
    if (cookies.length > 0) {
        configs._cookie = cookies[0];
    }
}

export async function newsblurFetchItems(configs: NewsBlurConfig) {
    const response = await fetchGetAPI(configs, "/reader/feeds", {});
    // parse response
    const json: NewsBlurResponse = await response.json();
    // errors
    printErrors(json);
    // return feeds
    return json;
}

export interface NewsBlurResponse {
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
            const response = await fetchPostAPI(configs, "/api/login", {
                username: configs.username,
                password: configs.password,
            });
            // parse body
            const json: NewsBlurResponse = await response.json();
            printErrors(json);
            // save auth cookie
            safeSetAuthCookie(response.headers, /*&*/ configs);
            // minTime to avoid overwhelming the server
            configs._minWaitSeconds = 60;
            configs._lastRefresh = new Date(Date.now() + 60 * 1000);
            // correct?
            return json.authenticated === true;
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
