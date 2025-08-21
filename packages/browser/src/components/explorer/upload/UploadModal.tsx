import { useGraphQLMutation } from '@stump/client'
import {
	Accordion,
	Button,
	cn,
	Dialog,
	Heading,
	Input,
	ProgressBar,
	ProgressSpinner,
	Text,
} from '@stump/components'
import { graphql, UploadBooksInput } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AxiosProgressEvent } from 'axios'
import { Book, FolderArchive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'
import { useSeriesContextSafe } from '@/scenes/series'
import { formatBytes } from '@/utils/format'

import { useFileExplorerContext } from '../context'
import UploadMenu from './UploadMenu'

const uploadBooksMutation = graphql(`
	mutation UploadLibraryBooks($input: UploadBooksInput!) {
		uploadBooks(input: $input)
	}
`)

const uploadSeriesMutation = graphql(`
	mutation UploadLibrarySeries($input: UploadSeriesInput!) {
		uploadSeries(input: $input)
	}
`)

export default function UploadModal() {
	const [uploadType, setUploadType] = useState<'books' | 'series'>()

	const [seriesDirName, setSeriesDirName] = useState<string | undefined>(undefined)
	const [files, setFiles] = useState<File[]>([])

	const { t } = useLocaleContext()

	const { currentPath, refetch, uploadConfig, libraryID } = useFileExplorerContext()

	const [uploadProgress, setUploadProgress] = useState(0)

	const config = useMemo(
		() => ({
			onUploadProgress: ({ loaded, total }: AxiosProgressEvent) => {
				const progress = Math.round((loaded * 100) / (total || 0))
				setUploadProgress(progress)
			},
		}),
		[],
	)

	const { mutateAsync: uploadBooks, isPending: isUploadingBooks } = useGraphQLMutation(
		uploadBooksMutation,
		{
			onSuccess: () => refetch(),
			config,
		},
	)
	const { mutateAsync: uploadSeries, isPending: isUploadingSeries } = useGraphQLMutation(
		uploadSeriesMutation,
		{
			onSuccess: () => refetch(),
			config,
		},
	)

	const isUploading = isUploadingBooks || isUploadingSeries

	const handleDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
		if (rejections.length) {
			console.warn('Some files were rejected:', rejections)
			toast.error('Some files were rejected. Please check the file type and size')
		}

		setFiles((prev) => [
			...prev,
			...acceptedFiles.filter((file) => !prev.some((f) => f.name === file.name)),
		])
	}, [])

	const { getRootProps, getInputProps, isFileDialogActive, isDragActive } = useDropzone({
		accept: {
			'application/zip': uploadType === 'books' ? ['.zip', '.cbz'] : ['.zip'],
			...(uploadType === 'books'
				? {
						'application/epub+zip': ['.epub'],
						'application/pdf': [],
						'application/vnd.comicbook+zip': ['.cbz'],
						'application/vnd.comicbook-rar': ['.cbr'],
						'application/vnd.rar': ['.rar', '.cbr'],
					}
				: {}),
		},
		maxSize: uploadConfig?.maxFileUploadSize ?? 0,
		multiple: uploadType === 'books',
		onDrop: handleDrop,
	})

	const handleOpenChanged = (isOpen: boolean) => {
		if (!isOpen) {
			setUploadType(undefined)
		}
	}

	const doUploadBooks = useCallback(
		async (params: UploadBooksInput) => {
			try {
				await uploadBooks({ input: params })
				toast.success('Successfully uploaded file(s)')
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload book(s)')
			}
		},
		[uploadBooks],
	)

	const enableSeries = useSeriesContextSafe() == null

	const doUploadSeries = useCallback(async () => {
		if (!enableSeries) return

		const firstFile = files?.at(0)
		if (!seriesDirName || !firstFile || !currentPath) return

		try {
			await uploadSeries({
				input: {
					upload: firstFile,
					placeAt: currentPath,
					libraryId: libraryID,
					seriesDirName,
				},
			})
			toast.success('Successfully uploaded series')
		} catch (error) {
			console.error(error)
			toast.error('Failed to upload series')
		}
	}, [uploadSeries, files, seriesDirName, currentPath, libraryID, enableSeries])

	const onUploadClicked = useCallback(async () => {
		// Return if files is empty
		if (!files) {
			return
		}

		// Current path needs to be set so we know where to put books
		if (currentPath == null) {
			return
		}

		// Handle books/series upload paths
		if (uploadType == 'books') {
			doUploadBooks({
				uploads: files,
				placeAt: currentPath,
				libraryId: libraryID,
			})
		} else {
			await doUploadSeries()
		}
	}, [files, currentPath, libraryID, uploadType, doUploadBooks, doUploadSeries])

	/**
	 * An effect to reset the state whenever uploadType becomes falsy (unset)
	 */
	useEffect(() => {
		if (!uploadType) {
			setFiles([])
			setSeriesDirName(undefined)
		}
	}, [uploadType])

	useEffect(() => {
		if (!enableSeries && uploadType === 'series') {
			setUploadType('books')
		}
	}, [enableSeries, uploadType])

	const isFocused = isFileDialogActive || isDragActive
	// Note: since the open state is contingent on the uploadType, when it is closed the uploadType is set to undefined.
	// This means that it will flash the wrong content. So, to prevent this, we will fallback to the previous
	// uploadType if the current one is undefined.
	const displayedType = useCurrentOrPrevious(uploadType)

	const renderDropContent = () => {
		if (isUploading) {
			return (
				<>
					<span className="flex items-center justify-center rounded-lg border border-edge bg-background-surface/80 p-4">
						<ProgressSpinner className="h-7 w-7" />
					</span>

					<div className="text-center">
						<Heading size="xs" className="flex items-center justify-center space-x-1">
							{t('common.uploading')}{' '}
							{uploadProgress > 0 && (
								<span className="text-foreground-muted">({uploadProgress}%)</span>
							)}
						</Heading>
						<div className="mt-2 flex h-4 w-64 items-center justify-center">
							<ProgressBar
								value={uploadProgress}
								isIndeterminate={uploadProgress === 0}
								className="h-1.5 rounded-lg"
								max={100}
								variant="primary"
							/>
						</div>
					</div>
				</>
			)
		} else {
			const Icon = displayedType === 'books' ? Book : FolderArchive
			return (
				<>
					<span className="flex items-center justify-center rounded-lg border border-edge bg-background-surface/80 p-4">
						<Icon className="h-8 w-8 text-foreground-muted" />
					</span>

					<div className="text-center">
						<Heading size="xs">{t(getKey(`dropzone.${displayedType}`))}</Heading>
						<Text variant="muted" size="sm">
							{t(getKey('dropzone.alt'))}
						</Text>
					</div>
				</>
			)
		}
	}

	return (
		<div>
			<UploadMenu onSelect={setUploadType} />

			<Dialog open={!!uploadType} onOpenChange={handleOpenChanged}>
				<Dialog.Content size="md">
					<Dialog.Header>
						<Dialog.Title>{t(getKey(`title.${displayedType}`))}</Dialog.Title>
						<Dialog.Description>
							{t(getKey(`description.${displayedType}`))}
							{displayedType === 'series' && (
								<span>
									{'. '}
									{t(getKey('seriesDisclaimer.0'))} <b>{t(getKey('seriesDisclaimer.1'))}</b>{' '}
									{t(getKey('seriesDisclaimer.2'))}
								</span>
							)}
						</Dialog.Description>
					</Dialog.Header>

					<div
						{...getRootProps()}
						className={cn(
							'flex shrink-0 flex-grow cursor-pointer flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-edge-subtle p-4 !outline-none ring-2 ring-transparent ring-offset-2 ring-offset-background-overlay',
							{ 'ring-edge-brand': isFocused },
						)}
					>
						<input {...getInputProps()} />

						{renderDropContent()}
					</div>

					{/* Conditionally render the series name input */}
					{uploadType === 'series' && (
						<div className="mt-2">
							<Heading size="xs">Series name</Heading>
							<Dialog.Description>
								This will be used as the name of the series directory. Your zip archive will be
								unpacked here.
							</Dialog.Description>
							<Input
								placeholder="Enter series name"
								value={seriesDirName}
								onChange={(e) => setSeriesDirName(e.target.value)}
								className="mt-2"
							/>
						</div>
					)}

					<Accordion type="single" collapsible>
						<Accordion.Item
							value="files"
							className="rounded-lg border-none bg-background-surface/80 px-4 py-2"
						>
							<Accordion.Trigger
								noUnderline
								asLabel
								disabled={!files.length}
								className={cn('py-2', { 'cursor-not-allowed opacity-50': !files.length })}
							>
								<span>
									{t(getKey('addedFiles'))}{' '}
									<span className="text-sm text-foreground-muted">({files.length})</span>
								</span>
							</Accordion.Trigger>

							<Accordion.Content>
								<div className="flex flex-col space-y-1">
									{files.map((file, idx) => (
										<div
											key={file.name}
											className="group flex items-center gap-x-2 rounded-lg border border-edge p-2"
										>
											<Text size="sm" className="line-clamp-1">
												{file.name}
											</Text>
											<Text size="sm" variant="muted" className="shrink-0">
												{formatBytes(file.size)}
											</Text>

											<div className="flex-1" />
											<Button
												variant="ghost"
												size="xs"
												className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
												onClick={() => {
													setFiles((prev) => prev.filter((_, i) => i !== idx))
												}}
											>
												{t('common.remove')}
											</Button>
										</div>
									))}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion>

					<Dialog.Footer>
						<Button variant="default" onClick={() => setUploadType(undefined)}>
							{t('common.cancel')}
						</Button>
						<Button variant="primary" disabled={!files.length} onClick={onUploadClicked}>
							{t('common.upload')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}

const LOCALE_BASE = 'fileExplorer.uploadModal'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
