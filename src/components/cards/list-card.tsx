import * as React from "react";
import { Card } from "./card";
import CardInfo from "./info";
import Highlights from "./highlights";
import { ListViewConfigs } from "../../schema-types";
import { SourceTextDirection } from "../../scripts/models/source";
import { RSSItem } from "../../scripts/models/item";
import CardThumbnail from "./thumbnail";

const className = (props: Card.Props) => {
    let cn = ["card", "list-card"];
    if (props.item.hidden) cn.push("hidden");
    if (props.selected) cn.push("selected");
    if (
        props.viewConfig.listViewConfigs & ListViewConfigs.FadeRead &&
        props.item.hasRead
    )
        cn.push("read");
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl");
    return cn.join(" ");
};

function ListCard(props: Card.Props): React.JSX.Element {
    const hasThumbs = props.item.thumbnails?.length != 0;
    const title = RSSItem.getTitle(props.item);
    return (
        <div
            className={className(props)}
            {...Card.bindEventsToProps(props)}
            data-iid={props.item.iid}
            data-is-focusable>
            {hasThumbs &&
            props.viewConfig.listViewConfigs & ListViewConfigs.ShowCover ? (
                <div className="head">
                    <CardThumbnail item={props.item} />
                </div>
            ) : null}
            <div className="data">
                <CardInfo source={props.source} item={props.item} />
                <h3 className="title">
                    <Highlights text={title} filter={props.filter} title />
                </h3>
                {Boolean(
                    props.viewConfig.listViewConfigs &
                        ListViewConfigs.ShowSnippet,
                ) && (
                    <p className="snippet">
                        <Highlights
                            text={props.item.snippet}
                            filter={props.filter}
                        />
                    </p>
                )}
            </div>
        </div>
    );
}

export default ListCard;
