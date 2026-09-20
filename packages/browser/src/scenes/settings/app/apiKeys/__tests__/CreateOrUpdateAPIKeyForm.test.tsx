import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { addDays, subDays } from 'date-fns'

import { useAppContext } from '@/context'

import { CreateOrUpdateAPIKeyFormValues, createSchema } from '../CreateOrUpdateAPIKeyForm'

vi.mock('@/context', () => ({
	useAppContext: vi.fn(),
}))
const useAppContextRet = {
	checkPermission: vi.fn(),
} as any

vi.mock('@stump/i18n', () => ({
	useLocaleContext: vi.fn(),
}))
const translate = vi.fn().mockImplementation((key: string) => key)

describe('CreateOrUpdateAPIKeyForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		vi.mocked(useAppContext).mockReturnValue(useAppContextRet)
		vi.mocked(useLocaleContext).mockReturnValue({ t: translate } as any)
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
					expiresAt: addDays(new Date(), 1),
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
					expiresAt: subDays(new Date(), 1),
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
