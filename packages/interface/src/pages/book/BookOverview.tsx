import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react'
import { useMedia, useTopBarStore } from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

import MediaCard from '../../components/media/MediaCard'
import TagList from '../../components/tags/TagList'
import Link from '../../ui/Link'
import ReadMore from '../../ui/ReadMore'
import { formatBytes } from '../../utils/format'

// TODO: looks shit on mobile
export default function BookOverview() {
	const { id } = useParams()

	if (!id) {
		throw new Error('Book id is required for this route.')
	}

	const { media, isLoading } = useMedia(id)
	const { setBackwardsUrl } = useTopBarStore()

	useEffect(() => {
		if (media?.series) {
			setBackwardsUrl(`/libraries/${media.series.id}`)
		}

		return () => {
			setBackwardsUrl()
		}
	}, [media, setBackwardsUrl])

	const textColor = useColorModeValue('gray.700', 'gray.400')

	if (isLoading) {
		return <div>Loading...</div>
	} else if (!media) {
		throw new Error('Media not found')
	}

	return (
		<>
			<Helmet>
				<title>Stump | {media.name ?? ''}</title>
			</Helmet>
			<div className="p-4 h-full w-full flex flex-col space-y-3">
				<div className="flex items-start space-x-4">
					<MediaCard media={media} readingLink />
					<div className="flex-1 flex flex-col space-y-4 h-full">
						<ReadMore text={media.description} />
						{media.series && <Link to={`/series/${media.series.id}`}>{media.series.name}</Link>}

						{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
						<TagList tags={media.tags} />
					</div>
				</div>

				<div className="flex flex-col space-y-2 text-sm pt-2">
					<Heading fontSize="md">File Information</Heading>
					<Box className="flex space-x-4" color={textColor}>
						<Text>Size: {formatBytes(media.size)}</Text>
						<Text>Kind: {media.extension.toUpperCase()}</Text>
					</Box>
					<Text color={textColor}>Checksum: {media.checksum}</Text>
					<Text color={textColor}>Path: {media.path}</Text>
				</div>

				{/* TODO: series slider, cursor after current? */}

				{/* <div className="pt-6">
					<Heading fontSize="md">Up Next in Series</Heading>
					TODO: make me BOB
				</div> */}
			</div>
		</>
	)
}
