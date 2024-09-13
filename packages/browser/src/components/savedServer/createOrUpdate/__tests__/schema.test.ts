import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

import { buildSchema, CreateOrUpdateServerSchema } from '../schema'

const validServer: CreateOrUpdateServerSchema = {
	name: 'name',
	uri: 'https://example.com',
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
			const schema = buildSchema([], jest.fn())
			for (const name of FORBIDDEN_ENTITY_NAMES) {
				expect(schema.safeParse(createSavedServer({ name })).success).toBe(false)
			}
		})

		it('should not allow existing names', () => {
			const schema = buildSchema([createSavedServer()], jest.fn())
			expect(
				schema.safeParse(createSavedServer({ name: 'name', uri: 'https://newexample.com' }))
					.success,
			).toBe(false)
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', uri: 'https://newexample.com' }))
					.success,
			).toBe(true)
		})

		it('should not allow existing URIs', () => {
			const schema = buildSchema([createSavedServer()], jest.fn())
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', uri: 'https://example.com' }))
					.success,
			).toBe(false)
			expect(
				schema.safeParse(createSavedServer({ name: 'newName', uri: 'https://newexample.com' }))
					.success,
			).toBe(true)
		})

		describe('update', () => {
			it('should allow the same name as itself', () => {
				const schema = buildSchema([createSavedServer()], jest.fn(), createSavedServer())
				expect(schema.safeParse(createSavedServer({ name: 'name' })).success).toBe(true)
			})

			it('should allow the same URI as itself', () => {
				const schema = buildSchema([createSavedServer()], jest.fn(), createSavedServer())
				expect(schema.safeParse(createSavedServer({ uri: 'https://example.com' })).success).toBe(
					true,
				)
			})
		})
	})
})
