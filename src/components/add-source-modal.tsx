import * as React from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { AnimationClassNames } from "@fluentui/react/lib/Styling";
import intl from "react-intl-universal";
import { useDispatch, useSelector } from "react-redux";
import {
    FocusTrapZone,
    INavLink,
    INavLinkGroup,
    Label,
    PrimaryButton,
    Spinner,
    Stack,
    TextField,
} from "@fluentui/react";

import { RootState } from "../scripts/reducer";
import { addSourcesThenReInit } from "../scripts/models/source";
import { hideAddSourceModal } from "../scripts/models/app";
import { urlTest } from "../scripts/utils";

/** Selector for whether the modal is visible. */
function useAddSourceModalDisplay(state: RootState): boolean {
    return state.app.addSourceModal.display;
}

type ModalState = { type: "ANALYZE" } | { type: "ADD"; source: string };

/** Modal dialogue to add a new RSS/Atom feed */
export default function AddSourceModal(): React.JSX.Element {
    const dispatch = useDispatch();
    const display = useSelector(useAddSourceModalDisplay);
    const [exiting, setExiting] = React.useState(false);
    const [newSourceUrl, setNewSourceUrl] = React.useState("");

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

    const onTextFieldChange = React.useCallback(
        (
            _e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
            newValue: string,
        ) => {
            const trimmed = newValue.trim();
            if (trimmed !== newSourceUrl) {
                setNewSourceUrl(trimmed);
            }
        },
        [setNewSourceUrl, newSourceUrl],
    );

    const analyzeTarget = (e: any) => {
        e.preventDefault();
        if (!urlTest(newSourceUrl)) {
            console.error("Invalid source url");
            return;
        }
        setModalState({ type: "ADD", source: newSourceUrl });
    };
    const addTarget = (e: any) => {
        e.preventDefault();
        if (urlTest(newSourceUrl)) {
            dispatch(addSourcesThenReInit([newSourceUrl]));
        } else {
            console.error("Invalid source url");
        }
        close();
    };

    if (!display) {
        return null;
    }
    return (
        <div className="modal-container">
            <div className={"modal " + AnimationClassNames.slideUpIn20}>
                <div className="btn-group">
                    <a
                        className={"btn" + (exiting ? " disabled" : "")}
                        title={intl.get("settings.exit")}
                        onClick={
                            modalState.type === "ANALYZE"
                                ? close
                                : backToAnalyze
                        }>
                        <Icon iconName="Back" />
                    </a>
                </div>
                <div className="form-panel">
                    <div className="modal-internal">
                        <ModalContent
                            modalState={modalState}
                            onTextFieldChange={onTextFieldChange}
                            onClickAnalyze={analyzeTarget}
                            onClickAdd={addTarget}
                            buttonDisabled={newSourceUrl === ""}
                            prefilledContent={newSourceUrl}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

type ModalContentProps = {
    modalState: ModalState;
    buttonDisabled?: boolean;
    prefilledContent?: string;
    onClickAnalyze: (e: any) => void;
    onClickAdd: (e: any) => void;
    onTextFieldChange?: (e: any, newValue?: string) => void;
};

function ModalContent(props: ModalContentProps): React.JSX.Element {
    switch (props.modalState.type) {
        case "ADD":
            return (
                <>
                    <Stack>
                        <Label>
                            {`Found a valid feed at ${props.modalState.source}`}
                        </Label>
                    </Stack>
                    <PrimaryButton
                        className="centered-button"
                        text={intl.get("sources.add")}
                        onClick={props.onClickAdd}
                    />
                </>
            );
        case "ANALYZE":
            return (
                <>
                    <Stack>
                        <TextField
                            label={intl.get("addSourceModal.textField")}
                            placeholder={intl.get("addSourceModal.example")}
                            description={intl.get("addSourceModal.description")}
                            defaultValue={props.prefilledContent}
                            onChange={props.onTextFieldChange}
                        />
                    </Stack>
                    <PrimaryButton
                        className="centered-button"
                        text={intl.get("addSourceModal.analyzeSource")}
                        onClick={props.onClickAnalyze}
                        disabled={props.buttonDisabled}
                    />
                </>
            );
        default:
            return (
                <p>An error occurred: this modal got in an impossible state</p>
            );
    }
}
