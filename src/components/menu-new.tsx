import * as React from "react";
import intl from "react-intl-universal";
import { Icon } from "@fluentui/react/lib/Icon";
import {
    AnimationClassNames,
    Stack,
    FocusZone,
    Nav,
    INavLink,
    INavLinkGroup,
} from "@fluentui/react";

import { SourceGroup, ViewType } from "../schema-types";
import { SourceState, RSSSource } from "../scripts/models/source";
import { ALL, initFeeds } from "../scripts/models/feed";
import { RootState, useAppSelector, useAppDispatch } from "../scripts/reducer";
import { toggleMenu, openGroupMenu } from "../scripts/models/app";
import { toggleGroupExpansion } from "../scripts/models/group";
import {
    selectAllArticles,
    selectSources,
    toggleSearch,
} from "../scripts/models/page";

// TODO: Refactor these with Reselect (or similar libraries)
const useMenuStatus = (state: RootState): boolean =>
    state.app.sourceInit && !state.app.settings.display;
const useMenuDisplay = (state: RootState): boolean => state.app.menu;
const useMenuKey = (state: RootState): string => state.app.menuKey;
const useSources = (state: RootState): SourceState => state.sources;

function countOverflow(count: number): string {
    return count >= 1000 ? " 999+" : ` ${count}`;
}

/**
 * Sidebar menu.
 */
export default function Menu(): React.JSX.Element {
    const dispatch: (x: any) => Promise<any> = useAppDispatch();
    const isDarwin = globalThis.utils.platform === "darwin";

    const status = useAppSelector(useMenuStatus);
    const display = useAppSelector(useMenuDisplay);
    const selected = useAppSelector(useMenuKey);
    const sources = useAppSelector(useSources);
    const rawGroups = useAppSelector((s) => s.groups);
    const groups = React.useMemo(
        () => rawGroups.map((g, i) => ({ ...g, index: i })),
        [rawGroups],
    );
    const searchOn = useAppSelector((s) => s.page.searchOn);
    const itemOn = useAppSelector(
        (s) =>
            s.page.itemId !== null &&
            s.page.viewConfig.currentView !== ViewType.List,
    );

    const toggle = () => dispatch(toggleMenu());
    const allArticles = (init: boolean = false) => {
        dispatch(selectAllArticles(init));
        dispatch(initFeeds());
    };
    const selectSourceGroup = (group: SourceGroup, menuKey: string) => {
        dispatch(selectSources(group.sids, menuKey, group.name));
        dispatch(initFeeds());
    };
    const selectSource = (source: RSSSource) => {
        dispatch(selectSources([source.sid], "s-" + source.sid, source.name));
        dispatch(initFeeds());
    };
    const groupContextMenu = (sids: number[], event: React.MouseEvent) => {
        dispatch(openGroupMenu(sids, event));
    };
    const updateGroupExpansion = (
        event: React.MouseEvent<HTMLElement>,
        key: string,
        selected: string,
    ) => {
        if ((event.target as HTMLElement).tagName === "I" || key === selected) {
            let [type, index] = key.split("-");
            if (type === "g") dispatch(toggleGroupExpansion(parseInt(index)));
        }
    };

    const getLinkGroups = (): INavLinkGroup[] => {
        return [
            {
                links: [
                    {
                        name: intl.get("search"),
                        ariaLabel: intl.get("search") + (searchOn ? " ✓" : " "),
                        key: "search",
                        icon: "Search",
                        onClick: () => dispatch(toggleSearch()),
                        url: null,
                    },
                    {
                        name: intl.get("allArticles"),
                        ariaLabel:
                            intl.get("allArticles") +
                            countOverflow(
                                Object.values(sources)
                                    .filter((s) => !s.hidden)
                                    .map((s) => s.unreadCount)
                                    .reduce((a, b) => a + b, 0),
                            ),
                        key: ALL,
                        icon: "TextDocument",
                        onClick: () => allArticles(selected !== ALL),
                        url: null,
                    },
                ],
            },
            {
                name: intl.get("menu.subscriptions"),
                links: groups
                    .filter((g) => g.sids.length > 0)
                    .map((g) => {
                        if (g.isMultiple) {
                            let sources = g.sids.map((sid) => sources[sid]);
                            return {
                                name: g.name,
                                ariaLabel:
                                    g.name +
                                    countOverflow(
                                        sources
                                            .map((s) => s.unreadCount)
                                            .reduce((a, b) => a + b, 0),
                                    ),
                                key: "g-" + g.index,
                                url: null,
                                isExpanded: g.expanded,
                                onClick: () =>
                                    selectSourceGroup(g, "g-" + g.index),
                                links: sources.map(getSource),
                            };
                        } else {
                            return getSource(sources[g.sids[0]]);
                        }
                    }),
            },
        ];
    };

    const getIconStyle = (url: string) => ({
        style: { width: 16 },
        imageProps: {
            style: { width: "100%" },
            src: url,
        },
    });

    const getSource = (s: RSSSource): INavLink => ({
        name: s.name,
        ariaLabel: s.name + countOverflow(s.unreadCount),
        key: "s-" + s.sid,
        onClick: () => selectSource(s),
        iconProps: s.iconurl ? getIconStyle(s.iconurl) : null,
        url: null,
    });

    const onContext = (item: INavLink, event: React.MouseEvent) => {
        let sids: number[];
        let [type, index] = item.key.split("-");
        if (type === "s") {
            sids = [parseInt(index)];
        } else if (type === "g") {
            sids = groups[parseInt(index)].sids;
        } else {
            return;
        }
        groupContextMenu(sids, event);
    };

    const onRenderLink = (link: INavLink): JSX.Element => {
        let count = link.ariaLabel.split(" ").pop();
        return (
            <Stack
                className="link-stack"
                horizontal
                grow
                onContextMenu={(event) => onContext(link, event)}>
                <div className="link-text">{link.name}</div>
                {count && count !== "0" && (
                    <div className="unread-count">{count}</div>
                )}
            </Stack>
        );
    };

    const onRenderGroupHeader = (group: INavLinkGroup): JSX.Element => {
        return (
            <p className={"subs-header " + AnimationClassNames.slideDownIn10}>
                {group.name}
            </p>
        );
    };

    if (!status) {
        return null;
    }
    return (
        <div
            className={"menu-container" + (display ? " show" : "")}
            onClick={toggle}>
            <div
                className={"menu" + (itemOn ? " item-on" : "")}
                onClick={(e) => e.stopPropagation()}>
                <div className="btn-group">
                    <a
                        className="btn hide-wide"
                        title={intl.get("menu.close")}
                        onClick={toggle}>
                        <Icon iconName="Back" />
                    </a>
                    <a
                        className="btn inline-block-wide"
                        title={intl.get("menu.close")}
                        onClick={toggle}>
                        <Icon
                            iconName={
                                isDarwin ? "SidePanel" : "GlobalNavButton"
                            }
                        />
                    </a>
                </div>
                <FocusZone as="div" disabled={!display} className="nav-wrapper">
                    <Nav
                        onRenderGroupHeader={onRenderGroupHeader}
                        onRenderLink={onRenderLink}
                        groups={getLinkGroups()}
                        selectedKey={selected}
                        onLinkExpandClick={(event, item) =>
                            updateGroupExpansion(event, item.key, selected)
                        }
                    />
                </FocusZone>
            </div>
        </div>
    );
}
