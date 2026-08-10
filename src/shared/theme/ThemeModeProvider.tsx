import * as React from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

const THEME_KEY = "mui-theme-mode";

function applyHtmlDarkClass(mode: any) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const ThemeModeContext = React.createContext<any>({
  mode: "light",
  toggleMode: () => {},
  setMode: () => {},
});

export function ThemeModeProvider({ children }: any) {
  // Default: light theme (ignore OS preference for CRM consistency)
  const [mode, setMode] = React.useState<"light" | "dark">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  // Sync CSS design tokens (`html.dark` in tokens.css) with MUI mode
  React.useLayoutEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
    applyHtmlDarkClass(mode);
  }, [mode]);

  const toggleMode = React.useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#f7d74f",
            dark: "#d4b800",
            contrastText: "#1a1505",
          },
          background: {
            default: mode === "dark" ? "#0b1220" : "#f6f7f9",
            paper: mode === "dark" ? "#111827" : "#ffffff",
          },
          text: {
            primary: mode === "dark" ? "#e5e7eb" : "#0f172a",
            secondary: mode === "dark" ? "#94a3b8" : "#475569",
          },
          divider: mode === "dark" ? "#1f2937" : "#e9ecf1",
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
      }),
    [mode],
  );

  const value = React.useMemo(
    () => ({ mode, toggleMode, setMode }),
    [mode, toggleMode],
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
