import * as React from "react";
import intl from "react-intl-universal";
import {
    Label,
    DefaultButton,
    TextField,
    Stack,
    PrimaryButton,
    DetailsList,
    IColumn,
    SelectionMode,
    Selection,
    IChoiceGroupOption,
    ChoiceGroup,
    IDropdownOption,
    Dropdown,
    MessageBar,
    MessageBarType,
    Toggle,
} from "@fluentui/react";
import { SourceState, RSSSource } from "../../scripts/models/source";
import {
    RootState,
    useAppDispatch,
    useAppSelector,
} from "../../scripts/reducer";
import { SyncService, SourceOpenTarget } from "../../schema-types";
import { urlTest } from "../../scripts/utils";
import DangerButton from "../utils/danger-button";

type SourcesTabProps = {
    sources: SourceState;
    serviceOn: boolean;
    sids: number[];
    acknowledgeSIDs: () => void;
    addSource: (url: string) => void;
    updateSourceUrl: (source: RSSSource, url: string) => void;
    updateSourceName: (source: RSSSource, name: string) => void;
    updateSourceIcon: (source: RSSSource, iconUrl: string) => Promise<void>;
    updateSourceOpenTarget: (
        source: RSSSource,
        target: SourceOpenTarget,
    ) => void;
    updateFetchFrequency: (source: RSSSource, frequency: number) => void;
    deleteSource: (source: RSSSource) => void;
    deleteSources: (sources: RSSSource[]) => void;
    importOPML: () => void;
    exportOPML: () => void;
    toggleSourceHidden: (source: RSSSource) => void;
};

const enum EditDropdownKeys {
    Name = "n",
    Icon = "i",
    Url = "u",
}

function toEditDropdownKeys(s: string | number): EditDropdownKeys {
    switch (s) {
        case "n":
        case "i":
        case "u":
            return s as EditDropdownKeys;
        default:
            throw Error("Invalid EditDropdownKeys value");
    }
}

// TODO: Selectors should be defined inside slice files rather than
// near components, see https://redux.js.org/usage/deriving-data-selectors
const useSources = (state: RootState) => state.sources;
const useServiceOn = (state: RootState) =>
    state.service.type !== SyncService.None;
const useSIDs = (state: RootState) => state.app.settings.sids;

function columns(): IColumn[] {
    return [
        {
            key: "favicon",
            name: intl.get("icon"),
            fieldName: "name",
            isIconOnly: true,
            iconName: "ImagePixel",
            minWidth: 16,
            maxWidth: 16,
            onRender: (s: RSSSource) =>
                s.iconurl && <img src={s.iconurl} className="favicon" />,
        },
        {
            key: "name",
            name: intl.get("name"),
            fieldName: "name",
            minWidth: 200,
            data: "string",
            isRowHeader: true,
        },
        {
            key: "url",
            name: "URL",
            fieldName: "url",
            minWidth: 280,
            data: "string",
        },
    ];
}

function sourceEditOptions(): IDropdownOption[] {
    return [
        { key: EditDropdownKeys.Name, text: intl.get("name") },
        { key: EditDropdownKeys.Icon, text: intl.get("icon") },
        { key: EditDropdownKeys.Url, text: "URL" },
    ];
}

function fetchFrequencyOptions(): IDropdownOption[] {
    return [
        { key: "0", text: intl.get("sources.unlimited") },
        { key: "15", text: intl.get("time.minute", { m: 15 }) },
        { key: "30", text: intl.get("time.minute", { m: 30 }) },
        { key: "60", text: intl.get("time.hour", { h: 1 }) },
        { key: "120", text: intl.get("time.hour", { h: 2 }) },
        { key: "180", text: intl.get("time.hour", { h: 3 }) },
        { key: "360", text: intl.get("time.hour", { h: 6 }) },
        { key: "720", text: intl.get("time.hour", { h: 12 }) },
        { key: "1440", text: intl.get("time.day", { d: 1 }) },
    ];
}

