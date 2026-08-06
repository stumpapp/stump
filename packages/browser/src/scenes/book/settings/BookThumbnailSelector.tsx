import { useGraphQLMutation, useGraphQLUploadMutation, useSDK } from '@stump/client'
import { Button, Dialog, PickSelect } from '@stump/components'
import {
	BookThumbnailSelectorUpdateMutation,
	FragmentType,
	graphql,
	useFragment,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { EntityCard } from '@/components/entity'
import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'

import BookPageGrid from './BookPageGrid'

// TODO: This entire UI looks like absolute shit IMO. I find the management pages that
// aren't quite large enough to have their own sidebar navigation to be a bit awkward
// to think through. That said, I would REALLY like to land on something that doesn't
// make me cringe when looking at it

export const BookThumbnailSelectorFragment = graphql(`
	fragment BookThumbnailSelector on Media {
		id
		thumbnail {
			url
		}
		pages
	}
`)

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

type OnSuccessData = PickSelect<BookThumbnailSelectorUpdateMutation, 'updateMediaThumbnail'>

type Props = {
	fragment: FragmentType<typeof BookThumbnailSelectorFragment>
}

export default function BookThumbnailSelector({ fragment }: Props) {
	const { t } = useLocaleContext()
	const book = useFragment(BookThumbnailSelectorFragment, fragment)

	const [isOpen, setIsOpen] = useState(false)
	const [page, setPage] = useState<number>()

	const { sdk } = useSDK()

	const onSuccess = useCallback(
		({ thumbnail }: OnSuccessData) =>
			sdk.axios.get(thumbnail.url, {
				headers: {
					'Cache-Control': 'no-cache',
					Pragma: 'no-cache',
					Expires: '0',
				},
			}),
		[sdk],
	)

	const { mutateAsync: patchThumbnail, isPending: isPatchingThumbnail } = useGraphQLMutation(
		updateMutation,
		{
			onSuccess: (data) => onSuccess(data.updateMediaThumbnail),
		},
	)

	const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } =
		useGraphQLUploadMutation(uploadMutation, {
			onSuccess: (data) => onSuccess(data.uploadMediaThumbnail),
		})

	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			setIsOpen(false)
		}
	}

	const handleCancel = () => {
		if (page) {
			setPage(undefined)
		}
		setIsOpen(false)
	}

	const handleUploadImage = useCallback(
		async (file: File) => {
			try {
				await uploadThumbnail({ id: book.id, file })
				setIsOpen(false)
			} catch (error) {
				console.error(error)
				toast.error(t('common.failedToUploadImage'))
			}
		},
		[book.id, uploadThumbnail, t],
	)

	const handleConfirm = useCallback(async () => {
		if (page == null) return

		try {
			await patchThumbnail({ id: book.id, input: { page } })
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('common.failedToUpdateThumbnail'))
		}
	}, [patchThumbnail, page, book.id, t])

	return (
		<div className="relative">
			<EntityCard
				imageUrl={page ? sdk.media.bookPageURL(book.id, page) : book.thumbnail.url}
				isCover
				className="flex-auto shrink-0"
				fullWidth={(imageFailed) => !imageFailed}
			/>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Trigger asChild>
					<span className="bottom-2 left-2 absolute block">
						<EditThumbnailDropdown
							onChooseSelector={() => setIsOpen(true)}
							onUploadImage={handleUploadImage}
						/>
					</span>
				</Dialog.Trigger>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>{t('common.selectThumbnail')}</Dialog.Title>
						<Dialog.Description>{t('common.choosePageForThumbnail')}</Dialog.Description>
						<Dialog.Close onClick={() => setIsOpen(false)} />
					</Dialog.Header>

					<BookPageGrid
						bookId={book.id}
						pages={book.pages}
						selectedPage={page}
						onSelectPage={setPage}
					/>

					<Dialog.Footer>
						<Button variant="outline" onClick={handleCancel}>
							{t('common.cancel')}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={!page}
							isLoading={isPatchingThumbnail || isUploadingThumbnail}
						>
							{t('common.confirmSelection')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
