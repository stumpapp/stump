import { Helmet } from 'react-helmet';
// import PreferencesForm from '~components/Settings/General/PreferencesForm';
// import ProfileForm from '~components/Settings/General/ProfileForm';

export default function GeneralSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'General Settings'}</title>
			</Helmet>

			<div>I am not implemented yet</div>

			{/* <ProfileForm /> */}

			{/* <PreferencesForm /> */}
		</>
	);
}
