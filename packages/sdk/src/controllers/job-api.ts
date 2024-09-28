import { JobSchedulerConfig, Pageable, PersistedJob } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys, PagedQueryParams } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the job API
 */
const JOB_ROUTE = '/jobs'
/**
 * A helper function to format the URL for job API routes with optional query parameters
 */
const jobURL = createRouteURLHandler(JOB_ROUTE)

/**
 * The job API controller, used for interacting with the job endpoints of the Stump API
 */
export class JobAPI extends APIBase {
	/**
	 * Fetch all jobs
	 */
	async get(params: PagedQueryParams): Promise<Pageable<PersistedJob[]>> {
		const { data: jobs } = await this.axios.get<Pageable<PersistedJob[]>>(jobURL('', params))
		return jobs
	}

	/**
	 * Fetch a job by its ID
	 */
	async getByID(id: string): Promise<PersistedJob> {
		const { data: job } = await this.axios.get<PersistedJob>(jobURL(id))
		return job
	}

	/**
	 * Cancel a job by its ID
	 */
	async cancel(id: string): Promise<void> {
		await this.axios.post(jobURL(`${id}/cancel`))
	}

	/**
	 * Delete a job by its ID
	 */
	async delete(id: string): Promise<void> {
		await this.axios.delete(jobURL(id))
	}

	/**
	 * Delete all jobs
	 */
	async deleteAll(): Promise<void> {
		await this.axios.delete(jobURL(''))
	}

	/**
	 * Get the config for the job scheduler
	 */
	async getSchedulerConfig(): Promise<JobSchedulerConfig> {
		const { data: config } = await this.axios.get<JobSchedulerConfig>(jobURL('scheduler-config'))
		return config
	}

	/**
	 * Update the config for the job scheduler
	 */
	async updateSchedulerConfig(config: JobSchedulerConfig): Promise<JobSchedulerConfig> {
		const { data: updatedConfig } = await this.axios.put<JobSchedulerConfig>(
			jobURL('scheduler-config'),
			config,
		)
		return updatedConfig
	}

	/**
	 * The query keys for the job API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof JobAPI>> {
		return {
			cancel: 'job.cancel',
			delete: 'job.delete',
			deleteAll: 'job.deleteAll',
			get: 'job.get',
			getByID: 'job.getByID',
			getSchedulerConfig: 'job.getSchedulerConfig',
			updateSchedulerConfig: 'job.updateSchedulerConfig',
		}
	}
}
