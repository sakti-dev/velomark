import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { IconMap } from "../icons";
import type { VelomarkTranslations } from "../../lib/translations";
import { Velomark } from "../velomark";
import { defaultIcons } from "../icons";
import { defaultTranslations } from "../../lib/translations";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("translations override", () => {
  it("uses custom copy label", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const translations: Partial<VelomarkTranslations> = { copyCode: "Kopiëren" };
    const dispose = render(
      () => <Velomark translations={translations} markdown={"```ts\nconst x = 1;\n```"} />,
      host,
    );
    mountedRoots.push(dispose);

    const copyBtn = host.querySelector("button.vm-code-copy");
    expect(copyBtn?.getAttribute("title")).toBe("Kopiëren");
  });

  it("uses custom table labels", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const translations: Partial<VelomarkTranslations> = { copyTable: "Tabelle kopieren" };
    const dispose = render(
      () => <Velomark translations={translations} markdown={"| A | B |\n|---|---|\n| 1 | 2 |"} />,
      host,
    );
    mountedRoots.push(dispose);

    const copyBtn = host.querySelector('[title="Tabelle kopieren"]');
    expect(copyBtn).not.toBeNull();
  });

  it("falls back to defaults for unspecified keys", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const translations: Partial<VelomarkTranslations> = { copyCode: "Custom" };
    const dispose = render(
      () => <Velomark translations={translations} markdown={"```ts\nx\n```"} />,
      host,
    );
    mountedRoots.push(dispose);

    expect(defaultTranslations.copyCode).toBe("Copy code");
  });
});

describe("icon override", () => {
  it("uses custom copy icon", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const CustomCopyIcon = () => <svg data-testid="custom-copy" />;
    const icons: Partial<IconMap> = { CopyIcon: CustomCopyIcon as never };
    const dispose = render(
      () => <Velomark icons={icons} markdown={"```ts\nconst x = 1;\n```"} />,
      host,
    );
    mountedRoots.push(dispose);

    const customIcon = host.querySelector('[data-testid="custom-copy"]');
    expect(customIcon).not.toBeNull();
  });

  it("uses default icons when not overridden", () => {
    expect(defaultIcons.CopyIcon).toBeDefined();
    expect(defaultIcons.XIcon).toBeDefined();
    expect(defaultIcons.DownloadIcon).toBeDefined();
  });
});

describe("allowedTags", () => {
  it("strips unknown tags but preserves children", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark allowedTags={{ safe: [] }} markdown={"<unknown>Hello world</unknown>"} />,
      host,
    );
    mountedRoots.push(dispose);

    const unknownTag = host.querySelector("unknown");
    expect(unknownTag).toBeNull();
    expect(host.textContent).toContain("Hello world");
  });

  it("renders allowed tags", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark allowedTags={{ mention: [] }} markdown={"<mention>Hello</mention>"} />,
      host,
    );
    mountedRoots.push(dispose);

    const mentionTag = host.querySelector("mention");
    expect(mentionTag).not.toBeNull();
  });

  it("filters attributes on allowed tags", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => (
        <Velomark
          allowedTags={{ mention: ["data-id"] }}
          markdown={"<mention data-id='123' onclick='evil()'>Hi</mention>"}
        />
      ),
      host,
    );
    mountedRoots.push(dispose);

    const mentionTag = host.querySelector("mention");
    expect(mentionTag?.getAttribute("data-id")).toBe("123");
    expect(mentionTag?.getAttribute("onclick")).toBeNull();
  });
});

describe("literalTagContent", () => {
  it("renders literal text without markdown parsing", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => (
        <Velomark
          allowedTags={{ mention: [] }}
          literalTagContent={["mention"]}
          markdown={"<mention>_not_italic_</mention>"}
        />
      ),
      host,
    );
    mountedRoots.push(dispose);

    const mentionTag = host.querySelector("mention");
    expect(mentionTag).not.toBeNull();
    expect(mentionTag?.querySelector("em")).toBeNull();
    expect(mentionTag?.textContent).toContain("_not_italic_");
  });

  it("parses markdown in non-literal tags", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark allowedTags={{ mention: [] }} markdown={"<mention>_italic_</mention>"} />,
      host,
    );
    mountedRoots.push(dispose);

    const mentionTag = host.querySelector("mention");
    expect(mentionTag?.querySelector("em")).not.toBeNull();
  });
});
