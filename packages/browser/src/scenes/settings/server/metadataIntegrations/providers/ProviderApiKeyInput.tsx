import { useGraphQLMutation } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, PasswordInput } from '@stump/components'
import {
	extractErrorMessage,
	graphql,
	ProviderApiKeyInputValidateKeyMutation,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangleIcon } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import { CreateProviderConfigSchema } from './schema'

const verificationMutation = graphql(`
	mutation ProviderApiKeyInputValidateKey($config: ValidateMetadataProviderConfigInput!) {
		validateProviderConfig(config: $config) {
			isValid
			error
			responseStatus
		}
	}
`)

export function ProviderApiKeyInput() {
	const form = useFormContext<CreateProviderConfigSchema>()

	const { t } = useLocaleContext()
	const { errors } = useFormState({ control: form.control })

	const [provider, value] = useWatch({
		control: form.control,
		name: ['providerType', 'apiToken'],
	})

	const [debouncedValue] = useDebouncedValue(value, 500)

	const {
		data: validationResult,
		mutate,
		isPending,
		error: criticalError,
		reset,
	} = useGraphQLMutation(verificationMutation, {})

	const validateKey = useCallback(
		async (apiKey: string) => {
			if (isPending || !apiKey) return

			form.clearErrors('apiToken')
			reset()

			if (apiKey.startsWith('Bearer ')) {
				form.setError('apiToken', {
					type: 'validate',
					message: t(getKey('apiToken.noBearerPrefixRequired')),
				})
			}

			mutate({ config: { apiToken: apiKey, providerType: provider } })
		},

		[provider, mutate, isPending, t, form, reset],
	)

	useEffect(
		() => {
			if (debouncedValue) {
				validateKey(debouncedValue)
			} else {
				form.clearErrors('apiToken')
				reset()
			}
		},

		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[debouncedValue],
	)

	const validationError = checkValidationResult(validationResult, t)
	const criticalMessage = criticalError
		? extractErrorMessage(criticalError, t(getKey('apiToken.validationRequestErrorUnknown')))
		: null

	return (
		<>
			<PasswordInput
				label={t(getKey('apiToken.label'))}
				description={t(getKey('apiToken.description'))}
				type="password"
				{...form.register('apiToken')}
				errorMessage={errors.apiToken?.message}
				fullWidth
			/>

			{(validationError || criticalMessage) && (
				<Alert variant="destructive">
					<AlertTriangleIcon />
					<AlertTitle>{t(getKey('apiToken.validationRequestError'))}</AlertTitle>
					<AlertDescription>{validationError || criticalMessage}</AlertDescription>
				</Alert>
			)}
		</>
	)
}

const LOCALE_KEY = 'settingsScene.server/metadataIntegrations.providerForm'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

const checkValidationResult = (
	mutationResult: ProviderApiKeyInputValidateKeyMutation | undefined,
	t: (key: string, args?: Record<string, unknown>) => string,
) => {
	const validationResult = mutationResult?.validateProviderConfig
	if (!validationResult || validationResult.isValid) return null

	if (validationResult.error) {
		return t(getKey('apiToken.providerError'), { message: validationResult.error })
	}

	if (validationResult.responseStatus) {
		return t(getKey('apiToken.providerStatusError'), { status: validationResult.responseStatus })
	}

	return t(getKey('apiToken.validationError'))
}
