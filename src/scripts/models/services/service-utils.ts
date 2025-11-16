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
