// Content-Security-Policy: require-trusted-types-for 'script'; trusted-types sanitized-html;

import intl from "react-intl-universal";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import DOMPurify from "dompurify";
import { RootState } from "./reducer";
import Parser from "rss-parser";
import { SearchEngines } from "../schema-types";

export enum ActionStatus {
    Request,
    Success,
    Failure,
    Intermediate,
}

export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    AnyAction
>;

export type AppDispatch = ThunkDispatch<RootState, undefined, AnyAction>;

/**
 * Type that represents a fetch func. Used for mocking out fetch API requests in the
 * renderer. You can treat it like Window.fetch.
 */
export type FetchFunc = (
    resource: string | URL | Request,
    options?: RequestInit,
) => Promise<Response>;

let _sanitizer: { createHTML: (s: string) => TrustedHTML } | undefined =
    undefined;
function htmlSanitizePolicy(): { createHTML: (s: string) => TrustedHTML } {
    if (_sanitizer != null) {
        return _sanitizer;
    }
    const sanitizer = window.trustedTypes.createPolicy("sanitized-html", {
        createHTML: (input: string) =>
            DOMPurify.sanitize(input, {
                WHOLE_DOCUMENT: true,
                ADD_TAGS: ["link"],
                ADD_ATTR: ["rel", "title", "type"],
            }),
    });
    _sanitizer = sanitizer;
    return _sanitizer;
}

const rssParser = new Parser({
    customFields: {
        item: [
            "thumb",
            "image",
            ["media:thumbnail", "mediaThumbnails", { keepArray: true }],
            ["content:encoded", "fullContent"],
            ["media:content", "mediaContent", { keepArray: true }],
        ],
    },
});
type extractGeneric<Type> = Type extends Parser<infer _, infer U> ? U : never;
export type MyParserItem = extractGeneric<typeof rssParser> & Parser.Item;

const CHARSET_RE = /charset=([^()<>@,;:\"/[\]?.=\s]*)/i;
const XML_ENCODING_RE = /^<\?xml.+encoding="(.+?)".*?\?>/i;
export async function decodeFetchResponse(response: Response, isHTML = false) {
    const buffer = await response.arrayBuffer();
    let ctype =
        response.headers.has("content-type") &&
        response.headers.get("content-type");
    let charset =
        ctype && CHARSET_RE.test(ctype) ? CHARSET_RE.exec(ctype)[1] : undefined;
    charset = charset === "" ? undefined : charset;
    let content = new TextDecoder(charset).decode(buffer);
    if (charset === undefined) {
        if (isHTML) {
            let policy = htmlSanitizePolicy();
            const dom = new DOMParser().parseFromString(
                policy.createHTML(content).toString(),
                "text/html",
            );
            charset = dom
                .querySelector("meta[charset]")
                ?.getAttribute("charset")
                ?.toLowerCase();
            if (!charset) {
                ctype = dom
                    .querySelector("meta[http-equiv='Content-Type']")
                    ?.getAttribute("content");
                charset =
                    ctype &&
                    CHARSET_RE.test(ctype) &&
                    CHARSET_RE.exec(ctype)[1].toLowerCase();
            }
        } else {
            charset =
                XML_ENCODING_RE.test(content) &&
                XML_ENCODING_RE.exec(content)[1].toLowerCase();
        }
        if (charset && charset !== "utf-8" && charset !== "utf8") {
            content = new TextDecoder(charset).decode(buffer);
        }
    }
    return content;
}

/** Combination of a confirmed feed URL and its parsed data.
 * Convert to parsed info using `parsedFoundFeed`.
 */
export type FoundFeed = {
    // URL where it was found.
    url: URL;
    // Parsed data, (if available).
    parsed?: Parser.Output<any>;
};

class FindRSSFeedsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FindRSSFeedsError";
    }
}

