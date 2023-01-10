import { HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { clearLogFile, getLogFileMeta } from '@stump/api'
import { queryClient, useMutation, useQuery, useStumpVersion } from '@stump/client'
import dayjs from 'dayjs'
import { useState } from 'react'
import toast from 'react-hot-toast'

import ConfirmationModal from '../../ui/ConfirmationModal'
import Link from '../../ui/Link'
import { formatBytes } from '../../utils/format'
import SettingsSection from './SettingsSection'

export function LogStats() {
	const [open, setOpen] = useState(false)
	const { data: logMeta } = useQuery(['getLogFileMeta'], () =>
		getLogFileMeta().then((res) => res.data),
	)
	const { mutateAsync } = useMutation(['clearStumpLogs'], clearLogFile)
	function handleClearLogs() {
		toast
			.promise(mutateAsync(), {
				error: 'Error clearing logs.',
				loading: 'Clearing...',
				success: 'Cleared logs!',
			})
			.then(() => queryClient.invalidateQueries(['getLogFileMeta']))
	}

	return (
		<HStack fontSize="sm" spacing={2} color={useColorModeValue('gray.700', 'gray.300')}>
			<Text>Log file size: {formatBytes(logMeta?.size)}</Text>
			<ConfirmationModal isOpen={open} onConfirm={handleClearLogs} onClose={() => setOpen(false)}>
				<Text>Are you sure you&rsquo;d like to clear your logfile?</Text>
			</ConfirmationModal>
		</HStack>
	)
}

export function ServerVersion() {
	const stump = useStumpVersion()
	const textColor = useColorModeValue('gray.700', 'gray.300')

	const commitLink = (rev: string | null) => {
		if (!rev) {
			return 'https://github.com/aaronleopold/stump'
		}

		return `https://www.github.com/aaronleopold/stump/commit/${rev}`
	}

	if (!stump) {
		return null
	}

	return (
		<HStack fontSize="sm" spacing={2} color={textColor}>
			<Link href={commitLink(stump.rev)} isExternal>
				Commit Hash: {stump.rev}
			</Link>
			<Text>Compile Date: {dayjs(stump?.compile_time).format('MMMM D, YYYY')}</Text>
		</HStack>
	)
}

// TODO: server uptime...
export default function ServerInformation() {
	return (
		<SettingsSection title="Server Meta" subtitle="General information about your Stump server">
			<div>
				<ServerVersion />
				<LogStats />
			</div>
		</SettingsSection>
	)
}
