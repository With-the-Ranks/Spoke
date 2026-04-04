import { css, StyleSheet } from "aphrodite";
import type { ChartData } from "chart.js";
import palette from "google-palette";
import React from "react";
import { Pie } from "react-chartjs-2";

const styles = StyleSheet.create({
  legendWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12
  },
  label: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#ffffff",
    whiteSpace: "nowrap"
  }
});

interface ChartProps {
  data: [string, number][];
}

const Chart: React.FC<ChartProps> = ({ data }) => {
  const chartColors = palette("tol-rainbow", data.length).map(
    (hex: string) => `#${hex}`
  );

  const pieData: ChartData = {
    labels: data.map(([label]) => label),
    datasets: [
      {
        label: "Number of responses",
        data: data.map(([_label, value]) => value),
        backgroundColor: chartColors
      }
    ]
  };

  return (
    <>
      {/* Chart.js doesn't handle a long list of options well so we do the legend outselves */}
      <Pie data={pieData} options={{ legend: { display: false } }} />
      <div className={css(styles.legendWrapper)}>
        {data.map(([label], index) => (
          <span
            key={label}
            className={css(styles.label)}
            style={{ backgroundColor: chartColors[index] }}
          >
            {label}
          </span>
        ))}
      </div>
    </>
  );
};

export default Chart;
