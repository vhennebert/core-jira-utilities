import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { PassThrough } from "node:stream";

/**
 * Creates a transform that passes an input stream through a jq filter.
 *
 * Returns a function suitable for use in a `.then()` chain after any method
 * returning a `Promise<ReadableStream>`:
 *
 * ```js
 * import { json } from "node:stream/consumers";
 * import { jira, jq } from "@jira-utilities/core";
 *
 * jira.get("issue/PROJ-123").then(jq(".fields")).then(json)
 * ```
 *
 * jq CLI flags may be passed before the program:
 *
 * ```js
 * jira.get("search?jql=project=PROJ").then(jq("--raw-output", ".issues[].key"))
 * ```
 *
 * @param {...string} args - Optional jq CLI flags followed by the (required) jq filter.
 * @returns A function that takes an input stream and returns jq's output as a Readable.
 * @throws {TypeError} If called with no arguments.
 */
export const jq = (...args) => {
  if (args.length === 0) {
    throw new TypeError("Missing required jq filter argument");
  }

  return (inputStream) => {
    const jq = spawn("jq", args);
    const output = new PassThrough();
    let errMsg = "";
    jq.stderr.on("data", (chunk) => (errMsg += chunk));

    const fail = (err) => {
      if (!jq.killed) {
        jq.kill();
      }
      output.destroy(err);
    };

    pipeline(inputStream, jq.stdin).catch((err) => {
      // EPIPE is normal when jq stops reading early (e.g. `first`, `limit`);
      // the real outcome comes from the exit code, not from stdin closing.
      if (err.code !== "EPIPE") {
        fail(err);
      }
    });
    // Defer output.end() until we can inspect the exit code;
    // Otherwise the consumer would see a clean end before we can error the stream.
    pipeline(jq.stdout, output, { end: false }).catch(fail);
    jq.on("error", fail);
    jq.on("close", (code) => {
      if (code !== 0) {
        fail(new Error(errMsg.trim()));
      } else {
        output.end();
      }
    });

    return output;
  };
};
