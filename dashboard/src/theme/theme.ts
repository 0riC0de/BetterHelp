import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f5e8c", dark: "#0b4568", light: "#e0f2fe" },
    success: { main: "#15803d" },
    warning: { main: "#d97706" },
    error: { main: "#c2413b" },
    background: { default: "#f8fafc", paper: "#ffffff" },
    text: { primary: "#172033", secondary: "#64748b" },
    divider: "#e2e8f0",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.03em" },
    h5: { fontWeight: 750, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});

export default theme;
