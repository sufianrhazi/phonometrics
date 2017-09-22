import * as React from 'react';
import { DebugLogView } from './DebugLogView';
import { DataModel, DebugLevel, LogMessage } from '../ApplicationDataModel';
import { MidiMessage } from '../MidiMessages';
import { PianoRollView } from './PianoRollView';
import { RawMidiView } from './RawMidiView';


interface TabViewProps {
    debugLevel: DebugLevel;
    logMessages: LogMessage[];
    model: DataModel;
}

export enum ActiveTab {
    TabPianoRoll,
    TabDebugLog,
    TabRawMidi
};

export interface TabViewState {
    activeTab: ActiveTab;
}

export class TabView extends React.Component<TabViewProps, TabViewState> {
    constructor(props?: TabViewProps) {
        super(props);
    }

    componentWillMount() {
        this.setState({
            activeTab: ActiveTab.TabPianoRoll
        });
    }

    private setTab(tab: ActiveTab) {
        this.setState({
            activeTab: tab
        });
    }

    public render(): JSX.Element {
        return <div className="tab">
            <div className="tab__nav">
                <button
                    disabled={this.state.activeTab === ActiveTab.TabPianoRoll}
                    className="tab__nav-btn"
                    onClick={() => this.setTab(ActiveTab.TabPianoRoll)}
                    >Piano Roll</button>
                <button
                    disabled={this.state.activeTab === ActiveTab.TabRawMidi}
                    className="tab__nav-btn"
                    onClick={() => this.setTab(ActiveTab.TabRawMidi)}
                    >Raw MIDI</button>
                <button
                    disabled={this.state.activeTab === ActiveTab.TabDebugLog}
                    className="tab__nav-btn"
                    onClick={() => this.setTab(ActiveTab.TabDebugLog)}
                    >Debug Log</button>
            </div>
            <div className="tab__body">
                {this.state.activeTab === ActiveTab.TabDebugLog && <DebugLogView
                    debugLevel={this.props.debugLevel}
                    messages={this.props.logMessages}
                    />}
                {this.state.activeTab === ActiveTab.TabRawMidi && <RawMidiView
                    model={this.props.model}
                    />}
                {this.state.activeTab === ActiveTab.TabPianoRoll && <PianoRollView
                    model={this.props.model}
                    />}
            </div>
        </div>;
    }
}