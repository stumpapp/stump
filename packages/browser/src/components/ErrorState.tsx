import { Button } from '@stump/components'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'

import { copyTextToClipboard } from '../utils/misc'
import { OwlEmptyState } from './Owl'

type Props = {
	/**
	 * A short title describing what failed, e.g. "Failed to Load Reading Stats"
	 */
	title: string
	/**
	 * The error which occurred, used for the message and copyable details
	 */
	error?: Error | null
	/**
	 * An optional callback to retry whatever failed
	 */
	onRetry?: () => void
}

/**
 * A generic, full-width error state for a section of a page that failed (e.g., a query),
 * as opposed to the {@link ErrorFallback} which is used for critical errors
 */
export function ErrorState({ title, error, onRetry }: Props) {
	const { t, translate } = useTranslate()

	useEffect(() => {
		if (error) console.error(error)
	}, [error])

	const details = error?.stack || error?.message

	function copyErrorDetails() {
		if (details) {
			copyTextToClipboard(details).then(() => {
				toast.success(t('errorScene.copiedDetails'))
			})
		}
	}

	return (
		<OwlEmptyState
			owl="error"
			title={title}
			description={error?.message || t('errorScene.emptyMessage')}
			actions={
				<>
					{onRetry && <Button onClick={onRetry}>{translate('shared.common.tryAgain')}</Button>}
					{details && (
						<Button
							title={t('errorScene.buttons.copyTitle')}
							variant="ghost"
							onClick={copyErrorDetails}
						>
							{t('errorScene.buttons.copy')}
						</Button>
					)}
				</>
			}
		/>
	)
}
