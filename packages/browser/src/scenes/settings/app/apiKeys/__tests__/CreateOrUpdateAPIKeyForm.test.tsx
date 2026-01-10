import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'

import { useAppContext } from '@/context'

import { CreateOrUpdateAPIKeyFormValues, createSchema } from '../CreateOrUpdateAPIKeyForm'

jest.mock('@/context', () => ({
	useAppContext: jest.fn(),
}))
const useAppContextRet = {
	checkPermission: jest.fn(),
} as any

jest.mock('@stump/i18n', () => ({
	useLocaleContext: jest.fn(),
}))
const translate = jest.fn().mockImplementation((key: string) => key)

describe('CreateOrUpdateAPIKeyForm', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(useAppContext).mockReturnValue(useAppContextRet)
		jest.mocked(useLocaleContext).mockReturnValue({ t: translate } as any)
	})

	describe('schema', () => {
		const getSchema = () => createSchema(translate)
		const validBase: CreateOrUpdateAPIKeyFormValues = {
			explicitPermissions: [],
			inherit: false,
			name: 'test',
		}

		it('should successfully validate a valid object', () => {
			const schema = createSchema(translate)
			expect(schema.safeParse(validBase).success).toBe(true)
			expect(
				schema.safeParse({
					...validBase,
					expiresAt: dayjs().add(1, 'day').toDate(),
				}).success,
			).toBe(true)
		})

		it('should enforce a name with a minimum length of 1', () => {
			expect(getSchema().safeParse({ ...validBase, name: '' }).success).toBe(false)
		})

		it('should enforce a permissions is a valid user permission', () => {
			const schema = createSchema(translate)
			expect(
				schema.safeParse({
					...validBase,
					explicitPermissions: ['invalid-permission'],
				}).success,
			).toBe(false)
			// Valid
			expect(
				schema.safeParse({
					...validBase,
					explicitPermissions: [UserPermission.AccessApiKeys],
				}).success,
			).toBe(true)
		})

		it('should enforce a future expiration date', () => {
			const schema = createSchema(translate)
			expect(
				schema.safeParse({
					...validBase,
					expiresAt: dayjs().subtract(1, 'day').toDate(),
				}).success,
			).toBe(false)
			expect(
				schema.safeParse({
					...validBase,
					expiresAt: new Date(),
				}).success,
			).toBe(false)
		})
	})
})
