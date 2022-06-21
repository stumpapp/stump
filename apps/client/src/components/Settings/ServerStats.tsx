import { Box, Text } from '@chakra-ui/react';
import React from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from 'react-query';
import client from '~api/client';
import { clearLogFile } from '~api/mutation/log';
import { getLogFileMeta } from '~api/query/log';
import Button from '~components/ui/Button';
import { formatBytes } from '~util/format';

export function LogStats() {
	const { data: logMeta } = useQuery('getLogFileMeta', () =>
		getLogFileMeta().then((res) => res.data),
	);

	const { mutateAsync } = useMutation('clearStumpLogs', clearLogFile);

	function handleClearLogs() {
		toast
			.promise(mutateAsync(), {
				loading: 'Clearing...',
				success: 'Cleared logs!',
				error: 'Error clearing logs.',
			})
			.then(() => client.invalidateQueries('getLogFileMeta'));
	}

	return (
		<Box>
			<Text>{formatBytes(logMeta?.size)}</Text>
			<Button onClick={handleClearLogs}>Delete logs</Button>
		</Box>
	);
}

export default function ServerStats() {
	return (
		<div>
			<LogStats />
		</div>
	);
}
