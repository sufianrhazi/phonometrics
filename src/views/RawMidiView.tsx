import * as React from 'react';
import { DataModel } from '../ApplicationDataModel';
import { MidiMessage } from '../MidiMessages';
import { pad } from '../strutil';

export interface RawMidiViewProps {
    model: DataModel;
}

interface WrappedMessages {
    messages: MidiMessage[];
}

interface RawMidiViewState {
    messages: WrappedMessages;
}

interface RawMidiMessageProps {
    message: MidiMessage;
}

interface RawMidiMessageState {
}

function toHex(num: number): string {
    return pad(num.toString(16), 2, '0');
}

function getHumanRepr(data: number[]): string {
    switch (data[0]) {
        
    }
    return '';
}

class RawMidiMessage extends React.Component<RawMidiMessageProps,RawMidiMessageState> {
    public render() {
        var sec = pad(Math.floor(this.props.message.ms / 1000), 4, ' ');
        var ms = pad(this.props.message.ms % 1000, 4, '0');
        var us = pad(this.props.message.us, 4, '0');
        var timestamp = (this.props.message.ms / 1000) + (this.props.message.us / 1000000);
        var messageStr = this.props.message.data.map((data) => toHex(data)).join(' ');
        var humanReadable = getHumanRepr(this.props.message.data);
        return <div>
            <code>{sec}.{ms}{us}: {messageStr}</code>
        </div>;
    }
}
export class RawMidiView extends React.Component<RawMidiViewProps,RawMidiViewState> {
    public componentWillMount() {
        var wrappedMessages: WrappedMessages = {
            messages: this.props.model.state.messages
        };
        this.setState({
            messages: wrappedMessages
        });
    }

    public render() {
        var messages = this.props.model.state.messages;
        return <div>
            {messages.map((message, i) => <RawMidiMessage key={i} message={message} />)}
        </div>;
    }
}