import * as React from 'react';

import { ReadiumViewProps } from './Readium.types';

export default function ReadiumView(props: ReadiumViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
