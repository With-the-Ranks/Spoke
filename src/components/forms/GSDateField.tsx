import TextField from "@material-ui/core/TextField";
import React from "react";

import { DateTime } from "../../lib/datetime";
import type { ISODateString } from "../../lib/js-types";
import type { GSFormFieldProps } from "./GSFormField";
import { GSFormField } from "./GSFormField";

interface GSDateFieldProps {
  onChange: (d: ISODateString | null) => void;
  value: string | undefined;
}

export default class GSDateField extends GSFormField<
  GSFormFieldProps & GSDateFieldProps,
  Record<string, unknown>
> {
  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = event.target.value;
    if (!newDateStr) {
      this.props.onChange(null);
      return;
    }
    const newDate = DateTime.fromISO(newDateStr);
    const oldDate = DateTime.fromISO(this.props.value || "");
    const newDateWithHMS = oldDate.isValid
      ? newDate.set({
          hour: oldDate.hour,
          minute: oldDate.minute,
          second: oldDate.second
        })
      : newDate;
    this.props.onChange(newDateWithHMS.isValid ? newDateWithHMS.toISO() : null);
  };

  render() {
    const parsedPropDate = DateTime.fromISO(this.props.value as string);
    const dateValue = parsedPropDate.isValid
      ? parsedPropDate.toFormat("yyyy-MM-dd")
      : "";

    return (
      <TextField
        type="date"
        label={this.floatingLabelText()}
        variant="outlined"
        size="small"
        fullWidth={this.props.fullWidth !== false}
        InputLabelProps={{ shrink: true }}
        name={this.props.name}
        className={this.props.className}
        data-test={this.props["data-test"]}
        value={dateValue}
        onChange={this.handleChange}
      />
    );
  }
}
