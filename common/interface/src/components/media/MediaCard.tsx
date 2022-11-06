import type { Media } from '@stump/client';
import { prefetchMedia } from '@stump/client';
import { getMediaThumbnail } from '@stump/client/api';
import { Text, useBoolean, useColorModeValue } from '@chakra-ui/react';
import Card, { CardBody, CardFooter } from '../Card';
import pluralizeStat from '../../utils/pluralize';

export type MediaCardProps = {
	media: Media;
	readingLink?: boolean;
};

export default function MediaCard({ media, readingLink }: MediaCardProps) {
	const [isFallback, { on }] = useBoolean(false);

	const link = readingLink
		? `/books/${media.id}/pages/${media.current_page ?? 1}`
		: `/books/${media.id}`;

	return (
		<Card variant="image" to={link} onMouseEnter={() => prefetchMedia(media.id)}>
			<CardBody p={0} className="aspect-[2/3]">
				<img
					className="aspect-[2/3] object-cover min-h-full"
					src={isFallback ? '/fallbacks/image-file.svg' : getMediaThumbnail(media.id)}
					onError={on}
				/>
			</CardBody>
			<CardFooter p={1} className="flex flex-col gap-1">
				<Text fontSize="sm" as="h3" fontWeight="semibold" className="[hyphens:auto]" noOfLines={1}>
					{media.name}
				</Text>

				<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')} noOfLines={1}>
					{pluralizeStat('pages', media.pages)}
					{media.current_page && ` • Page ${media.current_page}`}
				</Text>
			</CardFooter>
		</Card>
	);
}
