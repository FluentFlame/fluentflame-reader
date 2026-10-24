import { expect } from "chai";
import { JSDOM } from "jsdom";
import { exportedForTesting } from "../../src/scripts/utils";

const { getPotentialFavicons } = exportedForTesting;

const HEADER_FIXTURE_1 = `
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
`;
const HEADER_FIXTURE_2 = `
<head>
    <!-- Nothing here -->
</head>
`;
const HEADER_FIXTURE_3 = `
<head>
  <!-- High level meta -->
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noai, noimageai" />
  <meta name="description" content="Welcome to Crystal's Wobsite: A gay furry programmer's blog and art gallery. Look at pretty art or hear me talk about programming languages" />
  <!-- Preloads (for speed) -->
  <link rel="preload" href="./font/LibreBaskerville-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="./font/LibreBaskerville-Bold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="./images/misc/tiling_larger.png" as="image" type="image/png">
  <link rel="preload" href="./images/misc/border.svg" as="image" type="image/svg+xml">
  <!-- OpenGraph Embed -->
  <meta property="og:title" content="Crystal's Wobsite - Hiii" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Crystal's Wobsite" />
  <meta property="og:url" content="/index.html" />
  <meta property="og:description" content="Crystal's Wobsite (yes, with an 'O')" />
  <meta property="og:image" content="/images/misc/dragon_open_graph_embed_1200x630.webp" />
  <meta property="og:image:alt" content="Dragon underwater typing on a computer" />
  <!-- Twitter Embed -->
  <meta name="twitter:card" content="summary_large_image">
  <title>Crystal's Wobsite - Hiii</title>
  <!-- Favicon -->
  <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png">
  <link rel="manifest" href="./site.webmanifest">
  <link rel="mask-icon" href="./safari-pinned-tab.svg" color="#5bbad5">
  <meta name="msapplication-TileColor" content="#da532c">
  <meta name="theme-color" content="#007991">
</head>
`;
const HEADER_FIXTURE_4 = `
<link
  rel="icon"
  sizes="32x32"
  href="https://developer.mozilla.org/favicon.ico"
/>
<link
  rel="icon"
  type="image/svg+xml"
  href="https://developer.mozilla.org/favicon.svg"
/>
`;

describe("getPotentialFavicons", () => {
    const mocks: any = {};

    beforeEach(() => {
        mocks.DOMParser = global.DOMParser;
        global.DOMParser = new JSDOM().window.DOMParser;
    });

    afterEach(() => {
        global.DOMParser = mocks.DOMParser;
    });

    it("can find single favicon", async () => {
        const dom = new DOMParser().parseFromString(
            HEADER_FIXTURE_1,
            "text/html",
        );
        const potentialFavicons = getPotentialFavicons(
            dom,
            new URL("http://example.test"),
        );
        expect(potentialFavicons[0].href).to.equal(
            "http://example.test/favicon-32x32.png",
        );
    });

    it("returns empty array when none available", async () => {
        const dom = new DOMParser().parseFromString(
            HEADER_FIXTURE_2,
            "text/html",
        );
        const potentialFavicons = getPotentialFavicons(
            dom,
            new URL("http://example.test"),
        );
        expect(potentialFavicons.length).to.equal(0);
    });

    it("can find best favicon", async () => {
        const dom = new DOMParser().parseFromString(
            HEADER_FIXTURE_3,
            "text/html",
        );
        const potentialFavicons = getPotentialFavicons(
            dom,
            new URL("http://example.test"),
        );
        expect(potentialFavicons[0].href).to.equal(
            "http://example.test/favicon-16x16.png",
        );
    });

    it("chooses full hostnamed-icon", async () => {
        const dom = new DOMParser().parseFromString(
            HEADER_FIXTURE_4,
            "text/html",
        );
        const potentialFavicons = getPotentialFavicons(
            dom,
            new URL("http://mozilla.test"),
        );
        expect(potentialFavicons[0].href).to.equal(
            "https://developer.mozilla.org/favicon.ico",
        );
    });
});

describe("itemDate", () => {
    const { itemDate, rssParser } = exportedForTesting;

    const feed = (item: string) => `<?xml version="1.0"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel><title>t</title><link>http://example.com</link><description>d</description>
  ${item}
  </channel>
</rss>`;

    it("falls back to atom:updated when pubDate and isoDate are absent", async () => {
        const parsed = await rssParser.parseString(
            feed(
                "<item><title>a</title><link>http://example.com/a</link><atom:updated>2024-01-02T03:04:05Z</atom:updated></item>",
            ),
        );
        const date = itemDate(
            parsed.items[0] as any,
            new Date("2020-01-01T00:00:00Z"),
        );
        expect(date.toISOString()).to.equal("2024-01-02T03:04:05.000Z");
    });

    it("keeps pubDate when it is present", async () => {
        const parsed = await rssParser.parseString(
            feed(
                "<item><title>a</title><link>http://example.com/a</link><pubDate>Tue, 02 Jan 2024 03:04:05 GMT</pubDate><atom:updated>2025-06-07T08:09:10Z</atom:updated></item>",
            ),
        );
        const date = itemDate(
            parsed.items[0] as any,
            new Date("2020-01-01T00:00:00Z"),
        );
        expect(date.toISOString()).to.equal("2024-01-02T03:04:05.000Z");
    });
});
