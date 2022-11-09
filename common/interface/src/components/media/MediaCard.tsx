import type { Media } from '@stump/client';
import { prefetchMedia } from '@stump/client';
import { getMediaThumbnail } from '@stump/client/api';
import { Progress, Text, useBoolean, useColorModeValue } from '@chakra-ui/react';
import Card, { CardBody, CardFooter } from '../Card';
import pluralizeStat from '../../utils/pluralize';

export type MediaCardProps = {
	media: Media;
	readingLink?: boolean;
	fixed?: boolean;
};

export default function MediaCard({ media, readingLink, fixed }: MediaCardProps) {
	const [isFallback, { on }] = useBoolean(false);

	const pagesLeft = media.current_page ? media.pages - media.current_page : undefined;
	const link = readingLink
		? `/books/${media.id}/pages/${media.current_page ?? 1}`
		: `/books/${media.id}`;

	return (
		<Card
			variant={fixed ? 'fixedImage' : 'image'}
			to={link}
			onMouseEnter={() => prefetchMedia(media.id)}
		>
			<CardBody p={0} className="relative">
				<img
					className="aspect-[2/3] object-cover"
					src={isFallback ? '/fallbacks/image-file.svg' : getMediaThumbnail(media.id)}
					onError={on}
				/>

				{!!pagesLeft && pagesLeft !== media.pages && (
					<div className="absolute bottom-0 left-0 w-full">
						<Progress
							shadow="sm"
							value={media.pages - Number(pagesLeft)}
							max={media.pages}
							w="full"
							size="xs"
							colorScheme="brand"
						/>
					</div>
				)}
			</CardBody>
			<CardFooter p={1} className="flex flex-col gap-1">
				<Text fontSize="sm" as="h3" fontWeight="semibold" className="[hyphens:auto]" noOfLines={1}>
					{media.name}
				</Text>

				<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')} noOfLines={1}>
					{pluralizeStat('pages', media.pages)}
					{/* {pagesLeft && ` • ${pagesLeft} pages left`} */}
				</Text>
			</CardFooter>
		</Card>
	);
}
