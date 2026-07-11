// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useJudgeToggle } from "./useJudgeToggle";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  });
}

describe("useJudgeToggle", () => {
  it("toggles open on 'j' keydown", () => {
    const { result } = renderHook(() => useJudgeToggle());
    expect(result.current.open).toBe(false);
    press("j");
    expect(result.current.open).toBe(true);
    press("j");
    expect(result.current.open).toBe(false);
  });

  it("also toggles on uppercase 'J'", () => {
    const { result } = renderHook(() => useJudgeToggle());
    press("J");
    expect(result.current.open).toBe(true);
  });

  it("closes on Escape", () => {
    const { result } = renderHook(() => useJudgeToggle());
    press("j");
    expect(result.current.open).toBe(true);
    press("Escape");
    expect(result.current.open).toBe(false);
    // Escape while already closed stays closed.
    press("Escape");
    expect(result.current.open).toBe(false);
  });

  it("ignores keypresses originating in editable elements", () => {
    const { result } = renderHook(() => useJudgeToggle());
    const input = document.createElement("input");
    document.body.appendChild(input);
    press("j", {}, input);
    expect(result.current.open).toBe(false);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    press("j", {}, textarea);
    expect(result.current.open).toBe(false);
  });

  it("ignores meta/ctrl/alt-modified 'j'", () => {
    const { result } = renderHook(() => useJudgeToggle());
    press("j", { metaKey: true });
    press("j", { ctrlKey: true });
    press("j", { altKey: true });
    expect(result.current.open).toBe(false);
  });

  it("ignores unrelated keys", () => {
    const { result } = renderHook(() => useJudgeToggle());
    press("k");
    expect(result.current.open).toBe(false);
  });

  it("exposes setOpen for programmatic control", () => {
    const { result } = renderHook(() => useJudgeToggle());
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it("removes the listener on unmount", () => {
    const { result, unmount } = renderHook(() => useJudgeToggle());
    unmount();
    press("j");
    expect(result.current.open).toBe(false);
  });
});
