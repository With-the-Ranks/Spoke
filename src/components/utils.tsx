export interface DataSourceItemType<T = string> {
  text: string;
  rawValue: T;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const dataSourceItem = <T extends unknown = string>(
  name: string,
  key: T
): DataSourceItemType<T> => {
  return {
    text: name,
    rawValue: key
  };
};
