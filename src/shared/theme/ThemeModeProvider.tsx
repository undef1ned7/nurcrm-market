import * as React from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { THEME_MODE_STORAGE_KEY, DARK_PALETTE_STORAGE_KEY } from "./themeStorageKeys";
import {
  UI_PREFERENCES_SYNCED_EVENT,
  pushUiPreferenceUpdate,
} from "@shared/lib/uiPreferences";

const THEME_KEY = THEME_MODE_STORAGE_KEY;
const DARK_PALETTE_KEY = DARK_PALETTE_STORAGE_KEY;

export type DarkPalette = "soft" | "classic";

// MUI-side mirror of the CSS token swaps in tokens.css (`html.dark` /
// `html.dark[data-dark-palette="classic"]`). Keep in sync with that file.
const DARK_PALETTES: Record<
  DarkPalette,
  {
    default: string;
    paper: string;
    textPrimary: string;
    textSecondary: string;
    divider: string;
  }
> = {
  soft: {
    default: "#1c2128",
    paper: "#22272e",
    textPrimary: "#adbac7",
    textSecondary: "#909dab",
    divider: "#373e47",
  },
  classic: {
    default: "#0b1220",
    paper: "#111827",
    textPrimary: "#e5e7eb",
    textSecondary: "#94a3b8",
    divider: "#1f2937",
  },
};

function applyHtmlDarkClass(mode: any) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function applyDarkPaletteAttr(palette: DarkPalette) {
  document.documentElement.setAttribute("data-dark-palette", palette);
}

export const ThemeModeContext = React.createContext<any>({
  mode: "light",
  toggleMode: () => {},
  setMode: () => {},
  darkPalette: "soft" as DarkPalette,
  setDarkPalette: (_p: DarkPalette) => {},
});

export function ThemeModeProvider({ children }: any) {
  // Default: light theme (ignore OS preference for CRM consistency)
  const [mode, setModeState] = React.useState<"light" | "dark">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  // Which dark palette: "soft" (new default) or "classic" (pre-2026 navy)
  const [darkPalette, setDarkPaletteState] = React.useState<DarkPalette>(() => {
    const saved = localStorage.getItem(DARK_PALETTE_KEY);
    return saved === "classic" ? "classic" : "soft";
  });

  // Sync CSS design tokens (`html.dark` in tokens.css) with MUI mode
  React.useLayoutEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
    applyHtmlDarkClass(mode);
  }, [mode]);

  // Sync the dark-palette attribute (only takes effect while `html.dark`)
  React.useLayoutEffect(() => {
    localStorage.setItem(DARK_PALETTE_KEY, darkPalette);
    applyDarkPaletteAttr(darkPalette);
  }, [darkPalette]);

  // Другое устройство/вкладка синхронизировало значения с бэка — подхватываем их.
  React.useEffect(() => {
    const handleSynced = () => {
      const savedMode = localStorage.getItem(THEME_KEY);
      if (savedMode === "light" || savedMode === "dark") setModeState(savedMode);

      const savedPalette = localStorage.getItem(DARK_PALETTE_KEY);
      setDarkPaletteState(savedPalette === "classic" ? "classic" : "soft");
    };
    window.addEventListener(UI_PREFERENCES_SYNCED_EVENT, handleSynced);
    return () =>
      window.removeEventListener(UI_PREFERENCES_SYNCED_EVENT, handleSynced);
  }, []);

  const toggleMode = React.useCallback(() => {
    setModeState((m) => {
      const next = m === "dark" ? "light" : "dark";
      pushUiPreferenceUpdate({ theme_mode: next });
      return next;
    });
  }, []);

  const setMode = React.useCallback((next: "light" | "dark") => {
    setModeState(next);
    pushUiPreferenceUpdate({ theme_mode: next });
  }, []);

  const setDarkPalette = React.useCallback((p: DarkPalette) => {
    const next = p === "classic" ? "classic" : "soft";
    setDarkPaletteState(next);
    pushUiPreferenceUpdate({ theme_dark_palette: next });
  }, []);

  const theme = React.useMemo(() => {
    const dark = DARK_PALETTES[darkPalette];
    return createTheme({
      palette: {
        mode,
        primary: {
          main: "#f7d74f",
          dark: "#d4b800",
          contrastText: "#1a1505",
        },
        background: {
          default: mode === "dark" ? dark.default : "#f6f7f9",
          paper: mode === "dark" ? dark.paper : "#ffffff",
        },
        text: {
          primary: mode === "dark" ? dark.textPrimary : "#0f172a",
          secondary: mode === "dark" ? dark.textSecondary : "#475569",
        },
        divider: mode === "dark" ? dark.divider : "#e9ecf1",
        error: { main: "#ef4444" },
        success: { main: "#10b981" },
        warning: { main: "#f59e0b" },
        info: { main: "#3b82f6" },
      },
      typography: {
        fontFamily:
          '"Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif',
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCssBaseline: {
          styleOverrides: (t) => ({
            html: {
              backgroundColor: `${t.palette.background.default} !important`,
            },
            body: {
              backgroundColor: "transparent !important",
              color: "inherit !important",
            },
            "#root": {
              minHeight: "100vh",
              backgroundColor: "transparent !important",
            },
          }),
        },
        MuiButton: {
          styleOverrides: {
            containedPrimary: {
              color: "#1a1505",
              "&:hover": {
                backgroundColor: "#d4b800",
              },
            },
          },
        },
      },
    });
  }, [mode, darkPalette]);

  const value = React.useMemo(
    () => ({ mode, toggleMode, setMode, darkPalette, setDarkPalette }),
    [mode, toggleMode, darkPalette, setDarkPalette],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
