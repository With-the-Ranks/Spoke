import TextField from "@material-ui/core/TextField";
import omit from "lodash/omit";
import React from "react";

import GSFormField from "./GSFormField";

// Props from MUI v0 or react-formal that should not be passed to MUI v4 TextField
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

export default class GSTextField extends GSFormField {
  handleNewRef = (el) => {
    this.textFieldRef = el;
  };

  render() {
    const { value } = this.props;
    const safeProps = omit(this.props, V0_PROPS);
    return (
      <TextField
        ref={this.handleNewRef}
        {...safeProps}
        label={this.floatingLabelText()}
        placeholder={this.props.hintText || undefined}
        variant="outlined"
        size="small"
        fullWidth={this.props.fullWidth !== false}
        InputLabelProps={{ shrink: true }}
        onFocus={(event) => event.target.select()}
        value={value || ""}
        onChange={(event) => {
          this.props.onChange(event.target.value);
        }}
        type="text"
      />
    );
  }
}
