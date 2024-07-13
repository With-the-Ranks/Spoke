import { r } from "../server/models";

export const updateJob = async (job, percentComplete) => {
  if (job.id) {
    await r
      .knex("job_request")
      .update({
        status: percentComplete,
        updated_at: r.knex.fn.now()
      })
      .where({ id: job.id });
  }
};

export const getNextJob = async () => {
  let nextJob = await r
    .knex("job_request")
    .where({ assigned: false })
    .orderBy("created_at")
    .first();
  if (nextJob) {
    const updateResults = await r
      .knex("job_request")
      .where({ id: nextJob.id })
      .update({ assigned: true });
    if (updateResults.replaced !== 1) {
      nextJob = null;
    }
  }
  return nextJob;
};
