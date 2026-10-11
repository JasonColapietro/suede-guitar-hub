import test from "node:test";
import assert from "node:assert/strict";
import { currentNavigationHref, primaryNavigation } from "../lib/site-navigation.ts";

test("every primary destination identifies its own current navigation link", () => {
  for (const link of primaryNavigation) assert.equal(currentNavigationHref(link.href), link.href);
});

test("lesson pages and nested tools retain their section context", () => {
  for (const [pathname, href] of [
    ["/learn", "/learn/guitar"],
    ["/learn/guitar/g-l1-m1-01", "/learn/guitar"],
    ["/advanced/alternate-picking", "/advanced"],
    ["/tempo", "/tools"],
    ["/session", "/tools"],
    ["/log", "/tools"],
    ["/resources/recording-guitar-room-sound", "/guides"],
    ["/glossary", "/guides"],
  ]) assert.equal(currentNavigationHref(pathname), href, pathname);
});

test("unrelated routes and similarly named editorial pages are not marked current", () => {
  for (const pathname of [null, "/", "/start", "/practice-extra", "/learning", "/tempo-extra", "/how-to-practice-guitar-effectively"]) {
    assert.equal(currentNavigationHref(pathname), undefined, String(pathname));
  }
});
