import React, { useState } from 'react';
import ChatRoom from './ChatRoom';
import { io } from 'socket.io-client';

// Dynamic production socket connection
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

const ProffessorPortal = ({ username = "Professor" }) => {
  const [activeRoom, setActiveRoom] = useState(null);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-6 items-center">
      <div className="w-full max-w-4xl">
        
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CSE Professor Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Broadcast to your academic groups, {username}</p>
          </div>
          
          {activeRoom && (
            <button 
              onClick={() => setActiveRoom(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          )}
        </div>

        {!activeRoom ? (
          <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Manage Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Group A', 'Group B', 'Group C', 'Group D'].map((group) => (
                <button 
                  key={group}
                  onClick={() => setActiveRoom(group)}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-[#3390EC] hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-800 group-hover:text-[#3390EC] transition-colors block">
                        {group}
                      </span>
                      <span className="text-xs text-gray-400 font-medium mt-1">Official Broadcast</span>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-blue-50 text-[#3390EC] flex items-center justify-center transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ChatRoom 
              socket={socket} 
              username={username} 
              room={activeRoom} 
              role="prof" 
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ProffessorPortal;