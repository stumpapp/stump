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
			const isValid = await validator(apiKey)
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
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[debouncedValue],
	)

	return (
		<>
			<PasswordInput
				label={t(getKey('apiToken.label'))}
				description={t(getKey('apiToken.description'))}
				variant="primary"
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

type Validator = (apiKey: string) => Promise<boolean>

const validateHardcoverApiKey: Validator = async (apiKey) => {
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

	// TODO(localization): localize this error message
	if (!response.ok) {
		throw new Error(`Hardcover API responded with status ${response.status}`)
	}

	const data = await response.json()
	return getProperty(data, 'data.me.id') != null
}

const PROVIDER_VALIDATORS: Record<MetadataProvider, Validator | null> = {
	HARDCOVER: validateHardcoverApiKey,
}
