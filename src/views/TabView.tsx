import * as React from 'react';
import { DebugLogView } from './DebugLogView';
import { DebugLevel, LogMessage } from '../ApplicationDataModel';
import { PianoRollView } from './PianoRollView';

interface TabViewProps {
    debugLevel: DebugLevel;
    logMessages: LogMessage[];
}

export enum ActiveTab {
    TabPianoRoll,
    TabDebugLog
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

    public render(): JSX.Element {
        return <div className="tab">
            <div className="tab__nav">
                <button className="tab__nav-btn">Piano Roll</button>
                <button className="tab__nav-btn tab__nav-btn--is-active">Debug Log</button>
            </div>
            <div className="tab__body">
                <DebugLogView
                    debugLevel={this.props.debugLevel}
                    messages={this.props.logMessages}
                    />
                <PianoRollView />
            </div>
        </div>;
    }
}