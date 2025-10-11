import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

import { CreateOrUpdateEmailerSchema, createSchema } from '../schema'

const translateFn = jest.fn()

const validEmailer: CreateOrUpdateEmailerSchema = {
	isPrimary: false,
	name: 'newName',
	password: 'password',
	senderDisplayName: 'senderDisplayName',
	senderEmail: 'senderEmail@gmail.com',
	smtpHost: 'smtpHost',
	smtpPort: 123,
	tlsEnabled: false,
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
		it('should default isPrimary to true when no existing emailers', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.parse(createEmailer({ isPrimary: undefined })).isPrimary).toBe(true)
		})

		it('should default isPrimary to false when existing emailers', () => {
			const schema = createSchema(['existingName'], translateFn, true)
			expect(schema.parse(createEmailer({ isPrimary: undefined })).isPrimary).toBe(false)
		})

		it('should build form defaults from an emailer', () => {
			const schema = createSchema([], translateFn, true)
			const emailer = createEmailer()
			expect(schema.parse(emailer)).toEqual(emailer)
		})
	})

	describe('validation', () => {
		it('should allow optional maxAttachmentSizeBytes', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ maxAttachmentSizeBytes: undefined })).success).toBe(
				true,
			)
			expect(schema.safeParse(createEmailer({ maxAttachmentSizeBytes: 123 })).success).toBe(true)
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

		it('should require a valid email address for senderEmail', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ senderEmail: 'invalid' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ senderEmail: 'valid@gmail.com' })).success).toBe(true)
		})

		it('should require a non-empty string for senderDisplayName', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ senderDisplayName: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ senderDisplayName: 'valid' })).success).toBe(true)
		})

		it('should require a non-empty string for smtpHost', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ smtpHost: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ smtpHost: 'valid' })).success).toBe(true)
		})

		it('should require a number for smtpPort', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ smtpPort: NaN })).success).toBe(false)
			// @ts-expect-error: smtpPort is a number
			expect(schema.safeParse(createEmailer({ smtpPort: '3' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ smtpPort: 123 })).success).toBe(true)
		})

		it('should require a boolean for tlsEnabled', () => {
			const schema = createSchema([], translateFn, true)
			// @ts-expect-error: tlsEnabled is a boolean
			expect(schema.safeParse(createEmailer({ tlsEnabled: 'true' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ tlsEnabled: true })).success).toBe(true)
		})

		it('should require a non-empty string for username', () => {
			const schema = createSchema([], translateFn, true)
			expect(schema.safeParse(createEmailer({ username: '' })).success).toBe(false)
			expect(schema.safeParse(createEmailer({ username: 'valid' })).success).toBe(true)
		})
	})
})
