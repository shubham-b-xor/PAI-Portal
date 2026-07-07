import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Chat, Close, Send, AttachFile, Clear, InsertDriveFile, Download } from '@mui/icons-material';
import { aiAssistantService } from '@/api/services/aiAssistantService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatClient } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { acsChatService, BootstrapChatItem } from '@/api/services/acsChatService';
import { chatSessionService, ChatSessionSummary } from '@/api/services/chatSessionService';
import { authService } from '@/api/services/authService';
import { CircularProgress } from '@mui/material';
import { useChatContext } from '@/context/ChatContext';
import { createConversationFromContext, hashString, mergeConversations } from './chatWidgetUtils';

export type ChatMessage = {
  id: string | number;
  acsMessageId?: string;
  messageKey?: string;
  createdAtMs?: number;
  sender: 'me' | 'other';
  text: string;
  time: string;
  fileName?: string;
  fileUrl?: string;   // Local or remote URL for preview/download
  fileType?: string;  // MIME type or category (e.g., 'image', 'document')
  read?: boolean;
  readReceiptSent?: boolean;
};

export type Conversation = {
  id: number;
  sessionId?: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
  poNumber?: string;
  chatContext?: ChatContext;
};

export type ChatContext = {
  threadId?: string;
  poNumber?: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
};

type AcsSessionEntry = {
  threadClient: any;
  seenMessageIds: Set<string>;

  messageHandler?: any;
  typingHandler?: any;
  readReceiptHandler?: any;

  typingTimeoutRef: NodeJS.Timeout | null;
  lastTypingSentRef: number;
  initialized: boolean;
}

type BootstrapRefreshItem = {
  chat: BootstrapChatItem;
  conversationId: number;
  counterpartEmail: string;
  counterpartName: string;
  sessionEntry?: AcsSessionEntry;
};

interface ChatWidgetProps {
  initialConversations?: Conversation[];
  title?: string;
  subtitle?: string;
  chatContext?: ChatContext | null;
}

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getAcsSenderId = (message: any) =>
  message?.sender?.communicationUserId ||
  message?.sender?.rawId ||
  message?.sender?.id ||
  message?.senderCommunicationIdentifier?.communicationUserId ||
  message?.senderCommunicationIdentifier?.rawId ||
  message?.senderCommunicationIdentifier?.id ||
  message?.senderDisplayName ||
  '';

const isCurrentUserMessage = (message: any, currentUserAcsId: string, currentUserName?: string) => {
  const senderId = getAcsSenderId(message);
  return (
    senderId === currentUserAcsId ||
    senderId === currentUserName ||
    senderId.includes(currentUserAcsId) ||
    senderId.includes(currentUserName || '')
  );
};

const getAcsMessageKey = (message: any, threadId: string, currentUserAcsId: string, currentUserName?: string) => {
  const text = String(message?.content?.message ?? message?.message ?? '').trim();
  const sender = isCurrentUserMessage(message, currentUserAcsId, currentUserName) ? 'me' : 'other';
  const timestamp = message?.createdOn ? new Date(message.createdOn).toISOString() : '';

  return String(
    message?.id ||
    message?.chatMessageId ||
    `${threadId}|${sender}|${text}|${timestamp}`
  );
};

const mapAcsMessage = (
  message: any,
  threadId: string,
  currentUserAcsId: string,
  currentUserName?: string
) => {
  const messageKey = getAcsMessageKey(message, threadId, currentUserAcsId, currentUserName);
  const acsMessageId = String(message?.id || message?.chatMessageId || messageKey);
  const createdAtMs = message?.createdOn ? new Date(message.createdOn).getTime() : Date.now();

  return {
    id: acsMessageId,
    acsMessageId,
    messageKey,
    createdAtMs,
    sender: (isCurrentUserMessage(message, currentUserAcsId, currentUserName) ? 'me' : 'other') as 'me' | 'other',
    text: message?.content?.message || message?.message || '',
    time: message?.createdOn ? formatTime(new Date(message.createdOn)) : formatTime(new Date()),
    read: false
  };
};

const getNewestMessage = <T,>(messages: T[]) => messages[messages.length - 1] ?? null;

