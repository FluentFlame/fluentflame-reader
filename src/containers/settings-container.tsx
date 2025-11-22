import { connect } from "react-redux";
import { createSelector } from "reselect";
import { RootState } from "../scripts/reducer";
import { exitSettings, setSettingsTab } from "../scripts/models/app";
import Settings from "../components/settings";

const getApp = (state: RootState) => state.app;

const mapStateToProps = createSelector([getApp], (app) => ({
    display: app.settings.display,
    currentTab: app.settings.tab,
    blocked:
        !app.sourceInit ||
        app.syncing ||
        app.fetchingItems ||
        app.settings.saving,
    exitting: app.settings.saving,
}));

const mapDispatchToProps = (dispatch) => {
    return {
        close: () => dispatch(exitSettings()),
        setTab: (newTab: string | null) => dispatch(setSettingsTab(newTab)),
    };
};

const SettingsContainer = connect(
    mapStateToProps,
    mapDispatchToProps,
)(Settings);
export default SettingsContainer;
