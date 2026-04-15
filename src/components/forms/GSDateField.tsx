import TextField from "@material-ui/core/TextField";
import React, { useCallback } from "react";

import { DateTime } from "../../lib/datetime";
import type { ISODateString } from "../../lib/js-types";
import type { GSFormFieldProps } from "./GSFormField";
import { floatingLabelText } from "./GSFormField";

interface GSDateFieldProps extends GSFormFieldProps {
  onChange: (d: ISODateString | null) => void;
  value: string | undefined;
  fullWidth?: boolean;
}

const GSDateField: React.FC<GSDateFieldProps> = (props) => {
  const { value, onChange, name, className, fullWidth } = props;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newDateStr = event.target.value;
      if (!newDateStr) {
        onChange(null);
        return;
      }
      const newDate = DateTime.fromISO(newDateStr);
      const oldDate = DateTime.fromISO(value || "");
      const newDateWithHMS = oldDate.isValid
        ? newDate.set({
            hour: oldDate.hour,
            minute: oldDate.minute,
            second: oldDate.second
          })
        : newDate;
      onChange(newDateWithHMS.isValid ? newDateWithHMS.toISO() : null);
    },
    [value, onChange]
  );

  const parsedPropDate = DateTime.fromISO(value as string);
  const dateValue = parsedPropDate.isValid
    ? parsedPropDate.toFormat("yyyy-MM-dd")
    : "";

  return (
    <TextField
      type="date"
      label={floatingLabelText(props)}
      variant="outlined"
      size="small"
      fullWidth={fullWidth}
      InputLabelProps={{ shrink: true }}
      name={name}
      className={className}
      value={dateValue}
      onChange={handleChange}
    />
  );
};

export default GSDateField;
