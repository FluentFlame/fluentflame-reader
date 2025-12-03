import * as React from "react";
import { Card } from "./card";
import CardInfo from "./info";
import Highlights from "./highlights";
import { SourceTextDirection } from "../../scripts/models/source";
import { RSSItem } from "../../scripts/models/item";
import CardThumbnail from "./thumbnail";

const className = (props: Card.Props) => {
    let cn = ["card", "magazine-card"];
    if (props.item.hasRead) cn.push("read");
    if (props.item.hidden) cn.push("hidden");
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl");
    return cn.join(" ");
};

function MagazineCard(props: Card.Props): React.JSX.Element {
    const hasThumbs = props.item.thumbnails?.length != 0;
    const title = RSSItem.getTitle(props.item);
    return (
        <div
            className={className(props)}
            {...Card.bindEventsToProps(props)}
            data-iid={props.item.iid}
            data-is-focusable>
            {hasThumbs ? (
                <div className="head">
                    <CardThumbnail item={props.item} />
                </div>
            ) : null}
            <div className="data">
                <div>
                    <h3 className="title">
                        <Highlights text={title} filter={props.filter} title />
                    </h3>
                    <p className="snippet">
                        <Highlights
                            text={props.item.snippet}
                            filter={props.filter}
                        />
                    </p>
                </div>
                <CardInfo source={props.source} item={props.item} showCreator />
            </div>
        </div>
    );
}

export default MagazineCard;
