import {
	CreateOrUpdateEmailDevice,
	CreateOrUpdateEmailer,
	PatchEmailDevice,
	RegisteredEmailDevice,
	SMTPEmailer,
} from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'

function getEmailers(): Promise<APIResult<SMTPEmailer[]>> {
	return API.get('/emailers')
}

function getEmailerById(id: string): Promise<APIResult<SMTPEmailer>> {
	return API.get(`/emailers/${id}`)
}

function createEmailer(payload: CreateOrUpdateEmailer): Promise<APIResult<SMTPEmailer>> {
	return API.post('/emailers', payload)
}

function updateEmailer(
	id: string,
	payload: CreateOrUpdateEmailer,
): Promise<APIResult<SMTPEmailer>> {
	return API.put(`/emailers/${id}`, payload)
}

function deleteEmailer(id: string): Promise<APIResult<SMTPEmailer>> {
	return API.delete(`/emailers/${id}`)
}

function getEmailDevices(): Promise<APIResult<RegisteredEmailDevice[]>> {
	return API.get('/email-devices')
}

function getEmailDeviceById(id: string): Promise<APIResult<RegisteredEmailDevice>> {
	return API.get(`/email-devices/${id}`)
}

function createEmailDevice(
	payload: CreateOrUpdateEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.post('/email-devices', payload)
}

function updateEmailDevice(
	id: string,
	payload: CreateOrUpdateEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.put(`/email-devices/${id}`, payload)
}

function patchEmailDevice(
	id: string,
	payload: PatchEmailDevice,
): Promise<APIResult<RegisteredEmailDevice>> {
	return API.patch(`/email-devices/${id}`, payload)
}

function deleteEmailDevice(id: string): Promise<APIResult<RegisteredEmailDevice>> {
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
	getEmailers: 'emailer.get',
	patchEmailDevice: 'emailDevice.patch',
	updateEmailDevice: 'emailDevice.update',
	updateEmailer: 'emailer.update',
}
