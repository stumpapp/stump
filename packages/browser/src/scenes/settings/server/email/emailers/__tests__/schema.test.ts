import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

import { CreateOrUpdateEmailerSchema, createSchema } from '../schema'

const translateFn = jest.fn()

const validEmailer: CreateOrUpdateEmailerSchema = {
	is_primary: false,
	name: 'newName',
	password: 'password',
	sender_display_name: 'sender_display_name',
	sender_email: 'sender_email@gmail.com',
	smtp_host: 'smtp_host',
	smtp_port: 123,
	tls_enabled: false,
	username: 'username',
}

const createEmailer = (
	overrides: Partial<CreateOrUpdateEmailerSchema> = {},
): CreateOrUpdateEmailerSchema => ({
	...validEmailer,
	...overrides,
})

describe('CreateOrUpdateEmailerSchema', () => {
	describe('formDefaults', () => {
		it('should default is_primary to true when no existing emailers', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.parse(createEmailer({ is_primary: undefined })).is_primary).toBe(true)
		})

		it('should default is_primary to false when existing emailers', () => {
			const schema = createSchema(['existingName'], translateFn, true)
			expect(schema.parse(createEmailer({ is_primary: undefined })).is_primary).toBe(false)
		})

		it('should build form defaults from an emailer', () => {
			const schema = createSchema([], translateFn, true)
			const emailer = createEmailer()
			expect(schema.parse(emailer)).toEqual(emailer)
		})
	})

	describe('validation', () => {
		it('should allow optional max_attachment_size_bytes', () => {
			const schema = createSchema([], translateFn, true)
			expect(
				schema.safeParse(createEmailer({ max_attachment_size_bytes: undefined })).success,
			).toBe(true)
			expect(schema.safeParse(createEmailer({ max_attachment_size_bytes: 123 })).success).toBe(true)
		})

		it('should not allow existing names', () => {
			const schema = createSchema(['existingName'], translateFn, true)
			expect(schema.safeParse(createEmailer({ name: 'existingName' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ name: 'newName' })).success).toBe(true)
		})

		it('should not allow forbidden names', () => {
			const schema = createSchema([], translateFn, true)
			for (const name of FORBIDDEN_ENTITY_NAMES) {
				expect(schema.safeParse(createEmailer({ name })).success).toBe(false)
			}
		})

		it('should require a password when creating', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ password: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ password: undefined })).success).toBe(false)
			expect(schema.safeParse(createEmailer()).success).toBe(true)
		})

		it('should not require a password when updating', () => {
			const schema = createSchema([], translateFn, false)
			expect(schema.safeParse(createEmailer({ password: undefined })).success).toBe(true)
			expect(schema.safeParse(createEmailer()).success).toBe(true)
		})

		it('should require a valid email address for sender_email', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ sender_email: 'invalid' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ sender_email: 'valid@gmail.com' })).success).toBe(
				true,
			)
		})

		it('should require a non-empty string for sender_display_name', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ sender_display_name: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ sender_display_name: 'valid' })).success).toBe(true)
		})

		it('should require a non-empty string for smtp_host', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ smtp_host: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ smtp_host: 'valid' })).success).toBe(true)
		})

		it('should require a number for smtp_port', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ smtp_port: NaN })).success).toBe(false)
			// @ts-expect-error: smtp_port is a number
			expect(schema.safeParse(createEmailer({ smtp_port: '3' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ smtp_port: 123 })).success).toBe(true)
		})

		it('should require a boolean for tls_enabled', () => {
			const schema = createSchema([], translateFn, true)
			// @ts-expect-error: tls_enabled is a boolean
			expect(schema.safeParse(createEmailer({ tls_enabled: 'true' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ tls_enabled: true })).success).toBe(true)
		})

		it('should require a non-empty string for username', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ username: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ username: 'valid' })).success).toBe(true)
		})
	})
})
