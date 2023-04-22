import { Button, IconButton, Sheet, Text } from '@stump/components'
import { List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePreviousDifferent } from 'rooks'

import { useEpubReaderContext } from '../context'

export default function TocDrawer() {
	const { readerMeta, controls } = useEpubReaderContext()
	const { toc } = readerMeta.bookMeta || {}

	const location = useLocation()
	const previousLocation = usePreviousDifferent(location)

	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		if (previousLocation?.pathname !== location.pathname && isOpen) {
			setIsOpen(false)
		}
	}, [location, previousLocation, isOpen])

	function handleSelect(href: string) {
		controls.onLinkClick(href)
		setIsOpen(false)
	}

	return (
		<>
			<Sheet
				open={isOpen}
				onClose={() => setIsOpen(false)}
				onOpen={() => setIsOpen(true)}
				title="Table of Contents"
				description="Click on a chapter to jump to it."
				trigger={
					<IconButton variant="ghost" rounded="none" size="xs">
						<List className="h-5 w-5" />
					</IconButton>
				}
				size="lg"
			>
				<div className="flex max-h-full flex-col gap-1 overflow-y-auto px-2 pt-4 scrollbar-hide">
					{toc?.map((item, i) => (
						<Button
							key={item.label}
							className="justify-start text-left"
							onClick={() => handleSelect(item.content)}
							variant={i % 2 === 0 ? 'subtle' : 'ghost'}
						>
							<Text>{item.label}</Text>
						</Button>
					))}
				</div>
			</Sheet>
		</>
	)
}
