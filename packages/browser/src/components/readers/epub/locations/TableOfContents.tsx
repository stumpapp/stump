import { Text } from '@stump/components'
import { useCallback } from 'react'

import { EpubContent, useEpubReaderContext } from '../context'

type Props = {
	onLocationChanged?: () => void
}

type ItemProps = {
	item: EpubContent
	handleSelect: (href: string) => void
}

function TableOfContentsItem({ item, handleSelect }: ItemProps) {
	return (
		<>
			<button
				className="justify-start px-1 py-1.5 text-left hover:bg-background-surface"
				onClick={() => handleSelect(item.content)}
			>
				<Text className="line-clamp-1">{item.label}</Text>
			</button>
			{item.children.map((childItem) => (
				<TableOfContentsItem key={childItem.label} item={childItem} handleSelect={handleSelect} />
			))}
		</>
	)
}

export default function TableOfContents({ onLocationChanged }: Props) {
	const { readerMeta, controls } = useEpubReaderContext()
	const { toc } = readerMeta.bookMeta || {}

	const handleSelect = useCallback(
		(href: string) => {
			controls.onLinkClick(href)
			onLocationChanged?.()
		},
		[controls, onLocationChanged],
	)

	return (
		<div
			className="flex max-h-full flex-col divide-y divide-edge overflow-y-auto px-2 pt-4 scrollbar-hide"
			aria-label="Table of Contents"
		>
			{toc?.map((item) => (
				<TableOfContentsItem key={item.label} item={item} handleSelect={handleSelect} />
			))}
		</div>
	)
}
