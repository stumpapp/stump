import { useGraphQLMutation, useGraphQLUploadMutation } from '@stump/client'
import {
	Avatar,
	Button,
	cn,
	cx,
	Dialog,
	DropdownMenu,
	IconButton,
	Label,
	Text,
	useBoolean,
} from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Edit, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { useUser } from '@/stores'

const LOCALE_BASE = 'settingsScene.app/account.sections.account.avatarPicker'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const uploadMutation = graphql(`
	mutation UploadUserAvatar($file: Upload!) {
		uploadUserAvatar(upload: $file) {
			id
			avatarUrl
		}
	}
`)

const deleteMutation = graphql(`
	mutation DeleteUserAvatar {
		deleteUserAvatar {
			id
			avatarUrl
		}
	}
`)

export default function AvatarPicker() {
	const { t } = useLocaleContext()
	const { user, setUser } = useUser()
	const [isModalOpen, { on, off }] = useBoolean(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [filePreview, setFilePreview] = useState<string | null>(null)

	const { mutateAsync: uploadAvatar } = useGraphQLUploadMutation(uploadMutation, {
		onSuccess: ({ uploadUserAvatar: updated }) => {
			if (user) {
				setUser({ ...user, ...updated })
			}
		},
	})

	const { mutateAsync: deleteAvatar } = useGraphQLMutation(deleteMutation, {
		onSuccess: ({ deleteUserAvatar: updated }) => {
			if (user) {
				setUser({ ...user, ...updated })
			}
		},
	})

	const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
		if (fileRejections.length > 0) {
			const firstError = fileRejections[0]?.errors[0]
			const isTooLarge = firstError?.code === 'file-too-large'
			toast.error(isTooLarge ? 'File too large (20MB max)' : firstError?.message || 'Unknown error')
		} else if (acceptedFiles.length !== 1 || !acceptedFiles[0]) {
			toast.error(acceptedFiles.length ? 'Only 1 file allowed' : 'No files provided')
		} else {
			const file = acceptedFiles[0]
			setSelectedFile(file)
			setFilePreview(URL.createObjectURL(file))
		}
	}, [])

	const { getRootProps, getInputProps, isDragActive, isFileDialogActive } = useDropzone({
		accept: { 'image/*': [] },
		maxSize: 20 * 1024 * 1024,
		onDrop,
	})

	const isDropzoneFocused = isDragActive || isFileDialogActive

	const handleModalStateChange = (nowOpen: boolean) => {
		if (!nowOpen) off()
	}

	const handleConfirm = async () => {
		if (!selectedFile) return
		try {
			await uploadAvatar({ file: selectedFile })
			off()
		} catch (error) {
			console.error(error)
			toast.error(t(getKey('uploadFailed')), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	const handleRemove = async () => {
		try {
			// @ts-expect-error: my abstraction doesn't like `never` variables its fine
			await deleteAvatar()
		} catch (error) {
			console.error(error)
			toast.error(t(getKey('removeFailed')), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	useEffect(() => {
		return () => {
			if (filePreview) URL.revokeObjectURL(filePreview)
		}
	}, [filePreview])

	useEffect(() => {
		if (!isModalOpen) {
			setSelectedFile(null)
			setFilePreview(null)
		}
	}, [isModalOpen])

	const imageUrl = user?.avatarUrl

	return (
		<>
			<Dialog open={isModalOpen} onOpenChange={handleModalStateChange}>
				<Dialog.Content size="md">
					<Dialog.Header>
						<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
						<Dialog.Description>{t(getKey('subtitle'))}</Dialog.Description>
						<Dialog.Close onClick={off} />
					</Dialog.Header>

					<div className="gap-y-4 py-2 scrollbar-hide flex h-[300px] flex-col">
						<div className="flex items-center justify-center">
							<div className={cx('relative h-[100px]', { 'h-[100px]': filePreview })}>
								{filePreview && (
									<>
										<div className="top-0 right-0 absolute flex items-center justify-center">
											<IconButton
												title={t(getKey('removeSelection'))}
												size="xs"
												className="h-6 w-6 rounded-full"
												onClick={() => {
													setSelectedFile(null)
													setFilePreview(null)
												}}
											>
												<X className="h-3 w-3" />
											</IconButton>
										</div>
										<div className="flex h-full items-center justify-center overflow-hidden rounded-full">
											<img src={filePreview} className="h-full object-scale-down" />
										</div>
									</>
								)}
								{!filePreview && (
									<div className="flex h-[100px] w-[100px] rounded-full border border-edge" />
								)}
							</div>
						</div>

						<div
							{...getRootProps()}
							className={cn(
								'gap-2 rounded-md p-4 flex h-full cursor-pointer items-center justify-center border border-dashed border-edge-subtle ring-2 ring-transparent ring-offset-2 ring-offset-background',
								{ 'ring-edge-brand': isDropzoneFocused },
							)}
						>
							<input {...getInputProps()} />
							<Text variant="muted">{t(getKey('dropzone'))}</Text>
						</div>
					</div>

					<Dialog.Footer>
						<Button onClick={off}>{t('common.cancel')}</Button>
						<Button variant="primary" onClick={handleConfirm} disabled={!selectedFile}>
							{t('common.upload')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			<div className="gap-2.5 flex flex-col self-center">
				<Label>{t(getKey('label'))}</Label>
				<span className="relative">
					<Avatar
						className="h-40 w-40 text-2xl!"
						src={imageUrl || undefined}
						fallback={user?.username}
						fallbackColor="brand"
						fallbackWrapperClassName="text-3xl font-medium tracking-widest"
					/>
					<span className="bottom-0 left-0 translate-x-2 absolute block transform">
						<DropdownMenu
							align="start"
							contentWrapperClassName="w-18"
							trigger={
								<Button variant="subtle-dark" size="xs" className="px-2 py-1.5 border border-edge">
									<Edit className="mr-2 h-3 w-3" />
									{t('common.edit')}
								</Button>
							}
							groups={[
								{
									items: [
										{
											label: t(getKey('changeImage')),
											onClick: on,
										},
										{
											disabled: !imageUrl,
											label: t(getKey('removeImage')),
											onClick: handleRemove,
										},
									],
								},
							]}
						/>
					</span>
				</span>
			</div>
		</>
	)
}
