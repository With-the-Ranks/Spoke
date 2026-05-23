import TextField from "@material-ui/core/TextField";
import PropTypes from "prop-types";
import React from "react";

import { dataTest } from "../../../lib/attributes";

const DisplayLink = ({ url, textContent }) => (
  <div>
    <div>{textContent}</div>
    <TextField
      {...dataTest("url")}
      name={url}
      value={url}
      variant="outlined"
      size="small"
      autoFocus
      onFocus={(event) => event.target.select()}
      fullWidth
    />
  </div>
);

DisplayLink.propTypes = {
  url: PropTypes.string,
  textContent: PropTypes.string
};

export default DisplayLink;
