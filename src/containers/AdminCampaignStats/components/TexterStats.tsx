import Paper from "@material-ui/core/Paper";
import { useGetTexterStatsQuery } from "@spoke/spoke-codegen";
import React from "react";

import { TexterStatRow } from "./TexterStatRow";

export interface TexterStatsProps {
  campaignId: string;
}

export const TexterStats: React.FC<TexterStatsProps> = ({ campaignId }) => {
  const { data } = useGetTexterStatsQuery({
    variables: {
      campaignId,
      contactsFilter: {
        messageStatus: "needsMessage"
      }
    }
  });

  const assignments = data?.campaign?.assignments ?? [];
  return (
    <Paper variant="outlined" style={{ padding: 16 }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            {["Name", "% of first texts sent"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "6px 12px",
                  fontWeight: 600,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em"
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assignments.map(
            (assignment) =>
              assignment && <TexterStatRow assignment={assignment} />
          )}
        </tbody>
      </table>
    </Paper>
  );
};

export default TexterStats;
