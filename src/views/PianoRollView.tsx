import * as React from 'react';

interface PianoRollViewProps {
}

interface PianoRollViewState {
}

export class PianoRollView extends React.Component<PianoRollViewProps, PianoRollViewState> {
    public render(): JSX.Element {
        return <canvas />;
    }
}