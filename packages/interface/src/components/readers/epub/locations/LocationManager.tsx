import { Dialog, Tabs, Text } from '@stump/components'
import { List } from 'lucide-react'
import React, { useCallback, useState } from 'react'

import ControlButton from '../controls/ControlButton'
import Bookmarks from './Bookmarks'
import TableOfContents from './TableOfContents'

type LocationTab = 'contents' | 'annotations' | 'bookmarks'

export default function LocationManager() {
	const [isOpen, setIsOpen] = useState(false)
	const [activeTab, setActiveTab] = useState<LocationTab>('contents')

	const handleClose = () => setIsOpen(false)
	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			handleClose()
		}
	}
	const handleTabChange = (tab: LocationTab) => setActiveTab(tab)
	const handleLocationChanged = useCallback(() => {
		if (isOpen) {
			setIsOpen(false)
		}
	}, [isOpen])

	const renderTabContent = () => {
		if (activeTab === 'contents') {
			return <TableOfContents onLocationChanged={handleLocationChanged} />
		} else if (activeTab === 'annotations') {
			return null
		} else if (activeTab === 'bookmarks') {
			return <Bookmarks onLocationChanged={handleLocationChanged} />
		}

		return null
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild>
				<ControlButton title="Location manager">
					<List className="h-4 w-4" onClick={() => setIsOpen(true)} />
				</ControlButton>
			</Dialog.Trigger>
			<Dialog.Content size="md" className="h-[400px] dark:bg-gray-1000">
				<Dialog.Header>
					<Tabs value={activeTab} variant="primary" activeOnHover>
						<Tabs.List className="border-none">
							<Tabs.Trigger value="contents" asChild onClick={() => handleTabChange('contents')}>
								<Text className="cursor-pointer truncate">Contents</Text>
							</Tabs.Trigger>

							<Tabs.Trigger value="bookmarks" asChild onClick={() => handleTabChange('bookmarks')}>
								<Text className="cursor-pointer truncate">Bookmarks</Text>
							</Tabs.Trigger>

							<Tabs.Trigger
								value="annotations"
								asChild
								onClick={() => handleTabChange('annotations')}
								disabled
							>
								<Text className="cursor-pointer truncate">Annotations</Text>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs>

					<Dialog.Close onClick={handleClose} />
				</Dialog.Header>

				<div className="h-full overflow-y-scroll scrollbar-hide">{renderTabContent()}</div>
			</Dialog.Content>
		</Dialog>
	)
}
