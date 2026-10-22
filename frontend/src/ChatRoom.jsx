import { useState, useEffect, useRef } from 'react';

const ChatRoom = ({ socket, username, room, role }) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);

  // Join room on mount and leave on unmount/room change
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('join_room', room);

    const fetchMessageHistory = async () => {
      setLoadingHistory(true);
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${BACKEND_URL}/api/messages/${encodeURIComponent(room)}`);
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          setMessageList(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch message history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchMessageHistory();

    return () => {
      socket.emit('leave_room', room);
    };
  }, [room, socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  // Listen for incoming messages targeted ONLY to this active room
  useEffect(() => {
    if (!socket) return;

    const receiveMessageHandler = (data) => {
      if (data && data.room === room) {
        setMessageList((prevList) => [...prevList, data]);
      }
    };

    socket.on('receive_message', receiveMessageHandler);

    return () => {
      socket.off('receive_message', receiveMessageHandler);
    };
  }, [socket, room]);

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    const trimmed = currentMessage.trim();
    if (!trimmed || !socket) return;

    const messageData = {
      room: room,
      author: username || (role === 'prof' ? 'Professor' : 'Student'),
      role: role || 'member',
      text: trimmed,
      time: formatCurrentTime(),
    };

    // Optimistically display the sent message
    setMessageList((list) => [...list, messageData]);
    setCurrentMessage('');

    socket.emit('send_message', messageData);
  };

  // Derive group badge label (e.g. "Group A" -> "A")
  const getBadgeLetter = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : name.charAt(0);
  };

  return (
    <div className="flex flex-col w-full max-w-[440px] h-[78vh] min-h-[550px] max-h-[800px] mx-auto bg-[#F9FAFB] sm:rounded-[36px] shadow-xl border-4 sm:border-8 border-gray-900 overflow-hidden relative">
      
      {/* Header */}
      <div className="flex items-center gap-3 bg-white px-5 py-4 border-b border-gray-200 z-10 shadow-sm">
        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-[#3390EC] font-bold text-lg shadow-inner">
          {getBadgeLetter(room)}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">{room}</h2>
          <span className="text-xs text-[#3390EC] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Discussion Group
          </span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
              Loading messages...
            </div>
          </div>
        ) : messageList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-gray-100 border border-gray-200 px-4 py-2 rounded-full text-xs text-gray-500 font-medium">
              No messages here yet. Start the conversation!
            </div>
          </div>
        ) : (
          messageList.map((msg, index) => {
            const isMe = msg.author === username;
            return (
              <div 
                key={msg._id || `${msg.room}-${index}-${msg.time}`} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[12px] font-medium text-gray-600 ml-1.5 mb-1">
                    {msg.author}
                  </span>
                )}
                <div 
                  className={`relative max-w-[85%] px-4 py-2.5 text-[14px] shadow-sm flex flex-col ${
                    isMe 
                      ? 'bg-[#3390EC] text-white rounded-2xl rounded-br-sm' 
                      : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-sm'
                  }`}
                >
                  <p className="leading-relaxed pr-10 break-words whitespace-pre-wrap">{msg.text}</p>
                  <span 
                    className={`text-[10px] self-end mt-1 ${
                      isMe ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Open to Everyone (Professors and Students) */}
      <div className="bg-white px-4 py-3 flex items-center gap-2.5 border-t border-gray-200 z-10">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 text-[14px] text-gray-900 rounded-full px-4 py-2.5 outline-none placeholder-gray-500 border border-transparent focus:bg-white focus:border-[#3390EC] focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <button 
          onClick={sendMessage} 
          disabled={!currentMessage.trim()}
          title="Send Message"
          className={`rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 transition-all ${
            currentMessage.trim() 
              ? 'bg-[#3390EC] text-white hover:bg-[#287ecf] shadow-md scale-100 cursor-pointer' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed scale-95'
          }`}
        >
          <svg className="w-5 h-5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>

    </div>
  );
};

export default ChatRoom;
