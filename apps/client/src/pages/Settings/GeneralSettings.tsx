import { Heading, Stack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import React from 'react';
import { Helmet } from 'react-helmet';
import PreferencesForm from '~components/Settings/General/PreferencesForm';
import ProfileForm from '~components/Settings/General/ProfileForm';

export default function GeneralSettings() {
	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'General Settings'}</title>
			</Helmet>

			<ProfileForm />

			<PreferencesForm />
		</>
	);
}
