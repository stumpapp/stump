import {
	CreateOrUpdateEmailDevice,
	CreateOrUpdateEmailer,
	EmailerIncludeParams,
	EmailerSendRecord,
	EmailerSendRecordIncludeParams,
	PatchEmailDevice,
	RegisteredEmailDevice,
	SendAttachmentEmailResponse,
	SendAttachmentEmailsPayload,
	SMTPEmailer,
} from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the emailer API
 */
const EMAILER_ROUTE = '/emailer'
/**
 * A helper function to format the URL for emailer API routes with optional query parameters
 */
const emailerURL = createRouteURLHandler(EMAILER_ROUTE)

/**
 * The emailer API controller, used for interacting with the emailer endpoints of the Stump API
 */
export class EmailerAPI extends APIBase {
	/**
	 * Fetch all emailers
	 */
	async get(params?: EmailerIncludeParams): Promise<SMTPEmailer[]> {
		const { data: emailer } = await this.api.axios.get<SMTPEmailer[]>(emailerURL('', params))
		return emailer
	}

	/**
	 * Fetch emailer by ID
	 */
	async getByID(id: number, params?: EmailerIncludeParams): Promise<SMTPEmailer> {
		const { data: emailer } = await this.api.axios.get<SMTPEmailer>(
			emailerURL(id.toString(), params),
		)
		return emailer
	}

	/**
	 * Create a new emailer
	 */
	async create(payload: CreateOrUpdateEmailer): Promise<SMTPEmailer> {
		const { data: createdEmailer } = await this.api.axios.post<SMTPEmailer>(emailerURL(''), payload)
		return createdEmailer
	}

	/**
	 * Update an emailer
	 */
	async update(id: number, payload: CreateOrUpdateEmailer): Promise<SMTPEmailer> {
		const { data: updatedEmailer } = await this.api.axios.put<SMTPEmailer>(
			emailerURL(id.toString()),
			payload,
		)
		return updatedEmailer
	}

	/**
	 * Delete an emailer
	 */
	async delete(id: number): Promise<SMTPEmailer> {
		const { data: deletedEmailer } = await this.api.axios.delete<SMTPEmailer>(
			emailerURL(id.toString()),
		)
		return deletedEmailer
	}

	/**
	 * Fetch the send history for an emailer
	 */
	async getSendHistory(
		id: number,
		params?: EmailerSendRecordIncludeParams,
	): Promise<EmailerSendRecord[]> {
		const { data: sendHistory } = await this.api.axios.get<EmailerSendRecord[]>(
			emailerURL(`${id}/send-history`, params),
		)
		return sendHistory
	}

	/**
	 * Send an email with attachments. Note that no attachments are part of the request, rather the payload
	 * points to media which the Stump instance manages and will attach to the email.
	 */
	async send(payload: SendAttachmentEmailsPayload): Promise<SendAttachmentEmailResponse> {
		const { data: sendResponse } = await this.api.axios.post<SendAttachmentEmailResponse>(
			emailerURL('/send-attachment'),
			payload,
		)
		return sendResponse
	}

	/**
	 * Fetch all email devices
	 */
	async getDevices(): Promise<RegisteredEmailDevice[]> {
		const { data: devices } = await this.api.axios.get<RegisteredEmailDevice[]>(
			emailerURL('/email-devices'),
		)
		return devices
	}

	/**
	 * Fetch an email device by ID
	 */
	async getDeviceByID(id: number): Promise<RegisteredEmailDevice> {
		const { data: device } = await this.api.axios.get<RegisteredEmailDevice>(
			emailerURL(`/email-devices/${id}`),
		)
		return device
	}

	/**
	 * Create a new email device
	 */
	async createDevice(payload: CreateOrUpdateEmailDevice): Promise<RegisteredEmailDevice> {
		const { data: createdDevice } = await this.api.axios.post<RegisteredEmailDevice>(
			emailerURL('/email-devices'),
			payload,
		)
		return createdDevice
	}

	/**
	 * Update an email device
	 */
	async updateDevice(
		id: number,
		payload: CreateOrUpdateEmailDevice,
	): Promise<RegisteredEmailDevice> {
		const { data: updatedDevice } = await this.api.axios.put<RegisteredEmailDevice>(
			emailerURL(`/email-devices/${id}`),
			payload,
		)
		return updatedDevice
	}

	/**
	 * Patch an email device
	 */
	async patchDevice(id: number, payload: PatchEmailDevice): Promise<RegisteredEmailDevice> {
		const { data: patchedDevice } = await this.api.axios.patch<RegisteredEmailDevice>(
			emailerURL(`/email-devices/${id}`),
			payload,
		)
		return patchedDevice
	}

	/**
	 * Delete an email device
	 */
	async deleteDevice(id: number): Promise<RegisteredEmailDevice> {
		const { data: deletedDevice } = await this.api.axios.delete<RegisteredEmailDevice>(
			emailerURL(`/email-devices/${id}`),
		)
		return deletedDevice
	}

	get keys(): ClassQueryKeys<InstanceType<typeof EmailerAPI>> {
		return {
			create: 'emailer.create',
			createDevice: 'emailer.createDevice',
			delete: 'emailer.delete',
			deleteDevice: 'emailer.deleteDevice',
			get: 'emailer.get',
			getByID: 'emailer.getByID',
			getDeviceByID: 'emailer.getDeviceByID',
			getDevices: 'emailer.getDevices',
			getSendHistory: 'emailer.getSendHistory',
			patchDevice: 'emailer.patchDevice',
			send: 'emailer.send',
			update: 'emailer.update',
			updateDevice: 'emailer.updateDevice',
		}
	}
}
