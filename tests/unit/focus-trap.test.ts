// @vitest-environment happy-dom

import { describe, expect, it, beforeEach } from "vitest";
import { getFocusableElements, handleFocusTrap } from "@/lib/focus-trap";

describe("focus-trap", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = document.createElement("div");
    root.innerHTML = `
      <button type="button" id="first">First</button>
      <input type="text" id="middle" />
      <button type="button" id="last">Last</button>
    `;
    document.body.appendChild(root);
  });

  it("lists focusable elements in order", () => {
    const els = getFocusableElements(root);
    expect(els.map((el) => el.id)).toEqual(["first", "middle", "last"]);
  });

  it("wraps Tab from last to first", () => {
    const last = root.querySelector("#last") as HTMLButtonElement;
    last.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    handleFocusTrap(root, event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("first");
  });

  it("wraps Shift+Tab from first to last", () => {
    const first = root.querySelector("#first") as HTMLButtonElement;
    first.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    handleFocusTrap(root, event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("last");
  });
});
