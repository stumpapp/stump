import { Code, Heading, Link, Stack, Text, useBoolean } from '@chakra-ui/react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import BaseLayout from './Layouts/BaseLayout';

function ErrorFallback({ error }: FallbackProps) {
	const [showMore, { toggle }] = useBoolean(false);

	return (
		<BaseLayout>
			<Stack mt={{ base: 12, md: 16 }} w="full" h="full" align="center">
				<Heading as="h1" size="lg">
					Well, this is embarrassing...
				</Heading>

				<Text fontSize="lg" maxW="xl" textAlign="center">
					Something went wrong! Error: {error.message}.{' '}
					{error.stack && (
						<>
							<span onClick={toggle} className="cursor-pointer text-brand-400">
								Click me
							</span>{' '}
							to see {showMore ? 'less' : 'more'}.
						</>
					)}
				</Text>

				{showMore && (
					<Code rounded="md" maxW="4xl" p={4}>
						{error.stack}
					</Code>
				)}

				<Text fontSize="lg" maxW="xl" textAlign="center">
					<Link href="/" color="brand.400">
						Click here
					</Link>{' '}
					to go home
				</Text>
			</Stack>
		</BaseLayout>
	);
}

interface Props {
	children: React.ReactNode;
}

export default function ({ children }: Props) {
	return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}
