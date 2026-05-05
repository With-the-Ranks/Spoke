import TextField from "@material-ui/core/TextField";
import React from "react";

export class NameSearchBar extends React.Component<
  {
    onSubmit: (currentText: string) => void;
    onChange: (newText: string) => void;
  },
  { currentText: string }
> {
  state = {
    currentText: ""
  };

  render() {
    return (
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          this.props.onSubmit(this.state.currentText);
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search"
          onChange={(ev) => {
            const newText = ev.target.value;
            this.setState({ currentText: newText });
            this.props.onChange(newText);
          }}
        />
      </form>
    );
  }
}
export default NameSearchBar;
