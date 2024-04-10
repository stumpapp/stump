import {
	CreateOrUpdateEmailDevice,
	CreateOrUpdateEmailer,
	EmailerSendRecord,
	PatchEmailDevice,
	RegisteredEmailDevice,
	SMTPEmailer,
} from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'
import { toUrlParams } from './utils'

function getEmailers(params?: Record<string, unknown>): Promise<APIResult<SMTPEmailer[]>> {
	if (params) {
		return API.get(`/emailers?${toUrlParams(params)}`)
	} else {
		return API.get('/emailers')
	}
}

function getEmailerById(id: number): Promise<APIResult<SMTPEmailer>> {
	return API.get(`/emailers/${id}`)
}

function createEmailer(payload: CreateOrUpdateEmailer): Promise<APIResult<SMTPEmailer>> {
	return API.post('/emailers', payload)
}

function updateEmailer(
	id: number,
	payload: CreateOrUpdateEmailer,
): Promise<APIResult<SMTPEmailer>> {
	return API.put(`/emailers/${id}`, payload)
}

function deleteEmailer(id: number): Promise<APIResult<SMTPEmailer>> {
	return API.delete(`/emailers/${id}`)
}

function getEmailDevices(): Promise<APIResult<RegisteredEmailDevice[]>> {
	return API.get('/email-devices')
}

function getEmailDeviceById(id: number): Promise<APIResult<RegisteredEmailDevice>> {
	return API.get(`/email-devices/${id}`)
}

function getEmailerSendHistory(
	emailerId: number,
	params?: Record<string, unknown>,
): Promise<APIResult<EmailerSendRecord[]>> {
	if (params) {
		return API.get(`/emailers/${emailerId}/send-history?${toUrlParams(params)}`)
	} else {
		return API.get(`/emailers/${emailerId}/send-history`)
	}
}

function createEmailDevice(
	payload: CreateOrUpdateEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.post('/email-devices', payload)
}

function updateEmailDevice(
	id: number,
	payload: CreateOrUpdateEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.put(`/email-devices/${id}`, payload)
}

function patchEmailDevice(
	id: number,
	payload: PatchEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.patch(`/email-devices/${id}`, payload)
}

function deleteEmailDevice(id: number): Promise<APIResult<RegisteredEmailDevice>> {
	return API.delete(`/email-devices/${id}`)
}

export const emailerApi = {
	createEmailDevice,
	createEmailer,
	deleteEmailDevice,
	deleteEmailer,
	getEmailDeviceById,
	getEmailDevices,
	getEmailerById,
	getEmailerSendHistory,
	getEmailers,
	patchEmailDevice,
	updateEmailDevice,
	updateEmailer,
}

export const emailerQueryKeys: Record<keyof typeof emailerApi, string> = {
	createEmailDevice: 'emailDevice.create',
	createEmailer: 'emailer.create',
	deleteEmailDevice: 'emailDevice.delete',
	deleteEmailer: 'emailer.delete',
	getEmailDeviceById: 'emailDevice.getById',
	getEmailDevices: 'emailDevices.get',
	getEmailerById: 'emailer.getById',
	getEmailerSendHistory: 'emailer.sendHistory',
	getEmailers: 'emailer.get',
	patchEmailDevice: 'emailDevice.patch',
	updateEmailDevice: 'emailDevice.update',
	updateEmailer: 'emailer.update',
}
