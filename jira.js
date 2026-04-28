import { JIRA_URL, JIRA_AUTHORIZATION } from "./env.js";

const assocIn = (obj, [key, ...keys], val) =>
  key ? { ...obj, [key]: assocIn(obj[key] ?? {}, keys, val) } : val;

const updateIn = (obj, [key, ...keys], f, ...args) =>
  key
    ? { ...obj, [key]: updateIn(obj[key] ?? {}, keys, f, ...args) }
    : f(obj, ...args);

const fetchJira = (endpoint, { api, apiVersion, fetchParams, options }) => {
  if (options.debug) {
    console.log(fetchParams.method, endpoint, fetchParams.body);
  }
  return fetch(
    `${JIRA_URL}/rest/${api}/${apiVersion}/${endpoint}`,
    assocIn(fetchParams, ["headers", "Authorization"], JIRA_AUTHORIZATION),
  ).then(async (res) => {
    if (!res.ok) {
      const errorMsge = await res.text();
      throw new Error(
        `HTTP error ${res.status} ${res.statusText}: ${errorMsge}`,
      );
    }
    return res.body;
  });
};

const createApiCaller = (api) => {
  const defaultParams = {
    api,
    apiVersion: "latest",
    fetchParams: {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    options: {
      debug: false,
    },
  };
  const fetchJiraWithBody = (endpoint, params, method, body) =>
    fetchJira(
      endpoint,
      updateIn(params, ["fetchParams"], (fp) =>
        Object.assign(
          assocIn(fp, ["headers", "Content-Type"], "application/json"),
          { method, body },
        ),
      ),
    );

  const createMethods = (params) => ({
    get: (endpoint) => fetchJira(endpoint, params),
    post: (endpoint, body) => fetchJiraWithBody(endpoint, params, "POST", body),
    put: (endpoint, body) => fetchJiraWithBody(endpoint, params, "PUT", body),
  });

  const createMethodsBoundToEndpoint = (endpoint) => (params) =>
    Object.fromEntries(
      Object.entries(createMethods(params)).map(([method, fn]) => [
        method,
        fn.bind(undefined, endpoint),
      ]),
    );

  const createFetcher = (params, createMethods) => {
    return {
      ...createMethods(params),
      withOptions: (options) =>
        createFetcher(
          updateIn(params, ["options"], (opts) => ({ ...opts, ...options })),
          createMethods,
        ),
    };
  };

  const apiCaller = (endpoint) =>
    createFetcher(defaultParams, createMethodsBoundToEndpoint(endpoint));

  Object.assign(apiCaller, createFetcher(defaultParams, createMethods));
  return apiCaller;
};

/**
 * Jira REST API client targeting `/rest/api/latest`.
 *
 * Two equivalent call styles are supported:
 *
 * ```js
 * // Endpoint-first: call jira(endpoint), then invoke a method
 * jira("issue/PROJ-123").get()
 * jira("issue/PROJ-123").put({ fields: { summary: "New title" } })
 *
 * // Direct: pass the endpoint to the method
 * jira.get("issue/PROJ-123")
 * jira.put("issue/PROJ-123", { fields: { summary: "New title" } })
 * ```
 *
 * All methods resolve with a `ReadableStream`. Use `node:stream/consumers`
 * to materialise the response:
 *
 * ```js
 * import { json, text } from "node:stream/consumers";
 * jira("issue/PROJ-123").get().then(json).then((issue) => { ... })
 * jira("issue/PROJ-123").get().then(text).then((str) => { ... })
 * ```
 *
 * `.withOptions()` returns a new handle without mutating the original:
 *
 * ```js
 * const debugJira = jira.withOptions({ debug: true })
 * debugJira.get("issue/PROJ-123")  // logs: GET issue/PROJ-123
 * jira.get("issue/PROJ-123")       // unchanged — no logging
 * ```
 *
 * `jira.agile` mirrors this interface for `/rest/agile/latest`.
 *
 * @param {string} endpoint - API endpoint relative to `/rest/api/latest/`.
 */
export const jira = createApiCaller("api");
jira.agile = createApiCaller("agile");
