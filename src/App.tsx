import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Heart, Trash2, Mail, Wand2 } from 'lucide-react';
import { 
  saveEmailMessage, 
  getEmailMessages, 
  updateEmailLikes, 
  deleteEmailMessage,
  EmailMessage as FirebaseEmailMessage
} from './firebase';

interface Message {
  id: number | string;
  name: string;
  company: string;
  email: string;
  body: string;
  likes: number;
  color: string;
  timestamp: string;
}

const colors = [
  'bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-green-400',
  'bg-yellow-400', 'bg-red-400', 'bg-indigo-400', 'bg-teal-400'
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    body: '',
    signature: ''
  });
  const [sortBy, setSortBy] = useState<'latest' | 'likes'>('latest');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async (isLoadingMore = false) => {
    try {
      if (isLoadingMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const lastMessage = isLoadingMore && messages.length > 0 
        ? messages[messages.length - 1] 
        : undefined;

      const { messages: newMessages, hasMore: more } = await getEmailMessages(lastMessage as FirebaseEmailMessage);
      
      const formattedMessages = newMessages.map(msg => ({
        id: msg.id || '',
        name: msg.name,
        company: msg.company,
        email: msg.email,
        body: msg.body,
        likes: msg.likes,
        color: msg.color,
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp.toISOString() 
          : new Date(msg.timestamp.seconds * 1000).toISOString()
      }));

      if (isLoadingMore) {
        setMessages(prev => [...prev, ...formattedMessages]);
      } else {
        setMessages(formattedMessages);
      }
      
      setHasMore(more);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showNotification('Failed to load messages! ⚠️');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleLike = async (id: number | string) => {
    try {
      const messageToUpdate = messages.find(msg => msg.id === id);
      if (!messageToUpdate) return;

      const newLikes = messageToUpdate.likes + 1;
      
      if (typeof id === 'string') {
        await updateEmailLikes(id, newLikes);
      }
      
      setMessages(messages.map(msg =>
        msg.id === id ? { ...msg, likes: newLikes } : msg
      ));
      
      showNotification('Thanks for your like! 💖');
    } catch (error) {
      console.error('Error updating likes:', error);
      showNotification('Failed to update likes! ⚠️');
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      if (typeof id === 'string') {
        await deleteEmailMessage(id);
      }
      
      setMessages(messages.filter(msg => msg.id !== id));
      showNotification('Message deleted successfully! 🗑️');
    } catch (error) {
      console.error('Error deleting message:', error);
      showNotification('Failed to delete message! ⚠️');
    }
  };

  const handleRephrase = async () => {
    if (!formData.body.trim()) {
      showNotification('Please enter some text to rephrase! ⚠️');
      return;
    }

    setIsRephrasing(true);
    try {
      const response = await fetch('https://primary-production-166e.up.railway.app/webhook/a7be01bc-3899-462c-8e10-55198519f88b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formData.body,
          name: formData.name,
          company: formData.company,
          email: formData.email,
          signature: formData.signature
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const htmlResponse = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlResponse;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      setFormData(prev => ({ ...prev, body: textContent.trim() }));
      showNotification('Text rephrased successfully! ✨');
    } catch (error) {
      console.error('Error:', error);
      showNotification(`Failed to rephrase: ${error instanceof Error ? error.message : 'Unknown error'} ⚠️`);
    } finally {
      setIsRephrasing(false);
    }
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line.replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0')}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company || !formData.body || !formData.email) {
      showNotification('Please fill in all required fields! ⚠️');
      return;
    }

    if (!formData.email.includes('@')) {
      showNotification('Please enter a valid email address! ⚠️');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const emailMessage: Omit<FirebaseEmailMessage, 'timestamp'> = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        body: formData.body,
        likes: 0,
        color: color
      };
      
      const savedMessage = await saveEmailMessage(emailMessage);
      
      const newMessage: Message = {
        id: savedMessage.id || '',
        name: savedMessage.name,
        company: savedMessage.company,
        email: savedMessage.email,
        body: savedMessage.body,
        likes: savedMessage.likes,
        color: savedMessage.color,
        timestamp: savedMessage.timestamp instanceof Date 
          ? savedMessage.timestamp.toISOString() 
          : new Date().toISOString()
      };

      setMessages([newMessage, ...messages]);
      setFormData({ name: '', company: '', email: '', body: '', signature: '' });
      showNotification('Message posted successfully! 🎉');
    } catch (error) {
      console.error('Error saving message:', error);
      showNotification('Failed to post message! ⚠️');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedMessages = [...messages].sort((a, b) => {
    if (sortBy === 'likes') {
      return b.likes - a.likes;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative">
      {notification && (
        <div className="fixed top-4 right-4 bg-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}

      {/* Sidebar Form */}
      <div className="w-full md:w-1/3 bg-white p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Share Your Thoughts</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Company *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Company Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Message *</label>
            <div className="relative">
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                rows={4}
                placeholder="Share your thoughts..."
              />
              <button
                type="button"
                onClick={handleRephrase}
                disabled={isRephrasing}
                className="absolute bottom-2 right-2 text-indigo-500 hover:text-indigo-700 disabled:text-gray-400"
                title="Rephrase with AI"
              >
                <Wand2 size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Signature (optional)</label>
            <input
              type="text"
              value={formData.signature}
              onChange={(e) => setFormData({...formData, signature: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Your title or role"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center">
                <Send size={16} className="mr-2" />
                Share Message
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-2/3 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Messages ({messages.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
                ${sortBy === 'latest' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Latest
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
                ${sortBy === 'likes' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Most Liked
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Mail size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No messages yet</h3>
            <p className="text-gray-500">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`
                    ${message.color} chat-bubble rounded-2xl p-6 
                    transform hover:scale-105 transition-all duration-300 
                    shadow-lg group
                    animate-float animate-pulse-slow
                  `}
                  style={{ 
                    minHeight: `${100 + message.likes}px`,
                    animationDelay: `${index * 0.2}s`
                  }}
                >
                  <div className="flex items-start space-x-2 relative z-10">
                    <MessageCircle className="w-6 h-6 text-white" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-white text-lg">{message.name}</h3>
                          <p className="text-sm text-white/90 font-medium">{message.company}</p>
                          <div className="flex items-center mt-1 space-x-1">
                            <Mail className="w-4 h-4 text-white/80" />
                            <p className="text-sm text-white/90 font-medium break-all">{message.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white/80 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-white font-medium whitespace-pre-wrap font-mono">
                        {formatMessage(message.body)}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={() => handleLike(message.id)}
                          className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-white font-medium hover:bg-white/30 transition-colors duration-200"
                        >
                          <Heart className="w-4 h-4" />
                          <span>{message.likes}</span>
                        </button>
                        <span className="text-sm text-white/80">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchMessages(true)}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;