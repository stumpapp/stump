import { Card, Heading, Text } from '@stump/components'

import { useBookClubContext } from '@/components/bookClub'

const upperFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export default function MemberSpecDisplay() {
	const {
		bookClub: { roleSpec },
	} = useBookClubContext()

	return (
		<div className="flex flex-col md:max-w-lg">
			<Heading size="sm">Club roles</Heading>
			<Text variant="muted" size="sm">
				Book clubs can have special names for the default roles available. For easy reference, below
				is a table the default roles and their corresponding custom name for this book club (if any)
			</Text>
			<Card className="mt-2 overflow-hidden border-dashed">
				<table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
					<thead className="">
						<tr>
							<th
								scope="col"
								className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
							>
								<Text>Role</Text>
							</th>
							<th
								scope="col"
								className="border-l px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:border-l-gray-800"
							>
								<Text>Custom name</Text>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y dark:divide-gray-800">
						{Object.entries(roleSpec).map(([key, value]) => {
							return (
								<tr key={key}>
									<td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
										<Text size="sm">{upperFirst(key.toLowerCase())}</Text>
									</td>
									<td className="border-l px-3 py-4 dark:border-l-gray-800">
										<Text size="sm">{String(value)}</Text>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</Card>
		</div>
	)
}
