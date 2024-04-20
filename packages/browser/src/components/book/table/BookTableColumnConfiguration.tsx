import { Button, Drawer, IconButton, ToolTip } from '@stump/components'
import { Columns } from 'lucide-react'
import React, { useEffect, useState } from 'react'

// TODO: implement bottom drawer for column configuration

export default function BookTableColumnConfiguration() {
	const [isOpen, setIsOpen] = useState(false)

	// Note: this is a rather gross workaround to prevent height: auto from being set on the body
	// github.com/emilkowalski/vaul/issues/324
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => {
				document.body.style.height = '100%'
			}, 200)
		}
	}, [isOpen])

	return (
		<Drawer open={isOpen} onOpenChange={setIsOpen}>
			<ToolTip content="Configure columns" size="sm" align="start">
				<Drawer.Trigger asChild>
					<IconButton size="xs" variant="ghost" pressEffect={false}>
						<Columns className="h-4 w-4" />
					</IconButton>
				</Drawer.Trigger>
			</ToolTip>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>
							{/* {t(withLocaleKey('heading'))} */}
							Configure columns
						</Drawer.Title>
						<Drawer.Description>
							{/* {t(withLocaleKey('description'))} */}
							Adjust which columns are displayed in book-exploration tables
						</Drawer.Description>
					</Drawer.Header>
				</div>

				<div className="max-h-[70vh] w-full overflow-y-auto">
					<div className="mx-auto w-full max-w-2xl">
						<div className="flex flex-col gap-y-6 p-4 pb-0">Content!</div>
					</div>
				</div>

				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Footer className="w-full flex-row">
						<Button className="w-full">
							{/* {t(withLocaleKey('buttons.save'))} */}
							Save
						</Button>
						<Drawer.Close asChild>
							<Button variant="outline" className="w-full">
								{/* {t(withLocaleKey('buttons.cancel'))} */}
								Cancel
							</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
