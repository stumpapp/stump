import { useGraphQLMutation, useSDK } from '@stump/client'
import { DropdownItemGroup } from '@stump/components/dropdown/DropdownMenu'
import { FragmentType, graphql, useFragment, UserPermission } from '@stump/graphql'
import {
	BookMinus,
	BookOpenCheck,
	BookX,
	Download,
	FileSearch,
	Image,
	ImagePlus,
	ImageUp,
	Send,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'

import { EntityHeader } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import DeleteHistoryConfirmation from './DeleteHistoryConfirmation'
import EmailBookDialog from './EmailBookDialog'
import { useBookReadingActions } from './useBookReadingActions'
import { useBookThumbnailActions } from './useBookThumbnailActions'

const fragment = graphql(`
	fragment BookHeader on Media {
		id
		resolvedName
		pages
		series {
			id
			resolvedName
		}
		library {
			id
			name
		}
		...BookReadingActions
	}
`)

const analyzeMutation = graphql(`
	mutation BookHeaderAnalyze($id: ID!) {
		analyzeMedia(id: $id)
	}
`)

type Props = {
	fragment: FragmentType<typeof fragment>
	onInfoClick?: () => void
}

const MANAGE_PERMISSIONS = [
	UserPermission.ManageLibrary,
	UserPermission.EditThumbnails,
	UserPermission.EditMetadata,
]

// TODO(i8n): localize analysis

export function BookHeader({ fragment: fragmentRef, onInfoClick }: Props) {
	const book = useFragment(fragment, fragmentRef)
	const location = useLocation()
	const paths = usePaths()

	const { t, translate } = useTranslate()
	const { sdk } = useSDK()
	const { checkPermission } = useAppContext()
	const {
		isReading,
		isPreviouslyCompleted,
		isUntouched,
		completeBook,
		deleteCurrentSession,
		deleteReadHistory,
	} = useBookReadingActions(book)

	const thumbnail = useBookThumbnailActions({ bookId: book.id, pages: book.pages })
	const { mutate: analyze, isPending: isAnalyzing } = useGraphQLMutation(analyzeMutation, {
		onSuccess: () => toast.success('Analysis started'),
		onError: (error) => {
			console.error(error)
			toast.error('Failed to start analysis')
		},
	})

	const [showEmailDialog, setShowEmailDialog] = useState(false)
	const [showDeleteHistoryConfirmation, setShowDeleteHistoryConfirmation] = useState(false)

	const canManage = MANAGE_PERMISSIONS.some((permission) => checkPermission(permission))
	const canDownload = checkPermission(UserPermission.DownloadFile)
	const canAnalyze = checkPermission(UserPermission.ManageLibrary)
	const canEditThumbnail = checkPermission(UserPermission.EditThumbnails)
	const canUpload = checkPermission(UserPermission.UploadFile)
	const canEmail =
		checkPermission(UserPermission.EmailSend) || checkPermission(UserPermission.EmailArbitrarySend)

	const tabs = [
		{
			isActive: location.pathname === paths.bookOverview(book.id),
			label: translate('shared.common.overview'),
			to: paths.bookOverview(book.id),
		},
		{
			isActive: location.pathname === paths.bookReadingTimeline(book.id),
			label: translate('shared.readingTimeline.title'),
			to: paths.bookReadingTimeline(book.id),
		},
	]

	const actions = [
		{
			items: [
				...(isUntouched || isReading
					? [
							{
								label: translate('shared.bookActions.markAsRead.label'),
								leftIcon: <BookOpenCheck />,
								onClick: completeBook,
							},
						]
					: []),
				...(isReading
					? [
							{
								label: translate('shared.bookActions.clearProgress.label'),
								leftIcon: <BookMinus />,
								onClick: deleteCurrentSession,
							},
						]
					: []),
				...(isPreviouslyCompleted
					? [
							{
								label: translate('shared.bookActions.deleteReadHistory.label'),
								leftIcon: <BookX />,
								variant: 'destructive' as const,
								onClick: () => setShowDeleteHistoryConfirmation(true),
							},
						]
					: []),
			],
		},
		{
			items: [
				...(canDownload
					? [
							{
								label: translate('shared.common.download'),
								leftIcon: <Download />,
								onClick: () => downloadFile(sdk.media.downloadURL(book.id)),
							},
						]
					: []),
				...(canEmail
					? [
							{
								label: translate('shared.common.email'),
								leftIcon: <Send />,
								onClick: () => setShowEmailDialog(true),
							},
						]
					: []),
			],
		},
		{
			items: [
				...(canAnalyze
					? [
							{
								label: translate('shared.bookActions.analyze'),
								leftIcon: <FileSearch />,
								disabled: isAnalyzing,
								onClick: () => analyze({ id: book.id }),
							},
						]
					: []),
				...(canEditThumbnail
					? [
							{
								label: translate('shared.common.thumbnail'),
								leftIcon: <Image />,
								subItems: [
									{
										label: t('thumbnailSelector.chooseAPage'),
										leftIcon: <ImagePlus />,
										onClick: thumbnail.openPageSelector,
									},
									...(canUpload
										? [
												{
													label: t('thumbnailSelector.uploadImage'),
													leftIcon: <ImageUp />,
													onClick: thumbnail.openUpload,
												},
											]
										: []),
								],
							},
						]
					: []),
			],
		},
	].filter((group) => group.items.length > 0) satisfies DropdownItemGroup[]

	return (
		<>
			<EntityHeader
				name={book.resolvedName}
				parents={[
					{ label: book.library.name, to: paths.library(book.library.id) },
					{ label: book.series.resolvedName, to: paths.seriesOverview(book.series.id) },
				]}
				tabs={tabs}
				actions={actions.length ? actions : undefined}
				settingsLink={canManage ? paths.bookManagement(book.id) : undefined}
				onInfoClick={onInfoClick}
			/>

			{canEmail && (
				<EmailBookDialog
					mediaId={book.id}
					isOpen={showEmailDialog}
					onClose={() => setShowEmailDialog(false)}
				/>
			)}

			{canEditThumbnail && thumbnail.dialogs}

			<DeleteHistoryConfirmation
				name={book.resolvedName}
				isOpen={showDeleteHistoryConfirmation}
				onCancel={() => setShowDeleteHistoryConfirmation(false)}
				onConfirm={() => {
					deleteReadHistory()
					setShowDeleteHistoryConfirmation(false)
				}}
			/>
		</>
	)
}

const downloadFile = (url: string) => {
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = ''
	anchor.click()
}
