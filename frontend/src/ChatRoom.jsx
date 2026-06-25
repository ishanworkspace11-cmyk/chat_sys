import React, { useState, useEffect, useRef } from 'react';

const ChatRoom = ({ socket, username, room, role }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit("join_room", room);

    const fetchMessageHistory = async () => {
      try {
        // Dynamic production API call
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${BACKEND_URL}/api/messages/${room}`);
        const result = await response.json();
        
        if (result.success) {
          setMessageList(result.data); 
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchMessageHistory();
  }, [room, socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room: room,
        author: username,
        text: currentMessage,
        time: new Date(Date.now()).getHours() + ":" + 
              String(new Date(Date.now()).getMinutes()).padStart(2, '0'),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage(""); 
    }
  };

  useEffect(() => {
    const receiveMessageHandler = (data) => {
      setMessageList((list) => [...list, data]);
    };
    socket.on("receive_message", receiveMessageHandler);
    return () => {
      socket.off("receive_message", receiveMessageHandler);
    };
  }, [socket]);

  return (
    <div className="flex flex-col w-full max-w-[400px] h-[880px] mx-auto bg-[#F9FAFB] sm:rounded-[40px] shadow-2xl border-[8px] border-gray-900 overflow-hidden relative">
      
      <div className="flex items-center gap-3 bg-white px-5 py-4 border-b border-gray-200 z-10">
        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
          {room.charAt(0)}
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">{room}</h2>
          <span className="text-sm text-blue-500 font-medium">Official Broadcast</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {messageList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-gray-200 px-4 py-1.5 rounded-full text-sm text-gray-500 font-medium">
              No messages here yet...
            </div>
          </div>
        ) : (
          messageList.map((msg, index) => {
            const isMe = msg.author === username;
            return (
              <div key={index} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-[13px] text-gray-500 ml-1 mb-1">{msg.author}</span>
                )}
                <div 
                  className={`relative max-w-[85%] px-3.5 py-2.5 text-[15px] shadow-sm flex flex-col ${
                    isMe 
                      ? "bg-[#3390EC] text-white rounded-2xl rounded-br-sm" 
                      : "bg-white text-gray-900 border border-gray-100 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  <p className="leading-relaxed pr-10 break-words">{msg.text}</p>
                  <span className={`text-[11px] absolute bottom-1.5 right-2 ${isMe ? "text-blue-100" : "text-gray-400"}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {role === 'prof' ? (
        <div className="bg-white px-4 pb-8 pt-4 flex items-center gap-3 border-t border-gray-200 z-10">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Broadcast a message..."
            className="flex-1 bg-gray-100 text-[16px] text-gray-900 rounded-full px-5 py-3.5 outline-none placeholder-gray-500 border border-transparent focus:bg-white focus:border-[#3390EC] focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button 
            onClick={sendMessage} 
            disabled={!currentMessage.trim()}
            className={`rounded-full w-[60px] h-[25px] flex items-center justify-center flex-shrink-0 transition-all ${
              currentMessage.trim() 
                ? "bg-[#3390EC] text-white hover:bg-[#287ecf] shadow-md scale-100" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed scale-95"
            }`}
          >
            <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 px-4 pb-10 pt-6 flex justify-center border-t border-gray-200 z-10">
          <span className="text-gray-500 text-sm font-medium bg-gray-200 px-4 py-2 rounded-full">
            Only professors can send messages here.
          </span>
        </div>
      )}

    </div>
  );
};

export default ChatRoom;