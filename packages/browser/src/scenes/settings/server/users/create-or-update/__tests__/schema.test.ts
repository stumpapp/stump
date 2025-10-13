import { UserPermission } from '@stump/graphql'

import { buildSchema, ExistingUser } from '../schema'

const validUser = {
	id: '1',
	permissions: [],
	username: 'test',
} as unknown as ExistingUser

const createUser = (
	overrides: Partial<ExistingUser> & { password?: string } = {},
): ExistingUser => ({
	...validUser,
	...overrides,
})

describe('CreateOrUpdateUserSchema', () => {
	describe('base', () => {
		it('should enforce a non-empty username', () => {
			const schema = buildSchema(() => '', [], createUser())

			const result = schema.safeParse({ username: '' })
			expect(result.success).toBe(false)
		})

		it('should enforce a non-empty password when creating', () => {
			const schema = buildSchema(() => '', [])

			const result = schema.safeParse(createUser({ password: '' }))
			expect(result.success).toBe(false)
		})

		it('should allow no password when updating', () => {
			const schema = buildSchema(() => '', [], createUser())

			// This gets treated as no update in the backend
			const result = schema.safeParse(createUser({ password: '' }))
			expect(result.success).toBe(true)
		})

		it('should enforce a non-negative age restriction', () => {
			const schema = buildSchema(() => '', [], createUser())

			const result = schema.safeParse({ ageRestriction: -1 })
			expect(result.success).toBe(false)
		})
	})

	describe('userPermissionSchema', () => {
		it('should allow all valid permissions', () => {
			const schema = buildSchema(() => '', [], createUser())

			Object.values(UserPermission).forEach((permission) => {
				const result = schema.safeParse({ permissions: [permission] })
				expect(result.success).toBe(true)
			})
		})

		it('should not allow invalid permissions', () => {
			const schema = buildSchema(() => '', [], createUser())

			const result = schema.safeParse({ permissions: ['invalid'] })
			expect(result.success).toBe(false)
		})
	})
})