const normalizeMessageList = (messages: ChatMessage[]) => {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key = String(message.acsMessageId || message.messageKey || message.id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const appendUniqueMessage = (messages: ChatMessage[], nextMessage: ChatMessage) => {
  const nextKey = String(nextMessage.acsMessageId || nextMessage.messageKey || nextMessage.id);
  if (messages.some((message) => String(message.acsMessageId || message.messageKey || message.id) === nextKey)) {
    return messages;
  }

  return normalizeMessageList([...messages, nextMessage]).sort(
    (left, right) => (left.createdAtMs || 0) - (right.createdAtMs || 0)
  );
};

const getMessageIdentity = (message: ChatMessage) =>
    String(message.acsMessageId || "");

const countUnreadMessages = (messages: ChatMessage[], lastReadMessageId?: string | null) => {
  if (!messages.length) {
    return 0;
  }

  const lastReadIndex = lastReadMessageId
    ? messages.findIndex((message) => getMessageIdentity(message) === String(lastReadMessageId))
    : -1;

  return messages
    .slice(lastReadIndex >= 0 ? lastReadIndex + 1 : 0)
    .filter((message) => message.sender === 'other')
    .length;
};

const getSessionConversationKey = (session: ChatSessionSummary) =>
  hashString(session.po_number || session.acs_thread_id || session.id || 'po-chat');

const buildConversationFromSession = (
  session: ChatSessionSummary,
  currentUserId?: string,
  existingConversation?: Conversation
): Conversation => {
  const counterpart = (session.participants || []).find((participant) => participant.user_id !== currentUserId) ||
    (session.participants || [])[0];

  return {
    id: getSessionConversationKey(session),
    sessionId: session.id,
    name: counterpart?.name || session.po_number || 'Chat',
    role: session.chat_type === 'PS_SUPPLIER' ? 'PO-linked chat' : 'Chat',
    avatar: (counterpart?.name || session.po_number || 'CH').slice(0, 2).toUpperCase(),
    lastMessage: session.last_message_preview?.trim() || existingConversation?.lastMessage || 'No messages yet',
    lastTime: session.last_message_at ? formatTime(new Date(session.last_message_at)) : existingConversation?.lastTime || '',
    unread: session.unread_count ?? existingConversation?.unread ?? 0,
    messages: existingConversation?.messages ?? [],
    poNumber: session.po_number || existingConversation?.poNumber,
    chatContext: existingConversation?.chatContext,
  };
};

const scheduleBackgroundWork = (task: () => void) => {
  if (typeof window === 'undefined') {
    task();
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis & {
      requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    }).requestIdleCallback(() => task(), { timeout: 1500 });
    return;
  }

  globalThis.setTimeout(task, 0);
};


const ChatWidget: React.FC<ChatWidgetProps> = ({
  initialConversations = [],
  title = "Messages", 
  subtitle = "Chat with your team members",
  chatContext = null,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

  const [open, setOpen] = useState(false);

  const AI_CONVERSATION: Conversation = {
    id: -999,
    name: 'AI Assistant',
    role: 'Procurement AI',
    avatar: 'AI',
    lastMessage: 'Ask me anything about purchase orders',
    lastTime: '',
    unread: 0,
    messages: []
  };

  const [conversations, setConversations] = useState<Conversation[]>([AI_CONVERSATION, ...initialConversations]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [acsMessagesByConversation, setAcsMessagesByConversation] = useState<Record<number, any[]>>({});
  const [acsInitializingByConversation, setAcsInitializingByConversation] = useState<Record<number, boolean>>({});
  const [backendSessions, setBackendSessions] = useState<ChatSessionSummary[]>([]);

  const [activeChatContext, setActiveChatContext] = useState<ChatContext | null>(chatContext);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<Record<number, number>>({});
  const pendingReadReceiptIdsRef = useRef<Record<number, Set<string>>>({});
  const lastReadSyncRef = useRef<Record<number, string | null>>({});
  const readReceiptSyncInFlightRef = useRef<Record<number, boolean>>({});
  const lastReadReceiptSyncKeyRef = useRef<Record<number, string | null>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initializingConversationIdsRef = useRef<Set<number>>(new Set());
  const backgroundChatBootstrapStartedRef = useRef(false);
  const conversationsRef = useRef<Conversation[]>([AI_CONVERSATION, ...initialConversations]);
  const backendSessionsRef = useRef<ChatSessionSummary[]>([]);
  const acsMessagesByConversationRef = useRef<Record<number, any[]>>({});
  const nameOverrides: Record<string, string> = {
    "Procurement Specialist 1": "John",
    "Procurement Specialist 2": "Karl",
    "Procurement Specialist 3": "Smith",
    "Procurement Specialist 4": "David",
    "Procurement Specialist 5": "Michael",
    "Procurement Specialist 6": "James",
    "Procurement Specialist 7": "Robert",
    "Procurement Specialist 8": "William",
    "Procurement Specialist 9": "Thomas",
    "Procurement Specialist 10": "Daniel",
    "Procurement Specialist 11": "Chris",
    "Procurement Specialist 12": "Kevin",
  };

  const getDisplayName = (name: string) => nameOverrides[name] || name;

  const acsSessionRefs = useRef<Record<number, AcsSessionEntry>>({});
  const { setUnreadMap } = useChatContext();

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll to the bottom whenever a new message lands or chat changes
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // };

  useEffect(() => {
    setActiveChatContext(chatContext);
  }, [chatContext]);

  useEffect(() => {
    const handleChatContextEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ChatContext>;
      setActiveChatContext(customEvent.detail || null);
    };

    const clearChatContextEvent = (_event: Event) => {
      setActiveChatContext(null);
    };

    window.addEventListener('chat-context', handleChatContextEvent as EventListener);
    window.addEventListener('clear-chat-context', clearChatContextEvent);

    return () => {
      window.removeEventListener('chat-context', handleChatContextEvent as EventListener);
      window.removeEventListener('clear-chat-context', clearChatContextEvent);
    };
  }, []);

  useEffect(() => {
    if (activeChatContext) {
    const conversationId = hashString(
        activeChatContext.poNumber ||
        activeChatContext.threadId ||
        "po-chat"
    );

    const alreadyExists = conversationsRef.current.some(
        c =>
            c.id === conversationId &&
            c.chatContext?.threadId === activeChatContext.threadId &&
            c.chatContext?.poNumber === activeChatContext.poNumber
    );

    if (!alreadyExists) {
        const poConversation = createConversationFromContext(activeChatContext);

        setConversations(prev =>
            mergeConversations(prev, [poConversation])
        );
    }

    setSelectedId(prev =>
        prev === conversationId ? prev : conversationId
    );

    return;
}

    const updatedConversations = [
        AI_CONVERSATION,
        ...initialConversations,
    ];

    const firstId =
        updatedConversations[0]?.id ?? AI_CONVERSATION.id;

    setConversations

    setSelectedId((prev) => prev ?? firstId);
}, [
    initialConversations,
    activeChatContext?.threadId,
    activeChatContext?.poNumber,
]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    acsMessagesByConversationRef.current = acsMessagesByConversation;
  }, [acsMessagesByConversation]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? conversations[0],
    [conversations, selectedId]
  );
  const selectedConversationId = selectedConversation?.id ?? null;
  const activeConversationId = activeChatContext
    ? hashString(activeChatContext.poNumber || activeChatContext.threadId || 'po-chat')
    : null;

const selectedConversationMessages = useMemo(() => {
    if (selectedConversationId === null) {
        return [];
    }

    if (selectedConversationId === -999) {
        return selectedConversation?.messages || [];
    }

    return normalizeMessageList(
        acsMessagesByConversation[selectedConversationId] || []
    );
}, [
    selectedConversationId,
    selectedConversation,
    acsMessagesByConversation,
]);

useEffect(() => {
  console.log("Selected Conversation:", selectedConversation?.id);
  console.log("AI Messages:", selectedConversation?.messages);
  console.log("Messages being rendered:", selectedConversationMessages);
}, [selectedConversation, selectedConversationMessages]);

  const getConversationSession = (conversationId: number) =>
    backendSessions.find((session) => getSessionConversationKey(session) === conversationId) ||
    backendSessionsRef.current.find((session) => getSessionConversationKey(session) === conversationId) ||
    backendSessions.find((session) => session.po_number && hashString(session.po_number) === conversationId) ||
    backendSessionsRef.current.find((session) => session.po_number && hashString(session.po_number) === conversationId);

  const markConversationAsRead = async (conversation: Conversation, messageId?: string) => {
    if (conversation.id === -999) {
      return;
    }

    const currentMessageId = messageId || null;
    if (lastReadSyncRef.current[conversation.id] === currentMessageId) {
      return;
    }

    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              unread: 0,
            }
          : item
      )
    );

    setUnreadMap((prevUnread) => ({
      ...prevUnread,
      [conversation.id]: 0,
    }));

    const currentUser = authService.getCurrentUser();
    const latestMessageId = messageId || null;

    if (conversation.chatContext?.threadId && currentUser?.email && latestMessageId) {
      try {
        await acsChatService.markChatRead({
          email: currentUser.email,
          threadId: conversation.chatContext.threadId,
          lastReadMessageId: latestMessageId,
        });

        setConversations((prev) =>
          prev.map((item) =>
            item.id === conversation.id
              ? {
                  ...item,
                  unread: 0,
                }
              : item
          )
        );
        lastReadSyncRef.current[conversation.id] = currentMessageId;
        return;
      } catch (error) {
        console.error('Failed to mark ACS chat as read', error);
      }
    }

    const session = conversation.sessionId
      ? backendSessions.find((item) => item.id === conversation.sessionId) || backendSessionsRef.current.find((item) => item.id === conversation.sessionId)
      : getConversationSession(conversation.id);

    if (!session?.id) {
      return;
    }

    try {
      const updatedSession = await chatSessionService.markSessionRead(session.id, messageId);

      setBackendSessions((prev) =>
        prev.map((item) => (item.id === updatedSession.id ? updatedSession : item))
      );

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                sessionId: updatedSession.id,
                unread: updatedSession.unread_count ?? 0,
                lastMessage: updatedSession.last_message_preview?.trim() || item.lastMessage,
                lastTime: updatedSession.last_message_at
                  ? formatTime(new Date(updatedSession.last_message_at))
                  : item.lastTime,
              }
            : item
        )
      );
      lastReadSyncRef.current[conversation.id] = currentMessageId;
    } catch (error) {
      console.error('Failed to mark chat session as read', error);
    }
  };

  const getConversationPreview = (conversation: Conversation) => {
    const lastAcsMessage =
      getNewestMessage(acsMessagesByConversation[conversation.id] || [])?.text;
    const lastLocalMessage =
      getNewestMessage(conversation.messages || [])?.text;

    const preview =
      lastAcsMessage ||
      lastLocalMessage ||
      conversation.lastMessage ||
      "No messages yet";

    return preview.length > 40
      ? `${preview.substring(0, 40)}...`
      : preview;
  };
 

  const syncConversationReadState = async (
    conversation: Conversation,
    threadClient: any,
    messages: ChatMessage[]
  ) => {
    if (conversation.id === -999 || !threadClient) {
      return;
    }

    if (readReceiptSyncInFlightRef.current[conversation.id]) {
      return;
    }

    const incomingMessages = messages.filter((msg) => msg.sender === 'other');
    if (incomingMessages.length === 0) {
      return;
    }

    const latestVisibleMessage = incomingMessages[incomingMessages.length - 1];
    const latestVisibleMessageId = String(
      latestVisibleMessage?.acsMessageId ||
      latestVisibleMessage?.id ||
      ''
    );

    if (!latestVisibleMessageId) {
      return;
    }

    const latestUnreadReceipt = [...incomingMessages].reverse().find(msg => !msg.readReceiptSent);
    const syncKey = latestUnreadReceipt
      ? latestVisibleMessageId
      : `${latestVisibleMessageId}:read`;

    if (lastReadReceiptSyncKeyRef.current[conversation.id] === syncKey) {
      return;
    }

    readReceiptSyncInFlightRef.current[conversation.id] = true;

    try {
      const pendingReadReceipts = pendingReadReceiptIdsRef.current[conversation.id] || new Set<string>();
      pendingReadReceiptIdsRef.current[conversation.id] = pendingReadReceipts;

      const receiptKey = String(latestUnreadReceipt?.acsMessageId || latestUnreadReceipt?.id || latestVisibleMessageId);
      if (!pendingReadReceipts.has(receiptKey) && latestUnreadReceipt) {
        pendingReadReceipts.add(receiptKey);

        await threadClient.sendReadReceipt({
          chatMessageId: receiptKey,
        });

        await markConversationAsRead(
            conversation,
            latestVisibleMessageId
        );

        lastReadSyncRef.current[conversation.id] = latestVisibleMessageId;

        setConversations((prev) =>
            prev.map((c) =>
                c.id === conversation.id
                    ? {
                          ...c,
                          unread: 0,
                      }
                    : c
            )
        );

        setUnreadMap((prev) => ({
            ...prev,
            [conversation.id]: 0,
        }));
        console.log("Read receipt sent", receiptKey);
      }

      

      setAcsMessagesByConversation((prev) => ({
  ...prev,
  [conversation.id]: (prev[conversation.id] || []).map((msg) =>
    msg.sender === "other" && !msg.readReceiptSent
      ? {
          ...msg,
          readReceiptSent: true,
        }
      : msg
  ),
}));

      lastReadReceiptSyncKeyRef.current[conversation.id] = syncKey;
    } catch (error) {
      if (latestUnreadReceipt) {
        const receiptKey = String(latestUnreadReceipt.acsMessageId || latestUnreadReceipt.id);
        pendingReadReceiptIdsRef.current[conversation.id]?.delete(receiptKey);
      }

      console.error('Failed to sync read receipts', error);
    } finally {
      readReceiptSyncInFlightRef.current[conversation.id] = false;
    }
  };

  const selectedConversationInitializing = selectedConversationId !== null && selectedConversationId !== -999
    ? acsInitializingByConversation[selectedConversationId] || false
    : false;
  const isInitializingACS = selectedConversationInitializing;

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [open, selectedConversationId, selectedConversationMessages.length]);

