import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import { useGetTexterStatsQuery } from "@spoke/spoke-codegen";
import React from "react";

import { TexterStatRow } from "./TexterStatRow";

const useStyles = makeStyles({
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13
  },
  headerRow: {
    borderBottom: "1px solid #E5E7EB"
  },
  headerCell: {
    textAlign: "left" as const,
    padding: "6px 12px",
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    fontSize: 11,
    letterSpacing: "0.05em"
  }
});

const COLUMN_HEADERS = ["Name", "% of first texts sent"];

export interface TexterStatsProps {
  campaignId: string;
}

export const TexterStats: React.FC<TexterStatsProps> = ({ campaignId }) => {
  const classes = useStyles();
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
      <table className={classes.table}>
        <thead>
          <tr className={classes.headerRow}>
            {COLUMN_HEADERS.map((h) => (
              <th key={h} className={classes.headerCell}>
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
