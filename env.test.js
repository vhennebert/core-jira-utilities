import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("node:fs");
vi.mock("node:child_process");

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const dissoc = (obj, ...keys) => {
  const res = { ...obj };
  for (const key of keys) {
    delete res[key];
  }
  return res;
};

const envVars = {
  JIRA_URL: "https://test.atlassian.net",
  JIRA_USERNAME: "user@test.com",
  JIRA_TOKEN_PATH: "/path/to/token.gpg",
  JIRA_TOKEN: "plain-token",
};

const envAsFile = (env) =>
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

const expectedAuth = (token) =>
  `Basic ${Buffer.from(`${envVars.JIRA_USERNAME}:${token}`).toString("base64")}`;

const loadEnv = () => {
  vi.resetModules();
  return import("./env.js");
};

beforeEach(() => {
  execSync.mockClear();
  execSync.mockReturnValue("encrypted-token\n");
  for (const key of Object.keys(envVars)) {
    delete process.env[key];
  }
});

describe("env.js", () => {
  it("exports JIRA_URL and JIRA_AUTHORIZATION from .env file", async () => {
    readFileSync.mockReturnValue(envAsFile(dissoc(envVars, "JIRA_TOKEN")));
    const { JIRA_URL, JIRA_AUTHORIZATION } = await loadEnv();
    expect(JIRA_URL).toBe(envVars.JIRA_URL);
    expect(JIRA_AUTHORIZATION).toBe(expectedAuth("encrypted-token"));
  });

  it("process.env takes precedence over .env file", async () => {
    readFileSync.mockReturnValue(envAsFile(dissoc(envVars, "JIRA_TOKEN")));
    process.env.JIRA_URL = "https://override.atlassian.net";
    const { JIRA_URL } = await loadEnv();
    expect(JIRA_URL).toBe("https://override.atlassian.net");
  });

  it("works when .env file is absent and vars are set in process.env", async () => {
    Object.assign(process.env, dissoc(envVars, "JIRA_TOKEN"));
    readFileSync.mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    const { JIRA_URL } = await loadEnv();
    expect(JIRA_URL).toBe(envVars.JIRA_URL);
  });

  it("uses JIRA_TOKEN as a fallback when JIRA_TOKEN_PATH is not set", async () => {
    readFileSync.mockReturnValue(envAsFile(dissoc(envVars, "JIRA_TOKEN_PATH")));
    const { JIRA_AUTHORIZATION } = await loadEnv();
    expect(JIRA_AUTHORIZATION).toBe(expectedAuth("plain-token"));
    expect(execSync).not.toHaveBeenCalled();
  });

  it("prefers JIRA_TOKEN_PATH over JIRA_TOKEN when both are set", async () => {
    readFileSync.mockReturnValue(envAsFile(envVars));
    const { JIRA_AUTHORIZATION } = await loadEnv();
    expect(JIRA_AUTHORIZATION).toBe(expectedAuth("encrypted-token"));
    expect(execSync).toHaveBeenCalled();
  });

  it("throws listing all missing required variables", async () => {
    readFileSync.mockReturnValue(
      envAsFile(
        dissoc(envVars, "JIRA_USERNAME", "JIRA_TOKEN_PATH", "JIRA_TOKEN"),
      ),
    );
    await expect(loadEnv()).rejects.toThrow(
      "Missing required environment variables: JIRA_USERNAME, JIRA_TOKEN_PATH or JIRA_TOKEN",
    );
  });

  it("rethrows non-ENOENT file read errors", async () => {
    readFileSync.mockImplementation(() => {
      throw Object.assign(new Error("Permission denied"), { code: "EACCES" });
    });
    await expect(loadEnv()).rejects.toThrow("Permission denied");
  });
});
