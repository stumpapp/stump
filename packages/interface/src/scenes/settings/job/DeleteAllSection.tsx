import { jobApi, jobQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { Alert, Button, Text } from '@stump/components'
import React from 'react'
import { toast } from 'react-hot-toast'

import { useAppContext } from '../../../context.ts'
import { useLocaleContext } from '../../../i18n'
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
		<Alert level="error" rounded="sm" className="dark:bg-red-300/25">
			<Alert.Content>
				<Text className="flex-shrink pb-2 dark:text-white md:mr-2 md:pb-0">
					{t('settingsScene.jobs.historyTable.deleteAllMessage')}
				</Text>
				<Button
					title={`${t(
						`settingsScene.jobs.historyTable.${
							!jobs.length ? 'deleteAllConfirmButtonTitleNoJobs' : 'deleteAllConfirmButtonTitle'
						}`,
					)}`}
					variant="danger"
					onClick={handleClearHistory}
					disabled={!isServerOwner || !jobs.length}
					className="flex-shrink-0"
				>
					{t('settingsScene.jobs.historyTable.deleteAllConfirmButton')}
				</Button>
			</Alert.Content>
		</Alert>
	)
}
