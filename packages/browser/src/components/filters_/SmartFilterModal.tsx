import { zodResolver } from '@hookform/resolvers/zod'
import { Badge, Button, Dialog, Form } from '@stump/components'
import { useCallback, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { IsolatedSmartFilterSchema, smartFilterSchema } from '../smartList/createOrUpdate'
import { SmartListQueryBuilder } from '../smartList/createOrUpdate/queryBuilder'

type Props = {
	initialValues?: IsolatedSmartFilterSchema['filters']['groups']
	onSave: (values: IsolatedSmartFilterSchema) => void
}

export default function SmartFilterModal({ initialValues, onSave }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const form = useForm<IsolatedSmartFilterSchema>({
		defaultValues: {
			filters: {
				groups: initialValues ?? [],
				joiner: 'and',
			},
		},
		resolver: zodResolver(smartFilterSchema),
	})

	const filterGroups = useWatch({
		control: form.control,
		name: 'filters.groups',
	})
	const flatCount = useMemo(
		() => filterGroups.reduce((acc, group) => acc + group.filters.length, 0),
		[filterGroups],
	)

	const handleSave = useCallback(
		(values: IsolatedSmartFilterSchema) => {
			onSave(values)
			setIsOpen(false)
		},
		[onSave],
	)

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger>
				<Badge
					variant="primary"
					size="sm"
					className="flex cursor-pointer items-center justify-between space-x-1 pl-2 pr-1 opacity-95 hover:opacity-100"
				>
					<span>Smart filters</span>
					<span className="flex h-5 w-5 items-center justify-center rounded-md bg-fill-brand-secondary">
						{flatCount}
					</span>
				</Badge>
			</Dialog.Trigger>
			<Dialog.Content size="massive">
				<Dialog.Header>
					<Dialog.Title>Smart filter builder</Dialog.Title>
					<Dialog.Description>
						Build a complex filter to get exactly what you need. You can save this as a smart list
						later, if you want
					</Dialog.Description>
				</Dialog.Header>

				<Form
					form={form}
					onSubmit={handleSave}
					className="h-[60vh] overflow-y-auto"
					id="smart-filter-form"
				>
					<SmartListQueryBuilder isolated />
				</Form>

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)}>Cancel</Button>
					<Button variant="primary" type="submit" form="smart-filter-form">
						Save
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
