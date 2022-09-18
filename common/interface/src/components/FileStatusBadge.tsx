import { Badge } from '@chakra-ui/react';
import { FileStatus } from '@stump/core';

export default function FileStatusBadge({ status }: { status: FileStatus }) {
	const color = (() => {
		if (status === 'READY') {
			return 'green';
		} else if (status === 'MISSING') {
			return 'yellow';
		} else if (status === 'ERROR') {
			return 'red';
		}
		return 'gray';
	})();

	return (
		<Badge textTransform="none" bg={color} rounded="md">
			{status}
		</Badge>
	);
}
