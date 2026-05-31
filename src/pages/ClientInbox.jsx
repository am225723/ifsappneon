import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Send, Check, CheckCheck, RefreshCw, ArrowLeft, Trash2, AlertTriangle
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const ClientInbox = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const isDark = theme.isDark;
  const client = clientAuth.getCurrentClient();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const selectedTherapistId = selectedTherapist?.id;
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const templateAppliedRef = useRef(false);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const loadTherapists = useCallback(async () => {
    if (!client?.id) return;
    const [{ data: msgData }, { data: assignmentData }] = await Promise.all([
      supabase
        .from('ifs_messages')
        .select('therapist_id')
        .eq('client_id', client.id),
      supabase
        .from('ifs_therapist_clients')
        .select('therapist_id, therapist_name')
        .eq('client_id', client.id)
        .eq('status', 'active')
    ]);

    const therapistIds = [...new Set([...(assignmentData?.map(a => a.therapist_id) || []), ...(msgData?.map(m => m.therapist_id) || [])].filter(Boolean))];
    if (therapistIds.length > 0) {
      const { data: therapistData } = await supabase
        .from('ifs_clients')
        .select('id, name')
        .in('id', therapistIds);
      const assignmentNames = Object.fromEntries((assignmentData || []).map(a => [a.therapist_id, a.therapist_name]));
      const mergedTherapists = therapistIds.map(id => {
        const profile = therapistData?.find(t => t.id === id);
        return profile || { id, name: assignmentNames[id] || 'Assigned therapist' };
      });
      setTherapists(mergedTherapists);
      if (!selectedTherapist && mergedTherapists.length > 0) {
        setSelectedTherapist(mergedTherapists[0]);
      }
    }
  }, [client?.id, selectedTherapist]);

  const loadMessages = useCallback(async () => {
    if (!client?.id || !selectedTherapistId) return;
    const { data } = await supabase
      .from('ifs_messages')
      .select('*')
      .eq('client_id', client.id)
      .eq('therapist_id', selectedTherapistId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);

    await supabase
      .from('ifs_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('client_id', client.id)
      .eq('therapist_id', selectedTherapistId)
      .eq('sender_role', 'therapist')
      .is('read_at', null);
  }, [client?.id, selectedTherapistId]);

  const loadUnread = useCallback(async () => {
    if (!client?.id) return;
    const { data } = await supabase
      .from('ifs_messages')
      .select('id')
      .eq('client_id', client.id)
      .eq('sender_role', 'therapist')
      .is('read_at', null);
    setUnreadCount(data?.length || 0);
  }, [client?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadTherapists();
      await loadUnread();
      setLoading(false);
    };
    init();
  }, [loadTherapists, loadUnread]);

  useEffect(() => {
    if (selectedTherapistId) {
      const timer = window.setTimeout(() => loadMessages(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [selectedTherapistId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const template = location.state?.messageTemplate;
    if (template && !templateAppliedRef.current) {
      const timer = window.setTimeout(() => {
        setNewMessage(template);
        templateAppliedRef.current = true;
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [location.state]);

  const [sendError, setSendError] = useState(null);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    if (!selectedTherapist) { setSendError('No advisor selected'); return; }
    if (!client?.id) { setSendError('Client session not found. Please log in again.'); return; }
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from('ifs_messages').insert({
      therapist_id: selectedTherapist.id,
      client_id: client.id,
      sender_role: 'client',
      body: newMessage.trim()
    });
    if (error) {
      console.error('Send message error:', error);
      setSendError(error.message || 'Failed to send message');
    } else {
      setNewMessage('');
      await loadMessages();
    }
    setSending(false);
  };

  const handleDelete = async (msgId) => {
    const { error } = await supabase.from('ifs_messages').delete().eq('id', msgId).eq('client_id', client.id);
    if (error) {
      console.error('Delete message error:', error);
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (therapists.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className={`${cardBg} rounded-2xl border ${cardBorder} p-8`}>
          <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${textMuted} opacity-20`} />
          <h2 className={`text-lg font-semibold ${textPrimary} mb-2`}>No Messages Yet</h2>
          <p className={`text-sm ${textMuted}`}>
            Your advisor hasn't sent you any messages yet. Messages will appear here when they reach out to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Messages</h1>
          <p className={`text-sm ${textMuted}`}>
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Chat with your advisor'}
          </p>
        </div>
      </div>

      {therapists.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {therapists.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTherapist(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedTherapist?.id === t.id
                  ? 'bg-blue-500 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`} style={{ height: 'calc(100vh - 280px)' }}>
        <div className={`flex items-center gap-3 p-4 border-b ${cardBorder}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {selectedTherapist?.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className={`text-sm font-semibold ${textPrimary}`}>{selectedTherapist?.name}</p>
            <p className={`text-xs ${textMuted}`}>Advisor</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100% - 130px)' }}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${textMuted} opacity-30`} />
              <p className={`text-sm ${textMuted}`}>No messages in this conversation</p>
            </div>
          ) : (
            messages.map(msg => {
              const isClient = msg.sender_role === 'client';
              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'} group`}>
                  {isClient && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isClient
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-md'
                      : isDark ? 'bg-slate-700 text-white rounded-bl-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isClient ? 'text-amber-100' : textMuted}`}>
                      <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                      {isClient && (
                        msg.read_at
                          ? <CheckCheck className="w-3 h-3" />
                          : <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  {!isClient && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-3 border-t ${cardBorder}`}>
          {location.state?.urgent && (
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Your message has been drafted. Edit anything you want, then send when ready. This inbox is not monitored 24/7.
            </div>
          )}
          {sendError && (
            <div className="px-3 py-2 mb-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-lg">
              {sendError}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              rows={1}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm resize-none ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInbox;
