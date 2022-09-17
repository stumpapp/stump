import { Box, Text } from '@chakra-ui/react';
import toast from 'react-hot-toast';

export function LogStats() {
	// const { data: logMeta } = useQuery(['getLogFileMeta'], () =>
	// 	getLogFileMeta().then((res) => res.data),
	// );
	// const { mutateAsync } = useMutation(['clearStumpLogs'], clearLogFile);
	// function handleClearLogs() {
	// 	toast
	// 		.promise(mutateAsync(), {
	// 			loading: 'Clearing...',
	// 			success: 'Cleared logs!',
	// 			error: 'Error clearing logs.',
	// 		})
	// 		.then(() => client.invalidateQueries(['getLogFileMeta']));
	// }
	// return (
	// 	<Box>
	// 		<Text>{formatBytes(logMeta?.size)}</Text>
	// 		<Button onClick={handleClearLogs}>Delete logs</Button>
	// 	</Box>
	// );
}

export default function ServerStats() {
	return <div>{/* <LogStats /> */}</div>;
}
