import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Achievements, RangedStats, Streaks } from '~/components/readingStats'

// TODO: the ia is a bit awkward here, mostly the group of ranged stats sandwiched
// in the middle between two things _not_ affected by chosen range. not exactly
// priority until i build out achievements but will need to be sorted
// my partner also thinks the weekday chart is confusing in the context of the range,
// mostly that they'd expect it to be the last week only which leads into another point
// of feedback that the consistent "last X" preset, while consistent, doesn't align
// with what they'd expect, e.g.:
// - "this year" yes makes sense, start of year to now
// - "this week" no, start of week is not ideal bc on monday (like today)
//    you have too few dots, etc
// suggestion is to really just change "this week" to "last 7 days"
export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
			<ScrollView contentInsetAdjustmentBehavior="automatic">
				<View className="gap-8 p-4">
					<Streaks />
					<RangedStats />
					{__DEV__ && <Achievements />}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
