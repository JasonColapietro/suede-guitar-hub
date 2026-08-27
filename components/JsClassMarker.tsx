"use client";

import { useEffect } from "react";

export default function JsClassMarker() {
  useEffect(() => {
    document.documentElement.classList.add("js");
  }, []);

  return null;
}
