import { expect } from "chai";
import { exportedForTesting } from "../../src/main/utils";

describe("dialog trimming", () => {
    it("trims long words", () => {
        expect(exportedForTesting.trimContent("M".repeat(1000))).to.equal(
            "M".repeat(511) + "…",
        );
    });
    it("trims too many lines", () => {
        expect(exportedForTesting.trimContent("M\n".repeat(10))).to.equal(
            "M\n".repeat(4) + "…more lines…",
        );
    });
});
