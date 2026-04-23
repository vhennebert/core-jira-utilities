import { JIRA_URL, JIRA_AUTHORIZATION } from "./env.js";

const assocIn = (obj, [key, ...keys], val) =>
  key ? { ...obj, [key]: assocIn(obj[key] ?? {}, keys, val) } : val;

const updateIn = (obj, [key, ...keys], f, ...args) =>
  key
    ? { ...obj, [key]: updateIn(obj[key] ?? {}, keys, f, ...args) }
    : f(obj, ...args);

const fetchJira = (endpoint, { api, apiVersion, fetchParams, options }) => {
  if (options.debug) {
    console.log(fetchParams.method, api, fetchParams.body);
  }
  return fetch(
    `${JIRA_URL}/rest/${api}/${apiVersion}/${endpoint}`,
    assocIn(fetchParams, ["headers", "Authorization"], JIRA_AUTHORIZATION),
  )
    .then((res) => Promise.all([res, res.text()]))
    .then(([res, body]) => {
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} ${res.statusText}: ${body}`);
      }
      return body !== "" && options.parseJSON ? JSON.parse(body) : body;
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
      parseJSON: true,
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

const jira = createApiCaller("api");
jira.agile = createApiCaller("agile");

export default jira;
