import { fluentDB } from "../../db";
import { RSSItem } from "../item";
import { dateCompare } from "../../utils";

/**
 * Return items that match the given source id, and are within the date limit (before or after)
 */
export function getItemEntries(
    sids: number[],
    date: Date | null,
    before: boolean,
): Promise<RSSItem[]> {
    return fluentDB.items
        .where("source")
        .anyOf(sids)
        .and((item) => {
            if (item.hasRead || item.serviceRef == null) {
                return false;
            }
            if (date && !dateCompare(item.date, date, before)) {
                return false;
            }
            return true;
        })
        .toArray();
}


/**
 * An easier way to creating URLSearchParams() when
 * one has to pass arrays in this format
 * 
 * Instead of writing "array=1&array=2&array=3", one
 * can pass an object:
 * ```ts
 * { array: ["1", "2", "3"] }
 * ```
 * and it will be converted to the same url encoded form
 *  
 */
export function toSearchParams(object: ParamsObject): URLSearchParams {
    const params = new URLSearchParams();
    for (const key in object) {
        const value = object[key];
        if (Array.isArray(value)) {
            for (const innerValue of value) {
                params.append(key, innerValue.toString());
            }
        } else {
            params.set(key, value.toString());
        }
    }
    return params;
}
export type ParamsObject = Record<string, string | string[]>;

/**
 * A helper function to add path-params to a path
 * @param path - for example `/profile/:id`
 * @param params - for example `{ id: "username" }`
 * @returns 
 */
export function pathParams(path: string, params: Record<string, string>) {
    let finalPath = path;
    for (const param in params) {
        const value = params[param];
        finalPath = finalPath.replace(`:${param}`, encodeURIComponent(value));
    }
    return finalPath;
}