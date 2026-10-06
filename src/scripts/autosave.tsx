import * as db from "./db";

/**
 * Renew the autosave file in userData if it's been long enough.
 */
export async function renewAutosave() {
    const oneDay = 24 * 60 * 60 * 1000;
    const autosaveMTimeMs = await window.utils.getLastAutosaveTimestamp();
    const autosaveStartTime = Date.now();
    if (autosaveStartTime < autosaveMTimeMs + oneDay) {
        console.debug("Autosave still current, not rewriting.");
        return;
    }
    let sources: db.SourceEntry[];
    let items: db.ItemEntry[];
    const transaction = db.fluentDB.transaction(
        "r",
        db.fluentDB.sources,
        db.fluentDB.items,
        async () => {
            sources = await db.fluentDB.sources.toArray();
            items = await db.fluentDB.items.toArray();
        },
    );
    const output = window.settings.getAll();
    await transaction;
    output["database"] = {
        sources: sources,
        items: items,
    };
    await window.utils.autosaveBackupData(JSON.stringify(output));
    const autosaveEndTime = Date.now();
    console.debug(
        "Completed autosave in " +
            `${Math.round(autosaveEndTime - autosaveStartTime)}ms.`,
    );
}
