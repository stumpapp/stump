import { jobApi, jobQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { Alert, Button } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import React from 'react'
import { toast } from 'react-hot-toast'

import { useAppContext } from '@/context'

import { useJobSettingsContext } from './context.ts'

export default function DeleteAllSection() {
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()
	const { jobs } = useJobSettingsContext()

	if (!isServerOwner) return null

	/**
	 * Delete all job reports from the database
	 */
	const handleClearHistory = async () => {
		try {
			await jobApi.deleteAllJobs()
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			} else {
				console.error(error)
				toast.error('An unknown error occurred')
			}
		} finally {
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
		}
	}

	return (
		<Alert level="error" rounded="sm" icon={AlertTriangle}>
			<Alert.Content className="flex flex-col gap-3 md:flex-row">
				{t('settingsScene.server/jobs.sections.history.table.deleteAllMessage')}
				<Button
					title={`${t(
						`settingsScene.server/jobs.sections.history.table.${
							!jobs.length ? 'deleteAllConfirmButtonTitleNoJobs' : 'deleteAllConfirmButtonTitle'
						}`,
					)}`}
					variant="danger"
					onClick={handleClearHistory}
					disabled={!isServerOwner || !jobs.length}
					className="flex-shrink-0"
				>
					{t('settingsScene.server/jobs.sections.history.table.deleteAllConfirmButton')}
				</Button>
			</Alert.Content>
		</Alert>
	)
}
