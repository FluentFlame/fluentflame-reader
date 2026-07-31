import * as React from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { SharedColors } from "@fluentui/theme";
import { AnimationClassNames } from "@fluentui/react/lib/Styling";
import intl from "react-intl-universal";
import { useDispatch, useSelector } from "react-redux";
import {
    Checkbox,
    DefaultButton,
    PrimaryButton,
    Spinner,
    Stack,
    TextField,
} from "@fluentui/react";

import { RootState } from "../scripts/reducer";
import { addSourcesThenReInit } from "../scripts/models/source";
import { hideAddSourceModal } from "../scripts/models/app";
import { urlTest, findRSSFeeds, FoundFeed } from "../scripts/utils";

/** Time to wait for validating the URL input. */
const VALIDATION_TIME = 200;

/** Selector for whether the modal is visible. */
function useAddSourceModalDisplay(state: RootState): boolean {
    return state.app.addSourceModal.display;
}

const TEXT_FIELD_ID = "addSourceModal-textField";

type ModalState =
    | { type: "ANALYZE" }
    | { type: "ADD"; sources: { feed: FoundFeed; selected: boolean }[] }
    | { type: "FEED_ERROR"; errorMsg: string };

/** Modal dialogue to add a new RSS/Atom feed */
export default function AddSourceModal(): React.JSX.Element {
    const dispatch: (x: any) => Promise<any> = useDispatch();
    const display = useSelector(useAddSourceModalDisplay);
    const [exiting, setExiting] = React.useState(false);
    const [newSourceUrl, setNewSourceUrl] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    // Have we fetched the target, and found multiple feeds?
    const [modalState, setModalState] = React.useState<ModalState>({
        type: "ANALYZE",
    });

    const backToAnalyze = () => {
        setModalState({ type: "ANALYZE" });
    };
    const close = () => {
        setExiting(true);
        setNewSourceUrl("");
        backToAnalyze();
        dispatch(hideAddSourceModal());
        setExiting(false);
    };

    // Helper functions ---------------------------------------------------------------------------
    const onTextFieldValidate = React.useCallback(
        (newValue: string) => {
            const trimmed = newValue.trim();
            if (trimmed !== newSourceUrl) {
                setNewSourceUrl(trimmed);
            }
        },
        [setNewSourceUrl, newSourceUrl],
    );

    const analyzeTarget = async (e: any) => {
        e.preventDefault();
        if (!urlTest(newSourceUrl)) {
            return;
        }
        setLoading(true);
        try {
            const feeds = await findRSSFeeds(newSourceUrl);
            if (feeds.length <= 0) {
                setModalState({
                    type: "FEED_ERROR",
                    errorMsg: `No feeds at ${newSourceUrl}`,
                });
                return;
            }
            // Default to everything selected, then update it with checkbox
            // callbacks.
            setModalState({
                type: "ADD",
                sources: feeds.map((f) => {
                    return { selected: true, feed: f };
                }),
            });
        } catch (e) {
            console.error(`Error while finding RSS feed ${newSourceUrl}`, e);
            setModalState({
                type: "FEED_ERROR",
                errorMsg: e.toString(),
            });
        } finally {
            setLoading(false);
        }
    };
    const addTarget = async (e: any) => {
        e.preventDefault();
        if (modalState.type !== "ADD") {
            // Unreachable
            return;
        }
        setLoading(true);
        try {
            const asSourceStrings = modalState.sources
                .filter((s) => s.selected)
                .map((s) => s.feed.url.toString());
            await dispatch(addSourcesThenReInit(asSourceStrings));
        } catch (e) {
            console.error("Error while adding RSS feeds", e);
            setModalState({
                type: "FEED_ERROR",
                errorMsg: e.toString(),
            });
            return;
        } finally {
            setLoading(false);
        }
        close();
    };

    const onGetErrorMessage = async (value: string) => {
        if (value !== "" && !urlTest(value)) {
            return intl.get("app.badUrl");
        }
        onTextFieldValidate(value);
        return "";
    };

    // Keyboard event handlers --------------------------------------------------------------------
    const shortcutsListener = React.useCallback(
        (e: KeyboardEvent) => {
            if (!display || loading) {
                return;
            }
            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    if (modalState.type === "ANALYZE") {
                        close();
                        return;
                    }
                    backToAnalyze();
                    return;
                case "Enter":
                    const targetElem = e.target as HTMLElement;
                    if (
                        targetElem?.tagName.toLowerCase() !== "body" &&
                        targetElem?.id !== TEXT_FIELD_ID
                    ) {
                        return;
                    }
                    switch (modalState.type) {
                        // These already e.preventDefault() for us.
                        case "ANALYZE":
                            analyzeTarget(e);
                            return;
                        case "ADD":
                            addTarget(e);
                            return;
                        default:
                            return;
                    }
                default:
                    return;
            }
        },
        [
            display,
            loading,
            modalState.type,
            analyzeTarget,
            addTarget,
            backToAnalyze,
            close,
        ],
    );

    React.useEffect(() => {
        document.addEventListener("keyup", shortcutsListener);
    }, [shortcutsListener]);
    React.useEffect(() => {
        return () => document.removeEventListener("keyup", shortcutsListener);
    }, [shortcutsListener]);

    const modalContent = () => {
        switch (modalState.type) {
            case "ADD":
                const sources = modalState.sources;
                const onCheckboxChangeGen = (idx: number) => {
                    return (_event: any, checked: boolean) => {
                        sources[idx].selected = checked;
                        setModalState({ type: "ADD", sources: [...sources] });
                    };
                };
                const feedsToPotentiallyAdd = sources.map((s, idx) => {
                    return (
                        <Checkbox
                            label={s.feed.url.toString()}
                            defaultChecked
                            onChange={onCheckboxChangeGen(idx)}
                        />
                    );
                });
                return (
                    <>
                        <span>
                            {`${intl.get("addSourceModal.addSources")}:`}
                        </span>
                        <Stack tokens={{ childrenGap: 12 }}>
                            {feedsToPotentiallyAdd}
                        </Stack>
                        <PrimaryButton
                            className="centered-button"
                            text={intl.get("sources.add")}
                            onClick={addTarget}
                        />
                    </>
                );
            case "ANALYZE":
                return (
                    <>
                        <TextField
                            id={TEXT_FIELD_ID}
                            label={intl.get("addSourceModal.textField")}
                            placeholder={intl.get("addSourceModal.example")}
                            description={intl.get("addSourceModal.description")}
                            defaultValue={newSourceUrl}
                            onGetErrorMessage={onGetErrorMessage}
                            deferredValidationTime={VALIDATION_TIME}
                        />
                        <PrimaryButton
                            className="centered-button"
                            text={intl.get("addSourceModal.analyzeSource")}
                            onClick={analyzeTarget}
                            disabled={
                                newSourceUrl === "" || !urlTest(newSourceUrl)
                            }
                        />
                    </>
                );
            case "FEED_ERROR":
                return (
                    <>
                        <p>{intl.get("sources.errorAdd")}</p>
                        <p style={{ color: SharedColors.red20 }}>
                            {modalState.errorMsg}
                        </p>
                    </>
                );
            default:
                return (
                    <span>
                        An error occurred: this modal got into an impossible
                        state
                    </span>
                );
        }
    };

    const loadingComponent = () => {
        if (loading) {
            return <Spinner className="form-panel modal-internal" />;
        }
        return (
            <Stack
                className="form-panel modal-internal"
                tokens={{ childrenGap: 12 }}>
                {modalContent()}
            </Stack>
        );
    };

    if (!display) {
        return null;
    }
    return (
        <div className="modal-container">
            <div className={"modal " + AnimationClassNames.slideUpIn20}>
                <div className="btn-group">
                    <DefaultButton
                        className={
                            "btn" + (exiting || loading ? " disabled" : "")
                        }
                        title={intl.get("settings.exit")}
                        onClick={
                            modalState.type === "ANALYZE"
                                ? close
                                : backToAnalyze
                        }
                        tabIndex={0}>
                        <Icon iconName="Back" />
                    </DefaultButton>
                </div>
                {loadingComponent()}
            </div>
        </div>
    );
}
