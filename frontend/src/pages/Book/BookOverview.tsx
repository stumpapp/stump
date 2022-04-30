import { Box } from '@chakra-ui/react';
import React from 'react';
import { useQuery } from 'react-query';
import { Link, useParams } from 'react-router-dom';
import { getMediaById, getMediaThumbnail } from '~api/query/media';

export default function BookOverview() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Book id is required for this route.');
	}

	const { isLoading, data: media } = useQuery('getMediaById', {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!media) {
		throw new Error('Media not found');
	}

	return (
		<div className="p-4 flex">
			<Box
				as={Link}
				px={1.5}
				shadow="base"
				bg="gray.50"
				border="1.5px solid"
				borderColor="transparent"
				_dark={{ bg: 'gray.750' }}
				_hover={{
					borderColor: 'brand.500',
				}}
				rounded="md"
				to={`/books/${media.id}/pages/${media.currentPage ?? 1}`}
			>
				<img
					// Note: Comic book ratio is -> 663 : 1024
					className="h-96 w-[15.54rem] object-cover"
					src={getMediaThumbnail(media.id)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
				/>
			</Box>
		</div>
	);
}
