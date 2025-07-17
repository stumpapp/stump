import { Avatar, Text } from '@stump/components'

type Props = {
	username: string
	avatarUrl?: string | null
}

export default function UsernameRow({ username, avatarUrl }: Props) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-7 w-7" src={avatarUrl || undefined} fallback={username} />
			<Text size="sm">{username}</Text>
		</div>
	)
}
