import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const readEnvFile = (filename) => {
  try {
    return parseEnv(readFileSync(filename, "utf-8"));
  } catch (e) {
    if (e.code === "ENOENT") {
      return {};
    } else {
      throw e;
    }
  }
};

const env = Object.assign(readEnvFile(".env"), process.env);

const missing = ["JIRA_URL", "JIRA_USERNAME"].filter((k) => !env[k]);
if (!env.JIRA_TOKEN_PATH && !env.JIRA_TOKEN) {
  missing.push("JIRA_TOKEN_PATH or JIRA_TOKEN");
}
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

const token = env.JIRA_TOKEN_PATH
  ? execSync(`gpg -q --decrypt ${env.JIRA_TOKEN_PATH}`, {
      encoding: "utf-8",
    }).trim()
  : env.JIRA_TOKEN;

export const JIRA_URL = env.JIRA_URL;
export const JIRA_AUTHORIZATION = `Basic ${Buffer.from(`${env.JIRA_USERNAME}:${token}`).toString("base64")}`;
