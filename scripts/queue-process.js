// Job queue process.

const config = require('config');
const { getQueue, QueueName } = require('./queue');
const workerQueue = getQueue(QueueName.worker);
const buildProject = require('./jobs/build-project');
const logger = require('../app/utils/log')(module);

// const Bottleneck = require('bottleneck');
// const limiter = new Bottleneck({
//   maxConcurrent: 3,
//   minTime: 333,
// });
// limiter.schedule(() => {
// });

var dispatch = function () {
  workerQueue.on('ready', () => {
    logger.info('queue ready.');
  });
  workerQueue.on('error', (err) => {
    logger.error('queue error: ', err);
  });
  workerQueue.checkStalledJobs(config.jobs.checkStalledJobsInterval);
  workerQueue.process(config.jobs.concurrent, async function (job) {
    logger.info(`[job=${job.id}] start`);
    let sections = job.id.split(':');
    try {
      if (sections[0] == config.jobs.project.key) {
        let projectId = parseInt(sections[1]);
        await buildProject(projectId);
      } else {
        throw new Error(`unknown job type ${sections[0]}`);
      }
    } catch (err) {
      logger.error(`[job=${job.id}] failed with error: `, err);
      throw err;
    }
    logger.info(`[job=${job.id}] succeeded`);
  });
};

if (require.main === module)
  dispatch();
