import { Button, Drawer, IconButton, ToolTip } from '@stump/components'
import { Bolt } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function BookURLFilterDrawer() {
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
			<ToolTip content="Configure filters" size="sm">
				<Drawer.Trigger asChild>
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-300"
						pressEffect={false}
					>
						<Bolt className="h-4 w-4" />
					</IconButton>
				</Drawer.Trigger>
			</ToolTip>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>
							{/* {t(withLocaleKey('heading'))} */}
							Configure URL filters
						</Drawer.Title>
						<Drawer.Description>
							{/* {t(withLocaleKey('description'))} */}
							Adjust ordering, filtering, and pagination
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
