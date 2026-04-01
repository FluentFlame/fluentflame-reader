import { ServiceConfigs, SyncService } from "../../../schema-types";
import { RSSItem } from "../item";
import { ServiceHooks } from "../service";

export interface NewsBlurConfig extends ServiceConfigs {
    type: SyncService.NewsBlur;
    endpoint: string;
    username: string;
    password: string;
    fetchLimit: number;
    lastId?: number;
}

export const feedbinServiceHooks: ServiceHooks = {
    authenticate: async (configs: NewsBlurConfig) => {
        throw new Error("todo!");
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
