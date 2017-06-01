import * as React from 'react';

export type AudioControlsAction = 'record' | 'rewind' | 'stop' | 'pause' | 'play' | 'step' | 'fastforward';

export interface AudioControlsProps {
    onAction: (action: AudioControlsAction) => void;
    isRecordDisabled: boolean;
    isRewindDisabled: boolean;
    isStopDisabled: boolean;
    isPauseDisabled: boolean;
    isPlayDisabeld: boolean;
    isStepDisabled: boolean;
    isFastForwardDisabled: boolean;
}

export class AudioControls extends React.Component<AudioControlsProps,{}> {
    public render() {
        return <div>
            <h2>Audio Controls</h2>
            <button onClick={() => this.props.onAction('record')} disabled={this.props.isRecordDisabled}>Record</button>
            <button onClick={() => this.props.onAction('rewind')} disabled={this.props.isRewindDisabled}>Rewind</button>
            <button onClick={() => this.props.onAction('stop')} disabled={this.props.isStopDisabled}>Stop</button>
            <button onClick={() => this.props.onAction('pause')} disabled={this.props.isPauseDisabled}>Pause</button>
            <button onClick={() => this.props.onAction('play')} disabled={this.props.isPlayDisabeld}>Play</button>
            <button onClick={() => this.props.onAction('step')} disabled={this.props.isStepDisabled}>Step</button>
            <button onClick={() => this.props.onAction('fastforward')} disabled={this.props.isFastForwardDisabled}>Fast-Forward</button>
        </div>;
    }
}