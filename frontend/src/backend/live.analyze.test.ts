// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { makeLiveProvider, type LiveDiagnosis } from "./live";
import { DIAGNOSES } from "../scenarios/homework";
import { saveCustomProblem } from "../scenarios/custom";
import type { Diagnosis } from "../scenarios/types";

const ANALYZE_URL = "https://fake.test/analyze";
const SEEDED_ID = "average-speed";

const liveDiagnosis = (problemId = "whatever-the-server-said"): Diagnosis => ({
  problemId,
  steps: [{ id: "s1", kind: "claim", label: "step", caption: "cap" }],
  mixup: null,
  celebration: { headline: "Nice!", sub: "Solid reasoning." },
});

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const errorResponse = (status = 500) =>
  ({ ok: false, status, json: async () => ({}) }) as Response;

let fetchMock: Mock;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const provider = () => makeLiveProvider({ analyzeUrl: ANALYZE_URL });

describe("live provider analyzeReasoning", () => {
  it("returns the validated live diagnosis with the requested problemId stamped", async () => {
    fetchMock.mockResolvedValue(okResponse(liveDiagnosis()));
    const result = await provider().analyzeReasoning(SEEDED_ID, "my reasoning");
    // problemId is stamped from the request, not trusted from the server.
    expect(result.problemId).toBe(SEEDED_ID);
    expect(result.steps).toHaveLength(1);
    expect(result.celebration.headline).toBe("Nice!");
    expect((result as LiveDiagnosis).source).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ANALYZE_URL);
    expect(JSON.parse((init as RequestInit).body as string).problemId).toBe(
      SEEDED_ID,
    );
  });

  const seededFallback = (): LiveDiagnosis => ({
    ...DIAGNOSES[SEEDED_ID],
    source: "seeded-fallback",
  });

  it("falls back to the seeded diagnosis when the endpoint returns non-ok", async () => {
    fetchMock.mockResolvedValue(errorResponse(500));
    await expect(
      provider().analyzeReasoning(SEEDED_ID, "r"),
    ).resolves.toEqual(seededFallback());
  });

  it("falls back to the seeded diagnosis when fetch throws (network error)", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    await expect(
      provider().analyzeReasoning(SEEDED_ID, "r"),
    ).resolves.toEqual(seededFallback());
  });

  it("treats a timeout/abort as a failure and falls back for seeded problems", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError"),
    );
    await expect(
      provider().analyzeReasoning(SEEDED_ID, "r"),
    ).resolves.toEqual(seededFallback());
  });

  it("falls back when the live payload fails validation (missing steps)", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ celebration: { headline: "h", sub: "s" }, mixup: null }),
    );
    await expect(
      provider().analyzeReasoning(SEEDED_ID, "r"),
    ).resolves.toEqual(seededFallback());
  });

  it("rethrows failures for custom problems (no seed to fall back to)", async () => {
    const custom = saveCustomProblem({
      title: "Mine",
      statement: "s",
      sampleReasoning: "r",
    });
    fetchMock.mockRejectedValue(new TypeError("network down"));
    await expect(
      provider().analyzeReasoning(custom.id, "r"),
    ).rejects.toThrow("network down");
  });

  it("returns a live diagnosis for custom problems when the endpoint succeeds", async () => {
    const custom = saveCustomProblem({
      title: "Mine",
      statement: "s",
      sampleReasoning: "r",
    });
    fetchMock.mockResolvedValue(okResponse(liveDiagnosis()));
    const result = await provider().analyzeReasoning(custom.id, "r");
    expect(result.problemId).toBe(custom.id);
  });

  it("rejects for unknown problem ids before any fetch happens", async () => {
    await expect(
      provider().analyzeReasoning("no-such-problem", "r"),
    ).rejects.toThrow("Unknown problem: no-such-problem");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
