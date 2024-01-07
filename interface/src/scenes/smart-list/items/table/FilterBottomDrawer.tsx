import { Accordion, Button, Drawer, IconButton, Text, ToolTip } from '@stump/components'
import { Filter } from 'lucide-react'
import React from 'react'

import { useSmartListContext } from '../../context'

// TODO: bottom drawer
export default function FilterBottomDrawer() {
	const {
		list: { filters },
	} = useSmartListContext()

	return (
		<Drawer>
			<ToolTip content="Adjust filter">
				<Drawer.Trigger asChild>
					<IconButton variant="ghost">
						<Filter className="h-4 w-4 text-muted" />
					</IconButton>
				</Drawer.Trigger>
			</ToolTip>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>Smart list filters</Drawer.Title>
						<Drawer.Description>Change the filters for this viewing session</Drawer.Description>
					</Drawer.Header>
					<div className="flex flex-col gap-y-6 p-4 pb-0">
						<Accordion type="single" collapsible>
							<Accordion.Item value="raw_filters" className="border-none">
								<Accordion.Trigger noUnderline asLabel>
									Raw filter data
								</Accordion.Trigger>
								<Accordion.Content className="-mt-2">
									<Text size="sm" variant="muted">
										This is how Stump will process the filters
									</Text>
									<div className="mt-1.5 rounded-sm bg-background-200 p-4">
										<pre className="text-xs text-contrast-200">
											{JSON.stringify(filters, null, 2)}
										</pre>
									</div>
								</Accordion.Content>
							</Accordion.Item>
						</Accordion>

						<div>TODO: filter form</div>
					</div>
					<Drawer.Footer>
						<Button>Submit</Button>
						<Drawer.Close asChild>
							<Button variant="outline">Cancel</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
