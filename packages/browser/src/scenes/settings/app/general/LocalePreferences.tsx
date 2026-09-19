import { Alert, AlertDescription, AlertTitle, Button, ButtonOrLink } from '@stump/components'
import { dismissAlert } from '@stump/components/alert'
import { useLocaleContext } from '@stump/i18n'
import { Languages } from 'lucide-react'
import { useState } from 'react'

import LocaleSelector from './LocaleSelector'

export default function LocalePreferences() {
	const { t } = useLocaleContext()

	// just to trigger a rerender since alert doesn't subscribe to localStorage changes
	// its fine
	const [didDismiss, setDidDismiss] = useState(false)

	return (
		<div className="gap-y-4 flex flex-col">
			<Alert
				variant="info"
				className="relative"
				showX={false}
				dismissible
				id="contribute-to-translations"
				key={`contribute-to-translations-${didDismiss}`}
			>
				<Languages />
				<AlertTitle>{t(getKey('contribute'))}</AlertTitle>
				<AlertDescription className="flex flex-row items-start justify-between">
					{t(getKey('contributeIfAble'))}
				</AlertDescription>

				<div className="md:right-10 gap-x-2 md:absolute ml-4 mt-2 flex flex-row self-center">
					<Button
						variant="ghost"
						className="hover:bg-black/15"
						onClick={() => {
							dismissAlert('contribute-to-translations')
							setDidDismiss(true)
						}}
					>
						{t(getKey('noThanks'))}
					</Button>

					<ButtonOrLink
						href="https://hosted.weblate.org/engage/stump/"
						target="_blank"
						rel="noopener noreferrer"
						variant="outline"
					>
						{t(getKey('contribute'))}
					</ButtonOrLink>
				</div>
			</Alert>

			<LocaleSelector />
		</div>
	)
}

const getKey = (key: string) => `settingsScene.app/account.sections.language.${key}`
