import React, { useMemo } from 'react';
import { Text, TextProps, useBoolean } from '@chakra-ui/react';

interface Props extends Omit<TextProps, 'children'> {
	text?: string;
}

// FIXME: does not render new lines properly, this is pretty basic and needs changing.
export default function ReadMore({ text, ...props }: Props) {
	const [showingAll, { toggle }] = useBoolean(false);

	const canReadMore = useMemo(() => (text ?? '').length > 250, [text]);

	if (!text) {
		return null;
	}

	if (!canReadMore) {
		return <Text {...props}>{text}</Text>;
	}

	return (
		<Text {...props}>
			{showingAll ? text : text.slice(0, 250)}
			<span onClick={toggle} className="cursor-pointer font-semibold">
				{showingAll ? ' Read less' : '... Read more'}
			</span>
		</Text>
	);
}
