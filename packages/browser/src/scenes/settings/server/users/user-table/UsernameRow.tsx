import { Avatar, Text } from '@stump/components'

import { User } from './UserTable'

export default function UsernameRow({ username, avatarUrl }: User) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-7 w-7" src={avatarUrl || undefined} fallback={username} />
			<Text size="sm">{username}</Text>
		</div>
	)
}
