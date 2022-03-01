import React from 'react';
import {
	Heading,
	HStack,
	Progress,
	Spacer,
	Text,
	useColorModeValue,
	VStack,
} from '@chakra-ui/react';
import { getMediaThumbnail } from '~api/query/media';
import MoreLink from '~components/ui/MoreLink';

interface Props {
	media: MediaWithProgress[];
}
export default function KeepReading({ media }: Props) {
	if (!media.length) {
		return <div>TODO</div>;
	}

	return (
		<VStack shadow="base" rounded="md" bg={useColorModeValue('gray.200', 'gray.800')} p={6}>
			<HStack w="full" justifyContent="space-between">
				<Heading as="h3" size="md" mb={4}>
					Keep Reading
				</Heading>

				<MoreLink href="#" />
			</HStack>

			{media.map((m) => (
				<HStack h="full" w="full" key={m.id} alignItems="start" spacing={4}>
					<img
						src={getMediaThumbnail(m.id)}
						alt={`${m.name} thumbnail`}
						className="h-20 w-auto object-scale-down rounded-md"
					/>

					<VStack h="full" w="full" alignItems="start">
						<Heading as="h3" size="xs">
							{m.name}
						</Heading>

						<HStack w="full" justifyContent="space-between" alignItems="center">
							<Text size="xs">Author</Text>
							<Text size="xs">
								{m.current_page}/{m.pages}
							</Text>
						</HStack>

						<Spacer />

						<Progress
							size="sm"
							rounded="md"
							w="full"
							colorScheme="brand"
							value={((m.current_page ?? 0) / m.pages) * 100}
						/>
					</VStack>
				</HStack>
			))}
		</VStack>
	);
}
