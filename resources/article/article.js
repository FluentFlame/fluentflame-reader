function get(name) {
    if (
        (name = new RegExp("[?&]" + encodeURIComponent(name) + "=([^&]*)").exec(
            location.search,
        ))
    )
        return decodeURIComponent(name[1]);
}

/**
 * Enable/Disable animations based on user preferences.
 */
function applyAnimationPreferences() {
    const animationMotionPref = get("an");
    if (animationMotionPref === "reduced" || animationMotionPref === "off") {
        const injectedCSSElem = document.createElement("style");
        injectedCSSElem.textContent =
            "#main.show { animation-name: none !important; }";
        document.head.append(injectedCSSElem);
    }
}

let dir = get("d");
if (dir === "1") {
    document.body.classList.add("rtl");
} else if (dir === "2") {
    document.body.classList.add("vertical");
    document.body.addEventListener("wheel", (evt) => {
        document.scrollingElement.scrollLeft -= evt.deltaY;
    });
}
async function getArticle(url) {
    let article = get("a");
    if (get("m") === "1") {
        return (await Mercury.parse(url, { html: article })).content || "";
    } else {
        return article;
    }
}
document.documentElement.style.fontSize = get("s") + "px";
let font = get("f");
if (font) document.body.style.fontFamily = `"${font}"`;

applyAnimationPreferences();

let url = get("u");
getArticle(url).then((article) => {
    let domParser = new DOMParser();
    let dom = domParser.parseFromString(get("h"), "text/html");
    const articleElem = dom.getElementsByTagName("article");
    if (articleElem.length > 0) {
        articleElem[0].innerHTML = article;
    } else {
        console.error("Could not get <article> from parsed string element");
    }
    let baseEl = dom.createElement("base");
    baseEl.setAttribute("href", url.split("/").slice(0, 3).join("/"));
    dom.head.append(baseEl);
    for (let s of dom.getElementsByTagName("script")) {
        s.parentNode.removeChild(s);
    }
    for (let e of dom.querySelectorAll("*[src]")) {
        e.src = e.src;
    }
    for (let e of dom.querySelectorAll("*[href]")) {
        e.href = e.href;
    }
    let main = document.getElementById("main");
    if (main) {
        main.innerHTML = dom.body.innerHTML;
        main.classList.add("show");
    } else {
        console.error("Could not get #main element");
    }
});
