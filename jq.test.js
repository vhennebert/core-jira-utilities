import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { text } from "node:stream/consumers";
import { jq } from "./jq.js";

describe("jq(program)", () => {
  it("applies the filter to the input stream", async () => {
    const output = jq(".foo")(Readable.from('{"foo":"bar"}'));
    await expect(text(output)).resolves.toBe('"bar"\n');
  });

  it("supports options", async () => {
    const output = jq("--raw-output", ".foo")(Readable.from('{"foo":"bar"}'));
    await expect(text(output)).resolves.toBe("bar\n");
  });
});

describe("error handling", () => {
  it("throws TypeError when called with no arguments", () => {
    expect(() => jq()).toThrow(TypeError);
  });
  it("propagates errors from the input stream", async () => {
    const erroringStream = new Readable({
      read() {
        this.destroy(new Error("read error"));
      },
    });
    const output = jq(".")(erroringStream);
    await expect(text(output)).rejects.toThrow("read error");
  });

  it("rejects with an error when the filter is invalid", async () => {
    const output = jq(".foo |")(Readable.from("{}"));
    await expect(text(output)).rejects.toThrow("syntax error");
  });

  it("is robust to EPIPE when jq exits before consuming all input", async () => {
    // -n ignores stdin entirely; the infinite source triggers EPIPE when
    // jq exits, which must be swallowed so the successful output still resolves
    function* forever() {
      while (true) {
        yield "{}";
      }
    }
    const output = jq("-n", "null")(Readable.from(forever()));
    expect(await text(output)).toBe("null\n");
  });
});
