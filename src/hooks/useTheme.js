import { createContext, useContext } from "react";

// ========================================
// FolioObs Design System: "The Intelligence Editorial"
// Stitch-inspired emerald palette + editorial tone
// ========================================

export const THEMES = {
  dark: {
    name: "dark",
    // ── Surfaces ──
    bg: "#0f1117",
    surface: "#181a20",
    surfaceHover: "#22252d",
    surfaceLow: "#14161c",          // recessed areas
    surfaceHigh: "#2a2d36",         // elevated (hover, sidebar active)
    surfaceLowest: "#1e2028",       // primary cards

    // ── Text ──
    text: "#f0f0f3",
    textSecondary: "#9ca3af",
    textMuted: "#6b7280",

    // ── Brand: Emerald ──
    accent: "#10b981",              // primary emerald
    accentSolid: "#006c49",         // deep emerald (CTA gradient start)
    accentDeep: "#059669",          // mid emerald
    accentGradient: "linear-gradient(180deg, #006c49 0%, #10b981 100%)",

    // ── Semantic ──
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    pink: "#ec4899",

    // ── Glass & Cards ──
    glassBg: "rgba(24, 26, 32, 0.85)",
    glassBorder: "rgba(255,255,255,0.06)",
    glassBorderHover: "rgba(16, 185, 129, 0.25)",
    glassBlur: "blur(20px)",

    // ── Card / Table ──
    cardRowHover: "rgba(16, 185, 129, 0.04)",
    cardRowBorder: "rgba(255,255,255,0.05)",
    tableBorder: "rgba(255,255,255,0.06)",

    // ── Nav ──
    navBg: "rgba(15, 17, 23, 0.80)",

    // ── Hero ──
    heroBg: "#0f1117",
    heroOrb1: "transparent",
    heroOrb2: "transparent",

    // ── Sections ──
    statCardBg: "rgba(24, 26, 32, 0.8)",
    insightBg: "rgba(24, 26, 32, 0.6)",
    compareBg: "rgba(24, 26, 32, 0.6)",
    compareBorder: "rgba(255,255,255,0.06)",
    compareOrb: "40",

    // ── Inputs ──
    selectBg: "#181a20",

    // ── Charts ──
    chartGrid: "rgba(255,255,255,0.05)",

    // ── Scrollbar ──
    scrollThumb: "rgba(255,255,255,0.12)",
    scrollThumbHover: "rgba(255,255,255,0.2)",

    // ── Tooltip ──
    tooltipBg: "rgba(24,26,32,0.95)",

    // ── Badges & Buttons ──
    badgeBgAlpha: "18",
    badgeBorderAlpha: "30",
    activeNavBg: "rgba(16, 185, 129, 0.08)",
    activeNavBorder: "rgba(16, 185, 129, 0.2)",
    tagActiveBg: "rgba(16, 185, 129, 0.1)",
    inactiveBtnBg: "rgba(255,255,255,0.05)",
    selectedBtnBg: (c) => `${c}20`,
    selectedBtnBorder: (c) => `${c}50`,
    unselectedBtnBg: "rgba(255,255,255,0.04)",
    unselectedBtnBorder: "rgba(255,255,255,0.06)",
  },

  light: {
    name: "light",
    // ── Surfaces (Stitch off-white hierarchy) ──
    bg: "#f9f9fb",                   // base surface
    surface: "#ffffff",              // primary card surface (surface_container_lowest)
    surfaceHover: "#f3f3f5",         // surface_container_low
    surfaceLow: "#f3f3f5",           // recessed areas
    surfaceHigh: "#e8e8ea",          // active zones, hover
    surfaceLowest: "#ffffff",        // elevated content

    // ── Text ──
    text: "#111827",                 // on_surface (slate-900)
    textSecondary: "#4b5563",        // on_surface_variant (slate-600)
    textMuted: "#9ca3af",            // muted labels (slate-400)

    // ── Brand: Emerald ──
    accent: "#10b981",               // primary emerald
    accentSolid: "#006c49",          // deep emerald
    accentDeep: "#059669",           // mid emerald
    accentGradient: "linear-gradient(180deg, #006c49 0%, #10b981 100%)",

    // ── Semantic ──
    green: "#10b981",
    red: "#ef4444",
    amber: "#d97706",
    blue: "#3b82f6",
    purple: "#7c3aed",
    cyan: "#0891b2",
    pink: "#ec4899",

    // ── Glass & Cards ──
    glassBg: "#ffffff",
    glassBorder: "rgba(0,0,0,0.06)",
    glassBorderHover: "rgba(16, 185, 129, 0.2)",
    glassBlur: "blur(20px)",

    // ── Card / Table ──
    cardRowHover: "rgba(16, 185, 129, 0.03)",
    cardRowBorder: "rgba(0,0,0,0.05)",
    tableBorder: "rgba(0,0,0,0.06)",

    // ── Nav ──
    navBg: "rgba(249, 249, 251, 0.80)",

    // ── Hero ──
    heroBg: "#f9f9fb",
    heroOrb1: "transparent",
    heroOrb2: "transparent",

    // ── Sections ──
    statCardBg: "#f3f3f5",
    insightBg: "#f3f3f5",
    compareBg: "#f3f3f5",
    compareBorder: "rgba(0,0,0,0.06)",
    compareOrb: "30",

    // ── Inputs ──
    selectBg: "#ffffff",

    // ── Charts ──
    chartGrid: "rgba(0,0,0,0.06)",

    // ── Scrollbar ──
    scrollThumb: "rgba(0,0,0,0.12)",
    scrollThumbHover: "rgba(0,0,0,0.2)",

    // ── Tooltip ──
    tooltipBg: "rgba(255,255,255,0.95)",

    // ── Badges & Buttons ──
    badgeBgAlpha: "10",
    badgeBorderAlpha: "20",
    activeNavBg: "rgba(16, 185, 129, 0.06)",
    activeNavBorder: "rgba(16, 185, 129, 0.15)",
    tagActiveBg: "rgba(16, 185, 129, 0.06)",
    inactiveBtnBg: "rgba(0,0,0,0.03)",
    selectedBtnBg: (c) => `${c}12`,
    selectedBtnBorder: (c) => `${c}30`,
    unselectedBtnBg: "rgba(0,0,0,0.02)",
    unselectedBtnBorder: "rgba(0,0,0,0.06)",
  }
};

export const ThemeContext = createContext(THEMES.dark);
export const useTheme = () => useContext(ThemeContext);
