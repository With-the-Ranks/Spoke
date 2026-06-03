const fs = require("fs");
const Papa = require("papaparse");

let zipToTimeZone;
try {
  ({ zipToTimeZone } = require("../src/lib/zip-format"));
} catch {
  ({ zipToTimeZone } = require(`${__dirname}/../build/src/lib/zip-format`));
}

const fetchZipCodes = () => {
  const absolutePath = `${__dirname}/data/zip-codes.csv`;
  const content = fs.readFileSync(absolutePath, { encoding: "binary" });
  const { data, error } = Papa.parse(content, { header: true });
  if (error) {
    throw new Error("Failed to seed zip codes");
  }

  console.log(`Parsed a CSV with ${data.length} zip codes`);
  const zipCodes = data.filter(row => !zipToTimeZone(row.zip)).map(row => ({
    zip: row.zip,
    city: row.city,
    state: row.state,
    timezone_offset: Number(row.timezone_offset),
    has_dst: Boolean(row.has_dst),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  }));

  console.log(`${zipCodes.length} ZIP CODES`);
  return zipCodes;
};

exports.seed = (knex, Promise) => {
  const checkHasZipCodes = async () => !!(await knex("zip_code").first("zip"));

  return checkHasZipCodes().then(hasZipCodes => {
    if (hasZipCodes) {
      console.log("Zip codes have already been seeded. Skipping.");
      return;
    }

    const zipCodes = fetchZipCodes();
    return knex
      .batchInsert("zip_code", zipCodes)
      .then(() => console.log("Finished seeding"))
      .catch(err => console.error("Error seeding: ", err));
  });
};
