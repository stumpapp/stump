import { Lock } from 'lucide-react-native'
import { View } from 'react-native'

import { Card, Icon, Text } from '~/components/ui'

// TODO(achievements): this is super mocked and just wanted to see what something like this
// would look like. i think each badge should be some kind of ollie owl artwork, click
// into it and see an overview + larger version, when you got it, etc
// this has implications ofc like:
// - cron sweeps to compute?
// - push check after exiting reader?
// honestly a bit complex
// - the streaks at the top of the stats page could likely be tied to goals too

const IDEAS = [
	'First Book', // freebie >:)
	// streaks are tricky, not like i want to keep it indefinitely? like
	// counting forever? only because its a badge, like maybe achievements are
	// structured so that we can repr interval ones like this with a dynamic
	// unit and shit? or just define a few and be done with it, i don't need
	// to plan for e.g. 5 year streaks lmao this is not my job
	'7 Day Streak',
	'10 Books',
	// maybe like 30 books finished in the evening or something
	'Night Owl',
	// same but morning
	'Early Bird',
	// a year in reading time lol but ofc i hear it in sing song
	'525,600 Minutes',
	// lol cute, maybe like you read 300 books? robin, robbing, is a pun, kinda only works for eng ig
	'Robin the Library',
	// you rated a book highly that others (maybe 2+ folks?) rated poorly / dnf'ed, kinda
	// more of a social feature than others
	'Flying Against the Wind',
	// its an even row/col now so i'll just leave others commented out:
	// - The Journaler, X entries ever
	// - The Colorist, X highlights ever made
	// - The Low-Stakes Flier, 20 low-stakes fantasy books read (kinda for me lol)
]

export function Achievements() {
	return (
		<Card
			label="Achievements"
			description="You might not remember your reading activity but Ollie keeps track for you!"
		>
			<View className="p-4 gap-y-4 flex-row flex-wrap justify-evenly">
				{IDEAS.map((idea) => (
					<View key={idea} className="w-24 gap-2 items-center">
						<View className="h-16 w-16 border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/5 items-center justify-center rounded-full border-2 border-dashed">
							<Icon as={Lock} size={20} className="text-foreground-muted" />
						</View>
						<Text size="xs" className="text-foreground-muted text-center" numberOfLines={2}>
							{idea}
						</Text>
					</View>
				))}
			</View>
		</Card>
	)
}

// misc inspirations:
// - https://dribbble.com/shots/24683923-freud-v3-AI-Mental-Health-App-Achievements-Badges-UIUX
//   ^ okay ignore the abs HORROR that is an "ai mental health app" and just look at the ui AHHHHH where tf am i
// - https://dribbble.com/shots/27747788-Drylendar-Achievement-Cards
//   ^ frame like badges, not really my fav but not too bad
// - https://dribbble.com/shots/27067743-NVO-Achievements
//   ^ animated is neat, too much movement in those tho
// - https://dribbble.com/shots/21414971-Achievement-badges
// - https://dribbble.com/shots/27265584-Achievement-concept
//   ^ the announce pop up, prob shares a lot with badge detail view or w/e
// - https://mobbin.com/screens/04f5eda7-4d1d-4b06-9c76-998f6f706dd6
// - https://mobbin.com/screens/27423508-e523-49a9-a2bd-2c8eabe9e661
//   ^^ i mean if we're talking cute factor + owls it's hard to ignore duo
