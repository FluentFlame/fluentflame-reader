import Store from "electron-store";
import { SchemaTypes } from "../schema-types";
import pkg from "../../package.json";

export default function performUpdate(store: Store<SchemaTypes>) {
    let curVersion = store.get("version", null);
    if (pkg.version != curVersion) {
        store.set("version", pkg.version);
    }
}
