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
	PatchBookClubMember,
	UpdateBookClub,
} from '@stump/types'

import { toUrlParams, urlWithParams } from '.'
import { API } from './axios'
import { ApiResult } from './types'

export async function getBookClubs(params?: GetBookClubsParams): Promise<ApiResult<BookClub[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(urlWithParams('/book-clubs', searchParams))
	}

	return API.get('/book-clubs')
}

export async function createBookClub(payload: CreateBookClub): Promise<ApiResult<BookClub>> {
	return API.post('/book-clubs', payload)
}

export async function getBookClubById(id: string): Promise<ApiResult<BookClub>> {
	return API.get(`/book-clubs/${id}`)
}

export async function updateBookClub(
	id: string,
	payload: UpdateBookClub,
): Promise<ApiResult<BookClub>> {
	return API.put(`/book-clubs/${id}`, payload)
}

export async function getBookClubInvitations(
	bookClubId: string,
): Promise<ApiResult<BookClubInvitation>> {
	return API.get(`/book-clubs/${bookClubId}/invitations`)
}

export async function createBookClubInvitation(
	bookClubId: string,
	payload: CreateBookClubInvitation,
): Promise<ApiResult<BookClubInvitation>> {
	return API.post(`/book-clubs/${bookClubId}/invitations`, payload)
}

export async function respondToBookClubInvitation(
	bookClubId: string,
	invitationId: string,
	payload: BookClubInvitationAnswer,
): Promise<ApiResult<BookClubInvitation>> {
	return API.put(`/book-clubs/${bookClubId}/invitations/${invitationId}`, payload)
}

export async function getBookClubMembers(bookClubId: string): Promise<ApiResult<BookClubMember>> {
	return API.get(`/book-clubs/${bookClubId}/members`)
}

export async function createBookClubMember(
	bookClubId: string,
	payload: CreateBookClubMember,
): Promise<ApiResult<BookClubMember>> {
	return API.post(`/book-clubs/${bookClubId}/members`, payload)
}

export async function getBookClubMember(
	bookClubId: string,
	memberId: string,
): Promise<ApiResult<BookClubMember>> {
	return API.get(`/book-clubs/${bookClubId}/members/${memberId}`)
}

export async function updateBookClubMember(
	bookClubId: string,
	memberId: string,
	payload: CreateBookClubMember,
): Promise<ApiResult<PatchBookClubMember>> {
	return API.put(`/book-clubs/${bookClubId}/members/${memberId}`, payload)
}

export async function deleteBookClubMember(
	bookClubId: string,
	memberId: string,
): Promise<ApiResult<void>> {
	return API.delete(`/book-clubs/${bookClubId}/members/${memberId}`)
}

export async function getBookClubSchedule(
	bookClubId: string,
): Promise<ApiResult<BookClubSchedule>> {
	return API.get(`/book-clubs/${bookClubId}/schedule`)
}

export async function createBookClubSchedule(
	bookClubId: string,
): Promise<ApiResult<BookClubSchedule>> {
	return API.post(`/book-clubs/${bookClubId}/schedule`)
}

export async function getBookClubCurrentBook(bookClubId: string): Promise<ApiResult<BookClubBook>> {
	// TODO: maybe remove /schedule from the endpoint
	return API.get(`/book-clubs/${bookClubId}/schedule/current-book`)
}

export async function getBookClubCurrentChat(
	bookClubId: string,
): Promise<ApiResult<BookClubChatBoard>> {
	return API.get(`/book-clubs/${bookClubId}/chats/current`)
}

export async function getBookClubChatById(
	bookClubId: string,
	chatId: string,
): Promise<ApiResult<BookClubChatBoard>> {
	return API.get(`/book-clubs/${bookClubId}/chats/${chatId}`)
}

export async function getBookClubChatThread(
	bookClubId: string,
	chatId: string,
	threadId: string,
): Promise<ApiResult<BookClubChatMessage>> {
	return API.get(`/book-clubs/${bookClubId}/chats/${chatId}/threads/${threadId}`)
}

export const bookClubApi = {
	createBookClub,
	createBookClubInvitation,
	createBookClubMember,
	createBookClubSchedule,
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
