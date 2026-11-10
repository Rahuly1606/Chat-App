import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { FileText } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    const latestMessage = messages.at(-1);
    if (messageEndRef.current && (shouldAutoScroll.current || latestMessage?.senderId === authUser._id)) {
      messageEndRef.current.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" });
    }
  }, [authUser._id, messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto h-full">
      <ChatHeader />

      <div
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3"
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 120;
        }}
      >
        {messages.map((message, index) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={index === messages.length - 1 ? messageEndRef : null}
          >
            <div className="chat-image avatar">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.jpg"
                      : selectedUser.profilePic || "/avatar.jpg"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col max-w-[85%] sm:max-w-[75%]">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="max-w-full sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.file && (
                <a 
                  href={message.file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mb-2 p-2 bg-base-300 rounded-md hover:bg-base-200 transition-colors"
                >
                  <FileText size={18} className="text-primary flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">
                      {message.file.name}
                    </span>
                    <span className="text-xs opacity-70">
                      {message.file.type === "application/pdf" ? "PDF" : 
                       message.file.type === "application/msword" ? "DOC" :
                       message.file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "DOCX" :
                       message.file.type === "text/plain" ? "TXT" : "File"}
                    </span>
                  </div>
                </a>
              )}
              {message.text && <p className="break-words">{message.text}</p>}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-base-content/60 p-4">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
