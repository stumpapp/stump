import { Accordion, Button, cn, Dialog, Heading, Input, Text } from '@stump/components'
import { Book } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'

import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'
import { formatBytes } from '@/utils/format'

import UploadMenu from './UploadMenu'
import { useSDK } from '@stump/client'
import toast from 'react-hot-toast'
import { useLibraryContext } from '@/scenes/library/context'
import { useFileExplorerContext } from '../context'

// TODO(upload): make language dynamic according to the uploadType
// TODO(upload): add language to localization files
// TODO(upload): determine if using UploadButtons vs UploadMenu

export default function UploadModal() {
	const [uploadType, setUploadType] = useState<'books' | 'series'>()

	const [seriesDirName, setSeriesDirName] = useState<string | undefined>(undefined)
	const [files, setFiles] = useState<File[]>([])

	const { library } = useLibraryContext()
	const { currentPath } = useFileExplorerContext()
	const { sdk } = useSDK()

	const handleDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
		// TODO: check rejections and do sm
		console.debug({ acceptedFiles, rejections })
		setFiles((prev) => [
			...prev,
			...acceptedFiles.filter((file) => !prev.some((f) => f.name === file.name)),
		])
	}, [])

	const { getRootProps, getInputProps, isFileDialogActive, isDragActive } = useDropzone({
		accept: {
			'application/zip': [],
			'application/epub+zip': [],
			'application/pdf': [],
			'application/vnd.comicbook+zip': [],
			'application/vnd.comicbook-rar': [],
			'application/vnd.rar': [],
			'.cbz': [],
			'.cbr': [],
			'.epub': [],
		},
		// TODO(upload): pull this from the server
		maxSize: 20 * 1024 * 1024,
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
				await sdk.upload.uploadLibraryBooks(library.id, currentPath, files)
				toast.success('Successfully uploaded file(s)')
				setFiles([])
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
				await sdk.upload.uploadLibrarySeries(library.id, seriesDirName, files)
				toast.success('Successfully uploaded series')
				setFiles([])
				setSeriesDirName(undefined)
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload series')
			}
		}
	}

	const isFocused = isFileDialogActive || isDragActive
	// Note: since the open state is contigent on the uploadType, when it is closed the uploadType is set to undefined.
	// This means that it will flash the wrong content. So, to prevent this, we will fallback to the previous
	// uploadType if the current one is undefined.
	const displayedType = useCurrentOrPrevious(uploadType)

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

						<span className="flex items-center justify-center rounded-lg border border-edge bg-background-surface/80 p-4">
							<Book className="h-8 w-8 text-foreground-muted" />
						</span>

						<div className="text-center">
							<Heading size="xs">Drag and drop books here</Heading>
							<Text variant="muted" size="sm">
								Or click to browse your computer for books to upload
							</Text>
						</div>
					</div>

					{/* Conditionally render the series name input */}
					{uploadType === 'series' && (
						<div className="mt-2">
							<Heading size="xs">Series Name</Heading>
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
