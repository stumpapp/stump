import { Button, DropdownMenu } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useAppContext } from '@/context'

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

	const canUpload = useMemo(() => checkPermission(UserPermission.UploadFile), [checkPermission])

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
					<Button size="md" className="border border-edge">
						{label || t(withLocaleKey('label'))}
						<ChevronDown className="ml-2 h-4 w-4" />
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
