import { Button, cx, Dialog, IconButton, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

const LOCALE_BASE_KEY = 'thumbnailDropdown.uploadImage'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

type Props = {
	isOpen: boolean
	onClose: () => void
	onUploadImage: (file: File) => Promise<void>
}

export default function UploadImageModal({ isOpen, onClose, onUploadImage }: Props) {
	const { t } = useLocaleContext()

	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [filePreview, setFilePreview] = useState<string | null>(null)

	const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
		if (fileRejections.length > 0) {
			console.error(fileRejections)
			const firstError = fileRejections[0]?.errors[0]
			const isTooLarge = firstError?.code === 'file-too-large'
			toast.error(isTooLarge ? 'File too large (20MB max)' : firstError?.message || 'Unknown error')
		} else if (acceptedFiles.length > 1 || !acceptedFiles.length) {
			toast.error(acceptedFiles.length ? 'Only 1 file allowed' : 'No files provided')
		} else if (acceptedFiles[0]) {
			const file = acceptedFiles[0]

			setSelectedFile(file)
			setFilePreview(URL.createObjectURL(file))
		}
	}, [])

	const { getRootProps, getInputProps } = useDropzone({
		accept: {
			'image/*': [],
		},
		// TODO: support custom max size for server
		maxSize: 20 * 1024 * 1024, // 20MB
		onDrop,
	})

	const handleConfirm = async () => {
		if (selectedFile) {
			try {
				await onUploadImage(selectedFile)
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload image')
			}
		}
	}

	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			onClose()
		}
	}

	useEffect(() => {
		return () => {
			if (filePreview) {
				URL.revokeObjectURL(filePreview)
			}
		}
	}, [filePreview])

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>
				<div className="flex h-[300px] flex-col gap-y-2 py-2 scrollbar-hide">
					<div className="flex h-[100px] items-center justify-center">
						<div className={cx('relative', { 'h-[100px]': filePreview })}>
							{filePreview && (
								<>
									<div className="absolute -right-2 -top-2 flex items-center justify-center">
										<IconButton
											title={t(withLocaleKey('remove'))}
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
									<img src={filePreview} className="h-full object-scale-down" />
								</>
							)}
						</div>
						{!filePreview && (
							<Text variant="muted" className="text-center">
								{t(withLocaleKey('emptyState'))}
							</Text>
						)}
					</div>

					<div
						{...getRootProps()}
						className="flex shrink-0 flex-grow flex-col items-center justify-center border border-dashed border-edge p-4"
					>
						<input {...getInputProps()} />
						<Text variant="muted">{t(withLocaleKey('prompt'))}</Text>
					</div>
				</div>

				<Dialog.Footer>
					<Button variant="default" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleConfirm} disabled={!selectedFile}>
						Confirm selection
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
