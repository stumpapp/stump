import { Alert, AlertDescription, AlertTitle, PasswordInput } from '@stump/components'
import { MetadataProvider } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useMutation } from '@tanstack/react-query'
import getProperty from 'lodash/get'
import { AlertTriangleIcon } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import { CreateProviderConfigSchema } from './schema'

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
		mutate,
		isPending,
		error: fetchError,
	} = useMutation({
		mutationKey: ['validateApiKey', provider, debouncedValue],
		mutationFn: async ({ apiKey, validator }: { apiKey: string; validator: Validator }) => {
			const isValid = await validator(apiKey, t)
			if (!isValid) {
				form.setError('apiToken', {
					type: 'validate',
					message: t(getKey('apiToken.validationError')),
				})
			} else {
				form.clearErrors('apiToken')
			}
		},
	})

	const validateKey = useCallback(
		async (apiKey: string) => {
			if (isPending || !apiKey) return
			const validator = PROVIDER_VALIDATORS[provider]
			if (!validator) return
			mutate({ apiKey, validator })
		},
		[provider, mutate, isPending],
	)

	useEffect(
		() => {
			if (debouncedValue) {
				validateKey(debouncedValue)
			} else {
				form.clearErrors('apiToken')
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[debouncedValue],
	)

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

			{fetchError && (
				<Alert variant="destructive">
					<AlertTriangleIcon />
					<AlertTitle>{t(getKey('apiToken.validationRequestError'))}</AlertTitle>
					<AlertDescription>
						{fetchError instanceof Error
							? fetchError.message
							: t(getKey('apiToken.validationRequestErrorUnknown'))}
					</AlertDescription>
				</Alert>
			)}
		</>
	)
}

const LOCALE_KEY = 'settingsScene.server/metadataIntegrations.providerForm'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

type Validator = (
	apiKey: string,
	t: (key: string, args?: Record<string, unknown>) => string,
) => Promise<boolean>

const validateHardcoverApiKey: Validator = async (apiKey, t) => {
	if (apiKey.startsWith('Bearer ')) {
		throw new Error(t(getKey('apiToken.noBearerPrefixRequired')))
	}

	const response = await fetch('https://api.hardcover.app/v1/graphql', {
		method: 'POST',
		body: JSON.stringify({
			query: `
          query {
            me {
              id
              username
            }
          }
        `,
		}),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
	})

	if (!response.ok) {
		throw new Error(t(getKey('apiToken.hardcoverStatusError'), { status: response.status }))
	}

	const data = await response.json()
	const firstError = getProperty(data, 'errors[0].message')
	if (firstError && typeof firstError === 'string') {
		throw new Error(t(getKey('apiToken.hardcoverValidationError'), { message: firstError }))
	}
	// hardcover `me` is an array for whatever reason
	return getProperty(data, 'data.me[0].id') != null
}

const PROVIDER_VALIDATORS: Record<MetadataProvider, Validator | null> = {
	HARDCOVER: validateHardcoverApiKey,
}
