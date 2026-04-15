import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import React from "react";

import GSFormField from "./GSFormField";

export default class GSSelectField extends GSFormField {
  createMenuItems() {
    return this.props.choices.map(({ value, label }) => (
      <MenuItem value={value} key={value}>
        {label}
      </MenuItem>
    ));
  }

  render() {
    const { label } = this.props;
    const labelId = `gs-select-${this.props.name || "field"}-label`;
    return (
      <FormControl
        variant="outlined"
        size="small"
        fullWidth={this.props.fullWidth}
      >
        {label && (
          <InputLabel id={labelId} shrink>
            {label}
          </InputLabel>
        )}
        <Select
          labelId={labelId}
          label={label}
          value={this.props.value || ""}
          onChange={(event) => {
            this.props.onChange(event.target.value);
          }}
        >
          {this.createMenuItems()}
        </Select>
      </FormControl>
    );
  }
}
