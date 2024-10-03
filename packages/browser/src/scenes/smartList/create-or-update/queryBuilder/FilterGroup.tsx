import { Button, Card, IconButton, ToolTip } from '@stump/components'
import { MinusCircle } from 'lucide-react'
import React, { useCallback } from 'react'
import { useFieldArray } from 'react-hook-form'

import { FilterGroupSchema, FilterSchema, SmartListFormSchema } from '../form/newSchema'
import {} from '../form/schema'
import { FieldSelector } from './FieldSelector'
import OperatorSelect from './OperatorSelect'

type Props = {
	idx: number
	group: FilterGroupSchema
}
export default function FilterGroup({ idx, group }: Props) {
	const { remove: removeGroup } = useFieldArray<SmartListFormSchema>({
		name: 'filters.groups',
	})
	const { append, remove } = useFieldArray<SmartListFormSchema>({
		name: `filters.groups.${idx}.filters`,
	})

	return (
		<Card className="ml-4">
			<div className=" flex flex-col">
				{!group.filters.length && (
					<div className="p-4">
						<FieldSelector groupIdx={idx} idx={0} />
					</div>
				)}

				{group.filters.map((filter, filterIndex) => {
					return (
						<div key={filterIndex} className="group/filter relative flex items-center p-4">
							<div className="flex flex-1 flex-wrap items-center space-x-4">
								<FieldSelector groupIdx={idx} idx={filterIndex} />
								{filter.field && (
									<>
										<span className="text-foreground-muted">is</span>
										<OperatorSelect groupIdx={idx} idx={filterIndex} />
									</>
								)}
							</div>

							<div className="flex h-full w-12 shrink-0 items-center justify-end transition-opacity duration-200 group-hover/filter:opacity-100 md:opacity-0">
								<ToolTip content="Delete filter" align="end">
									<IconButton
										size="xs"
										className="text-foreground-muted transition-all duration-200 hover:text-fill-danger"
										onClick={() => remove(filterIndex)}
										disabled={group.filters.length === 1}
									>
										<MinusCircle className="h-4 w-4" />
									</IconButton>
								</ToolTip>
							</div>
						</div>
					)
				})}
			</div>

			<div className="flex h-12 items-center space-x-4 bg-background-surface/45 px-4">
				<Button variant="ghost" size="sm" newYork onClick={() => append({} as FilterSchema)}>
					Add filter
				</Button>

				<Button
					variant="ghost"
					size="sm"
					newYork
					className="hover:bg-fill-danger-secondary"
					onClick={() => removeGroup(idx)}
				>
					Delete group
				</Button>
			</div>
		</Card>
	)
}
