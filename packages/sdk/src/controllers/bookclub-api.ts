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
} from '../types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the auth API
 */
const BOOK_CLUB_ROUTE = '/book-clubs'
/**
 * A helper function to format the URL for auth API routes with optional query parameters
 */
const clubURL = createRouteURLHandler(BOOK_CLUB_ROUTE)

/**
 * The book club API controller, used for interacting with the auth endpoints of the Stump API
 */
export class BookClubAPI extends APIBase {
	/**
	 * Fetch all book clubs, either all or filtered by those which the user has access to
	 */
	async get(params?: GetBookClubsParams): Promise<BookClub[]> {
		const { data: clubs } = await this.api.axios.get<BookClub[]>(clubURL('', params))
		return clubs
	}

	/**
	 * Fetch a book club by its ID
	 */
	async getByID(id: string): Promise<BookClub> {
		const { data: club } = await this.api.axios.get<BookClub>(clubURL(id))
		return club
	}

	/**
	 * Fetch all schedules for a book club
	 */
	async getInvitations(id: string): Promise<BookClubInvitation[]> {
		const { data: invitations } = await this.api.axios.get<BookClubInvitation[]>(
			clubURL(`${id}/invitations`),
		)
		return invitations
	}

	/**
	 * Create a new invitation for a book club
	 */
	async createInvitation(
		id: string,
		payload: CreateBookClubInvitation,
	): Promise<BookClubInvitation> {
		const { data: createdInvitation } = await this.api.axios.post<BookClubInvitation>(
			clubURL(`${id}/invitations`),
			payload,
		)
		return createdInvitation
	}

	/**
	 * Respond to a book club invitation
	 */
	async respondToInvitation(
		clubId: string,
		invitationId: string,
		payload: BookClubInvitationAnswer,
	): Promise<BookClubInvitation> {
		const { data: updatedInvitation } = await this.api.axios.put<BookClubInvitation>(
			clubURL(`${clubId}/invitations/${invitationId}`),
			payload,
		)
		return updatedInvitation
	}

	/**
	 * Fetch all members for a book club
	 */
	async getMembers(id: string): Promise<BookClubMember[]> {
		const { data: members } = await this.api.axios.get<BookClubMember[]>(clubURL(`${id}/members`))
		return members
	}

	/**
	 * Create a new member for a book club
	 */
	async createMember(id: string, payload: CreateBookClubMember): Promise<BookClubMember> {
		const { data: createdMember } = await this.api.axios.post<BookClubMember>(
			clubURL(`${id}/members`),
			payload,
		)
		return createdMember
	}

	/**
	 * Fetch a single member of a book club
	 */
	async updateMember(
		clubId: string,
		memberId: string,
		payload: UpdateBookClubMember,
	): Promise<BookClubMember> {
		const { data: updatedMember } = await this.api.axios.put<BookClubMember>(
			clubURL(`/${clubId}/members/${memberId}`),
			payload,
		)
		return updatedMember
	}

	/**
	 * Update a member of a book club
	 */
	async deleteMember(clubId: string, memberId: string): Promise<void> {
		await this.api.axios.delete(clubURL(`/${clubId}/members/${memberId}`))
	}

	async getSchedule(id: string): Promise<BookClubSchedule> {
		const { data: schedule } = await this.api.axios.get<BookClubSchedule>(
			clubURL(`/${id}/schedule`),
		)
		return schedule
	}

	async createSchedule(id: string, payload: BookClubSchedule): Promise<BookClubSchedule> {
		const { data: createdSchedule } = await this.api.axios.post<BookClubSchedule>(
			clubURL(`/${id}/schedule`),
			payload,
		)
		return createdSchedule
	}

	// TODO: update

	async getCurrentBook(id: string): Promise<BookClubBook> {
		const { data: schedule } = await this.api.axios.get<BookClubBook>(
			clubURL(`/${id}/schedule/current-book`),
		)
		return schedule
	}

	async getCurrentDiscussion(id: string): Promise<BookClubChatBoard> {
		const { data: chat } = await this.api.axios.get<BookClubChatBoard>(
			clubURL(`/${id}/chats/current`),
		)
		return chat
	}

	async getDiscussionById(id: string, chatId: string): Promise<BookClubChatBoard> {
		const { data: chat } = await this.api.axios.get<BookClubChatBoard>(
			clubURL(`/${id}/chats/${chatId}`),
		)
		return chat
	}

	async getDiscussionThread(
		id: string,
		chatId: string,
		threadId: string,
	): Promise<BookClubChatMessage> {
		const { data: chat } = await this.api.axios.get<BookClubChatMessage>(
			clubURL(`/${id}/chats/${chatId}/threads/${threadId}`),
		)
		return chat
	}

	/**
	 * Create a new book club
	 */
	async create(payload: CreateBookClub): Promise<BookClub> {
		const { data: createdClub } = await this.api.axios.post<BookClub>(clubURL(''), payload)
		return createdClub
	}

	/**
	 * Update an existing book club
	 */
	async update(id: string, payload: UpdateBookClub): Promise<BookClub> {
		const { data: updatedClub } = await this.api.axios.put<BookClub>(clubURL(id), payload)
		return updatedClub
	}

	/**
	 * Delete a book club by its ID
	 */
	async delete(id: string): Promise<void> {
		await this.api.axios.delete(clubURL(id))
	}

	/**
	 * The query keys for the bookclub API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof BookClubAPI>> {
		return {
			create: 'bookclub.create',
			createInvitation: 'bookclub.createInvitation',
			createMember: 'bookclub.createMember',
			createSchedule: 'bookclub.createSchedule',
			delete: 'bookclub.delete',
			deleteMember: 'bookclub.deleteMember',
			get: 'bookclub.get',
			getByID: 'bookclub.getByID',
			getCurrentBook: 'bookclub.getCurrentBook',
			getCurrentDiscussion: 'bookclub.getCurrentDiscussion',
			getDiscussionById: 'bookclub.getDiscussionById',
			getDiscussionThread: 'bookclub.getDiscussionThread',
			getInvitations: 'bookclub.getInvitations',
			getMembers: 'bookclub.getMembers',
			getSchedule: 'bookclub.getSchedule',
			respondToInvitation: 'bookclub.respondToInvitation',
			update: 'bookclub.update',
			updateMember: 'bookclub.updateMember',
		}
	}
}
