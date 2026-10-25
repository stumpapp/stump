import { ButtonOrLink, Text } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

export default function FourOhFour() {
	const { t } = useTranslate()

	return (
		<div
			data-tauri-drag-region
			className="max-w-sm gap-6 sm:max-w-md md:max-w-lg mx-auto flex h-full w-full flex-col items-center justify-center"
		>
			<div className="gap-1.5 flex flex-col text-left">
				<h1 className="text-5xl font-semibold text-foreground">404</h1>
				<Text size="lg">{t('notFound.description')}</Text>
				<div className="mt-6 gap-2 flex items-center">
					<ButtonOrLink href="/">{t('common.goHome')}</ButtonOrLink>
					<ButtonOrLink
						variant="outline"
						href="https://github.com/stumpapp/stump/issues"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('notFound.reportIssue')}
					</ButtonOrLink>
				</div>
			</div>
		</div>
	)
}
