import { Accordion, Alert, Button, Drawer, IconButton, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Construction, Filter } from 'lucide-react'
import React from 'react'

import { useSmartListContext } from '../../context'

const LOCALE_BASE_KEY = 'userSmartListScene.itemsScene.actionHeader.filterDrawer'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function FilterBottomDrawer() {
	const { t } = useLocaleContext()
	const {
		list: { filters },
	} = useSmartListContext()

	return (
		<Drawer>
			<ToolTip content="Adjust filter">
				<Drawer.Trigger asChild>
					<IconButton variant="ghost">
						<Filter className="h-4 w-4 text-foreground-muted" />
					</IconButton>
				</Drawer.Trigger>
			</ToolTip>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>{t(withLocaleKey('heading'))}</Drawer.Title>
						<Drawer.Description>{t(withLocaleKey('description'))}</Drawer.Description>
					</Drawer.Header>
				</div>

				<div className="max-h-[70vh] w-full overflow-y-auto">
					<div className="mx-auto w-full max-w-2xl">
						<div className="flex flex-col gap-y-6 p-4 pb-0">
							<Accordion type="single" collapsible>
								<Accordion.Item value="raw_filters" className="border-none">
									<Accordion.Trigger noUnderline asLabel>
										{t(withLocaleKey('rawData.heading'))}
									</Accordion.Trigger>
									<Accordion.Content className="-mt-2">
										<Text size="sm" variant="muted">
											{t(withLocaleKey('rawData.description'))}
										</Text>
										<div className="mt-1.5 rounded-sm bg-background-surface p-4">
											<pre className="text-xs text-foreground-subtle">
												{JSON.stringify(filters, null, 2)}
											</pre>
										</div>
									</Accordion.Content>
								</Accordion.Item>
							</Accordion>

							<Alert level="warning" icon={Construction} rounded="sm">
								<Alert.Content>
									<span>This functionality is not yet implemented</span>
								</Alert.Content>
							</Alert>
						</div>
					</div>
				</div>

				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Footer className="w-full flex-row">
						<Button className="w-full">{t(withLocaleKey('buttons.save'))}</Button>
						<Drawer.Close asChild>
							<Button variant="outline" className="w-full">
								{t(withLocaleKey('buttons.cancel'))}
							</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
