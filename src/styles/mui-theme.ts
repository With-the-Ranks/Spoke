import blue from "@material-ui/core/colors/blue";
import blueGrey from "@material-ui/core/colors/blueGrey";
import green from "@material-ui/core/colors/green";
import grey from "@material-ui/core/colors/grey";
import red from "@material-ui/core/colors/red";
import yellow from "@material-ui/core/colors/yellow";
import { createTheme } from "@material-ui/core/styles"; // v4.x
import getMuiTheme from "material-ui/styles/getMuiTheme";

import assemblePalette from "./assemble-palette";
import type { CustomTheme } from "./types";

export const createMuiThemev0 = (theme: Partial<CustomTheme> = {}) => {
  const primaryColor = theme.primaryColor ?? assemblePalette.primary.navy;
  const secondaryColor = theme.secondaryColor ?? assemblePalette.primary.navy;

  return getMuiTheme(
    {
      fontFamily: "'Inter', sans-serif",
      palette: {
        primary1Color: primaryColor,
        textColor: theme.primaryTextColor || blueGrey[800],
        primary2Color: secondaryColor,
        primary3Color: grey[400],
        accent1Color: secondaryColor,
        accent2Color: grey[300],
        accent3Color: grey[500],
        alternateTextColor: theme.secondaryTextColor || "#333333",
        canvasColor: theme.canvassColor || grey[50],
        borderColor: grey[300],
        disabledColor: theme.disabledBackgroundColor || grey[300]
      }
    },
    { userAgent: "all" }
  );
};

// TODO: return real theme once components beyond Dialog are converted
export const createMuiThemev1 = (theme: Partial<CustomTheme> = {}) => {
  const primaryColor = theme.primaryColor ?? assemblePalette.primary.indigo;
  const secondaryColor = theme.secondaryColor ?? assemblePalette.primary.indigo;
  const infoColor = theme.infoColor ?? "#FF781D";
  const badgeColor = theme.badgeColor || assemblePalette.secondary.red;

  return createTheme({
    typography: {
      fontFamily: "'Inter', sans-serif",
      button: {
        textTransform: "none" as const
      }
    },
    shape: {
      borderRadius: 8
    },
    palette: {
      primary: { main: primaryColor },
      secondary: { main: secondaryColor },
      badge: { main: badgeColor },
      convoMessageBadge: { main: yellow[600] },
      inboundMessageBg: { main: blue[500] },
      success: { main: theme.successColor || green[500], light: green[100] },
      warning: { main: theme.warningColor || "#F59E0B" },
      error: { main: theme.errorColor || red[200] },
      info: { main: infoColor, light: blue[100], dark: blue[900] },
      text: {
        primary: theme.primaryTextColor || blueGrey[800],
        // Do not provide default of grey[50] here -- v0 and v1 behave differently
        secondary: theme.secondaryTextColor || "#333333"
      },
      background: {
        default: theme.canvassColor || assemblePalette.common.backgroundGray
      },
      action: {
        disabled: theme.disabledTextColor || blueGrey[800],
        disabledBackground: theme.disabledBackgroundColor || grey[300]
      }
    },
    overrides: {
      MuiButton: {
        root: {
          borderRadius: 8,
          textTransform: "none" as const
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none"
          }
        }
      },
      MuiPaper: {
        elevation1: {
          boxShadow: "none",
          border: `1px solid ${assemblePalette.common.cardBorder}`
        },
        rounded: {
          borderRadius: 8
        }
      },
      MuiDialog: {
        paperRounded: {
          borderRadius: 12
        }
      },
      MuiOutlinedInput: {
        root: {
          borderRadius: 8
        },
        notchedOutline: {
          "& legend": {
            fontSize: "0.85em"
          }
        }
      },
      MuiInputLabel: {
        outlined: {
          "&.MuiInputLabel-shrink": {
            transform: "translate(14px, -6px) scale(0.75)"
          }
        }
      },
      MuiTextField: {
        root: {
          marginTop: 8,
          marginBottom: 8
        }
      },
      MuiFormControl: {
        root: {
          marginTop: 8,
          marginBottom: 8
        }
      },
      MuiTableCell: {
        head: {
          textTransform: "uppercase" as const,
          fontSize: 12,
          fontWeight: 600,
          color: "#6B7280"
        }
      },
      MuiFab: {
        root: {
          borderRadius: 8,
          textTransform: "none" as const,
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"
          }
        },
        extended: {
          borderRadius: 8
        }
      },
      MuiSpeedDial: {
        fab: {
          borderRadius: 8,
          border: 0,
          background: "linear-gradient(to bottom left, #fde68a, #fbbf24)",
          color: "#000000",
          fontSize: "0.875rem",
          fontWeight: 700,
          padding: 8,
          whiteSpace: "nowrap" as const,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "background 0.2s ease, color 0.2s ease",
          "&:hover": {
            background: "linear-gradient(to bottom left, #fcd34d, #f59e0b)"
          },
          "&:focus-visible": {
            outline: "none",
            boxShadow: "0 0 0 2px #fff, 0 0 0 4px #1d4ed8"
          },
          "&.Mui-disabled": {
            pointerEvents: "none",
            opacity: 0.5
          }
        }
      },
      MuiSpeedDialAction: {
        fab: {
          borderRadius: 8
        }
      }
    }
  });
};
