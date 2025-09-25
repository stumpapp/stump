import { Dialog, Tabs } from '@stump/components'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'
import ReaderSettings from './ReaderSettings'

export default function SettingsDialog() {
	const { book, currentPage } = useImageBaseReaderContext()

	const [modality, setModality] = useState<'book' | 'global'>('book')

	return (
		<Dialog>
			<Dialog.Trigger asChild>
				<ControlButton>
					<Settings2 className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content size="md" className="z-[101] flex flex-col gap-4 bg-background-surface">
				<Tabs
					value={modality}
					defaultValue="book"
					onValueChange={(value) => setModality(value as 'book' | 'global')}
				>
					<Tabs.List>
						<Tabs.Trigger value="book">Book</Tabs.Trigger>
						<Tabs.Trigger value="global">Global</Tabs.Trigger>
					</Tabs.List>
				</Tabs>

				<ReaderSettings
					forBook={modality === 'book' ? book.id : undefined}
					currentPage={modality === 'book' ? currentPage : undefined}
				/>
			</Dialog.Content>
		</Dialog>
	)
}
