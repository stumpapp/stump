import { Progress, Text, useColorModeValue } from '@chakra-ui/react'
import type { Media } from '@stump/client'
import { prefetchMedia } from '@stump/client'
import { getMediaThumbnail } from '@stump/client/api'

import pluralizeStat from '../../utils/pluralize'
import { prefetchMediaPage } from '../../utils/prefetch'
import Card, { CardBody, CardFooter } from '../Card'

export type MediaCardProps = {
	media: Media
	// changes the card link to go directly to a reader, rather than overview page
	readingLink?: boolean
	// Used on the home page to set the height/width of the card for the sliding flex layout
	fixed?: boolean
}

export default function MediaCard({ media, readingLink, fixed }: MediaCardProps) {
	const pagesLeft = media.current_page ? media.pages - media.current_page : undefined
	const link = readingLink
		? `/books/${media.id}/pages/${media.current_page ?? 1}`
		: `/books/${media.id}`

	function handleMouseOver() {
		prefetchMedia(media.id)

		if (media.current_page) {
			const _img = prefetchMediaPage(media.id, media.current_page)
		}
	}

	return (
		<Card
			variant={fixed ? 'fixedImage' : 'image'}
			to={link}
			onMouseEnter={handleMouseOver}
			title={readingLink ? `Continue reading ${media.name}` : media.name}
		>
			<CardBody
				p={0}
				className="relative aspect-[2/3] bg-center bg-cover"
				style={{
					// TODO: figure out how to do fallback ONLY on error... url('/assets/fallbacks/image-file.svg')
					backgroundImage: `url('${getMediaThumbnail(media.id)}')`,
				}}
			>
				{!!pagesLeft && pagesLeft !== media.pages && (
					<div className="absolute bottom-0 left-0 w-full">
						<Progress
							shadow="xl"
							value={media.pages - Number(pagesLeft)}
							max={media.pages}
							w="full"
							size="xs"
							colorScheme="orange"
						/>
					</div>
				)}
			</CardBody>
			<CardFooter p={1} className="flex flex-col gap-1">
				{/* TODO: figure out how to make this not look like shit with 2 lines */}
				<Text fontSize="sm" as="h3" fontWeight="semibold" className="[hyphens:auto]" noOfLines={1}>
					{media.name}
				</Text>

				<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')} noOfLines={1}>
					{pluralizeStat('pages', media.pages)}
				</Text>
			</CardFooter>
		</Card>
	)
}