export async function findRSSFeeds(urlStr: string): Promise<FoundFeed[]> {
    const url = new URL(urlStr);
    const decoded = await internalFetchDecode(url);
    const isFeed = checkIfFeed(url, decoded);
    const isWebpage = checkIfWebpage(url, decoded);
    return await Promise.any([isFeed, isWebpage]).catch((e) => {
        switch (e.name) {
            case "AggregateError":
                if (
                    e.errors.every(
                        (internalErr: any) =>
                            internalErr.name === "FindRSSFeedsError",
                    )
                ) {
                    // If everything worked out fine, yet there were no feeds,
                    // just return an empty list.
                    return [];
                }
            // Intentional fallthru
            default:
                throw e;
        }
    });
}

async function checkIfWebpage(url: URL, decoded: string): Promise<FoundFeed[]> {
    const policy = htmlSanitizePolicy();
    const parsedDom = new DOMParser().parseFromString(
        policy.createHTML(decoded).toString(),
        "text/html",
    );
    const alternates = parsedDom.querySelectorAll(
        `link[rel="alternate"][type][href]`,
    );
    const output: FoundFeed[] = Array.from(alternates)
        .filter((elem) => {
            const type = elem.getAttribute("type");
            return (
                type === "application/atom+xml" ||
                type === "application/rss+xml"
            );
        })
        .map((elem) => {
            return { url: new URL(elem.getAttribute("href"), url) };
        });
    if (output.length > 0) {
        return output;
    }
    throw new FindRSSFeedsError(`No feeds found in webpage: '${url}'`);
}

async function checkIfFeed(url: URL, decoded: string): Promise<FoundFeed[]> {
    try {
        const parsed = await rssParser.parseString(decoded);
        return [{ url: url, parsed: parsed }];
    } catch (e) {
        throw new FindRSSFeedsError(`Feed did not parse: '${url}': ${e}`);
    }
}

export async function parseFoundFeed(
    foundFeed: FoundFeed,
): Promise<Parser.Output<any>> {
    // Unpack to prevent async changes to foundFeed contents.
    const { url, parsed } = foundFeed;
    if (parsed != null) {
        return parsed;
    }
    const decoded = await internalFetchDecode(url);
    return await rssParser.parseString(decoded);
}

/**
 * @deprecated Use findRSSFeeds instead.
 */
export async function parseRSS(url: string) {
    const decoded = await internalFetchDecode(new URL(url));
    return await rssParser.parseString(decoded);
}

async function internalFetchDecode(url: URL): Promise<string> {
    let result: Response;
    try {
        result = await fetch(url, { credentials: "omit" });
    } catch (e) {
        throw new Error(`${intl.get("log.networkError")}: ${e}`);
    }
    if (!result || !result.ok) {
        throw new Error(
            "Networking error: " + result.status + " " + result.statusText,
        );
    }
    let decoded: string;
    try {
        decoded = await decodeFetchResponse(result);
    } catch (e) {
        throw new Error(`${intl.get("log.parseError")}: ${e}`);
    }
    return decoded;
}

export async function fetchFavicon(urlString: string): Promise<string | null> {
    const url = URL.parse(urlString);
    if (!url) {
        return null;
    }
    let result = await fetch(url.origin, { credentials: "omit" });
    if (result.ok) {
        const html = await result.text();
        const dom = new DOMParser().parseFromString(html, "text/html");
        const potentialFavicons = getPotentialFavicons(
            dom,
            new URL(url.origin),
        );
        if (potentialFavicons.length !== 0) {
            return potentialFavicons[0].href;
        }
    }
    const faviconGuess = `${url.origin}/favicon.ico`;
    if (await validateFavicon(faviconGuess)) {
        return faviconGuess;
    }
    return null;
}

/**
 * Return favicons for a given targetUrl and its associated fetch dom.
 * Ranked in order of preference to fetch.
 */
