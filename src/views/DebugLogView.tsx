import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ApplicationState, DebugLevel, LogMessage } from '../ApplicationDataModel';

export interface DebugLogViewProps {
    debugLevel: DebugLevel;
    messages: LogMessage[];
}


export class DebugLogView extends React.Component<DebugLogViewProps,{}> {
    public render(): JSX.Element {
        var messages = this.props.messages
            .map((message) => <div key={message.id}>{message.when} {DebugLevel[message.level]} {message.message}</div>);
        return <div>
            Messages:
            <pre>{messages}</pre>
        </div>;
    }
}