import { zodResolver } from '@hookform/resolvers/zod'
import { Button, cx, Form, Tabs, Text } from '@stump/components'
import { useForm, useWatch } from 'react-hook-form'

import { schema, SmartListFormSchema } from '../form/newSchema'
import FilterGroup from './FilterGroup'

export default function SmartListQueryBuilder() {
	const form = useForm<SmartListFormSchema>({
		defaultValues: {
			filters: {
				groups: [
					{
						filters: [
							{ field: 'name', operation: 'any', source: 'book', value: ['boo', 'biz'] },
							// { field: 'name', operation: 'none', source: 'book', value: ['foo', 'bar'] },
						],
						joiner: 'or',
					},
					// {
					// 	filters: [{ field: 'name', operation: 'contains', source: 'book', value: 'baz' }],
					// 	joiner: 'not',
					// },
				],
				joiner: 'and',
			},
		},
		resolver: zodResolver(schema),
	})

	const [joiner] = form.watch(['filters.joiner'])
	const {
		filters: { groups },
	} = useWatch({ control: form.control }) as SmartListFormSchema

	return (
		<Form form={form} onSubmit={() => {}}>
			<div className="flex flex-col space-y-4">
				<div className="flex items-center space-x-3.5">
					<Tabs variant="primary" activeOnHover value={joiner}>
						<Tabs.List className="rounded-lg">
							<Tabs.Trigger
								value="and"
								asChild
								className="w-10 min-w-[unset] rounded-lg px-2"
								onClick={() => form.setValue('filters.joiner', 'and')}
							>
								<Text className="cursor-pointer truncate">AND</Text>
							</Tabs.Trigger>

							<Tabs.Trigger
								value="or"
								asChild
								className="w-10 min-w-[unset] rounded-lg px-2"
								onClick={() => form.setValue('filters.joiner', 'or')}
							>
								<Text className={cx('truncate', { 'cursor-pointer': true })}>OR</Text>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs>

					<Text variant="muted" size="sm">
						{joiner === 'and'
							? 'All filter groups must be true for a book to be matched'
							: 'Any filter group must be true for a book to be matched'}
					</Text>
				</div>

				<div className="relative ml-4 flex flex-col space-y-8 border-l border-l-edge px-2 pt-4">
					{groups.length === 0 && (
						<div className="ml-4 flex max-w-sm items-center justify-center rounded-lg border border-dashed border-edge p-4">
							<Text variant="muted">Add a group to get started</Text>
						</div>
					)}
					{groups.map((group, index) => (
						<FilterGroup key={index} idx={index} group={group} />
					))}
				</div>

				<div>
					<Button
						variant="outline"
						onClick={() => {
							form.setValue('filters.groups', [
								...groups,
								{
									filters: [],
									joiner: 'and',
								},
							])
						}}
					>
						Add group
					</Button>
				</div>
			</div>
		</Form>
	)
}
