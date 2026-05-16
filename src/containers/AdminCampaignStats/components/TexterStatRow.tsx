import LinearProgress from "@material-ui/core/LinearProgress";
import type { GetTexterStatsQuery } from "@spoke/spoke-codegen";
import React from "react";

type TexterAssignment = NonNullable<
  NonNullable<
    NonNullable<NonNullable<GetTexterStatsQuery>["campaign"]>["assignments"]
  >[0]
>;

export interface TexterStatRowProps {
  assignment: TexterAssignment;
}

export const TexterStatRow: React.FC<TexterStatRowProps> = ({ assignment }) => {
  const { contactsCount, unmessagedCount, texter, id } = assignment;
  if (contactsCount === 0) {
    return <div key={id} />;
  }

  const percentComplete = Math.round(
    ((contactsCount - unmessagedCount) * 100) / contactsCount
  );

  return (
    <tr key={id} style={{ borderBottom: "1px solid #F3F4F6" }}>
      <td style={{ padding: "8px 12px", fontWeight: 600 }}>
        {texter.firstName} {texter.lastName}
      </td>
      <td style={{ padding: "8px 12px", color: "#374151", minWidth: 200 }}>
        <div style={{ marginBottom: 4 }}>{percentComplete}%</div>
        <LinearProgress variant="determinate" value={percentComplete} />
      </td>
    </tr>
  );
};
