import { Button, Dropdown } from '@stump/components'
import { ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

import { useSmartListContext } from '../../context'
import CreateOrUpdateTableView from './CreateOrUpdateTableView'

export default function ViewManagerDropdown() {
	const [managerState, setManagerState] = useState<'create' | 'update' | 'none'>('none')

	const { workingView, selectedView, workingViewIsDifferent } = useSmartListContext()

	return (
		<>
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
					<Dropdown.Item
						disabled={!selectedView || !workingViewIsDifferent}
						onClick={() => setManagerState('update')}
					>
						Update selected
					</Dropdown.Item>
					<Dropdown.Item disabled={!workingView} onClick={() => setManagerState('create')}>
						Create new view
					</Dropdown.Item>
				</Dropdown.Content>
			</Dropdown>

			<CreateOrUpdateTableView
				isCreating={managerState === 'create'}
				isOpen={managerState !== 'none'}
				onClose={() => setManagerState('none')}
			/>
		</>
	)
}
