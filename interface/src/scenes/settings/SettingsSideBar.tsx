import { Heading, Label } from '@stump/components'
import { User } from '@stump/types'
import { Link } from 'react-router-dom'

type Props = {
	user?: User | null
}

export default function SettingsSideBar({ user }: Props) {
	console.debug(user)

	return (
		<div className="border-edge bg-background relative flex h-full w-48 shrink-0 flex-col gap-4 border-r px-2 py-4">
			<div>
				<Label className="mb-2">Application</Label>

				<ul>
					<Link to="/settings/app/general">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">General</li>
					</Link>
					<Link to="/settings/app/appearance">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">Appearance</li>
					</Link>
				</ul>
			</div>

			<div>
				<Label className="mb-2">Server</Label>

				<ul>
					<Link to="/settings/server/general">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">General</li>
					</Link>
					<Link to="/settings/server/users">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">Users</li>
					</Link>
					<Link to="/settings/server/access">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">Access</li>
					</Link>
					<Link to="/settings/server/notifications">
						<li className="rounded-md px-2 py-1 dark:hover:bg-gray-950">Notifications</li>
					</Link>
				</ul>
			</div>
		</div>
	)
}
