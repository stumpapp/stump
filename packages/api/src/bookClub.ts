import {
	BookClub,
	BookClubBook,
	BookClubChatBoard,
	BookClubChatMessage,
	BookClubInvitation,
	BookClubInvitationAnswer,
	BookClubMember,
	BookClubSchedule,
	CreateBookClub,
	CreateBookClubInvitation,
	CreateBookClubMember,
	GetBookClubsParams,
	UpdateBookClub,
	UpdateBookClubMember,
} from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'
import { toUrlParams, urlWithParams } from './utils'

export async function getBookClubs(params?: GetBookClubsParams): Promise<APIResult<BookClub[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(urlWithParams('/book-clubs', searchParams))
	}

	return API.get('/book-clubs')
}

export async function createBookClub(payload: CreateBookClub): Promise<APIResult<BookClub>> {
	return API.post('/book-clubs', payload)
}

export async function deleteBookClub(id: string): Promise<APIResult<void>> {
	return API.delete(`/book-clubs/${id}`)
}

export async function getBookClubById(id: string): Promise<APIResult<BookClub>> {
	return API.get(`/book-clubs/${id}`)
}

export async function updateBookClub(
	id: string,
	payload: UpdateBookClub,
): Promise<APIResult<BookClub>> {
	return API.put(`/book-clubs/${id}`, payload)
}

export async function getBookClubInvitations(
	bookClubId: string,
): Promise<APIResult<BookClubInvitation>> {
	return API.get(`/book-clubs/${bookClubId}/invitations`)
}

export async function createBookClubInvitation(
	bookClubId: string,
	payload: CreateBookClubInvitation,
): Promise<APIResult<BookClubInvitation>> {
	return API.post(`/book-clubs/${bookClubId}/invitations`, payload)
}

export async function respondToBookClubInvitation(
	bookClubId: string,
	invitationId: string,
	payload: BookClubInvitationAnswer,
): Promise<APIResult<BookClubInvitation>> {
	return API.put(`/book-clubs/${bookClubId}/invitations/${invitationId}`, payload)
}

export async function getBookClubMembers(bookClubId: string): Promise<APIResult<BookClubMember[]>> {
	return API.get(`/book-clubs/${bookClubId}/members`)
}

export async function createBookClubMember(
	bookClubId: string,
	payload: CreateBookClubMember,
): Promise<APIResult<BookClubMember>> {
	return API.post(`/book-clubs/${bookClubId}/members`, payload)
}

export async function getBookClubMember(
	bookClubId: string,
	memberId: string,
): Promise<APIResult<BookClubMember>> {
	return API.get(`/book-clubs/${bookClubId}/members/${memberId}`)
}

export async function updateBookClubMember(
	bookClubId: string,
	memberId: string,
	payload: CreateBookClubMember,
): Promise<APIResult<UpdateBookClubMember>> {
	return API.put(`/book-clubs/${bookClubId}/members/${memberId}`, payload)
}

export async function deleteBookClubMember(
	bookClubId: string,
	memberId: string,
): Promise<APIResult<void>> {
	return API.delete(`/book-clubs/${bookClubId}/members/${memberId}`)
}

export async function getBookClubSchedule(
	bookClubId: string,
): Promise<APIResult<BookClubSchedule>> {
	return API.get(`/book-clubs/${bookClubId}/schedule`)
}

export async function createBookClubSchedule(
	bookClubId: string,
): Promise<APIResult<BookClubSchedule>> {
	return API.post(`/book-clubs/${bookClubId}/schedule`)
}

export async function getBookClubCurrentBook(bookClubId: string): Promise<APIResult<BookClubBook>> {
	// TODO: maybe remove /schedule from the endpoint
	return API.get(`/book-clubs/${bookClubId}/schedule/current-book`)
}

export async function getBookClubCurrentChat(
	bookClubId: string,
): Promise<APIResult<BookClubChatBoard>> {
	return API.get(`/book-clubs/${bookClubId}/chats/current`)
}

export async function getBookClubChatById(
	bookClubId: string,
	chatId: string,
): Promise<APIResult<BookClubChatBoard>> {
	return API.get(`/book-clubs/${bookClubId}/chats/${chatId}`)
}

export async function getBookClubChatThread(
	bookClubId: string,
	chatId: string,
	threadId: string,
): Promise<APIResult<BookClubChatMessage>> {
	return API.get(`/book-clubs/${bookClubId}/chats/${chatId}/threads/${threadId}`)
}

export const bookClubApi = {
	createBookClub,
	createBookClubInvitation,
	createBookClubMember,
	createBookClubSchedule,
	deleteBookClub,
	deleteBookClubMember,
	getBookClubById,
	getBookClubChatById,
	getBookClubChatThread,
	getBookClubCurrentBook,
	getBookClubCurrentChat,
	getBookClubInvitations,
	getBookClubMember,
	getBookClubMembers,
	getBookClubSchedule,
	getBookClubs,
	respondToBookClubInvitation,
	updateBookClub,
	updateBookClubMember,
}

export const bookClubQueryKeys: Record<keyof typeof bookClubApi, string> = {
	createBookClub: 'bookClub.create',
	createBookClubInvitation: 'bookClub.createInvitation',
	createBookClubMember: 'bookClub.createMember',
	createBookClubSchedule: 'bookClub.createSchedule',
	deleteBookClub: 'bookClub.delete',
	deleteBookClubMember: 'bookClub.deleteMember',
	getBookClubById: 'bookClub.getById',
	getBookClubChatById: 'bookClub.getChatById',
	getBookClubChatThread: 'bookClub.getChatThread',
	getBookClubCurrentBook: 'bookClub.getCurrentBook',
	getBookClubCurrentChat: 'bookClub.getCurrentChat',
	getBookClubInvitations: 'bookClub.getInvitations',
	getBookClubMember: 'bookClub.getMember',
	getBookClubMembers: 'bookClub.getMembers',
	getBookClubSchedule: 'bookClub.getSchedule',
	getBookClubs: 'bookClub.get',
	respondToBookClubInvitation: 'bookClub.respondToInvitation',
	updateBookClub: 'bookClub.update',
	updateBookClubMember: 'bookClub.updateMember',
}
