import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import intl from "react-intl-universal";
import { Icon } from "@fluentui/react/lib/Icon";
import { ProgressIndicator, IObjectWithKey } from "@fluentui/react";

import {
    openMarkAllMenu,
    openViewMenu,
    showAddSourceModal,
    toggleLogMenu,
    toggleMenu,
    toggleSettings,
} from "../scripts/models/app";
import { RootState } from "../scripts/reducer";
import { ViewType } from "../schema-types";
import { WindowStateListenerType } from "../schema-types";
import { fetchItems } from "../scripts/models/item";
import { toggleSearch } from "../scripts/models/page";

function close() {
    window.utils.closeWindow();
}

function setBodyFocusState(focused: boolean) {
    if (focused) document.body.classList.remove("blur");
    else document.body.classList.add("blur");
}

function setBodyFullscreenState(fullscreen: boolean) {
    if (fullscreen) document.body.classList.remove("not-fullscreen");
    else document.body.classList.add("not-fullscreen");
}

// TODO: Selectors should be defined inside slice files rather than
// near components, see https://redux.js.org/usage/deriving-data-selectors
function selectAppState(state: RootState) {
    return state.app;
}

function selectItemShown(state: RootState) {
    return (
        state.page.itemId && state.page.viewConfig.currentView !== ViewType.List
    );
}

// Component --------------------------------------------------------------------------------------

