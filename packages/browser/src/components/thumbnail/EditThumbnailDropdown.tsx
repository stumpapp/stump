import { Button, DropdownMenu } from '@stump/components'
import { Edit } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { useAppContext } from '@/context'
import { useLocaleContext } from '@/i18n'

import UploadImageModal from './UploadImageModal'

const LOCALE_BASE_KEY = 'thumbnailDropdown'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

type Props = {
	label?: string
	onChooseSelector: () => void
	onUploadImage: (file: File) => Promise<void>
}

export default function EditThumbnailDropdown({ label, onChooseSelector, onUploadImage }: Props) {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canUpload = useMemo(() => checkPermission('file:upload'), [checkPermission])

	const [showUploadModal, setShowUploadModal] = useState(false)

	const handleUploadImage = async (file: File) => {
		await onUploadImage(file)
		setShowUploadModal(false)
	}

	return (
		<>
			<DropdownMenu
				align="start"
				contentWrapperClassName="w-18"
				trigger={
					<Button variant="subtle-dark" size="xs" className="border border-edge px-2 py-1.5">
						<Edit className="mr-2 h-3 w-3" />
						{label || t(withLocaleKey('label'))}
					</Button>
				}
				groups={[
					{
						items: [
							{
								label: t(withLocaleKey('options.selectFromBooks')),
								onClick: onChooseSelector,
							},
							...(canUpload
								? [
										{
											label: t(withLocaleKey('options.uploadImage')),
											onClick: () => setShowUploadModal(true),
										},
									]
								: []),
						],
					},
				]}
			/>

			<UploadImageModal
				isOpen={showUploadModal}
				onClose={() => setShowUploadModal(false)}
				onUploadImage={handleUploadImage}
			/>
		</>
	)
}
