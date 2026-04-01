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
		<div className="gap-4 flex flex-col">
			<div className="md:max-w-lg">
				<Heading size="sm">Custom names</Heading>
				<Text variant="muted" size="sm">
					You can override the default name for any role. This is purely cosmetic and will not
					affect permissions
				</Text>
			</div>

			<Card className="rounded-lg w-full">
				<table className="min-w-full divide-y divide-edge">
					<thead className="">
						<tr>
							<th
								scope="col"
								className="py-3.5 pl-4 pr-3 text-sm font-semibold sm:pl-6 text-left text-foreground"
							>
								<Text>Role</Text>
							</th>
							<th
								scope="col"
								className="px-3 py-3.5 text-sm font-semibold border-l border-l-edge text-left text-foreground"
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
										<td className="py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 text-gray-900">
											<Text size="sm">{upperFirst(key.toLowerCase())}</Text>
										</td>
										<td className="px-3 py-4 border-l border-l-edge">
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
