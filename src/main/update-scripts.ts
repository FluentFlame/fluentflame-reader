import Store from "electron-store";
import { SchemaTypes } from "../schema-types";
import { version } from "../../package.json";

export default function performUpdate(store: Store<SchemaTypes>) {
    let curVersion = store.get("version", null);
    if (version != curVersion) {
        store.set("version", version);
    }
}
