import { useEmailerSendHistoryQuery } from '@stump/client'
import { Drawer, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import React, { useState } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import EmailerSendHistoryTable from './EmailerSendHistoryTable'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

type Props = {
	emailerId: number
	lastUsedAt: dayjs.Dayjs
}

export default function EmailerSendHistory({ emailerId, lastUsedAt }: Props) {
	const { t } = useLocaleContext()
	const { sendHistory } = useEmailerSendHistoryQuery({
		emailerId,
		params: { include_sent_by: true },
		suspense: true,
	})

	const [drawerOpen, setDrawerOpen] = useState(false)

	const renderHistory = () => {
		if (!sendHistory.length) {
			return (
				<GenericEmptyState
					title={t(getLocaleKey('emptyHeading'))}
					subtitle={t(getLocaleKey('emptySubtitle'))}
					leftAlign
					containerClassName="mx-auto w-full max-w-2xl p-4"
				/>
			)
		} else {
			return <EmailerSendHistoryTable records={sendHistory} />
		}
	}

	return (
		<>
			<div className="flex">
				<ToolTip content={lastUsedAt.format('LLL')} align="start" size="sm">
					<Text
						size="sm"
						variant="muted"
						className="cursor-pointer hover:underline"
						onClick={() => setDrawerOpen(!drawerOpen)}
					>
						{lastUsedAt.fromNow()}
					</Text>
				</ToolTip>
			</div>

			{/* TODO: clear the history option */}
			<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenChange={setDrawerOpen}>
				<Drawer.Content>
					<div className="mx-auto w-full max-w-2xl">
						<Drawer.Header>
							<Drawer.Title>{t(getLocaleKey('heading'))}</Drawer.Title>
						</Drawer.Header>
					</div>

					<div className="max-h-[70vh] w-full overflow-y-auto">{renderHistory()}</div>
				</Drawer.Content>
			</Drawer>
		</>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.emailers.list.sendHistory'
const getLocaleKey = (key: string) => `${LOCALE_BASE}.${key}`
