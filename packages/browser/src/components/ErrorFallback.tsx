import { Button, ButtonOrLink, useBodyLock } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ExternalLink } from 'lucide-react'
import { FallbackProps } from 'react-error-boundary'
import { toast } from 'sonner'

import { copyTextToClipboard } from '../utils/misc'

// TODO: take in platform?
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	useBodyLock()
	const { t } = useLocaleContext()

	function copyErrorStack() {
		if (error.stack) {
			copyTextToClipboard(error.stack).then(() => {
				toast.success(t('errorScene.copiedDetails'))
			})
		}
	}

	return (
		<div
			data-tauri-drag-region
			className="flex h-full w-full flex-col items-center justify-center overflow-hidden"
		>
			<img
				src="/assets/svg/bomb.svg"
				alt={t('errorScene.imageAlt')}
				className="max-h-64 sm:inline-block mx-auto hidden w-1/2 shrink-0 object-scale-down"
			/>
			<div className="max-w-sm sm:max-w-md md:max-w-xl">
				<div className="text-left">
					<h1 className="text-4xl font-semibold text-foreground">
						{t('errorScene.criticalHeading')}
					</h1>
					<p className="mt-1.5 text-lg text-foreground">
						{error.message || t('errorScene.emptyMessage')}
					</p>
				</div>
				<div className="gap-3 pt-3 flex w-full items-center">
					<ButtonOrLink
						onClick={resetErrorBoundary}
						title={t('errorScene.buttons.goHomeTitle')}
						forceAnchor
						href="/"
					>
						{t('errorScene.buttons.goHome')}
					</ButtonOrLink>
					<ButtonOrLink
						title={t('errorScene.buttons.reportTitle')}
						href="https://github.com/stumpapp/stump/issues/new/choose"
						target="_blank"
					>
						{t('errorScene.buttons.report')} <ExternalLink className="ml-2 h-4 w-4" />
					</ButtonOrLink>
					{error.stack && (
						<Button
							title={t('errorScene.buttons.copyTitle')}
							onClick={copyErrorStack}
							variant="ghost"
						>
							{t('errorScene.buttons.copy')}
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
