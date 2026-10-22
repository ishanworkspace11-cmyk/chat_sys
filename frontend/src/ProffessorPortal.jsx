import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatRoom from './ChatRoom';
import socket from './socket';

function getInitialUser() {
  try {
    const userStr = localStorage.getItem('cse_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      return {
        name: parsed.name || 'Professor',
        email: parsed.email || '',
      };
    }
  } catch (e) {
    console.error('Failed to parse user session:', e);
  }
  return { name: 'Professor', email: '' };
}

const ProffessorPortal = () => {
  const navigate = useNavigate();
  const [activeRoom, setActiveRoom] = useState(null);
  const [currentUser] = useState(getInitialUser);

  const handleLogout = () => {
    localStorage.removeItem('cse_user');
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-6 items-center">
      <div className="w-full max-w-4xl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">CSE Professor Dashboard</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#3390EC]">
                Faculty
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Signed in as <span className="font-semibold text-gray-800">{currentUser.name}</span>
              {currentUser.email && <span className="text-gray-400"> ({currentUser.email})</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {activeRoom && (
              <button 
                onClick={() => setActiveRoom(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm cursor-pointer"
              >
                ← Back to Dashboard
              </button>
            )}

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-200 text-sm cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {!activeRoom ? (
          <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Manage Broadcast Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Group A', 'Group B', 'Group C', 'Group D'].map((group) => (
                <button 
                  key={group}
                  onClick={() => setActiveRoom(group)}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-[#3390EC] hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-800 group-hover:text-[#3390EC] transition-colors block">
                        {group}
                      </span>
                      <span className="text-xs text-gray-400 font-medium mt-1">Official Broadcast Channel</span>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-blue-50 text-[#3390EC] flex items-center justify-center transition-transform group-hover:translate-x-1 font-semibold">
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
              username={currentUser.name} 
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
