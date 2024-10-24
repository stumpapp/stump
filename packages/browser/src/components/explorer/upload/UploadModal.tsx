import { useMutation, useQuery, useSDK } from '@stump/client'
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
import { UploaderParams, UploadLibraryBooks, UploadLibrarySeries } from '@stump/sdk'
import { Book, FolderArchive } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

import Spinner from '@/components/Spinner'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'
import { useLibraryContext } from '@/scenes/library/context'
import { formatBytes } from '@/utils/format'

import { useFileExplorerContext } from '../context'
import UploadMenu from './UploadMenu'

// TODO(upload): make language dynamic according to the uploadType
// TODO(upload): add language to localization files
// TODO(upload): determine if using UploadButtons vs UploadMenu

export default function UploadModal() {
	const [uploadType, setUploadType] = useState<'books' | 'series'>()

	const [seriesDirName, setSeriesDirName] = useState<string | undefined>(undefined)
	const [files, setFiles] = useState<File[]>([])

	const { library } = useLibraryContext()
	const { currentPath, refetch } = useFileExplorerContext()
	const { sdk } = useSDK()
	const { data: config } = useQuery([sdk.upload.keys.config], () => sdk.upload.config(), {
		suspense: true,
	})

	const [uploadProgress, setUploadProgress] = useState(0)

	const { mutateAsync: uploadBooks, isLoading: isUploadingBooks } = useMutation(
		[sdk.upload.keys.uploadLibraryBooks],
		(params: UploaderParams<UploadLibraryBooks>) =>
			sdk.upload.uploadLibraryBooks({ ...params, onProgress: setUploadProgress }),
		{
			onSuccess: () => refetch(),
		},
	)
	const { mutateAsync: uploadSeries, isLoading: isUploadingSeries } = useMutation(
		[sdk.upload.keys.uploadLibrarySeries],
		(params: UploaderParams<UploadLibrarySeries>) =>
			sdk.upload.uploadLibrarySeries({ ...params, onProgress: setUploadProgress }),
		{
			onSuccess: () => refetch(),
		},
	)

	const isUploading = isUploadingBooks || isUploadingSeries

	const handleDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
		// TODO: check rejections and do sm
		console.debug({ acceptedFiles, rejections })
		acceptedFiles.forEach((file) => {
			console.log(file.type) // Log the MIME type of the accepted file
		})
		rejections.forEach((file) => {
			console.error(file.errors) // Log errors for rejected files
		})
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
		maxSize: config?.max_file_upload_size ?? 0,
		multiple: uploadType === 'books',
		onDrop: handleDrop,
	})

	const handleOpenChanged = (isOpen: boolean) => {
		if (!isOpen) {
			setUploadType(undefined)
		}
	}

	const onUploadClicked = async () => {
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
			try {
				await uploadBooks({ files, library_id: library.id, place_at: currentPath })
				toast.success('Successfully uploaded file(s)')
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload book(s)')
			}
		} else {
			// TODO - Series upload
			if (seriesDirName == undefined) {
				return
			}

			try {
				// TODO - Better enforcement of single file
				// We'll only take the first file for now
				let file = files[0]
				if (file == undefined) {
					return
				}

				await uploadSeries({
					file,
					library_id: library.id,
					series_dir_name: seriesDirName,
				})
				toast.success('Successfully uploaded series')
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload series')
			}
		}
	}

	/**
	 * An effect to reset the state whenever uploadType becomes falsy (unset)
	 */
	useEffect(() => {
		if (!uploadType) {
			setFiles([])
			setSeriesDirName(undefined)
		}
	}, [uploadType])

	const isFocused = isFileDialogActive || isDragActive
	// Note: since the open state is contigent on the uploadType, when it is closed the uploadType is set to undefined.
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
							Uploading
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
			return (
				<>
					<span className="flex items-center justify-center rounded-lg border border-edge bg-background-surface/80 p-4">
						{displayedType === 'books' ? (
							<Book className="h-8 w-8 text-foreground-muted" />
						) : (
							<FolderArchive className="h-8 w-8 text-foreground-muted" />
						)}
					</span>

					<div className="text-center">
						<Heading size="xs">
							{displayedType === 'books'
								? 'Drag and drop books here'
								: 'Drag and drop a zip file here'}
						</Heading>
						<Text variant="muted" size="sm">
							Or click to browse your computer for books to upload
						</Text>
					</div>
				</>
			)
		}
	}

	// If we wind up using UploadButtons, we would just have each one set the uploadType accordingly
	return (
		<div>
			<UploadMenu onSelect={setUploadType} />

			<Dialog open={!!uploadType} onOpenChange={handleOpenChanged}>
				<Dialog.Content size="md">
					<Dialog.Header>
						<Dialog.Title>
							{displayedType === 'books' ? 'Upload books' : 'Upload series'}
						</Dialog.Title>
						<Dialog.Description>
							{displayedType === 'books'
								? 'Add books directly to the current path in the file explorer.'
								: 'Add a series directly to the current path in the file explorer. '}
							{displayedType === 'series' && (
								<span>
									It must be a <b>zipped file</b> containing the folder which should be the series,
									with all the books inside
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
							<Heading size="xs">Series Name</Heading>
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
									Added files{' '}
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
											<Text size="sm">{file.name}</Text>
											<Text size="sm" variant="muted">
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
												Remove
											</Button>
										</div>
									))}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion>

					<Dialog.Footer>
						<Button variant="default" onClick={() => setUploadType(undefined)}>
							Cancel
						</Button>
						<Button variant="primary" disabled={!files.length} onClick={onUploadClicked}>
							Upload
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
