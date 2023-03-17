import {
	FormErrorMessage,
	FormHelperText,
	FormLabel,
	InputGroup,
	InputRightElement,
	Spinner,
	useBoolean,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkUrl, isUrl } from '@stump/api'
import { useStumpStore } from '@stump/client'
import { CloudCheck, CloudSlash } from 'phosphor-react'
import { ChangeEvent, useMemo, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'

import Button from '../ui/Button'
import Form, { FormControl } from '../ui/Form'
import { DebouncedInput } from '../ui/Input'

export default function ServerUrlForm() {
	const { setBaseUrl } = useStumpStore(({ setBaseUrl }) => ({ setBaseUrl }))
	const [isCheckingUrl, { on, off }] = useBoolean(false)
	const [sucessfulConnection, setSuccessfulConnection] = useState(false)

	const schema = z.object({
		baseUrl: z
			.string()
			.min(1, { message: 'URL is required' })
			.refine(isUrl, { message: 'Invalid URL' })
			.refine(checkUrl, (url) => ({ message: `Failed to connect to ${url}` })),
	})

	const form = useForm({
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})

	async function validateUrl() {
		on()
		const url = form.getValues('baseUrl')

		if (!url) {
			off()
			return
		}

		let errorMessage: string

		// TODO: this function doesn't work lol
		if (!isUrl(url)) {
			errorMessage = 'Invalid URL'
		} else {
			const isValid = await checkUrl(url)

			if (!isValid) {
				errorMessage = `Failed to connect to ${url}`
			} else {
				setSuccessfulConnection(true)
			}
		}

		setTimeout(() => {
			off()
			if (errorMessage) {
				form.setError('baseUrl', {
					message: `Failed to connect to ${url}`,
				})
			}
		}, 300)
	}

	async function handleSubmit(values: FieldValues) {
		const { baseUrl } = values

		setBaseUrl(baseUrl)

		// FIXME: super cringe, big no
		window.location.href = '/'
	}

	const InputDecoration = useMemo(() => {
		if (isCheckingUrl) {
			return <Spinner size="sm" />
		} else if (Object.keys(form.formState.errors).length > 0) {
			return <CloudSlash size="1.25rem" color="#F56565" />
		} else if (sucessfulConnection) {
			return <CloudCheck size="1.25rem" color="#48BB78" />
		}

		return null
	}, [isCheckingUrl, form.formState.errors, sucessfulConnection])

	const { onChange, ...register } = form.register('baseUrl')

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		setSuccessfulConnection(false)
		form.clearErrors('baseUrl')

		onChange(e)
	}

	return (
		<Form onSubmit={handleSubmit} form={form}>
			<FormControl label="Server URL" isInvalid={!!form.formState.errors.baseUrl}>
				<FormLabel htmlFor="baseUrl">Server URL</FormLabel>

				<InputGroup>
					<DebouncedInput
						borderColor={sucessfulConnection ? 'green.500' : undefined}
						{...register}
						onChange={handleChange}
						onInputStop={validateUrl}
					/>
					<InputRightElement
						title={
							// TODO: remove ternary, yuck
							isCheckingUrl
								? 'Testing connection...'
								: InputDecoration
								? 'Failed to connect!'
								: undefined
						}
						// eslint-disable-next-line react/no-children-prop
						children={InputDecoration}
					/>
				</InputGroup>

				<FormErrorMessage>{form.formState.errors.baseUrl?.message as string}</FormErrorMessage>

				{sucessfulConnection && (
					<FormHelperText color="green.300">
						Successfully connected to {form.getValues('baseUrl')}!
					</FormHelperText>
				)}
			</FormControl>

			<Button colorScheme="brand" type="submit">
				Submit Form
			</Button>
		</Form>
	)
}
