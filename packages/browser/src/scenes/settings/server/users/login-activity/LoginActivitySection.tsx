import { Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import ClearLoginActivityConfirmation from './ClearActivityConfirmation'
import LoginActivityTable from './LoginActivityTable'

export default function LoginActivitySection() {
	const { t } = useTranslate()

	return (
		<div data-testid="login-activity-section" className="gap-y-4 flex flex-col">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t('settingsScene.server/users.loginActivity.heading')}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/users.loginActivity.description')}
					</Text>
				</div>

				<ClearLoginActivityConfirmation />
			</div>

			<div className="gap-3 flex flex-col">
				<Suspense>
					<LoginActivityTable />
				</Suspense>
			</div>
		</div>
	)
}
