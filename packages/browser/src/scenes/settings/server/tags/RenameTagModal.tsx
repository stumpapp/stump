import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Dialog, Input } from '@stump/components'
import { graphql, Tag } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const mutation = graphql(`
	mutation RenameTagModal($id: Int!, $name: String!) {
		renameTag(id: $id, name: $name) {
			id
			name
		}
	}
`)

type Props = {
	tag: Tag | null
	onClose: () => void
}

export default function RenameTagModal({ tag, onClose }: Props) {
	const [name, setName] = useState('')

	const client = useQueryClient()
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const { mutate: renameTag, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.tags),
			})
			onClose()
		},
		onError: (error) => {
			console.error('Failed to rename tag', error)
			toast.error(String(error))
		},
	})

	const handleRename = useCallback(() => {
		if (tag && name.trim()) {
			renameTag({ id: tag.id, name: name.trim() })
		}
	}, [tag, name, renameTag])

	useEffect(() => {
		if (tag) {
			setName(tag.name)
		}
	}, [tag])

	return (
		<Dialog open={!!tag} onOpenChange={isPending ? undefined : (open) => !open && onClose()}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
				</Dialog.Header>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						handleRename()
					}}
				>
					<Input
						label={t(getKey('name.label'))}
						placeholder={t(getKey('name.placeholder'))}
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
				</form>

				<Dialog.Footer>
					<Button disabled={isPending} onClick={onClose} size="sm">
						{t('common.cancel')}
					</Button>

					<Button
						disabled={isPending || !name.trim() || name.trim() === tag?.name}
						variant="primary"
						size="sm"
						onClick={handleRename}
					>
						{t(getKey('submit'))}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = 'settingsScene.server/tags.sections.renameTag.modal'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
