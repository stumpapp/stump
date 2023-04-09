import { Button, IconButton, Sheet, Text } from '@stump/components'
import type { EpubContent } from '@stump/types'
import { ListBullets } from 'phosphor-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePreviousDifferent } from 'rooks'

// FIXME: I briefly worked on this file to remove chakra, but it needs a LOT of work.
// it is very ugly. stinky doody code, too.

interface EpubTocDrawerProps {
	isOpen: boolean
	onClose(): void
	onOpen(): void

	// TODO: TYPE THESE, has to work both with epubjs and streaming epub engine (not built yet)
	toc: EpubContent[]
	onSelect(tocItem: string): void
}

export default function EpubTocDrawer({
	isOpen,
	onOpen,
	onClose,
	toc,
	onSelect,
}: EpubTocDrawerProps) {
	const location = useLocation()
	const previousLocation = usePreviousDifferent(location)

	useEffect(() => {
		if (previousLocation?.pathname !== location.pathname && isOpen) {
			onClose()
		}
	}, [location, previousLocation, isOpen, onClose])

	function handleSelect(href: string) {
		onSelect(href)
		onClose()
	}

	return (
		<>
			<Sheet
				open={isOpen}
				onClose={onClose}
				onOpen={onOpen}
				title="Table of Contents"
				description="Click on a chapter to jump to it."
				trigger={
					<IconButton variant="ghost">
						<ListBullets className="text-lg" weight="regular" />
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