function sourceOpenTargetChoices(): IChoiceGroupOption[] {
    return [
        {
            key: String(SourceOpenTarget.DeferToGlobal),
            text: intl.get("default"),
        },
        {
            key: String(SourceOpenTarget.Local),
            text: intl.get("sources.rssText"),
        },
        {
            key: String(SourceOpenTarget.FullContent),
            text: intl.get("article.loadFull"),
        },
        {
            key: String(SourceOpenTarget.Webpage),
            text: intl.get("sources.loadWebpage"),
        },
        {
            key: String(SourceOpenTarget.External),
            text: intl.get("openExternal"),
        },
    ];
}

function singleSelectedSource(sources: RSSSource[]): RSSSource | null {
    if (sources.length === 1) {
        return sources[0];
    }
    return null;
}

export function SourcesTab(props: SourcesTabProps) {
    const dispatch = useAppDispatch();
    const sources = useAppSelector(useSources);
    const serviceOn = useAppSelector(useServiceOn);
    const sids = useAppSelector(useSIDs);
    const [newUrl, setNewUrl] = React.useState("");
    const [newSourceName, setNewSourceName] = React.useState("");
    const [newSourceIcon, setNewSourceIcon] = React.useState("");
    const [selectedSources, setSelectedSources] = React.useState<RSSSource[]>(
        [],
    );
    const [sourceEditOption, setSourceEditOption] =
        React.useState<EditDropdownKeys | null>(null);
    const selection = new Selection({
        getKey: (s) => (s as RSSSource).sid,
        onSelectionChanged: () => {
            let count = selection.getSelectedCount();
            let sources = count
                ? (selection.getSelection() as RSSSource[])
                : [];
            setSelectedSources(sources);
            if (count === 1) {
                setNewUrl(sources[0].url);
                setNewSourceName(sources[0].name);
                setNewSourceIcon(sources[0].iconurl ?? "");
            } else {
                setNewUrl("");
                setNewSourceName("");
                setNewSourceIcon("");
            }
            setSourceEditOption(EditDropdownKeys.Name);
        },
    });

    const updateSingleSource = (
        source: RSSSource,
        updater: Partial<RSSSource>,
    ) => {
        // We can't mutate state directly, so instead use this updater to do it.
        // https://react.dev/learn/updating-arrays-in-state#replacing-items-in-an-array
        const newSelectedSource = { ...source, ...updater };
        setSelectedSources([newSelectedSource]);
        return newSelectedSource;
    };

    const onSourceEditOptionChange = (_: any, option: IDropdownOption) => {
        setSourceEditOption(toEditDropdownKeys(option.key));
    };

    const onFetchFrequencyChange = (_: any, option: IDropdownOption) => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        let frequency = parseInt(option.key as string);
        props.updateFetchFrequency(selectedSource, frequency);
        updateSingleSource(selectedSource, { fetchFrequency: frequency });
    };

    const updateSourceUrl = () => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        const newUrlTrimmed = newUrl.trim();
        props.updateSourceUrl(selectedSource, newUrlTrimmed);
        updateSingleSource(selectedSource, { url: newUrlTrimmed });
    };

    const updateSourceName = () => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        const newName = newSourceName.trim();
        props.updateSourceName(selectedSource, newName);
        updateSingleSource(selectedSource, { name: newName });
    };

    const updateSourceIcon = () => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        const newIcon = newSourceIcon.trim();
        props.updateSourceIcon(selectedSource, newIcon);
        updateSingleSource(selectedSource, { iconurl: newIcon });
    };

    const handleInputChange = (event) => {
        // This is a mess, but this matches how it was originally
        // implemented.
        const name: string = event.target.name;
        const value: any = event.target.value;
        switch (name) {
            case "newUrl":
                setNewUrl(value);
                return;
            case "newSourceName":
                setNewSourceName(value);
                return;
            case "newSourceIcon":
                setNewSourceIcon(value);
                return;
            case "selectedSources":
                setSelectedSources(value);
                return;
            case "sourceEditOption":
                setSourceEditOption(value);
                return;
            default:
                console.error("Invalid input change", name);
                return;
        }
    };

    const addSource = (event: React.FormEvent) => {
        event.preventDefault();
        let trimmed = newUrl.trim();
        if (urlTest(trimmed)) props.addSource(trimmed);
    };

    const onOpenTargetChange = (_: any, option: IChoiceGroupOption) => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        let newTarget = parseInt(option.key) as SourceOpenTarget;
        props.updateSourceOpenTarget(selectedSource, newTarget);
        updateSingleSource(selectedSource, { openTarget: newTarget });
    };

    const onToggleHidden = () => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return;
        }
        props.toggleSourceHidden(selectedSource);
        updateSingleSource(selectedSource, { hidden: !selectedSource.hidden });
    };

    React.useEffect(() => {
        if (sids.length > 0) {
            for (const sid of sids) {
                selection.setKeySelected(String(sid), true, false);
            }
            props.acknowledgeSIDs();
        }
    }, []);

    const renderSelectedSourceDiv = () => {
        const selectedSource = singleSelectedSource(selectedSources);
        if (selectedSource == null) {
            return null;
        }
        return (
            <>
                {selectedSource.serviceRef && (
                    <MessageBar messageBarType={MessageBarType.info}>
                        {intl.get("sources.serviceManaged")}
                    </MessageBar>
                )}
                <Label>{intl.get("sources.selected")}</Label>
                <Stack horizontal>
                    <Stack.Item>
                        <Dropdown
                            options={sourceEditOptions()}
                            selectedKey={sourceEditOption}
                            onChange={onSourceEditOptionChange}
                            style={{ width: 120 }}
                        />
                    </Stack.Item>
                    {sourceEditOption === EditDropdownKeys.Name && (
                        <>
                            <Stack.Item grow>
                                <TextField
                                    onGetErrorMessage={(v) =>
                                        v.trim().length == 0
                                            ? intl.get("emptyName")
                                            : ""
                                    }
                                    validateOnLoad={false}
                                    placeholder={intl.get("sources.name")}
                                    value={newSourceName}
                                    name="newSourceName"
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={
                                        newSourceName.trim().length == 0 ||
                                        newSourceName === selectedSource.name
                                    }
                                    onClick={updateSourceName}
                                    text={intl.get("sources.editName")}
                                />
                            </Stack.Item>
                        </>
                    )}
                    {sourceEditOption === EditDropdownKeys.Icon && (
                        <>
                            <Stack.Item grow>
                                <TextField
                                    onGetErrorMessage={(v) =>
                                        urlTest(v.trim())
                                            ? ""
                                            : intl.get("sources.badUrl")
                                    }
                                    validateOnLoad={false}
                                    placeholder={intl.get("sources.inputUrl")}
                                    value={newSourceIcon}
                                    name="newSourceIcon"
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={
                                        !urlTest(newSourceIcon.trim()) ||
                                        newSourceIcon === selectedSource.iconurl
                                    }
                                    onClick={updateSourceIcon}
                                    text={intl.get("edit")}
                                />
                            </Stack.Item>
                        </>
                    )}
                    {sourceEditOption === EditDropdownKeys.Url && (
                        <>
                            <Stack.Item grow>
                                <TextField
                                    onGetErrorMessage={(v) =>
                                        urlTest(v.trim())
                                            ? ""
                                            : intl.get("sources.badUrl")
                                    }
                                    validateOnLoad={false}
                                    placeholder={intl.get("sources.inputUrl")}
                                    value={newUrl}
                                    name="newUrl"
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={
                                        newUrl.trim().length == 0 ||
                                        newUrl === selectedSource.url
                                    }
                                    onClick={updateSourceUrl}
                                    text={intl.get("edit")}
                                />
                            </Stack.Item>
                        </>
                    )}
                </Stack>
                {!selectedSource.serviceRef && (
                    <>
                        <Label>{intl.get("sources.fetchFrequency")}</Label>
                        <Stack>
                            <Stack.Item>
                                <Dropdown
                                    options={fetchFrequencyOptions()}
                                    selectedKey={
                                        selectedSource.fetchFrequency
                                            ? String(
                                                  selectedSource.fetchFrequency,
                                              )
                                            : "0"
                                    }
                                    onChange={onFetchFrequencyChange}
                                    style={{ width: 200 }}
                                />
                            </Stack.Item>
                        </Stack>
                    </>
                )}
                <ChoiceGroup
                    label={intl.get("sources.openTarget")}
                    options={sourceOpenTargetChoices()}
                    selectedKey={String(selectedSource.openTarget)}
                    onChange={onOpenTargetChange}
                />
                <Stack horizontal verticalAlign="baseline">
                    <Stack.Item grow>
                        <Label>{intl.get("sources.hidden")}</Label>
                    </Stack.Item>
                    <Stack.Item>
                        <Toggle
                            checked={selectedSource.hidden}
                            onChange={onToggleHidden}
                        />
                    </Stack.Item>
                </Stack>
                {!selectedSource.serviceRef && (
                    <Stack horizontal>
                        <Stack.Item>
                            <DangerButton
                                onClick={() =>
                                    props.deleteSource(selectedSource)
                                }
                                key={selectedSource.sid}
                                text={intl.get("sources.delete")}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <span className="settings-hint">
                                {intl.get("sources.deleteWarning")}
                            </span>
                        </Stack.Item>
                    </Stack>
                )}
            </>
        );
    };

    const renderMultipleSourcesDiv = () => {
        if (selectedSources.length < 2) {
            return null;
        }
        return selectedSources.filter((s) => s.serviceRef).length === 0 ? (
            <>
                <Label>{intl.get("sources.selectedMulti")}</Label>
                <Stack horizontal>
                    <Stack.Item>
                        <DangerButton
                            onClick={() => props.deleteSources(selectedSources)}
                            text={intl.get("sources.delete")}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <span className="settings-hint">
                            {intl.get("sources.deleteWarning")}
                        </span>
                    </Stack.Item>
                </Stack>
            </>
        ) : (
            <MessageBar messageBarType={MessageBarType.info}>
                {intl.get("sources.serviceManaged")}
            </MessageBar>
        );
    };

    return (
        <div className="tab-body">
            {serviceOn && (
                <MessageBar messageBarType={MessageBarType.info}>
                    {intl.get("sources.serviceWarning")}
                </MessageBar>
            )}
            <Label>{intl.get("sources.opmlFile")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={props.importOPML}
                        text={intl.get("sources.import")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={props.exportOPML}
                        text={intl.get("sources.export")}
                    />
                </Stack.Item>
            </Stack>

            <form onSubmit={addSource}>
                <Label htmlFor="newUrl">{intl.get("sources.add")}</Label>
                <Stack horizontal>
                    <Stack.Item grow>
                        <TextField
                            onGetErrorMessage={(v) =>
                                urlTest(v.trim())
                                    ? ""
                                    : intl.get("sources.badUrl")
                            }
                            validateOnLoad={false}
                            placeholder={intl.get("sources.inputUrl")}
                            value={newUrl}
                            id="newUrl"
                            name="newUrl"
                            onChange={handleInputChange}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <PrimaryButton
                            disabled={!urlTest(newUrl.trim())}
                            type="submit"
                            text={intl.get("add")}
                        />
                    </Stack.Item>
                </Stack>
            </form>

            <DetailsList
                compact={Object.keys(sources).length >= 10}
                items={Object.values(sources)}
                columns={columns()}
                getKey={(s) => s.sid}
                setKey="selected"
                selection={selection}
                selectionMode={SelectionMode.multiple}
            />
            {renderSelectedSourceDiv()}
            {renderMultipleSourcesDiv()}
        </div>
    );
}
