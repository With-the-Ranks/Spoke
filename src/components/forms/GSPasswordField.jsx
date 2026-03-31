import TextField from "@material-ui/core/TextField";
import omit from "lodash/omit";
import React from "react";

import GSFormField from "./GSFormField";

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

export default class GSPasswordField extends GSFormField {
  render() {
    const { value } = this.props;
    const safeProps = omit(this.props, V0_PROPS);
    return (
      <TextField
        {...safeProps}
        label={this.floatingLabelText()}
        placeholder={this.props.hintText || undefined}
        variant="outlined"
        size="small"
        fullWidth={this.props.fullWidth !== false}
        InputLabelProps={{ shrink: true }}
        onFocus={(event) => event.target.select()}
        value={value}
        onChange={(event) => {
          this.props.onChange(event.target.value);
        }}
        type="password"
      />
    );
  }
}
