import { Box, Tab, TabList, Tabs } from '@chakra-ui/react';
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const pages = [
	{
		path: '/settings/general',
		shortName: 'general',
		index: 0,
	},
	{
		path: '/settings/server',
		shortName: 'server',
		index: 1,
	},
];

export default function SettingsNav() {
	const navigate = useNavigate();

	const location = useLocation();

	const activeTab = useMemo(
		() => pages.find((p) => p.path === location.pathname)?.index ?? 0,
		[location],
	);

	function handleChange(index: number) {
		const page = pages.find((p) => p.index === index);

		if (page && index !== activeTab) {
			navigate(`/settings/${page.shortName}`);
		}
	}

	// FIXME: This is so horrendously ugly lol
	return (
		<Box py={4} w={{ base: 20, md: 48 }} h="full" px={4}>
			<Tabs
				index={activeTab}
				onChange={handleChange}
				variant="soft-rounded"
				colorScheme="brand"
				orientation="vertical"
			>
				<TabList>
					<Tab color="gray.400">General Settings</Tab>
					<Tab color="gray.400">Server Settings</Tab>
					<Tab color="gray.400">Job History</Tab>
				</TabList>
			</Tabs>
		</Box>
	);
}
