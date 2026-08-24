import { FORBIDDEN_ENTITY_NAMES } from '@stump/browser/utils'

import { buildSchema, CreateOrUpdateServerSchema } from '../schema'

const validServer: CreateOrUpdateServerSchema = {
	name: 'name',
	url: 'https://example.com',
	isDefault: false,
	authMode: 'login',
}

const createSavedServer = (
	overrides: Partial<CreateOrUpdateServerSchema> = {},
): CreateOrUpdateServerSchema => ({
	...validServer,
	...overrides,
})

describe('CreateOrUpdateServerSchema', () => {
	describe('validation', () => {
		it('should not allow forbidden names', () => {
			const schema = buildSchema([], vi.fn())
			for (const name of FORBIDDEN_ENTITY_NAMES) {
				expect(schema.safeParse(createSavedServer({ name })).success).toBe(false)
			}
		})

		it('should not allow existing names', () => {
			const schema = buildSchema([createSavedServer()], vi.fn())
			expect(
				schema.safeParse(createSavedServer({ name: 'name', url: 'https://newexample.com' }))
					.success,
			).toBe(false)
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', url: 'https://newexample.com' }))
					.success,
			).toBe(true)
		})

		it('should not allow existing URIs', () => {
			const schema = buildSchema([createSavedServer()], vi.fn())
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', url: 'https://example.com' }))
					.success,
			).toBe(false)
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', url: 'https://newexample.com' }))
					.success,
			).toBe(true)
		})

		describe('update', () => {
			it('should allow the same name as itself', () => {
				const schema = buildSchema([createSavedServer()], vi.fn(), {
					id: 'foo',
					...createSavedServer(),
				})
				expect(schema.safeParse(createSavedServer({ name: 'name' })).success).toBe(true)
			})

			it('should allow the same url as itself', () => {
				const schema = buildSchema([createSavedServer()], vi.fn(), {
					id: 'foo',
					...createSavedServer(),
				})
				expect(schema.safeParse(createSavedServer({ url: 'https://example.com' })).success).toBe(
					true,
				)
			})
		})
	})
})
