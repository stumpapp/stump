import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, ButtonOrLink, DropdownMenu } from '@stump/components'
import { DropdownItemGroup } from '@stump/components/dropdown/DropdownMenu'
import { BookCardFragment, graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import {
	BookMinus,
	BookOpen,
	BookOpenCheck,
	BookX,
	Download,
	EllipsisVertical,
	EyeOff,
	FileText,
	Play,
	Send,
	Settings,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useAppContext } from '@/context'
import { usePaths } from '@/paths'
import { EBOOK_EXTENSION, PDF_EXTENSION } from '@/utils/patterns'

import DeleteHistoryConfirmation from './DeleteHistoryConfirmation'
import EmailBookDialog from './EmailBookDialog'

const completedMutation = graphql(`
	mutation BookActionMenuComplete($id: ID!, $isComplete: Boolean!, $page: Int) {
		markMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {
			completedAt
		}
	}
`)

const deleteMutation = graphql(`
	mutation BookActionMenuDeleteSession($id: ID!) {
		deleteMediaProgress(id: $id) {
			__typename
		}
	}
`)

const deleteHistoryMutation = graphql(`
	mutation BookActionMenuDeleteHistory($id: ID!) {
		deleteMediaReadHistory(id: $id) {
			__typename
		}
	}
`)

type Props = {
	book: BookCardFragment
}
export default function BookActionMenu({ book }: Props) {
	const { sdk } = useSDK()
	const { checkPermission } = useAppContext()

	const client = useQueryClient()

	const onSuccess = useCallback(
		() => client.invalidateQueries({ queryKey: ['bookOverview', book.id] }),
		[client, book.id],
	)

	const { mutate: completeBook } = useGraphQLMutation(completedMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			toast.error('Failed to update book completion status')
		},
	})
	const { mutate: deleteCurrentSession } = useGraphQLMutation(deleteMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			toast.error('Failed to delete current session')
		},
	})
	const { mutate: deleteReadHistory } = useGraphQLMutation(deleteHistoryMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			toast.error('Failed to delete read history')
		},
	})

	const actions = useMemo(
		() => ({
			completeBook,
			deleteCurrentSession,
			deleteReadHistory,
		}),
		[completeBook, deleteCurrentSession, deleteReadHistory],
	)

	const progression = useMemo(
		() => ({
			isReading: !!book.readProgress,
			isUntouched: !book.readProgress && !book.readHistory?.length,
			isPreviouslyCompleted: !!book.readHistory?.length,
		}),
		[book],
	)

	const [showEmailDialog, setShowEmailDialog] = useState(false)
	const [showDeleteHistoryConfirmation, setShowDeleteHistoryConfirmation] = useState(false)

	const downloadRef = useRef<HTMLAnchorElement>(null)
	const paths = usePaths()
	const navigate = useNavigate()

	const canDownload = checkPermission(UserPermission.DownloadFile)

	const continueReadingLink = useMemo(() => {
		if (!book.readProgress) return undefined
		const { page, epubcfi } = book.readProgress
		if (epubcfi) {
			return paths.bookReader(book.id, { epubcfi, isEpub: true })
		} else if (!!page && page > 0) {
			return paths.bookReader(book.id, { page })
		}
		return undefined
	}, [book, paths])

	const getReadFromBeginningLink = useCallback(
		(incognito: boolean) => {
			const { id, extension } = book
			if (extension.match(EBOOK_EXTENSION)) {
				return paths.bookReader(id, { isEpub: true, isIncognito: incognito || undefined })
			}
			return paths.bookReader(id, { isIncognito: incognito || undefined, page: 1 })
		},
		[book, paths],
	)

	const groups = useMemo<DropdownItemGroup[]>(
		() =>
			[
				{
					items: [
						...(continueReadingLink
							? [
									{
										label: 'Continue reading',
										leftIcon: <Play className="mr-2 h-4 w-4" />,
										onClick: () => navigate(continueReadingLink),
									},
								]
							: []),
						{
							label: 'Read from beginning',
							leftIcon: <BookOpen className="mr-2 h-4 w-4" />,
							onClick: () => navigate(getReadFromBeginningLink(false)),
						},
						{
							label: 'Incognito mode',
							leftIcon: <EyeOff className="mr-2 h-4 w-4" />,
							onClick: () => navigate(getReadFromBeginningLink(true)),
						},
						...(book.extension?.match(PDF_EXTENSION)
							? [
									{
										label: 'Native PDF viewer',
										leftIcon: <FileText className="mr-2 h-4 w-4" />,
										onClick: () =>
											navigate(paths.bookReader(book.id, { isPdf: true, isStreaming: false })),
									},
								]
							: []),
					],
				},
				{
					items: [
						...(progression.isUntouched || progression.isReading
							? [
									{
										label: 'Mark as read',
										leftIcon: <BookOpenCheck className="mr-2 h-4 w-4" />,
										onClick: () => {
											actions.completeBook({ isComplete: true, id: book.id, page: book.pages })
										},
									},
								]
							: []),
						...(progression.isReading
							? [
									{
										label: 'Clear progress',
										leftIcon: <BookMinus className="mr-2 h-4 w-4" />,
										onClick: () => {
											actions.deleteCurrentSession({ id: book.id })
										},
									},
								]
							: []),
						...(progression.isPreviouslyCompleted
							? [
									{
										label: 'Delete history',
										leftIcon: <BookX className="mr-2 h-4 w-4" />,
										onClick: () => {
											setShowDeleteHistoryConfirmation(true)
										},
									},
								]
							: []),
					],
				},
				{
					items: [
						...(checkPermission(UserPermission.ManageLibrary) ||
						checkPermission(UserPermission.EditThumbnails)
							? [
									{
										label: 'Manage',
										leftIcon: <Settings className="mr-2 h-4 w-4" />,
										onClick: () => {
											navigate(paths.bookManagement(book.id))
										},
									},
								]
							: []),
						...(checkPermission(UserPermission.EmailSend) ||
						checkPermission(UserPermission.EmailArbitrarySend)
							? [
									{
										label: 'Email',
										leftIcon: <Send className="mr-2 h-4 w-4" />,
										onClick: () => setShowEmailDialog(true),
									},
								]
							: []),
					],
				},
			].filter((group) => group.items.length > 0),
		[
			checkPermission,
			progression,
			paths,
			navigate,
			book,
			actions,
			continueReadingLink,
			getReadFromBeginningLink,
		],
	)

	return (
		<>
			<EmailBookDialog
				mediaId={book.id}
				isOpen={showEmailDialog}
				onClose={() => setShowEmailDialog(false)}
			/>

			<DeleteHistoryConfirmation
				isOpen={showDeleteHistoryConfirmation}
				onCancel={() => setShowDeleteHistoryConfirmation(false)}
				onConfirm={() => {
					actions.deleteReadHistory({ id: book.id })
					setShowDeleteHistoryConfirmation(false)
				}}
			/>

			<a
				ref={downloadRef}
				className="invisible hidden"
				href={sdk.media.downloadURL(book.id)}
				download
			/>

			<div className="flex w-full items-center gap-1">
				{canDownload && (
					<ButtonOrLink
						className="w-full"
						variant="outline"
						onClick={() => downloadRef.current?.click()}
						title="Download"
						rounded="lg"
					>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ButtonOrLink>
				)}

				<DropdownMenu
					align="end"
					contentWrapperClassName="w-48"
					trigger={
						<Button variant="outline" size="icon" className="h-8 w-8 shrink-0" rounded="lg">
							<EllipsisVertical className="h-4 w-4" />
						</Button>
					}
					groups={groups}
				/>
			</div>
		</>
	)
}
