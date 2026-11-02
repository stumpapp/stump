import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

import {
	buildSchema,
	createFormDefaults,
	type CreateOrUpdateBookClubSchema,
	defaultMemberSpec,
	formDefaults,
} from '../schema'

const translateFn = vi.fn((key: string) => key)

const existingClubs = [
	{
		name: 'existingClubName',
	} as any,
]

const createClub = (
	overrides: Partial<CreateOrUpdateBookClubSchema> = {},
): CreateOrUpdateBookClubSchema => ({
	creatorDisplayName: 'creatorDisplayName',
	creatorHideProgress: false,
	description: 'description',
	isPrivate: false,
	memberRoleSpec: defaultMemberSpec,
	name: 'newClubName',
	...overrides,
})

describe('createOrUpdateBookClubForm schema', () => {
	describe('formDefaults', () => {
		it('createFormDefaults should default creatorHideProgress to false', () => {
			expect(createFormDefaults().creatorHideProgress).toBe(false)
		})

		it('createFormDefaults should default isPrivate to false', () => {
			expect(createFormDefaults().isPrivate).toBe(false)
		})

		it('formDefaults should set creatorHideProgress to undefined (edit mode)', () => {
			expect(formDefaults().creatorHideProgress).toBe(undefined)
		})

		it('schema requires creatorHideProgress when creating', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub({ creatorHideProgress: undefined })).success).toBe(false)
		})

		it('schema allows creatorHideProgress to be undefined when updating', () => {
			const schema = buildSchema(translateFn, [], false)
			expect(schema.parse(createClub({ creatorHideProgress: undefined })).creatorHideProgress).toBe(
				undefined,
			)
		})

		it('schema requires isPrivate', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub({ isPrivate: undefined })).success).toBe(false)
		})

		it('should map existing club to form defaults', () => {
			const schema = buildSchema(translateFn, [], false)
			const club = createClub()
			expect(schema.parse(club)).toEqual(club)
		})
	})

	describe('validation', () => {
		it('should successfully validate a valid club', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub()).success).toBe(true)
		})

		it('should not allow existing names', () => {
			const schema = buildSchema(
				translateFn,
				existingClubs.map(({ name }) => name),
				true,
			)
			expect(schema.safeParse(createClub({ name: 'existingClubName' })).success).toBe(false)
			expect(schema.safeParse(createClub({ name: 'newClubName' })).success).toBe(true)
		})

		it('should not allow forbidden names', () => {
			const schema = buildSchema(translateFn, [], true)
			for (const name of FORBIDDEN_ENTITY_NAMES) {
				expect(schema.safeParse(createClub({ name })).success).toBe(false)
			}
		})

		it('should require a name', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub({ name: '' })).success).toBe(false)
		})

		it('should not require a description', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub({ description: undefined })).success).toBe(true)
			expect(schema.safeParse(createClub({ description: '' })).success).toBe(true)
		})

		it('should not require a creatorDisplayName', () => {
			const schema = buildSchema(translateFn, [], true)
			expect(schema.safeParse(createClub({ creatorDisplayName: undefined })).success).toBe(true)
			expect(schema.safeParse(createClub({ creatorDisplayName: '' })).success).toBe(true)
		})
	})
})
