import {
	useGraphQLMutation,
	useGraphQLUploadMutation,
	useSDK,
	useUploadConfig,
} from '@stump/client'
import { Button, Dialog } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import UploadImageModal from '@/components/thumbnail/UploadImageModal'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { invalidateThumbnailQueries } from '@/utils/query'

import BookPageGrid from './BookPageGrid'

const updateMutation = graphql(`
	mutation BookThumbnailSelectorUpdate($id: ID!, $input: PageBasedThumbnailInput!) {
		updateMediaThumbnail(id: $id, input: $input) {
			id
			thumbnail {
				url
			}
		}
	}
`)

const uploadMutation = graphql(`
	mutation BookThumbnailSelectorUpload($id: ID!, $file: Upload!) {
		uploadMediaThumbnail(id: $id, file: $file) {
			id
			thumbnail {
				url
			}
		}
	}
`)

type Params = {
	bookId: string
	pages: number
	extension: string
}

/**
 * The state, mutations, and dialogs for changing a book's thumbnail
 */
export function useBookThumbnailActions({ bookId, pages, extension }: Params) {
	const { t, translate } = useTranslate()
	const { sdk } = useSDK()
	const queryClient = useQueryClient()
	const { checkPermission } = useAppContext()

	const hasUploadPermission = checkPermission(UserPermission.UploadFile)
	const { uploadConfig } = useUploadConfig({ enabled: hasUploadPermission })
	const canUpload = hasUploadPermission && !!uploadConfig?.enabled

	const [isPageSelectorOpen, setIsPageSelectorOpen] = useState(false)
	const [isUploadOpen, setIsUploadOpen] = useState(false)
	const [page, setPage] = useState<number>()

	const { mutateAsync: patchThumbnail, isPending: isPatching } = useGraphQLMutation(
		updateMutation,
		{ onSuccess: () => invalidateThumbnailQueries(queryClient) },
	)
	const { mutateAsync: uploadThumbnail, isPending: isUploading } = useGraphQLUploadMutation(
		uploadMutation,
		{ onSuccess: () => invalidateThumbnailQueries(queryClient) },
	)

	const closePageSelector = () => {
		setPage(undefined)
		setIsPageSelectorOpen(false)
	}

	const handleUploadImage = async (file: File) => {
		try {
			await uploadThumbnail({ id: bookId, file })
			setIsUploadOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.uploadFailed'))
		}
	}

	const handleConfirmPage = async () => {
		if (page == null) return
		try {
			await patchThumbnail({ id: bookId, input: { page } })
			setPage(undefined)
			setIsPageSelectorOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.updateFailed'))
		}
	}

	const dialogs = (
		<>
			<Dialog open={isPageSelectorOpen} onOpenChange={(open) => !open && closePageSelector()}>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>{t('thumbnailSelector.title')}</Dialog.Title>
						<Dialog.Description>
							{t('thumbnailSelector.descriptions.chooseBookPage')}
						</Dialog.Description>
						<Dialog.Close onClick={closePageSelector} />
					</Dialog.Header>

					<BookPageGrid
						bookId={bookId}
						pages={pages}
						extension={extension}
						selectedPage={page}
						onSelectPage={setPage}
					/>

					<Dialog.Footer>
						<Button variant="outline" onClick={closePageSelector}>
							{translate('shared.common.cancel')}
						</Button>
						<Button
							onClick={handleConfirmPage}
							disabled={!page}
							isLoading={isPatching || isUploading}
						>
							{t('thumbnailSelector.actions.confirmSelection')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			{canUpload && (
				<UploadImageModal
					isOpen={isUploadOpen}
					onClose={() => setIsUploadOpen(false)}
					onUploadImage={handleUploadImage}
					maxSize={uploadConfig.maxFileUploadSize}
				/>
			)}
		</>
	)

	return {
		/** a preview url for the currently selected (unconfirmed) page, if any */
		previewUrl: page ? sdk.media.bookPageURL(bookId, page) : undefined,
		openPageSelector: () => setIsPageSelectorOpen(true),
		openUpload: () => setIsUploadOpen(true),
		/** whether the user has permission and the server has uploads enabled */
		canUpload,
		dialogs,
	}
}
