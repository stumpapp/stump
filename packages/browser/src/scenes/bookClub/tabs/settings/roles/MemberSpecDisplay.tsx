import { Button, Card, Heading, Input, Text } from '@stump/components'
import { useState } from 'react'

import { useBookClubContext } from '@/components/bookClub'

const upperFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export default function MemberSpecDisplay() {
	const {
		bookClub: { roleSpec },
		patchClub,
	} = useBookClubContext()

	const [updatedSpec, setUpdatedSpec] = useState(() => roleSpec)

	const isDifferent = Object.entries(roleSpec).some(([key, value]) => {
		return String(updatedSpec[key]) !== String(value)
	})

	return (
		<div className="flex flex-col gap-4">
			<div className="md:max-w-lg">
				<Heading size="sm">Custom names</Heading>
				<Text variant="muted" size="sm">
					You can override the default name for any role. This is purely cosmetic and will not
					affect permissions
				</Text>
			</div>

			<Card className="w-full rounded-lg">
				<table className="min-w-full divide-y divide-edge">
					<thead className="">
						<tr>
							<th
								scope="col"
								className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6"
							>
								<Text>Role</Text>
							</th>
							<th
								scope="col"
								className="border-l border-l-edge px-3 py-3.5 text-left text-sm font-semibold text-foreground"
							>
								<Text>Show as</Text>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-edge">
						{Object.entries(updatedSpec)
							.sort(([keyA], [keyB]) => {
								const order = ['MEMBER', 'MODERATOR', 'ADMIN', 'CREATOR']
								return order.indexOf(keyA) - order.indexOf(keyB)
							})
							.map(([key, value]) => {
								return (
									<tr key={key}>
										<td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
											<Text size="sm">{upperFirst(key.toLowerCase())}</Text>
										</td>
										<td className="border-l border-l-edge px-3 py-4">
											<Input
												value={String(value)}
												onChange={(e) => {
													const newSpec = { ...updatedSpec, [key]: e.target.value }
													setUpdatedSpec(newSpec)
												}}
											/>
										</td>
									</tr>
								)
							})}
					</tbody>
				</table>
			</Card>

			<div>
				<Button
					variant="primary"
					onClick={() => patchClub({ memberRoleSpec: updatedSpec })}
					disabled={!isDifferent}
				>
					Save changes
				</Button>
			</div>
		</div>
	)
}
