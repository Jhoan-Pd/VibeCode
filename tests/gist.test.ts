import { describe, expect, it } from "vitest";
import { extraerIdGist } from "@/lib/gist";

describe("extraerIdGist (anti-SSRF)", () => {
  it("acepta URLs de gist.github.com con o sin usuario", () => {
    expect(extraerIdGist("https://gist.github.com/ana/0123456789abcdef0123")).toBe("0123456789abcdef0123");
    expect(extraerIdGist(" https://gist.github.com/0123456789abcdef0123456789abcdef#file-x ")).toBe("0123456789abcdef0123456789abcdef");
  });

  it("rechaza otros hosts, protocolos e ids inválidos", () => {
    for (const url of [
      "http://gist.github.com/ana/0123456789abcdef0123",
      "https://gist.github.com.evil.com/ana/0123456789abcdef0123",
      "https://evil.com/gist.github.com/0123456789abcdef0123",
      "https://gist.github.com/ana/xyz",
      "https://169.254.169.254/latest/meta-data",
      "",
    ]) {
      expect(extraerIdGist(url)).toBeNull();
    }
  });
});
