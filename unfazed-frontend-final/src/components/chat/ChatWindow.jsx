import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { acquireSocket, getSocket, releaseSocket } from '../../utils/socket';

export default function ChatWindow({ roomId, currentUserRole }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(roomId));
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (!roomId) return undefined;
    let mounted = true;
    const token = currentUserRole === 'client' ? localStorage.getItem('clientToken') : localStorage.getItem('therapistToken') || localStorage.getItem('token');
    if (!token) {
      setError('Your session has expired. Please log in again.');
      setLoading(false);
      return undefined;
    }

    const fetchHistory = async () => {
      try {
        const res = await axiosInstance.get(`/messages/${roomId}`);
        if (mounted) setMessages(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load chat history.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleConnectError = (err) => mounted && setError(err.message || 'Chat connection failed.');
    const handleConnect = () => {
      setError('');
      socket.emit('join-room', roomId, (result) => {
        if (!result?.ok && mounted) setError(result?.message || 'Could not join this conversation.');
      });
    };
    const handleReceive = (msg) => {
      if (!mounted || String(msg.roomId) !== String(roomId)) return;
      setMessages((prev) => prev.some((item) => item._id === msg._id) ? prev : [...prev, msg]);
      setIsOtherTyping(false);
    };
    const handleTyping = () => {
      if (!mounted) return;
      setIsOtherTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2000);
    };

    fetchHistory();
    acquireSocket(token);
    socket.on('connect_error', handleConnectError);
    socket.on('connect', handleConnect);
    socket.on('receive-message', handleReceive);
    socket.on('user-typing', handleTyping);
    if (socket.connected) handleConnect();

    return () => {
      mounted = false;
      socket.off('connect_error', handleConnectError);
      socket.off('connect', handleConnect);
      socket.off('receive-message', handleReceive);
      socket.off('user-typing', handleTyping);
      clearTimeout(typingTimeoutRef.current);
      releaseSocket();
    };
  }, [roomId, currentUserRole, socket]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOtherTyping]);

  const handleTextChange = (event) => {
    const value = event.target.value.slice(0, 4000);
    setText(value);
    if (roomId && socket.connected) socket.emit('typing', roomId);
  };

  const sendMessage = () => {
    const value = text.trim();
    if (!value || !roomId || !socket.connected || sending) return;
    setSending(true);
    setError('');
    socket.emit('send-message', { roomId, text: value }, (result) => {
      if (!result?.ok) {
        setError(result?.message || 'Could not send message.');
        setSending(false);
        return;
      }
      setText('');
      setSending(false);
    });
  };

  return (
    <div className="chat-window">
      <div className="chat-body" aria-live="polite">
        {loading && <p className="muted chat-status">Loading conversation…</p>}
        {!loading && messages.length === 0 && !error && <p className="muted chat-status">No messages yet. Start the conversation.</p>}
        {messages.map((msg, index) => (
          <div key={msg._id || `${msg.createdAt}-${index}`} className={`chat-bubble ${msg.senderRole === currentUserRole ? 'out' : 'in'}`}>
            {msg.text}
            <span className="chat-time">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        ))}
        {isOtherTyping && <div className="chat-bubble in"><i>Typing…</i></div>}
        <div ref={bottomRef} />
      </div>
      {error && <div className="error-msg" role="alert">{error}</div>}
      <div className="chat-input-row">
        <input aria-label="Message" type="text" maxLength={4000} value={text} onChange={handleTextChange} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Type a message..." />
        <button type="button" aria-label="Send message" onClick={sendMessage} className="chat-send" disabled={!text.trim() || sending || !socket.connected}>{sending ? '…' : '➤'}</button>
      </div>
    </div>
  );
}