function getPotentialFavicons(dom: Document, baseUrl: URL): URL[] {
    const links = dom.getElementsByTagName("link");
    const out = new Array();
    for (const link of links) {
        const rel = link.getAttribute("rel");
        const href = link.getAttribute("href");
        if ((rel === "icon" || rel === "shortcut icon") && href) {
            const sizes: string | null = link.getAttribute("sizes");
            let ranking = 0;
            if (sizes) {
                if (sizes === "any") {
                    ranking = -2;
                } else {
                    const sizesSplit = sizes.split(" ");
                    // We only ever use Favicons that are 16x16. Save data by choosing that
                    // explicitly if available.
                    if (sizesSplit.includes("16x16")) {
                        ranking = -1;
                    }
                }
            }
            out.push({ ranking: ranking, target: new URL(href, baseUrl) });
        }
    }
    out.sort((left, right) => left.ranking - right.ranking);
    return out.map((item) => item.target);
}

export async function validateFavicon(url: string): Promise<Boolean> {
    const result = await fetch(url, { credentials: "omit" });
    if (
        result.status == 200 &&
        result.headers.has("Content-Type") &&
        result.headers.get("Content-Type").startsWith("image")
    ) {
        return true;
    }
    return false;
}

export function htmlDecode(input: string) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

export const urlTest = (s: string) =>
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,63}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(
        s,
    );

export const getWindowBreakpoint = () => window.outerWidth >= 1440;

export const cutText = (s: string, length: number) => {
    return s.length <= length ? s : s.slice(0, length) + "…";
};

export function getSearchEngineName(engine: SearchEngines) {
    switch (engine) {
        case SearchEngines.Google:
            return intl.get("searchEngine.google");
        case SearchEngines.Bing:
            return intl.get("searchEngine.bing");
        case SearchEngines.Baidu:
            return intl.get("searchEngine.baidu");
        case SearchEngines.DuckDuckGo:
            return intl.get("searchEngine.duckduckgo");
        case SearchEngines.Startpage:
            return intl.get("searchEngine.startpage");
    }
}
export function webSearch(text: string, engine = SearchEngines.Google) {
    switch (engine) {
        case SearchEngines.Google:
            return window.utils.openExternal(
                "https://www.google.com/search?q=" + encodeURIComponent(text),
            );
        case SearchEngines.Bing:
            return window.utils.openExternal(
                "https://www.bing.com/search?q=" + encodeURIComponent(text),
            );
        case SearchEngines.Baidu:
            return window.utils.openExternal(
                "https://www.baidu.com/s?wd=" + encodeURIComponent(text),
            );
        case SearchEngines.DuckDuckGo:
            return window.utils.openExternal(
                "https://duckduckgo.com/?q=" + encodeURIComponent(text),
            );
        case SearchEngines.Startpage:
            return window.utils.openExternal(
                "https://www.startpage.com/do/search?query=" +
                    encodeURIComponent(text),
            );
    }
}

export function mergeSortedArrays<T>(
    a: T[],
    b: T[],
    cmp: (x: T, y: T) => number,
): T[] {
    let merged = new Array<T>();
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (cmp(a[i], b[j]) <= 0) {
            merged.push(a[i++]);
        } else {
            merged.push(b[j++]);
        }
    }
    while (i < a.length) merged.push(a[i++]);
    while (j < b.length) merged.push(b[j++]);
    return merged;
}

export function byteToMB(B: number) {
    let MB = Math.round(B / 1048576);
    return MB + "MB";
}

export function validateRegex(regex: string, flags = ""): RegExp {
    try {
        return new RegExp(regex, flags);
    } catch {
        return null;
    }
}

export function platformCtrl(
    e: React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent,
) {
    return window.utils.platform === "darwin" ? e.metaKey : e.ctrlKey;
}

export function initTouchBarWithTexts() {
    window.utils.initTouchBar({
        menu: intl.get("nav.menu"),
        search: intl.get("search"),
        refresh: intl.get("nav.refresh"),
        markAll: intl.get("nav.markAllRead"),
        notifications: intl.get("nav.notifications"),
    });
}

/**
 * Compare an item date to a limitDate. Returns true if it violates the limit
 * Usually that means it's older than the limit.
 * before can be used to invert the calculation.
 */
export function dateCompare(itemDate: Date, limitDate: Date, before = false) {
    if ((before && itemDate > limitDate) || itemDate < limitDate) {
        return false;
    }
    return true;
}

export const exportedForTesting = {
    getPotentialFavicons,
};