const lastReceiptSentRef = useRef<Record<number, string>>({});

useEffect(() => {

    const selectedThreadClient =
        selectedConversationId &&
        selectedConversationId !== -999
            ? acsSessionRefs.current[selectedConversationId]?.threadClient
            : null;

    if (
        !selectedThreadClient ||
        !open ||
        !selectedConversation
    ) {
        return;
    }

    const latestUnread =
        [...selectedConversationMessages]
            .reverse()
            .find(
                m =>
                    m.sender === "other" &&
                    !m.readReceiptSent
            );

    if (!latestUnread) {
        return;
    }

    if (
        lastReceiptSentRef.current[selectedConversation.id] ===
        latestUnread.acsMessageId
    ) {
        return;
    }

    lastReceiptSentRef.current[selectedConversation.id] =
        latestUnread.acsMessageId!;

    void syncConversationReadState(
        selectedConversation,
        selectedThreadClient,
        selectedConversationMessages
    );

}, [
    open,
    selectedConversationId,
    selectedConversationMessages
]);

  const toggleOpen = () => {
      setOpen(prev => {
          const next = !prev;

          return next;
      });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectConversation = async (id: number) => {
    const conversation = conversations.find((item) => item.id === id);

    setSelectedId(id);

    if (activeConversationId !== null && id !== activeConversationId) {
      setActiveChatContext(null);
      window.dispatchEvent(new Event('clear-chat-context'));
    }

    if (id !== -999 && conversation?.chatContext) {
      await initializeACS(conversation.chatContext, id);
    }
  };

  const typeWriterResponse = (
    text: string
  ) => {

    const messageId = Date.now();

    const botMessage: ChatMessage = {
      id: messageId,
      sender: 'other',
      text: '',
      time: formatTime(new Date())
    };

    setConversations(current =>
      current.map(conv =>
        conv.id === -999
          ? {
              ...conv,
              messages: [
                ...conv.messages,
                botMessage
              ]
            }
          : conv
      )
    );

    let index = 0;

    const interval = setInterval(() => {

      index++;

      setConversations(current =>
        current.map(conv =>
          conv.id === -999
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        text: text.slice(
                          0,
                          index
                        )
                      }
                    : msg
                )
              }
            : conv
        )
      );

      if (index >= text.length) {
        clearInterval(interval);
      }

    }, 15);
  };

  const handleSend = async () => {

    if (isInitializingACS) {
        return;
    }

    const trimmed = draft.trim();

    if (selectedConversation?.id !== -999) {
      if (!trimmed) {
        return;
      }

      const selectedThreadClient = selectedConversationId && selectedConversationId !== -999
        ? acsSessionRefs.current[selectedConversationId]?.threadClient
        : null;

      if (!selectedThreadClient) {
        return;
      }

      await selectedThreadClient.sendMessage({
        content: trimmed,
      });

      setDraft('');
      clearSelectedFile();

      return;
    }

    const question = trimmed;

    setDraft('');
    clearSelectedFile();

    if (selectedConversation?.id === -999) {

      setIsThinking(true);

      try {

        setConversations(current =>
          current.map(conv =>
            conv.id === -999
              ? {
                  ...conv,
                  messages: [
                    ...conv.messages,
                    {
                      id: Date.now(),
                      sender: 'me',
                      text: question,
                      time: formatTime(new Date())
                    }
                  ]
                }
              : conv
          )
        );

        setTimeout(scrollToBottom, 0);

        const response = await aiAssistantService.askQuestion(question);

        setIsThinking(false);

        typeWriterResponse(
          response.output
        );

      } catch {

        setIsThinking(false);

        typeWriterResponse(
          'Sorry, I encountered an error.'
        );
      }

      return;
  }

    setDraft('');
    clearSelectedFile();
  };

  const initializeACS = async (
    context: ChatContext,
    conversationId: number,
    bootstrapSession?: BootstrapChatItem
  ) => {
    if (!context.toEmail || !context.toName) {
      return;
    }

    const existingSession = acsSessionRefs.current[conversationId];
    if (existingSession?.initialized && existingSession.threadClient) {
      return;
    }

    if (initializingConversationIdsRef.current.has(conversationId)) {
      return;
    }

    initializingConversationIdsRef.current.add(conversationId);

    setAcsInitializingByConversation((prev) => ({
      ...prev,
      [conversationId]: true,
    }));

    try {
      const currentUser = authService.getCurrentUser();

      if (!currentUser?.email) {
        return;
      }

      const session = bootstrapSession || (await acsChatService.getChatSession({
        fromEmail: currentUser.email,
        fromName: currentUser.name || currentUser.email,
        toEmail: context.toEmail,
        toName: context.toName,
        poNumber: context.poNumber,
      })).data;

      const userId = session.acsUserId;
      const credential = new AzureCommunicationTokenCredential(session.token);
      const client = new ChatClient(session.endpoint, credential);
      const thread = client.getChatThreadClient(session.threadId);

      const history: Array<{
        id: string;
        acsMessageId: string;
        messageKey: string;
        createdAtMs: number;
        text: string;
        sender: 'me' | 'other';
        time: string;
      }> = [];
      const seenMessageIds = new Set<string>();

      for await (const msg of thread.listMessages()) {
        const historyItem = mapAcsMessage(msg, session.threadId, userId, currentUser.name);
        const text = msg.content?.message?.trim();

        if (!text) {
          continue;
        }

        if (!seenMessageIds.has(historyItem.messageKey)) {
          seenMessageIds.add(historyItem.messageKey);
          history.push(historyItem);
        }
      }

      acsSessionRefs.current[conversationId] = {
        threadClient: thread,
        seenMessageIds,
        messageHandler: null,
        typingTimeoutRef: null,
        lastTypingSentRef: 0,
        initialized: false,
      };

      const sortedHistory = [...history]
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .map(msg => {

        if (
            session.lastReadMessageId &&
            msg.sender === "me"
        ) {

            const lastReadIndex = history.findIndex(
                m => m.acsMessageId === session.lastReadMessageId
            );

            const currentIndex = history.findIndex(
                m => m.acsMessageId === msg.acsMessageId
            );

            return {
                ...msg,
                read: currentIndex <= lastReadIndex
            };
        }

        return msg;

    });
      const nextUnreadCount = open && selectedId === conversationId
        ? 0
        : countUnreadMessages(sortedHistory, session.lastReadMessageId);

      setAcsMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: normalizeMessageList(sortedHistory),
      }));
      
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
      ? {
                ...conversation,
                sessionId: conversation.sessionId,
                chatContext: {
                  ...context,
                  threadId: session.threadId,
                },
                lastMessage: sortedHistory[sortedHistory.length - 1]?.text || conversation.lastMessage,
                lastTime: sortedHistory[sortedHistory.length - 1]?.time || conversation.lastTime,
                unread: nextUnreadCount,
              }
              : conversation
            )
          );
          
          setUnreadMap((prev) => ({
            ...prev,
            [conversationId]: nextUnreadCount,
          }));
          
          await client.startRealtimeNotifications();
          
          const sessionEntry = acsSessionRefs.current[conversationId];
          if (sessionEntry.messageHandler) {
              client.off("chatMessageReceived", sessionEntry.messageHandler);
          }
    
          if (sessionEntry.typingHandler) {
              client.off("typingIndicatorReceived", sessionEntry.typingHandler);
          }
    
          if (sessionEntry.readReceiptHandler) {
              client.off("readReceiptReceived", sessionEntry.readReceiptHandler);
          }
      if (!sessionEntry.messageHandler) {
        sessionEntry.messageHandler = async (event: any) => {
          if (event.threadId !== session.threadId) {
            return;
          }

          const mappedMessage = mapAcsMessage(event, session.threadId, userId, currentUser.name);

          if (sessionEntry.seenMessageIds.has(mappedMessage.messageKey)) {
            return;
          }

          sessionEntry.seenMessageIds.add(mappedMessage.messageKey);

          const updatedMessages = appendUniqueMessage(
              acsMessagesByConversationRef.current[conversationId] || [],
              mappedMessage
          );

          setAcsMessagesByConversation((prev) => ({
              ...prev,
              [conversationId]: updatedMessages,
          }));

          if (
              mappedMessage.sender === "other" &&
              open &&
              selectedConversationId === conversationId
          ) {
              void syncConversationReadState(
                  conversationsRef.current.find(c => c.id === conversationId)!,
                  thread,
                  updatedMessages
              );
          }

          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    lastMessage: mappedMessage.text || conversation.lastMessage,
                    lastTime: mappedMessage.time || conversation.lastTime,
                  }
                : conversation
            )
          );

          if (mappedMessage.sender !== 'me' && !(open && selectedConversationId === conversationId)) {
            setConversations((prev) =>
              prev.map((conversation) =>
                conversation.id === conversationId
                  ? {
                      ...conversation,
                      unread: (conversation.unread || 0) + 1,
                    }
                  : conversation
              )
            );
            setUnreadMap((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || 0) + 1,
            }));
          }
        };

        // Remove old listeners if they already exist

        client.on('chatMessageReceived', sessionEntry.messageHandler);

        sessionEntry.typingHandler = (event: any) => {

    if (event.threadId !== session.threadId) {
        return;
    }

    if (isCurrentUserMessage(event, userId, currentUser.name)) {
        return;
    }

    setIsOtherUserTyping(true);

    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
        setIsOtherUserTyping(false);
    }, 3000);
};

