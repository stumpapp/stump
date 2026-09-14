import { Dialog, Tabs } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'
import ReaderSettings from './ReaderSettings'

export default function SettingsDialog() {
	const { t } = useLocaleContext()
	const { book, currentPage } = useImageBaseReaderContext()

	const [modality, setModality] = useState<'book' | 'global'>('book')

	return (
		<Dialog>
			<Dialog.Trigger asChild>
				<ControlButton>
					<Settings2 className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content
				size="md"
				className="pt-0 z-101 scrollbar-hide flex max-h-[95vh] flex-col overflow-y-auto"
			>
				<div className="top-0 -mx-6 px-6 pt-6 pb-4 backdrop-blur-md sticky z-10 bg-dialog/80">
					<Dialog.Header>
						<Tabs
							value={modality}
							defaultValue="book"
							onValueChange={(value) => setModality(value as 'book' | 'global')}
						>
							<Tabs.List>
								<Tabs.Trigger value="book">
									{t('imageReader.settingsDialog.scopes.book')}
								</Tabs.Trigger>
								<Tabs.Trigger value="global">
									{t('imageReader.settingsDialog.scopes.global')}
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs>

						<Dialog.Close />
					</Dialog.Header>
				</div>

				<ReaderSettings
					forBook={modality === 'book' ? book.id : undefined}
					currentPage={modality === 'book' ? currentPage : undefined}
				/>
			</Dialog.Content>
		</Dialog>
	)
}
