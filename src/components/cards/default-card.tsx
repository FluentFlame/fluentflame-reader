import * as React from "react";
import { Card } from "./card";
import CardInfo from "./info";
import Highlights from "./highlights";
import { SourceTextDirection } from "../../scripts/models/source";
import { RSSItem } from "../../scripts/models/item";
import CardThumbnail from "./thumbnail";
import { getYouTubeId } from "../../scripts/youtube";

const className = (props: Card.Props) => {
    let cn = ["card", "default-card"];
    if (props.item.hasRead) {
        cn.push("read");
    }
    if (
        props.item.snippet &&
        (props.item.thumbnails?.length > 0 || props.item.thumb)
    )
        cn.push("transform");
    if (props.item.hidden) cn.push("hidden");
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl");
    if (getYouTubeId(props.item.link)) cn.push("yt-card");
    return cn.join(" ");
};

const HEADER_IMG_WIDTH = 256;
const HEADER_IMG_HEIGHT = 144;
const RESCALE_FACTOR = 2; // Should be at least 1.

function DefaultCard(props: Card.Props): React.JSX.Element {
    const title = RSSItem.getTitle(props.item);
    const hasThumbnail =
        props.item.thumbnails?.length > 0 || props.item.thumb != null;
    const youtubeId = getYouTubeId(props.item.link);
    return (
        <div
            className={className(props)}
            {...Card.bindEventsToProps(props)}
            data-iid={props.item.iid}
            data-is-focusable>
            <CardThumbnail className="bg" item={props.item} />
            <div className="bg"></div>
            <CardThumbnail
                className="head"
                item={props.item}
                width={HEADER_IMG_WIDTH * RESCALE_FACTOR}
                height={HEADER_IMG_HEIGHT * RESCALE_FACTOR}
            />
            {youtubeId && <span className="yt-play">▶</span>}
            <CardInfo source={props.source} item={props.item} />
            <h3 className="title">
                <Highlights text={title} filter={props.filter} title />
            </h3>
            <p className={"snippet" + (hasThumbnail ? "" : " show")}>
                <Highlights text={props.item.snippet} filter={props.filter} />
            </p>
        </div>
    );
}

export default DefaultCard;
