import TextField from "@material-ui/core/TextField";
import omit from "lodash/omit";
import React from "react";

import { floatingLabelText } from "./GSFormField";

const V0_PROPS = [
  "errors",
  "floatingLabelText",
  "floatingLabelStyle",
  "fullWidth",
  "hintText",
  "errorText",
  "underlineShow",
  "underlineFocusStyle"
];

const GSPasswordField = (props) => {
  const { value, onChange, hintText, fullWidth } = props;
  const safeProps = omit(props, V0_PROPS);
  return (
    <TextField
      {...safeProps}
      label={floatingLabelText(props)}
      placeholder={hintText || undefined}
      variant="outlined"
      size="small"
      fullWidth={fullWidth}
      InputLabelProps={{ shrink: true }}
      onFocus={(event) => event.target.select()}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      type="password"
    />
  );
};

export default GSPasswordField;
