"use client";

import { useEffect } from "react";
import { pageTitle } from "@/lib/seo/pageTitle";

/**
 * Keep the browser tab aligned with a personalized header.
 * Next's metadata `<title>` is applied again after child effects, so a
 * one-shot `document.title` write gets replaced. Re-apply until it sticks,
 * then stop watching so the next route can set its own title.
 */
export function useDocumentTitle(segment: string) {
  useEffect(() => {
    const next = pageTitle(segment);
    let nested = false;

    const apply = () => {
      if (document.title === next || nested) return;
      nested = true;
      document.title = next;
      nested = false;
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Next reapplies metadata in a parent effect, which is before this timer.
    // Once the personalized title survived that write, stop watching so a
    // later route's commit can own `document.title` before this effect cleans up.
    const stopWatching = window.setTimeout(() => {
      if (document.title === next) observer.disconnect();
    }, 0);

    return () => {
      window.clearTimeout(stopWatching);
      observer.disconnect();
    };
  }, [segment]);
}
