import { Tag } from '@stump/client';
import { Badge } from '@chakra-ui/react';

interface Props {
	tag: Tag;
}

export default function TagComponent({ tag }: Props) {
	return (
		<Badge textTransform="none" rounded="md" px={1.5} py={0.5} colorScheme="brand">
			{tag.name}
		</Badge>
	);
}
