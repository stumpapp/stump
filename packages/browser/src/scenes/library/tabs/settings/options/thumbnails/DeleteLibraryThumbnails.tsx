import { useGraphQLMutation } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ConfirmationModal,
	Heading,
	Text,
} from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'
import { invalidateThumbnailQueries } from '@/utils/query'

import { useLibraryManagement } from '../../context'

const mutation = graphql(`
	mutation DeleteLibraryThumbnails($id: ID!) {
		deleteLibraryThumbnails(id: $id)
	}
`)

const LOCALE_KEY = 'librarySettingsScene.options/thumbnails.sections.management.deleteThumbnails'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function DeleteLibraryThumbnails() {
	const { t } = useTranslate()
	const queryClient = useQueryClient()
	const {
		library: { id },
	} = useLibraryManagement()

	// This is a naive way to prevent the user from deleting the thumbnails multiple times
	// in a row. I don't feel it would be worth it to implement a more robust solution.
	const [showConfirmation, setShowConfirmation] = useState(false)

	const { mutateAsync: deleteThumbnails, isPending, data } = useGraphQLMutation(mutation)

	const handleDeleteThumbnails = useCallback(async () => {
		try {
			await deleteThumbnails({ id })
			await invalidateThumbnailQueries(queryClient)
			toast.success(t(getKey('toasts.success')))
		} catch (error) {
			console.error(error)
			const fallbackMessage = t(getKey('toasts.error'))
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		}
	}, [id, deleteThumbnails, queryClient, t])

	return (
		<>
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<div className="flex">
				<Button
					variant="destructive"
					onClick={() => setShowConfirmation(true)}
					className="shrink-0"
					disabled={isPending || !!data}
				>
					{t(getKey('trigger'))}
				</Button>
			</div>

			<ConfirmationModal
				title={t(getKey('confirmation.title'))}
				description={t(getKey('confirmation.text'))}
				confirmText={t(getKey('confirmation.confirm'))}
				confirmVariant="destructive"
				isOpen={showConfirmation && !data}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isPending}
				size="md"
			>
				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>{t('common.cannotBeUndone')}</AlertTitle>
					<AlertDescription>{t(getKey('warning.description'))}</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</>
	)
}
