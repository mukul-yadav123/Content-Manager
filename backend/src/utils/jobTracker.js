import GenerationJob from '../models/GenerationJob.js';
import logger from './logger.js';

/**
 * Execute an operation wrapped in a GenerationJob lifecycle for monitoring and dashboard metrics
 */
export const trackGenerationJob = async ({
  userId,
  jobType,
  inputParams = {},
  targetDraftId = null,
  targetArticleId = null,
  execute
}) => {
  const startedAt = new Date();
  let job = null;

  try {
    job = await GenerationJob.create({
      userId,
      jobType,
      status: 'processing',
      progress: 25,
      inputParams,
      targetDraftId,
      targetArticleId,
      startedAt
    });
  } catch (err) {
    logger.warn(`Could not create GenerationJob record: ${err.message}`);
  }

  try {
    const result = await execute();

    if (job) {
      const completedAt = new Date();
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = completedAt;
      job.durationMs = completedAt.getTime() - startedAt.getTime();
      if (result && typeof result === 'object' && result._id) {
        if (!job.targetDraftId && result.contentDraftId) {
          job.targetDraftId = result.contentDraftId;
        }
      }
      await job.save().catch(() => {});
    }

    return result;
  } catch (error) {
    if (job) {
      const completedAt = new Date();
      job.status = 'failed';
      job.completedAt = completedAt;
      job.durationMs = completedAt.getTime() - startedAt.getTime();
      job.error = {
        message: error.message || 'Generation failed',
        code: String(error.statusCode || error.name || 'GENERATION_ERROR')
      };
      await job.save().catch(() => {});
    }
    throw error;
  }
};

export default {
  trackGenerationJob
};