client.on(
    "typingIndicatorReceived",
    sessionEntry.typingHandler
);

sessionEntry.readReceiptHandler = (event: any) => {

    console.log("READ RECEIPT", event);

    const receiptMessageId = String(event.chatMessageId);

    setAcsMessagesByConversation((prev) => {
    const conversationMessages = prev[conversationId] || [];

    const receiptIndex = conversationMessages.findIndex(
        (m) => String(m.acsMessageId) === String(event.chatMessageId)
    );

    if (receiptIndex === -1) {
        return prev;
    }

    return {
        ...prev,
        [conversationId]: conversationMessages.map((msg, index) => ({
            ...msg,
            read:
                msg.sender === "me" && index <= receiptIndex
                    ? true
                    : msg.read,
        })),
    };
});
};

client.on(
    "readReceiptReceived",
    sessionEntry.readReceiptHandler
);
      }

      sessionEntry.initialized = true;
    } finally {
      initializingConversationIdsRef.current.delete(conversationId);
      setAcsInitializingByConversation((prev) => ({
        ...prev,
        [conversationId]: false,
      }));
    }
  };

  const sendTypingNotification = async () => {
    const selectedThreadClient = selectedConversationId && selectedConversationId !== -999
      ? acsSessionRefs.current[selectedConversationId]?.threadClient
      : null;

    if (!selectedThreadClient || !selectedConversationId) {
      return;
    }

    const now = Date.now();
    const lastSent = lastTypingSentRef.current[selectedConversationId] || 0;

    if (now - lastSent < 1000) {
      return;
    }

    lastTypingSentRef.current[selectedConversationId] = now;

    try {
      await selectedThreadClient.sendTypingNotification();
    } catch (error) {
      console.error(error);
    }
  };

  const refreshBackendSessions = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.email) {
      return;
    }

    try {
      const sessions = (await chatSessionService.listSessions()).filter((session) => !session.acs_thread_id);
      backendSessionsRef.current = sessions;
      setBackendSessions(sessions);

      const canonicalConversations = sessions.map((session) => {
        const existingConversation = conversationsRef.current.find((item) => {
          if (item.sessionId && item.sessionId === session.id) {
            return true;
          }

          if (session.po_number && item.poNumber === session.po_number) {
            return true;
          }

          if (session.acs_thread_id && item.chatContext?.threadId === session.acs_thread_id) {
            return true;
          }

          return false;
        });

        return buildConversationFromSession(session, currentUser.id, existingConversation);
      });

      setConversations((prev) => {
        const merged = mergeConversations(prev, canonicalConversations);
        return merged.map((conversation) => {
          const session = sessions.find(
            (item) =>
              item.id === conversation.sessionId ||
              (conversation.poNumber && item.po_number === conversation.poNumber) ||
              (conversation.chatContext?.threadId && item.acs_thread_id === conversation.chatContext.threadId)
          );

          if (!session) {
            return conversation;
          }

          return {
            ...conversation,
            sessionId: session.id,
            lastMessage: session.last_message_preview?.trim() || conversation.lastMessage,
            lastTime: session.last_message_at
              ? formatTime(new Date(session.last_message_at))
              : conversation.lastTime,
            unread: session.unread_count ?? conversation.unread,
          };
        });
      });

      setUnreadMap((prev) => {
        const next = { ...prev };

        sessions.forEach((session) => {
          const conversationId = getSessionConversationKey(session);
          next[conversationId] = session.unread_count ?? 0;
        });

        return next;
      });
    } catch (error) {
      console.error('Failed to load canonical chat sessions', error);
    }
  };

  const refreshAcsBootstrapState = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.email) {
      return;
    }

    try {
      const bootstrapChats = await acsChatService.bootstrapChats(currentUser.email);

      const normalizedChats = bootstrapChats
        .map((chat) => {
          const counterpartEmail = chat.counterpart?.email;
          const counterpartName = chat.counterpart?.name || counterpartEmail;

          if (!counterpartEmail) {
            return null;
          }

          const conversationId = hashString(chat.poNumber || chat.threadId || 'po-chat');
          const sessionEntry = acsSessionRefs.current[conversationId];

          return {
            chat,
            conversationId,
            counterpartEmail,
            counterpartName: counterpartName || 'Chat',
            sessionEntry,
          };
        })
        .filter(Boolean) as BootstrapRefreshItem[];

      const refreshBatch = async (batch: typeof normalizedChats) => {
        const results = await Promise.allSettled(
          batch.map(async ({ chat, conversationId, counterpartEmail, counterpartName, sessionEntry }) => {
            const context: ChatContext = {
              threadId: chat.threadId,
              poNumber: chat.poNumber,
              fromEmail: currentUser.email,
              fromName: currentUser.name || currentUser.email,
              toEmail: counterpartEmail,
              toName: counterpartName,
            };

            const existingConversation = conversationsRef.current.find((item) => item.id === conversationId);

            if (!sessionEntry?.threadClient || !chat.currentParticipant?.acsUserId) {
              return {
                conversation: createConversationFromContext(context, existingConversation),
                messages: acsMessagesByConversationRef.current[conversationId] || [],
                unread: countUnreadMessages(acsMessagesByConversationRef.current[conversationId] || [], chat.lastReadMessageId),
              };
            }

            const refreshedMessages: ChatMessage[] = [];
            const seenMessageIds = new Set<string>();

            for await (const msg of sessionEntry.threadClient.listMessages()) {
              const mappedMessage = mapAcsMessage(
                msg,
                chat.threadId,
                chat.currentParticipant.acsUserId,
                currentUser.name || currentUser.email
              );
              const text = String(msg.content?.message || msg.message || '').trim();

              if (!text) {
                continue;
              }

              const messageIdentity = getMessageIdentity(mappedMessage);
              if (seenMessageIds.has(messageIdentity)) {
                continue;
              }

              seenMessageIds.add(messageIdentity);
              refreshedMessages.push(mappedMessage);
            }

            const sortedMessages = normalizeMessageList(
              [...refreshedMessages].sort((left, right) => (left.createdAtMs || 0) - (right.createdAtMs || 0))
            );
            const effectiveLastRead =
                lastReadSyncRef.current[conversationId] ??
                chat.lastReadMessageId;

            const unread = countUnreadMessages(
                sortedMessages,
                effectiveLastRead
            );

            return {
              conversation: createConversationFromContext(context, existingConversation),
              messages: sortedMessages,
              unread,
            };
          })
        );

        const successfulUpdates = results
          .filter((item): item is PromiseFulfilledResult<{
            conversation: Conversation;
            messages: ChatMessage[];
            unread: number;
          }> => item.status === 'fulfilled')
          .map((item) => item.value);

        if (successfulUpdates.length === 0) {
          return;
        }

        setAcsMessagesByConversation((prev) => {
    const next = { ...prev };

    successfulUpdates.forEach(({ conversation, messages }) => {
        const previousMessages = prev[conversation.id] || [];

        const mergedAcsMessages = messages.map((msg) => {
    const existing = previousMessages.find(
        (m) => String(m.acsMessageId) === String(msg.acsMessageId)
    );

    return {
        ...msg,
        read:
    existing?.read ||
    (
        lastReadSyncRef.current[conversation.id] &&
        String(msg.acsMessageId) <=
            String(lastReadSyncRef.current[conversation.id])
    ) ||
    msg.read ||
    false,
    };
});

// Preserve messages that don't belong to ACS (AI/system messages)
const nonAcsMessages = previousMessages.filter(
    (m) => !m.acsMessageId
);

next[conversation.id] = [...mergedAcsMessages, ...nonAcsMessages].sort(
    (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
);
    });

    return next;
});

        setConversations((prev) => {
  const updates = successfulUpdates.map(({ conversation, messages, unread }) => ({
    ...conversation,
    lastMessage: getNewestMessage(messages)?.text || conversation.lastMessage,
    lastTime: getNewestMessage(messages)?.time || conversation.lastTime,
    unread,
  }));

  setSelectedId((prev) => {
  if (prev == null) {
    return conversationsRef.current[0]?.id ?? -999;
  }

  return prev;
});

  return prev.map((existing) => {
    const updated = updates.find((u) => u.id === existing.id);

    if (!updated) {
      return existing;
    }

    return {
      ...existing,
      lastMessage: updated.lastMessage,
      lastTime: updated.lastTime,
      unread: updated.unread,
    };
  });
});

        setUnreadMap((prev) => {
          const next = { ...prev };

          successfulUpdates.forEach(({ conversation, unread }) => {
            next[conversation.id] = unread;
          });

          return next;
        });
      };

      const batchSize = 3;
      for (let index = 0; index < normalizedChats.length; index += batchSize) {
        const batch = normalizedChats.slice(index, index + batchSize);
        // Keep the background refresh responsive when many threads exist.
        // eslint-disable-next-line no-await-in-loop
        await refreshBatch(batch);
      }
    } catch (error) {
      console.error('Failed to refresh ACS bootstrap state', error);
    }
  };


  useEffect(() => {
    if (!activeChatContext || selectedConversationId === -999) {
      return;
    }

    if (!open) {
      return;
    }

    if (selectedConversationId === null || selectedConversationId !== activeConversationId) {
      return;
    }

    void initializeACS(activeChatContext, selectedConversationId);
  }, [activeChatContext, activeConversationId, open, selectedConversationId]);

  useEffect(() => {
    void refreshBackendSessions();
    void refreshAcsBootstrapState();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!open) {
        void refreshBackendSessions();
        void refreshAcsBootstrapState();
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (backgroundChatBootstrapStartedRef.current) {
      return;
    }

    backgroundChatBootstrapStartedRef.current = true;

    scheduleBackgroundWork(() => {
      const bootstrapGlobalAcsChats = async () => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.email) {
          return;
        }

        try {
          const bootstrapChats = await acsChatService.bootstrapChats(currentUser.email);

          const normalizedChats = bootstrapChats
            .map((chat) => {
              const counterpartEmail = chat.counterpart?.email;
              const counterpartName = chat.counterpart?.name || counterpartEmail;

              if (!counterpartEmail) {
                return null;
              }

              const context: ChatContext = {
                threadId: chat.threadId,
                poNumber: chat.poNumber,
                fromEmail: currentUser.email,
                fromName: currentUser.name || currentUser.email,
                toEmail: counterpartEmail,
                toName: counterpartName || 'Chat',
              };

              return { chat, context };
            })
            .filter((item): item is { chat: BootstrapChatItem; context: ChatContext } => Boolean(item));

          const conversationsToAdd = normalizedChats.map(({ context }) => {
            const existingConversation = conversationsRef.current.find(
              (item) => item.id === hashString(context.poNumber || context.threadId || 'po-chat')
            );

            return createConversationFromContext(context, existingConversation);
          });

          setConversations((prev) => mergeConversations(prev, conversationsToAdd));

          const initializeInBatches = async () => {
            const batchSize = 3;

            for (let index = 0; index < normalizedChats.length; index += batchSize) {
              const batch = normalizedChats.slice(index, index + batchSize);

              await Promise.allSettled(
                batch.map(({ chat, context }) => {
                  const conversationId = hashString(chat.poNumber || chat.threadId || 'po-chat');
                  return initializeACS(context, conversationId, chat);
                })
              );

              await new Promise<void>((resolve) => {
                scheduleBackgroundWork(() => resolve());
              });
            }
          };

          void initializeInBatches();
        } catch (error) {
          console.error('Failed to bootstrap ACS conversations', error);
        }
      };

      void bootstrapGlobalAcsChats();
    });
  }, []);

  useEffect(() => {

      return () => {

          if (typingTimeoutRef.current) {
              clearTimeout(
                  typingTimeoutRef.current
              );
          }

      };

  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [
    selectedConversationMessages,
    selectedConversation?.messages?.length,
    isThinking,
  ]);

  const totalUnread = conversations
    .filter((conversation) => conversation.id !== -999)
    .reduce((sum, conversation) => sum + (conversation.unread || 0), 0);

    useEffect(() => {
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) Procurement Portal`;
        } else {
            document.title = "Procurement Portal";
        }
    }, [totalUnread]);

  return (
    <Box sx={{ position: 'fixed', bottom: 60, right: 16, zIndex: (theme) => theme.zIndex.drawer + 10 }}>
      {open ? (
        <Paper elevation={12} sx={{ width: 900, maxWidth: 'calc(100vw - 24px)', height: 680, maxHeight: 'calc(100vh - 24px)', display: 'flex', overflow: 'hidden', borderRadius: 3, alignItems: 'stretch' }}>
          
          {/* Sidebar */}
          <Box sx={{ width: 320, borderRight: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', backgroundColor: theme.palette.background.default, minHeight: 0 }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            </Box>

            <Box sx={{ px: 1, py: 1, flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <List disablePadding>
                {conversations.map((conversation) => (
                  <ListItem key={conversation.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton 
                      selected={selectedConversation?.id === conversation.id} 
                      onClick={() => handleSelectConversation(conversation.id)}
                      sx={{ borderRadius: 1, mx: 1 }}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={conversation.unread || null} color="primary">
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}> {getDisplayName(conversation.name).charAt(0)} </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={getDisplayName(conversation.name)}
                        secondary={getConversationPreview(conversation)}
                        primaryTypographyProps={{ fontWeight: 600 }} 
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          {/* Chat Window */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {isInitializingACS && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <CircularProgress />
                      <Typography variant="body2">
                        Loading chat...
                      </Typography>
                    </Box>
                  )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.background.paper }}>
              <Box>
                <Typography variant="subtitle1">
                  {selectedConversation && getDisplayName(selectedConversation.name)}
                  {selectedConversation?.poNumber && ` (${selectedConversation.poNumber})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">{selectedConversation?.role}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="Online" color="success" size="small" />
                <IconButton onClick={toggleOpen} aria-label="Close chat"><Close /></IconButton>
              </Box>
            </Box>

            {/* Message Stream */}
            <Box ref={messagesContainerRef} sx={{ flex: 1, minHeight: 0, px: 2, py: 2, overflowY: 'auto', backgroundColor: theme.palette.background.default }}>
              {
                (selectedConversation?.id === -999
                  ? selectedConversation?.messages
                  : selectedConversationMessages
                )?.map((message: any)  => (
                <Box key={message.id} sx={{ display: 'flex', justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start', mb: 1.2 }}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      maxWidth: '75%', 
                      p: message.fileType === 'image' ? 0.75 : 1.25, // Tighter padding for images
                      borderRadius: 1, 
                      bgcolor: message.sender === 'me' ? theme.palette.primary.main : theme.palette.action.hover, 
                      color: message.sender === 'me' ? theme.palette.primary.contrastText : 'inherit',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Media Render Routing */}
                    {message.fileType === 'image' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box 
                          component="img" 
                          src={message.fileUrl} 
                          alt={message.fileName} 
                          sx={{ maxWidth: '100%', maxHeight: 240, borderRadius: 1, objectFit: 'cover', display: 'block' }} 
                        />
                        {/* Render caption text beneath image if it exists */}
                        {message.text && message.text !== 'Sent an image' && (
                          <Typography variant="body2" sx={{ mt: 1, px: 0.5 }}>{message.text}</Typography>
                        )}
                      </Box>
                    ) : message.fileType === 'document' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* WhatsApp / Teams Style File Block */}
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5, 
                            p: 1, 
                            borderRadius: 1, 
                            bgcolor: message.sender === 'me' ? 'rgba(255,255,255,0.15)' : theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`
                          }}
                        >
                          <InsertDriveFile color={message.sender === 'me' ? "inherit" : "primary"} />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap fontWeight="medium">{message.fileName}</Typography>
                          </Box>
                          <IconButton 
                            size="small" 
                            component="a" 
                            href={message.fileUrl} 
                            download={message.fileName}
                            color="inherit"
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        </Box>
                        {message.text && !message.text.startsWith('📄 Attached:') && (
                          <Typography variant="body2">{message.text}</Typography>
                        )}
                      </Box>
                    ) : (
                      // Plain Text Message Layout
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }: React.PropsWithChildren) => (
                            <Typography
                              variant="body2"
                              sx={{
                                m: 0,
                                lineHeight: 1.4
                              }}
                            >
                              {children}
                            </Typography>
                          )
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    )}
                    
                    <Box
                        sx={{
                            display:'flex',
                            justifyContent:'flex-end',
                            gap:0.5
                        }}
                      >

                      <Typography
                        variant="caption"
                      >

                      {message.time}

                      </Typography>

                      {
                      message.sender==="me" && (

                          <Typography
                            variant="caption"
                          >

                            {
                              message.read
                                ? "✓✓"
                                : "✓"
                            }

                          </Typography>

                      )

                      }

                      </Box>
                  </Paper>
                </Box>
              ))}
              {
                isThinking &&
                selectedConversation?.id === -999 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      mb: 1.2
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 2
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          alignItems: 'center',

                          '& .ai-dot': {
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#666',
                            animation: 'aiBounce 1.4s infinite ease-in-out'
                          },

                          '& .dot2': {
                            animationDelay: '0.2s'
                          },

                          '& .dot3': {
                            animationDelay: '0.4s'
                          },

                          '@keyframes aiBounce': {
                            '0%, 80%, 100%': {
                              transform: 'translateY(0)',
                              opacity: 0.4
                            },
                            '40%': {
                              transform: 'translateY(-6px)',
                              opacity: 1
                            }
                          }
                        }}
                      >
                        <Box className="ai-dot dot1" />
                        <Box className="ai-dot dot2" />
                        <Box className="ai-dot dot3" />
                      </Box>

                    </Paper>
                  </Box>
                )
              }
              {/* Invisible anchor node to handle smooth scroll pinning */}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Input Action Tray */}
            <Box sx={{ p: 2, backgroundColor: theme.palette.background.paper }}>
              {selectedFile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, px: 1 }}>
                  <Chip 
                    label={`Ready to send: ${selectedFile.name}`} 
                    color="info" 
                    variant="outlined" 
                    onDelete={clearSelectedFile}
                    deleteIcon={<Clear />}
                    size="small"
                  />
                </Box>
              )}

              {
                isOtherUserTyping && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 2,
                        py: 1,
                        minHeight: 32,
                    }}
                >
                    <Avatar
                        sx={{
                            width: 22,
                            height: 22,
                            fontSize: 11,
                        }}
                    >
                        {selectedConversation
  ? getDisplayName(selectedConversation.name).charAt(0)
  : ""}
                    </Avatar>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            backgroundColor: "#F3F6FB",
                            px: 1.5,
                            py: 0.75,
                            borderRadius: "16px",
                        }}
                    >
                        {[0, 1, 2].map((i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: "primary.main",
                                    animation: "typingAnimation 1.2s infinite ease-in-out",
                                    animationDelay: `${i * 0.2}s`,
                                    "@keyframes typingAnimation": {
                                        "0%, 80%, 100%": {
                                            opacity: 0.3,
                                            transform: "translateY(0px)",
                                        },
                                        "40%": {
                                            opacity: 1,
                                            transform: "translateY(-4px)",
                                        },
                                    },
                                }}
                            />
                        ))}
                    </Box>

                    <Typography
                        variant="caption"
                        sx={{
                            color: "text.secondary",
                            fontStyle: "italic",
                            userSelect: "none",
                        }}
                    >
                        {selectedConversation
                          ? getDisplayName(selectedConversation.name)
                          : ""}{" "}
                        is typing...
                    </Typography>
                </Box>
                )
              }
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                />
                
                {/* <IconButton 
                  color={selectedFile ? "info" : "default"} 
                  onClick={() => fileInputRef.current?.click()} 
                  aria-label="Attach file"
                >
                  <AttachFile />
                </IconButton> */}

                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder={
                      selectedFile
                        ? "Add a caption..."
                        : `Message ${
                            selectedConversation
                              ? getDisplayName(selectedConversation.name)
                              : ""
                          }...`
                    }
                  value={draft} 
                  onChange={(event) => {

                      setDraft(event.target.value);

                      if (selectedConversation?.id !== -999) {
                          sendTypingNotification();
                      }

                  }}
                  // disabled={isInitializingACS}
                  onKeyDown={(event) => {
                      if (isInitializingACS) {
                          event.preventDefault();
                          return;
                      }

                      if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                      }
                  }}
                />
                
                <IconButton 
                  color="primary" 
                  onClick={handleSend} 
                  disabled={
                      isInitializingACS ||
                      (!draft.trim() && !selectedFile)
                  }
                  aria-label="Send message"
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>

          </Box>
        </Paper>
      ) : (
          <Badge
          badgeContent={
              totalUnread
          }
          color="error"
          invisible={totalUnread === 0}
        >
          <Fab
            color="primary"
            onClick={toggleOpen}
            aria-label="Open chat"
            size="large"
          >
            <Chat />
          </Fab>
        </Badge>
      )}
    </Box>
  );
};

export default ChatWidget;
