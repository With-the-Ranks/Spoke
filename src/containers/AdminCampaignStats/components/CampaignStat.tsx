import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import isNil from "lodash/isNil";
import React from "react";

import LoadingIndicator from "../../../components/LoadingIndicator";

const useStyles = makeStyles((theme) => ({
  card: {
    alignSelf: "flex-start"
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5)
  },
  count: {
    fontSize: 32,
    fontWeight: 700,
    color: theme.palette.primary.main,
    lineHeight: 1.1
  },
  countHighlight: {
    color: theme.palette.error.main
  }
}));

export interface CampaignStatProps {
  title: string;
  loading?: boolean;
  error?: string;
  count?: any;
  highlight?: boolean;
}

export const CampaignStat: React.FC<CampaignStatProps> = (props) => {
  const classes = useStyles();

  return (
    <Card className={classes.card}>
      {props.loading && <LoadingIndicator />}
      {props.error && (
        <CardContent>
          <Typography variant="body2" color="error">
            {props.error}
          </Typography>
        </CardContent>
      )}
      {!isNil(props.count) && (
        <CardContent>
          <Typography className={classes.label}>{props.title}</Typography>
          <Typography
            className={`${classes.count}${
              props.highlight ? ` ${classes.countHighlight}` : ""
            }`}
          >
            {props.count}
          </Typography>
        </CardContent>
      )}
    </Card>
  );
};

export default CampaignStat;
