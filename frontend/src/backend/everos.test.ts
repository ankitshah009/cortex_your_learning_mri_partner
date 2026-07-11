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
import { makeEverosMemory } from "./everos";

let fetchMock: Mock;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const memory = () => makeEverosMemory("test-api-key", "user-1");

describe("everos getMemoryEvidence", () => {
  it("returns an empty evidence shape on non-2xx responses (no throw)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);
    await expect(memory().getMemoryEvidence("speed")).resolves.toEqual({
      topic: "speed",
      episodes: [],
      profiles: [],
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns an empty evidence shape on network failure (no throw)", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    await expect(memory().getMemoryEvidence("speed")).resolves.toEqual({
      topic: "speed",
      episodes: [],
      profiles: [],
    });
  });

  it("passes through episodes and profiles from a successful search", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { episodes: [{ id: "e1" }], profiles: [{ id: "pr1" }] },
      }),
    } as Response);
    const evidence = await memory().getMemoryEvidence("speed");
    expect(evidence).toEqual({
      topic: "speed",
      episodes: [{ id: "e1" }],
      profiles: [{ id: "pr1" }],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/memories/search");
    expect(
      (init as RequestInit).headers as Record<string, string>,
    ).toMatchObject({ authorization: "Bearer test-api-key" });
  });

  it("tolerates a successful response with a malformed data payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { episodes: "not-an-array" } }),
    } as Response);
    await expect(memory().getMemoryEvidence("speed")).resolves.toEqual({
      topic: "speed",
      episodes: [],
      profiles: [],
    });
  });
});

describe("everos recordLearningSession", () => {
  it("silently falls back to the mock recorder on failure (resolves, warns)", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    await expect(
      memory().recordLearningSession("speed", "fixed the mix-up", 88),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("falls back on non-2xx responses too", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    await expect(
      memory().recordLearningSession("speed", "summary", 50),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("posts the session to the memories endpoint on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    await memory().recordLearningSession("speed", "fixed the mix-up", 88);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/memories");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.user_id).toBe("user-1");
    expect(body.messages[0].content).toContain("Score: 88/100");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
