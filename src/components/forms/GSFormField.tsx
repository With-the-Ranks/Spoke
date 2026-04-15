import { Component } from "react";
import type { FieldProps } from "react-formal/Field";

import type { TruthyString } from "../../lib/js-types";

export interface GSFormFieldProps extends FieldProps {
  floatingLabelText: TruthyString;
  label: string;
  ["data-test"]?: any;
}

/** Standalone helper – usable from functional components */
export const floatingLabelText = (
  props: Pick<GSFormFieldProps, "floatingLabelText" | "label">
) =>
  props.floatingLabelText === false
    ? null
    : props.floatingLabelText || props.label;

export class GSFormField<P extends GSFormFieldProps, S> extends Component<
  P,
  S
> {
  // eslint-disable-next-line react/no-unused-class-component-methods
  floatingLabelText() {
    return floatingLabelText(this.props);
  }
}

export default GSFormField;
