import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Dialog, Input } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const mutation = graphql(`
	mutation CreateTagModal($tags: [String!]!) {
		createTags(tags: $tags) {
			id
			name
		}
	}
`)

export default function CreateTagModal() {
	const [isOpen, setIsOpen] = useState(false)
	const [name, setName] = useState('')

	const client = useQueryClient()
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const { mutate: createTags, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.tags),
			})
			setIsOpen(false)
		},
		onError: (error) => {
			console.error('Failed to create tag', error)
			toast.error(String(error))
		},
	})

	const handleCreate = useCallback(() => {
		const trimmed = name.trim()
		if (trimmed) {
			createTags({ tags: [trimmed] })
		}
	}, [name, createTags])

	useEffect(() => {
		if (!isOpen) {
			const timeout = setTimeout(() => setName(''), 150)
			return () => clearTimeout(timeout)
		}
	}, [isOpen])

	return (
		<Dialog open={isOpen} onOpenChange={isPending ? undefined : setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm" variant="secondary">
					{t(getKey('trigger'))}
				</Button>
			</Dialog.Trigger>

			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('modal.heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('modal.description'))}</Dialog.Description>
				</Dialog.Header>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						handleCreate()
					}}
				>
					<Input
						label={t(getKey('modal.name.label'))}
						placeholder={t(getKey('modal.name.placeholder'))}
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
				</form>

				<Dialog.Footer>
					<Button disabled={isPending} onClick={() => setIsOpen(false)} size="sm">
						{t('common.cancel')}
					</Button>

					<Button
						disabled={isPending || !name.trim()}
						variant="primary"
						size="sm"
						onClick={handleCreate}
					>
						{t(getKey('modal.submit'))}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = 'settingsScene.server/tags.sections.createTag'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
