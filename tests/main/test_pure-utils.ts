import { expect } from "chai";
import { trimContent } from "../../src/main/pure-utils";

describe("dialog trimming", () => {
    it("trims long words", () => {
        expect(trimContent("M".repeat(1000))).to.equal("M".repeat(511) + "…");
    });
    it("trims too many lines", () => {
        expect(trimContent("M\n".repeat(15), 512, 5)).to.equal(
            "M\n".repeat(4) + "…more lines…",
        );
    });
});
