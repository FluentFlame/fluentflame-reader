import { ThumbnailTypePref } from "../schema-types";

export interface ThumbnailAttributes {
    medium: "image" | "video";
    url: string;
    type: ThumbnailTypePref;
}

/**
 * Return only the head of a given url.
 */
async function fetchHead(url: URL): Promise<string> {
    const controller = new AbortController();
    const response = await fetch(url, { signal: controller.signal });
    let result = "";
    if (!response.ok || !response.body) return result;
    const stream = response.body.pipeThrough(new TextDecoderStream());
    const headRegex = /<\/head>/i;
    for await (const value of stream) {
        result += value;
        if (headRegex.test(value)) {
            controller.abort();
            return result;
        }
    }
    return result;
}

async function makeOpenGraphThumbnail(
    head: string,
): Promise<ThumbnailAttributes[]> {
    const dom = new DOMParser().parseFromString(head, "text/html");
    const elements = [
        ...dom.head.querySelectorAll(
            "meta[property*='og:image'],meta[property*='og:video']",
        ),
    ].map((e: HTMLMetaElement) => {
        return { tag: e.getAttribute("property"), content: e.content };
    });

    const queries = [
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "og:video",
        "og:video:url",
        "og:video:secure_url",
    ];
    const result: ThumbnailAttributes[] = [];
    for (const query of queries) {
        const element = elements.find((e) => e.tag === query)?.content ?? null;
        if (element !== null)
            result.push(
                await urlToThumbnailAttributes(
                    element,
                    query.startsWith("og:image") ? "image" : "video",
                    ThumbnailTypePref.OpenGraph,
                ),
            );
    }
    return result;
}

const OPENGRAPH_REGEX = /og:(?:image|video)/gi;

export async function fetchOpenGraphThumb(
    url: URL,
): Promise<ThumbnailAttributes[] | null> {
    const head = await fetchHead(url);
    if (OPENGRAPH_REGEX.test(head)) {
        return makeOpenGraphThumbnail(head);
    }
    return null;
}

export async function urlToThumbnailAttributes(
    url: string,
    medium: "image" | "video" | "unknown",
    type: ThumbnailTypePref,
): Promise<ThumbnailAttributes> {
    if (medium === "image" || medium === "video") {
        return {
            url,
            medium,
            type,
        };
    }
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok)
        return {
            url,
            medium: "image", //assume image as a fallback
            type,
        };
    const contentType = response.headers.get("content-type");
    medium = contentType.startsWith("video/") ? "video" : "image";
    return {
        url,
        medium,
        type,
    };
}