/** The top navigation bar, containing buttons */
function Nav() {
    const dispatch = useDispatch();
    const [maximized, setMaximized] = React.useState(
        window.utils.isMaximized(),
    );
    const state = useSelector(selectAppState);
    const itemShown = useSelector(selectItemShown);

    const menu = () => dispatch(toggleMenu());
    const search = () => dispatch(toggleSearch());
    const markAllRead = () => dispatch(openMarkAllMenu());
    const logs = () => dispatch(toggleLogMenu());
    const settings = () => dispatch(toggleSettings());
    const views = () => dispatch(openViewMenu());

    const minimize = () => {
        window.utils.minimizeWindow();
        setMaximized(false);
    };

    const maximize = () => {
        window.utils.maximizeWindow();
        setMaximized(true);
    };

    const canFetch = () =>
        state.sourceInit &&
        state.feedInit &&
        !state.syncing &&
        !state.fetchingItems;

    const feedFetch = () => {
        if (canFetch()) dispatch(fetchItems());
    };

    const fetching = () => (!canFetch() ? " fetching" : "");

    const getClassNames = () => {
        const classNames = new Array<string>();
        classNames.push("top-nav");
        if (state.settings.display) classNames.push("hide-btns");
        if (state.menu) classNames.push("menu-on");
        if (itemShown) classNames.push("item-on");
        return classNames.join(" ");
    };

    const navShortcutsHandler = React.useCallback(
        (e: KeyboardEvent | IObjectWithKey) => {
            if (!state.settings.display && !state.addSourceModal.display) {
                switch (e.key) {
                    case "F1":
                        menu();
                        return;
                    case "F2":
                        search();
                        return;
                    case "F5":
                        feedFetch();
                        return;
                    case "F6":
                        markAllRead();
                        return;
                    case "F7":
                        if (!itemShown) logs();
                        return;
                    case "F8":
                        if (!itemShown) views();
                        return;
                    case "F9":
                        if (!itemShown) settings();
                        return;
                }
            }
        },
        [
            itemShown,
            state.settings.display,
            state.addSourceModal.display,
            menu,
            search,
            feedFetch,
            markAllRead,
            logs,
            views,
            settings,
        ],
    );

    const getProgress = () => {
        return state.fetchingTotal > 0
            ? state.fetchingProgress / state.fetchingTotal
            : null;
    };

    // componentDidMount replacement.
    React.useEffect(() => {
        setBodyFocusState(window.utils.isFocused());
        setBodyFullscreenState(window.utils.isFullscreen());
        const windowStateListener = (
            type: WindowStateListenerType,
            value: boolean,
        ) => {
            switch (type) {
                case WindowStateListenerType.Maximized:
                    setMaximized(value);
                    break;
                case WindowStateListenerType.Fullscreen:
                    setBodyFullscreenState(value);
                    break;
                case WindowStateListenerType.Focused:
                    setBodyFocusState(value);
                    break;
            }
        };
        window.utils.addWindowStateListener(windowStateListener);
    }, []);

    React.useEffect(() => {
        document.addEventListener("keydown", navShortcutsHandler);
        if (window.utils.platform === "darwin") {
            window.utils.addTouchBarEventsListener(navShortcutsHandler);
        }
    }, [navShortcutsHandler]);

    // componentWillUnmount replacement.
    React.useEffect(() => {
        return () =>
            document.removeEventListener("keydown", navShortcutsHandler);
    }, [navShortcutsHandler]);

    return (
        <nav className={getClassNames()}>
            <div className="btn-group">
                <a
                    className="btn hide-wide"
                    title={intl.get("nav.menu")}
                    onClick={menu}>
                    <Icon
                        iconName={
                            window.utils.platform === "darwin"
                                ? "SidePanel"
                                : "GlobalNavButton"
                        }
                    />
                </a>
            </div>
            <span className="title hide-on-tiny">{state.title}</span>
            <div className="btn-group corner-btn-group">
                <a
                    className={"btn"}
                    onClick={() => dispatch(showAddSourceModal())}
                    title={intl.get("sources.add")}>
                    <Icon iconName="Add" />
                </a>
                <a
                    className={"btn" + fetching()}
                    onClick={feedFetch}
                    title={intl.get("nav.refresh")}>
                    <Icon iconName="Refresh" />
                </a>
                <a
                    className="btn hide-on-tiny"
                    id="mark-all-toggle"
                    onClick={markAllRead}
                    title={intl.get("nav.markAllRead")}
                    onMouseDown={(e) => {
                        if (state.contextMenu.event === "#mark-all-toggle")
                            e.stopPropagation();
                    }}>
                    <Icon iconName="InboxCheck" />
                </a>
                <a
                    className="btn"
                    id="log-toggle"
                    title={intl.get("nav.notifications")}
                    onClick={logs}>
                    {state.logMenu.notify ? (
                        <Icon iconName="RingerSolid" />
                    ) : (
                        <Icon iconName="Ringer" />
                    )}
                </a>
                <a
                    className="btn hide-on-tiny"
                    id="view-toggle"
                    title={intl.get("nav.view")}
                    onClick={views}
                    onMouseDown={(e) => {
                        if (state.contextMenu.event === "#view-toggle")
                            e.stopPropagation();
                    }}>
                    <Icon iconName="View" />
                </a>
                <a
                    className="btn"
                    title={intl.get("nav.settings")}
                    onClick={settings}>
                    <Icon iconName="Settings" />
                </a>
                <span className="seperator"></span>
                <a
                    className="btn system"
                    title={intl.get("nav.minimize")}
                    onClick={minimize}
                    style={{ fontSize: 12 }}>
                    <Icon iconName="Remove" />
                </a>
                <a
                    className="btn system"
                    title={intl.get("nav.maximize")}
                    onClick={maximize}>
                    {maximized ? (
                        <Icon
                            iconName="ChromeRestore"
                            style={{ fontSize: 11 }}
                        />
                    ) : (
                        <Icon iconName="Checkbox" style={{ fontSize: 10 }} />
                    )}
                </a>
                <a
                    className="btn system close"
                    title={intl.get("close")}
                    onClick={close}>
                    <Icon iconName="Cancel" />
                </a>
            </div>
            {!canFetch() && (
                <ProgressIndicator
                    className="progress"
                    percentComplete={getProgress()}
                />
            )}
        </nav>
    );
}

export default Nav;
