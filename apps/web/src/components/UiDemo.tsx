import { Heading, Spacer, useColorMode } from '@chakra-ui/react';
import React from 'react';
import toast from 'react-hot-toast';
import JobOverlay from './JobOverlay';
import Button from '~ui/Button';
import Link from '~ui/Link';

const UiSection = ({ title, children }: any) => {
	return (
		<div>
			<Heading size="sm">{title}</Heading>
			<div className="flex space-x-4">{children}</div>
		</div>
	);
};

export default function UiDemo() {
	const { toggleColorMode: toggle } = useColorMode();

	const testLoadingToast = () =>
		new Promise((resolve) => {
			setTimeout(() => resolve('Hey...'), 5000);
		});

	return (
		<div className="flex flex-col space-y-4">
			<UiSection title="Buttons">
				<Button>Ghost</Button>
				<Button colorScheme="brand">Brand</Button>

				<Spacer />

				<Button variant="brand" onClick={toggle}>
					Toggle Theme
				</Button>

				<Spacer />

				<Button variant="primary" onClick={() => toast.success('Woah there!')}>
					Success
				</Button>
				<Button variant="danger" onClick={() => toast.error('Woah there!')}>
					Failure
				</Button>
				<Button
					variant="primary"
					onClick={() => {
						toast.promise(testLoadingToast(), {
							loading: 'Loading...',
							success: 'Got the data!',
							error: 'Error when fetching!',
						});
					}}
				>
					Promise
				</Button>
			</UiSection>

			<UiSection title="Links">
				<Link to="#" isExternal>
					External
				</Link>

				<Link to="#" noUnderline>
					Internal
				</Link>
			</UiSection>

			<JobOverlay />
		</div>
	);
}
