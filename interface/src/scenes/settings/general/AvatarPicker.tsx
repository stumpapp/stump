import {
	Avatar,
	Button,
	Dialog,
	DropdownMenu,
	Input,
	Label,
	Text,
	useBoolean,
} from '@stump/components'
import { Edit } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useLocaleContext } from '../../../i18n'

type Props = {
	imageUrl?: string | null
	fallback?: string
	onImageChange: (url?: string) => void
}

export default function AvatarPicker({ imageUrl, fallback, onImageChange }: Props) {
	const { t } = useLocaleContext()
	const [newUrl, setNewUrl] = useState('')
	const [isModalOpen, { on, off }] = useBoolean(false)

	const handleModalStateChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			off()
		}
	}

	const handleConfirm = () => {
		onImageChange(newUrl || undefined)
		off()
	}

	useEffect(() => {
		if (!imageUrl) {
			setNewUrl('')
		}
	}, [imageUrl])

	return (
		<>
			<Dialog open={isModalOpen} onOpenChange={handleModalStateChange}>
				<Dialog.Content size="md">
					<Dialog.Header>
						<Dialog.Title>
							{t('settingsScene.general.profileForm.avatarPicker.heading')}
						</Dialog.Title>
						<Dialog.Description>
							{t('settingsScene.general.profileForm.avatarPicker.subtitle')}
						</Dialog.Description>
						<Dialog.Close onClick={off} />
					</Dialog.Header>
					<Text variant="muted" size="xs">
						{t('settingsScene.general.profileForm.avatarPicker.preview')}
					</Text>
					<div className="flex flex-col items-center gap-4 p-2 md:flex-row md:justify-between">
						<Input
							variant="primary"
							label={t('settingsScene.general.profileForm.avatarPicker.labels.imageUrl')}
							value={newUrl}
							onChange={(e) => setNewUrl(e.target.value)}
						/>
						<Avatar src={newUrl} className="h-20 w-20 md:h-28 md:w-28" />
					</div>

					<Dialog.Footer>
						<Button onClick={off}>
							{t('settingsScene.general.profileForm.avatarPicker.buttons.cancel')}
						</Button>
						<Button variant="primary" onClick={handleConfirm}>
							{t('settingsScene.general.profileForm.avatarPicker.buttons.confirm')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			<div className="flex flex-col gap-2.5 self-center">
				<Label>{t('settingsScene.general.profileForm.avatarPicker.labels.customAvatar')}</Label>
				<span className="relative">
					<Avatar
						className="h-40 w-40 !text-2xl"
						src={imageUrl || undefined}
						fallback={fallback}
						fallbackColor="brand"
						fallbackWrapperClassName="text-3xl font-medium tracking-widest"
					/>
					<span className="absolute bottom-0 left-0 block translate-x-2 transform">
						<DropdownMenu
							align="start"
							contentWrapperClassName="w-18"
							trigger={
								<Button
									variant="subtle-dark"
									size="xs"
									className="border border-gray-75 px-2 py-1.5 dark:border-gray-850"
								>
									<Edit className="mr-2 h-3 w-3" />
									{t('settingsScene.general.profileForm.avatarPicker.buttons.edit')}
								</Button>
							}
							groups={[
								{
									items: [
										{
											label: t(
												'settingsScene.general.profileForm.avatarPicker.buttons.changeImage',
											),
											onClick: on,
										},
										{
											disabled: !imageUrl && !newUrl,
											label: t(
												'settingsScene.general.profileForm.avatarPicker.buttons.removeImage',
											),
											onClick: () => onImageChange(),
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
