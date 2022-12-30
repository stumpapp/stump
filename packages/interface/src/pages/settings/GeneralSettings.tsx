import { Helmet } from 'react-helmet'

import { UserPreferencesForm, UserProfileForm } from '../../components/settings/forms'

export default function GeneralSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'General Settings'}</title>
			</Helmet>

			<UserProfileForm />
			<UserPreferencesForm />
		</>
	)
}
