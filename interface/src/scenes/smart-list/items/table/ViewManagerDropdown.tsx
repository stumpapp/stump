import { Button, Dropdown } from '@stump/components'
import { ChevronDown } from 'lucide-react'
import React from 'react'

import { useSmartListContext } from '../../context'

export default function ViewManagerDropdown() {
	const { workingView, selectedView, workingViewIsDifferent } = useSmartListContext()

	return (
		<Dropdown>
			<Dropdown.Trigger asChild>
				<Button
					disabled={!workingView}
					className="h-10 shrink-0 divide-opacity-30 bg-background-200/50 px-0 py-0 hover:bg-background-200/80 data-[state=open]:bg-background-200"
				>
					<div className="inline-flex h-full items-center divide-x divide-edge">
						<span className="flex h-full items-center px-3 py-2">Save</span>
						<span className="flex h-full items-center  px-1 py-2">
							<ChevronDown className="h-4 w-4" />
						</span>
					</div>
				</Button>
			</Dropdown.Trigger>
			<Dropdown.Content align="end">
				<Dropdown.Item disabled={!selectedView || !workingViewIsDifferent}>
					Update selected
				</Dropdown.Item>
				<Dropdown.Item>Create new view</Dropdown.Item>
			</Dropdown.Content>
		</Dropdown>
	)
}
