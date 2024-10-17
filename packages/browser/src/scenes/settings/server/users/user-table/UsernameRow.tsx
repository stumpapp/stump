import { Avatar, Text } from '@stump/components'
import { User } from '@stump/sdk'

export default function UsernameRow({ username, avatar_url }: User) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-7 w-7" src={avatar_url || undefined} fallback={username} />
			<Text size="sm">{username}</Text>
		</div>
	)
}
