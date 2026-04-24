import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import React, { useRef } from "react";

const useStyles = makeStyles({
  swatch: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1px solid rgba(0, 0, 0, 0.23)",
    cursor: "pointer"
  },
  hiddenInput: {
    position: "absolute" as const,
    opacity: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0
  },
  wrapper: {
    position: "relative" as const,
    flexShrink: 0
  }
});

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange
}) => {
  const classes = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const color = value || "#ffffff";

  return (
    <Tooltip title="Campaign color" placement="top">
      <div className={classes.wrapper}>
        <div
          className={classes.swatch}
          style={{ backgroundColor: color }}
          onClick={() => inputRef.current?.click()}
        />
        <input
          ref={inputRef}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className={classes.hiddenInput}
        />
      </div>
    </Tooltip>
  );
};

export default ColorPicker;
