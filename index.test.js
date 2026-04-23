import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const EXPECTED_AUTH = `Basic ${Buffer.from("test@example.com:fake-token").toString("base64")}`;
const JIRA_URL = "https://test.atlassian.net";
const BASE_URL = `${JIRA_URL}/rest/api/latest`;
const AGILE_BASE_URL = `${JIRA_URL}/rest/agile/latest`;

vi.doMock("./env.js", () => ({
  JIRA_URL,
  JIRA_AUTHORIZATION: EXPECTED_AUTH,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Imported dynamically so that doMock can do its job first
// doMock is necessary over mock to use global constants
const { default: jira } = await import("./index.js");

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("{}") });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const testSuite = (label, subject, baseUrl, api) => {
  describe(`endpoint-first style: ${label}(endpoint)`, () => {
    describe(".get()", () => {
      it("calls fetch with the correct URL", () => {
        subject("issue/AIPCC-1234").get();
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.anything(),
        );
      });

      it("uses GET method with Authorization and Accept headers", () => {
        subject("issue/AIPCC-1234").get();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              Accept: "application/json",
            }),
          }),
        );
      });
    });

    describe(".post(body)", () => {
      it("calls fetch with POST method, Content-Type header, and body", () => {
        const body = { field: "value" };
        subject("issue/AIPCC-1234").post(body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              Accept: "application/json",
              "Content-Type": "application/json",
            }),
            body,
          }),
        );
      });
    });

    describe(".put(body)", () => {
      it("calls fetch with PUT method, Content-Type header, and body", () => {
        const body = { field: "value" };
        subject("issue/AIPCC-1234").put(body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              Accept: "application/json",
              "Content-Type": "application/json",
            }),
            body,
          }),
        );
      });
    });

    describe(".withOptions({debug: true})", () => {
      it(".get() logs method and api type", () => {
        subject("issue/AIPCC-1234").withOptions({ debug: true }).get();
        expect(console.log).toHaveBeenCalledWith("GET", api, undefined);
      });

      it(".post(body) logs method and api type", () => {
        subject("issue/AIPCC-1234")
          .withOptions({ debug: true })
          .post({ field: "value" });
        expect(console.log).toHaveBeenCalledWith(
          "POST",
          api,
          expect.anything(),
        );
      });

      it(".put(body) logs method and api type", () => {
        subject("issue/AIPCC-1234")
          .withOptions({ debug: true })
          .put({ field: "value" });
        expect(console.log).toHaveBeenCalledWith("PUT", api, expect.anything());
      });
    });

    describe(".withOptions({parseJSON: false})", () => {
      it(".get() still calls fetch with the correct URL and GET method", () => {
        subject("issue/AIPCC-1234").withOptions({ parseJSON: false }).get();
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "GET" }),
        );
      });

      it(".post(body) still calls fetch with POST method and body", () => {
        const body = { field: "value" };
        subject("issue/AIPCC-1234")
          .withOptions({ parseJSON: false })
          .post(body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "POST", body }),
        );
      });

      it(".put(body) still calls fetch with PUT method and body", () => {
        const body = { field: "value" };
        subject("issue/AIPCC-1234").withOptions({ parseJSON: false }).put(body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "PUT", body }),
        );
      });
    });

    describe("withOptions chaining", () => {
      it("merges options across multiple withOptions calls", () => {
        subject("issue/AIPCC-1234")
          .withOptions({ debug: true })
          .withOptions({ parseJSON: false })
          .get();
        expect(console.log).toHaveBeenCalledWith("GET", api, undefined);
      });
    });

    describe("immutability", () => {
      it("withOptions does not mutate the original handle", () => {
        const handle = subject("issue/AIPCC-1234");
        handle.withOptions({ debug: true });
        handle.get();
        expect(console.log).not.toHaveBeenCalledWith("GET", api, undefined);
      });
    });
  });

  describe(`flat style: ${label}.get / ${label}.post / ${label}.put / ${label}.withOptions`, () => {
    describe(`.get(endpoint)`, () => {
      it("calls fetch with correct URL, GET method and auth headers", () => {
        subject.get("issue/AIPCC-1234");
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              Accept: "application/json",
            }),
          }),
        );
      });
    });

    describe(`.post(endpoint, body)`, () => {
      it("calls fetch with POST method, Content-Type header, and body", () => {
        const body = { field: "value" };
        subject.post("issue/AIPCC-1234", body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              "Content-Type": "application/json",
            }),
            body,
          }),
        );
      });
    });

    describe(`.put(endpoint, body)`, () => {
      it("calls fetch with PUT method, Content-Type header, and body", () => {
        const body = { field: "value" };
        subject.put("issue/AIPCC-1234", body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              Authorization: EXPECTED_AUTH,
              "Content-Type": "application/json",
            }),
            body,
          }),
        );
      });
    });

    describe(`.withOptions({debug: true})`, () => {
      it(".get(endpoint) logs method and api type", () => {
        subject.withOptions({ debug: true }).get("issue/AIPCC-1234");
        expect(console.log).toHaveBeenCalledWith("GET", api, undefined);
      });

      it(".post(endpoint, body) logs method and api type", () => {
        subject
          .withOptions({ debug: true })
          .post("issue/AIPCC-1234", { field: "value" });
        expect(console.log).toHaveBeenCalledWith(
          "POST",
          api,
          expect.anything(),
        );
      });

      it(".put(endpoint, body) logs method and api type", () => {
        subject
          .withOptions({ debug: true })
          .put("issue/AIPCC-1234", { field: "value" });
        expect(console.log).toHaveBeenCalledWith("PUT", api, expect.anything());
      });
    });

    describe(`.withOptions({parseJSON: false})`, () => {
      it(".get(endpoint) still calls fetch with correct URL and GET method", () => {
        subject.withOptions({ parseJSON: false }).get("issue/AIPCC-1234");
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "GET" }),
        );
      });

      it(".post(endpoint, body) still calls fetch with POST method and body", () => {
        const body = { field: "value" };
        subject
          .withOptions({ parseJSON: false })
          .post("issue/AIPCC-1234", body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "POST", body }),
        );
      });

      it(".put(endpoint, body) still calls fetch with PUT method and body", () => {
        const body = { field: "value" };
        subject.withOptions({ parseJSON: false }).put("issue/AIPCC-1234", body);
        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/issue/AIPCC-1234`,
          expect.objectContaining({ method: "PUT", body }),
        );
      });
    });

    describe("withOptions chaining", () => {
      it("merges options across multiple withOptions calls", () => {
        subject
          .withOptions({ debug: true })
          .withOptions({ parseJSON: false })
          .get("issue/AIPCC-1234");
        expect(console.log).toHaveBeenCalledWith("GET", api, undefined);
      });
    });

    describe("immutability", () => {
      it("withOptions does not mutate the original subject object", () => {
        subject.withOptions({ debug: true });
        subject.get("issue/AIPCC-1234");
        expect(console.log).not.toHaveBeenCalledWith("GET", api, undefined);
      });
    });
  });
};

testSuite("jira", jira, BASE_URL, "api");
testSuite("jira.agile", jira.agile, AGILE_BASE_URL, "agile");

describe("cross-cutting", () => {
  it("Authorization header encodes the decrypted token correctly", () => {
    jira("issue/AIPCC-1234").get();
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe(EXPECTED_AUTH);
  });

  it("different endpoints produce independent URLs", () => {
    jira("issue/AIPCC-1234").get();
    jira("issue/AIPCC-5678").get();
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE_URL}/issue/AIPCC-1234`);
    expect(mockFetch.mock.calls[1][0]).toBe(`${BASE_URL}/issue/AIPCC-5678`);
  });

  it("default options do not trigger debug logging", () => {
    jira("issue/AIPCC-1234").get();
    expect(console.log).not.toHaveBeenCalledWith("GET", "api", undefined);
  });

  it("jira and jira.agile use independent base URLs", () => {
    jira.agile.get("sprint/123");
    jira.get("issue/AIPCC-1234");
    expect(mockFetch.mock.calls[0][0]).toBe(`${AGILE_BASE_URL}/sprint/123`);
    expect(mockFetch.mock.calls[1][0]).toBe(`${BASE_URL}/issue/AIPCC-1234`);
  });
});
