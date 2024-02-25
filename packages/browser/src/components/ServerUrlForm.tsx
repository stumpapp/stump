import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, isUrl } from '@stump/api'
import { Button, Form, Input, ProgressSpinner, Text, useBoolean } from '@stump/components'
import { Cloud, CloudOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDebounce } from 'rooks'
import { z } from 'zod'

import { useAppStore } from '@/stores'

// TODO: retest this component. I blindly refactored it when migrating off chakra...
export default function ServerUrlForm() {
	const [isCheckingUrl, { on, off }] = useBoolean(false)
	const [sucessfulConnection, setSuccessfulConnection] = useState(false)
	const setBaseURL = useAppStore((store) => store.setBaseUrl)

	const schema = z.object({
		baseUrl: z
			.string()
			.min(1, { message: 'URL is required' })
			.refine(isUrl, { message: 'Invalid URL' })
			.refine(checkUrl, (url) => ({ message: `Failed to connect to ${url}` })),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})
	const baseUrl = form.watch('baseUrl')

	useEffect(
		() => {
			async function validateUrl() {
				if (!baseUrl) {
					return
				}

				on()

				let errorMessage: string

				// TODO: this function doesn't work lol
				if (!isUrl(baseUrl)) {
					errorMessage = 'Invalid URL'
				} else {
					const isValid = await checkUrl(baseUrl)

					if (!isValid) {
						errorMessage = `Failed to connect to ${baseUrl}`
					} else {
						setSuccessfulConnection(true)
					}
				}

				setTimeout(() => {
					off()
					if (errorMessage) {
						form.setError('baseUrl', {
							message: `Failed to connect to ${baseUrl}`,
						})
					}
				}, 300)
			}

			if (baseUrl) {
				form.clearErrors('baseUrl')
				setSuccessfulConnection(false)
				validateUrl()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[baseUrl],
	)

	async function handleSubmit(values: Schema) {
		const { baseUrl } = values

		setBaseURL(baseUrl)

		// FIXME: super cringe, big no
		window.location.href = '/'
	}

	const InputDecoration = useMemo(() => {
		if (isCheckingUrl) {
			return <ProgressSpinner size="sm" />
		} else if (Object.keys(form.formState.errors).length > 0) {
			return <CloudOff size="1.25rem" color="#F56565" />
		} else if (sucessfulConnection) {
			return <Cloud size="1.25rem" color="#48BB78" />
		}

		return null
	}, [isCheckingUrl, form.formState.errors, sucessfulConnection])

	const setUrlDebounced = useDebounce((value: string) => form.setValue('baseUrl', value), 500)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<input className="hidden" {...form.register('baseUrl')} />
			<Input
				label="Server URL"
				rightDecoration={InputDecoration}
				variant="primary"
				errorMessage={form.formState.errors.baseUrl?.message}
				onChange={(e) => setUrlDebounced(e.target.value)}
			/>

			{sucessfulConnection && <Text className="-mt-3 text-green-400">Successfully connected!</Text>}

			<div className="w-full md:w-1/3">
				<Button className="w-full" variant="primary" type="submit" isLoading={isCheckingUrl}>
					Submit
				</Button>
			</div>
		</Form>
	)
}
