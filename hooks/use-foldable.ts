"use client";

import { useState, useEffect } from "react";

export type ScreenPosture = "no-fold" | "laptop" | "tablet" | "book" | "tent";

export interface FoldableState {
  isFoldable: boolean;
  posture: ScreenPosture;
  segments: number;
  isSpanned: boolean;
  foldSize: number;
  foldOrientation: "horizontal" | "vertical" | "none";
}

/**
 * Hook to detect and respond to foldable device states
 * Supports Samsung Galaxy Fold, Surface Duo, and other foldables
 */
export function useFoldable(): FoldableState {
  const [state, setState] = useState<FoldableState>({
    isFoldable: false,
    posture: "no-fold",
    segments: 1,
    isSpanned: false,
    foldSize: 0,
    foldOrientation: "none",
  });

  useEffect(() => {
    // Check if browser supports foldable APIs
    if (!("screen" in window)) return;

    const updateFoldableState = () => {
      const segments = (window as any).screen?.segments || [];
      const isFoldable = segments.length > 1;

      let posture: ScreenPosture = "no-fold";
      let foldSize = 0;
      let foldOrientation: "horizontal" | "vertical" | "none" = "none";

      // Check Window Segments API (for foldables)
      if (isFoldable && segments.length === 2) {
        const seg1 = segments[0];
        const seg2 = segments[1];

        // Calculate fold location and orientation
        if (seg1.left === seg2.left && seg1.width === seg2.width) {
          // Horizontal fold
          foldOrientation = "horizontal";
          foldSize = seg2.top - (seg1.top + seg1.height);
          posture = "laptop";
        } else if (seg1.top === seg2.top && seg1.height === seg2.height) {
          // Vertical fold
          foldOrientation = "vertical";
          foldSize = seg2.left - (seg1.left + seg1.width);
          posture = "book";
        }
      }

      // Fallback: Check for device hints
      if (!isFoldable) {
        const isWideScreen = window.innerWidth / window.innerHeight > 1.5;
        
        // Check for Surface Duo or similar via media queries
        if (window.matchMedia("(horizontal-viewport-segments: 2)").matches) {
          posture = "book";
          foldOrientation = "vertical";
        } else if (window.matchMedia("(vertical-viewport-segments: 2)").matches) {
          posture = "laptop";
          foldOrientation = "horizontal";
        }
      }

      setState({
        isFoldable,
        posture,
        segments: segments.length || 1,
        isSpanned: isFoldable,
        foldSize,
        foldOrientation,
      });
    };

    // Initial check
    updateFoldableState();

    // Listen for screen changes
    window.addEventListener("resize", updateFoldableState);
    window.addEventListener("orientationchange", updateFoldableState);

    // Listen for fold state changes (if supported)
    if ("screen" in window && "onchange" in (window.screen as any)) {
      (window.screen as any).addEventListener("change", updateFoldableState);
    }

    return () => {
      window.removeEventListener("resize", updateFoldableState);
      window.removeEventListener("orientationchange", updateFoldableState);
      if ("screen" in window && "onchange" in (window.screen as any)) {
        (window.screen as any).removeEventListener("change", updateFoldableState);
      }
    };
  }, []);

  return state;
}

/**
 * Hook to get optimal layout for foldable devices
 */
export function useFoldableLayout() {
  const foldable = useFoldable();

  const getLayoutRecommendation = () => {
    if (!foldable.isFoldable) {
      return {
        layout: "single" as const,
        suggestion: "Use standard layout",
      };
    }

    if (foldable.posture === "book" && foldable.foldOrientation === "vertical") {
      return {
        layout: "dual-vertical" as const,
        suggestion: "Split content vertically - canvas on left, tools on right",
      };
    }

    if (foldable.posture === "laptop" && foldable.foldOrientation === "horizontal") {
      return {
        layout: "dual-horizontal" as const,
        suggestion: "Split content horizontally - canvas on top, tools on bottom",
      };
    }

    return {
      layout: "single" as const,
      suggestion: "Use standard layout",
    };
  };

  return {
    ...foldable,
    ...getLayoutRecommendation(),
  };
}