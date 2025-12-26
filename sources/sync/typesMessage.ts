import { AgentEvent } from "./typesRaw";
import { MessageMeta } from "./typesMessageMeta";
import { MessageImageRef } from "./reducer/reducer";

export type ToolCall = {
    name: string;
    state: 'running' | 'completed' | 'error';
    input: any;
    createdAt: number;
    startedAt: number | null;
    completedAt: number | null;
    description: string | null;
    result?: any;
    resultApiMessage?: any; // API message from the tool result (user role message)
    permission?: {
        id: string;
        status: 'pending' | 'approved' | 'denied' | 'canceled';
        reason?: string;
        mode?: string;
        allowedTools?: string[];
        decision?: 'approved' | 'approved_for_session' | 'denied' | 'abort';
        date?: number;
    };
}

// Flattened message types - each message represents a single block
export type UserTextMessage = {
    kind: 'user-text';
    id: string;
    localId: string | null;
    createdAt: number;
    text: string;
    displayText?: string; // Optional text to display in UI instead of actual text
    meta?: MessageMeta;
    images?: MessageImageRef[]; // Optional attached images
    apiMessage?: any; // Original Claude API message
}

export type ModeSwitchMessage = {
    kind: 'agent-event';
    id: string;
    createdAt: number;
    event: AgentEvent;
    meta?: MessageMeta;
    apiMessage?: any; // Original Claude API message
}

export type AgentTextMessage = {
    kind: 'agent-text';
    id: string;
    localId: string | null;
    createdAt: number;
    text: string;
    meta?: MessageMeta;
    apiMessage?: any; // Original Claude API message
}

export type ToolCallMessage = {
    kind: 'tool-call';
    id: string;
    localId: string | null;
    createdAt: number;
    tool: ToolCall;
    children: Message[];
    meta?: MessageMeta;
    apiMessage?: any; // Original Claude API message
}

export type ThinkingMessage = {
    kind: 'thinking';
    id: string;
    localId: string | null;
    createdAt: number;
    thinking: string;
    signature?: string;
    meta?: MessageMeta;
    apiMessage?: any; // Original Claude API message
}

export type SubAgentInvocation = {
    kind: 'sub-agent-invocation';
    id: string;
    localId: string | null;
    createdAt: number;
    subagentType: string;
    description: string;
    prompt: string;
    result: string;
    resultApiMessage?: any; // API message from the tool result (user role message)
    meta?: MessageMeta;
    apiMessage?: any; // Original Claude API message (assistant role with tool_use)
}

export type Message = UserTextMessage | AgentTextMessage | ToolCallMessage | ModeSwitchMessage | ThinkingMessage | SubAgentInvocation;