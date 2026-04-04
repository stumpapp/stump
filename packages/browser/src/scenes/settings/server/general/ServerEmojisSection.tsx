import { useGraphQLMutation, useGraphQLUploadMutation, useSuspenseGraphQL } from '@stump/client'
import { Button, cn, ConfirmationModal, Heading, Input, ScrollArea, Text } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { useAppContext } from '@/context'

const query = graphql(`
	query ServerEmojisSection {
		customEmojis {
			id
			name
			isAnimated
			url
		}
	}
`)

const uploadMutation = graphql(`
	mutation ServerEmojisSectionUploadEmoji($input: CreateCustomEmojiInput!, $upload: Upload!) {
		uploadCustomEmoji(input: $input, upload: $upload) {
			id
			name
			isAnimated
			url
		}
	}
`)

const updateMutation = graphql(`
	mutation ServerEmojisSectionRenameEmoji($id: ID!, $input: UpdateCustomEmojiInput!) {
		updateCustomEmoji(id: $id, input: $input) {
			id
			name
			isAnimated
			url
		}
	}
`)

const deleteMutation = graphql(`
	mutation ServerEmojisSectionDeleteEmoji($id: ID!) {
		deleteCustomEmoji(id: $id)
	}
`)

export default function ServerEmojisSection() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canManageEmojis = useMemo(
		() => checkPermission(UserPermission.UploadFile),
		[checkPermission],
	)

	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [emojiName, setEmojiName] = useState('')
	const [isAnimated, setIsAnimated] = useState(false)

	const [renamingId, setRenamingId] = useState<number | null>(null)
	const [renameValue, setRenameValue] = useState('')
	const [deletingEmoji, setDeletingEmoji] = useState<{ id: number; name: string } | null>(null)

	const { data, refetch } = useSuspenseGraphQL(query, ['customEmojis'])

	const { mutateAsync: uploadEmoji, isPending: isUploading } = useGraphQLUploadMutation(
		uploadMutation,
		{
			onSuccess: async () => {
				await refetch()
			},
		},
	)

	const { mutateAsync: renameEmoji, isPending: isRenaming } = useGraphQLMutation(updateMutation, {
		onSuccess: async () => {
			await refetch()
		},
	})

	const { mutateAsync: deleteEmoji, isPending: isDeleting } = useGraphQLMutation(deleteMutation, {
		onSuccess: async () => {
			await refetch()
		},
	})

	const emojis = data?.customEmojis ?? []

	const onDrop = useCallback(
		(acceptedFiles: File[], fileRejections: FileRejection[]) => {
			if (fileRejections.length > 0) {
				const firstError = fileRejections[0]?.errors[0]
				toast.error(firstError?.message ?? t('common.fileUpload.someFilesRejected'))
				return
			}

			if (acceptedFiles.length !== 1) {
				toast.error(t('common.fileUpload.tooManyFiles'))
				return
			}

			const file = acceptedFiles.at(0)
			if (!file) {
				toast.error(t('common.fileUpload.noValidFiles'))
				return
			}

			const inferredName = file.name
				.replace(/\.[^/.]+$/, '')
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '_')

			setSelectedFile(file)
			setEmojiName((prev) => prev || inferredName)
			setIsAnimated(file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif'))
			setPreviewUrl((prev) => {
				if (prev) {
					URL.revokeObjectURL(prev)
				}
				return URL.createObjectURL(file)
			})
		},
		[t],
	)

	const { getRootProps, getInputProps, isDragActive, isFileDialogActive } = useDropzone({
		accept: {
			'image/*': [],
		},
		maxFiles: 1,
		multiple: false,
		onDrop,
	})

	const clearSelection = () => {
		setSelectedFile(null)
		setEmojiName('')
		setIsAnimated(false)
		setPreviewUrl((prev) => {
			if (prev) {
				URL.revokeObjectURL(prev)
			}
			return null
		})
	}

	const handleUpload = async () => {
		if (!selectedFile) return

		const name = sanitizedName(emojiName)
		if (!name) {
			toast.error(t('customEmojis.invalidName'))
			return
		}

		try {
			await uploadEmoji({
				input: {
					name,
					isAnimated,
				},
				upload: selectedFile,
			})
			toast.success(t(getKey('uploadSuccess')))
			clearSelection()
		} catch (error) {
			console.error(error)
			toast.error(t(getKey('uploadError')), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	const startRename = (id: number, name: string) => {
		setRenamingId(id)
		setRenameValue(name)
	}

	const cancelRename = () => {
		setRenamingId(null)
		setRenameValue('')
	}

	const confirmRename = async () => {
		if (renamingId == null) return

		const name = sanitizedName(renameValue)
		if (!name) {
			toast.error('Please provide an emoji name')
			return
		}

		try {
			await renameEmoji({
				id: String(renamingId),
				input: { name },
			})
			toast.success(t('customEmojis.renameSuccess'))
			cancelRename()
		} catch (error) {
			console.error(error)
			toast.error(t('customEmojis.renameError'), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	const confirmDelete = async () => {
		if (!deletingEmoji) return

		try {
			await deleteEmoji({ id: String(deletingEmoji.id) })
			toast.success(t('customEmojis.deleteSuccess'))
			setDeletingEmoji(null)
		} catch (error) {
			console.error(error)
			toast.error(t('customEmojis.deleteError'), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	const isDropzoneFocused = isDragActive || isFileDialogActive

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('title'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			{canManageEmojis && (
				<div className="rounded-lg p-3 border border-edge">
					<div
						{...getRootProps()}
						className={cn(
							'gap-2 rounded-md p-4 flex cursor-pointer items-center justify-center border border-dashed border-edge-subtle ring-2 ring-transparent ring-offset-2 ring-offset-background',
							{ 'ring-edge-brand': isDropzoneFocused },
						)}
					>
						<input {...getInputProps()} />
						<ImagePlus className="h-4 w-4 text-foreground-muted" />
						<Text size="sm" variant="muted">
							{t(getKey('dropzone'))}
						</Text>
					</div>

					<div className="mt-3 gap-3 flex flex-row items-end">
						<div className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-edge bg-background-surface">
							{previewUrl && (
								<img
									src={previewUrl}
									alt={emojiName || 'emoji preview'}
									className="h-full w-full object-cover"
								/>
							)}
						</div>

						<div className="flex-1">
							<Input
								label={t(getKey('input.label'))}
								placeholder={t(getKey('input.placeholder'))}
								value={emojiName}
								onChange={(event) => setEmojiName(event.target.value)}
							/>
						</div>

						<div className="gap-2 flex items-center">
							<Button
								variant="default"
								disabled={!selectedFile || isUploading}
								onClick={clearSelection}
							>
								{t('common.cancel')}
							</Button>
							<Button
								variant="primary"
								disabled={!selectedFile || !emojiName.trim() || isUploading}
								onClick={handleUpload}
							>
								{isUploading ? t('common.uploadingEllipsis') : t('common.upload')}
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className="rounded-lg border border-edge">
				{emojis.length === 0 && (
					<div className="p-4">
						<Text size="sm" variant="muted">
							{t(getKey('noCustomEmojis'))}
						</Text>
					</div>
				)}

				{emojis.length > 0 && (
					<ScrollArea className={cn({ 'h-96': emojis.length > 8 })}>
						<div className="divide-y divide-edge">
							{emojis.map((emoji) => (
								<div key={emoji.id} className="gap-3 p-3 flex items-center">
									<img src={emoji.url} alt={emoji.name} className="h-8 w-8 rounded object-cover" />

									{renamingId === emoji.id ? (
										<div className="gap-2 flex flex-1 items-center">
											<Input
												value={renameValue}
												onChange={(event) => setRenameValue(event.target.value)}
												placeholder="emoji_name"
											/>
											<Button
												variant="primary"
												size="sm"
												disabled={isRenaming}
												onClick={confirmRename}
											>
												{t('common.save')}
											</Button>
											<Button variant="default" size="sm" onClick={cancelRename}>
												{t('common.cancel')}
											</Button>
										</div>
									) : (
										<>
											<div className="rounded-lg p-0.5 bg-background-surface">
												<Text size="sm" className="font-mono">
													:{emoji.name}:
												</Text>
											</div>

											<div className="flex-1" />

											{canManageEmojis && (
												<div className="gap-1 flex items-center">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => startRename(emoji.id, emoji.name)}
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setDeletingEmoji({ id: emoji.id, name: emoji.name })}
													>
														<Trash2 className="text-foreground-destructive h-3.5 w-3.5" />
													</Button>
												</div>
											)}
										</>
									)}
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</div>

			<ConfirmationModal
				title={t(getKey('deleteModal.title'))}
				description={t(getKey('deleteModal.description'))}
				confirmText={t('common.delete')}
				confirmVariant="danger"
				isOpen={!!deletingEmoji}
				onClose={() => setDeletingEmoji(null)}
				onConfirm={confirmDelete}
				confirmIsLoading={isDeleting}
				trigger={null}
			/>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.server/general.sections.customEmojis'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

const sanitizedName = (name: string) => {
	const trimmed = name.trim()
	// Note: The system will handle colons
	return trimmed.replace(/^:+|:+$/g, '')
}
