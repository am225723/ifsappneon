import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Send, Search, ChevronLeft, Check, CheckCheck,
  Clock, User, Shield, RefreshCw, Trash2, AlertCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';

const MESSAGE_BOUNDARY = 'Messages are checked during business hours and are not monitored for emergencies. If you are in immediate danger or experiencing a crisis, call 911 or your local crisis line.';

const TherapistMessages = () => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const therapist = clientAuth.getCurrentClient();

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const loadClients = useCallback(async () => {
    if (!therapist?.id) return;
    const data = await loadAssignedClients(therapist.id, 'id, name, status, last_active, user_role');
    setClients(data);
  }, [therapist?.id]);

  const loadUnreadCounts = useCallback(async () => {
    if (!therapist?.id) return;
    const { data, error } = await supabase
      .from('ifs_messages')
      .select('client_id')
      .eq('therapist_id', therapist.id)
      .eq('sender_role', 'client')
      .is('read_at', null);
    if (error) { console.error('Error loading unread counts:', error); return; }
    if (data) {
      const counts = {};
      data.forEach(m => { counts[m.client_id] = (counts[m.client_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  }, [therapist?.id]);

  const loadMessages = useCallback(async (clientId) => {
    if (!therapist?.id || !clientId) return;
    const { data } = await supabase
      .from('ifs_messages')
      .select('*')
      .eq('therapist_id', therapist.id)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);

    await supabase
      .from('ifs_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('therapist_id', therapist.id)
      .eq('client_id', clientId)
      .eq('sender_role', 'client')
      .is('read_at', null);

    setUnreadCounts(prev => ({ ...prev, [clientId]: 0 }));
  }, [therapist?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadClients();
      await loadUnreadCounts();
      setLoading(false);
    };
    init();
  }, [loadClients, loadUnreadCounts]);

  useEffect(() => {
    if (selectedClient) {
      loadMessages(selectedClient.id);
    }
  }, [selectedClient, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [sendError, setSendError] = useState(null);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    if (!selectedClient) { setSendError('No client selected'); return; }
    if (!therapist?.id) { setSendError('Therapist session not found. Please log in again.'); return; }
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from('ifs_messages').insert({
      therapist_id: therapist.id,
      client_id: selectedClient.id,
      sender_role: 'therapist',
      body: newMessage.trim(),
      is_urgent: false
    });
    if (error) {
      console.error('Send message error:', error);
      setSendError(error.message || 'Failed to send message');
    } else {
      setNewMessage('');
      await loadMessages(selectedClient.id);
    }
    setSending(false);
  };

  const handleDelete = async (msgId) => {
    const { error } = await supabase.from('ifs_messages').delete().eq('id', msgId).eq('therapist_id', therapist.id);
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

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickMessages = [
    "Great progress this week! Keep up the good work.",
    "Remember to practice your grounding exercises daily.",
    "How are you feeling after our last session?",
    "Don't forget to complete your homework assignment.",
    "I noticed your journal entries — wonderful self-reflection!",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Client Messages</h1>
          <p className={`text-sm ${textMuted}`}>Secure messaging with your assigned clients</p>
        </div>
      </div>

      <div className={`mb-4 rounded-xl border px-4 py-3 ${isDark ? 'bg-amber-900/20 border-amber-700/40 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{MESSAGE_BOUNDARY}</p>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`} style={{ height: 'calc(100vh - 220px)' }}>
        <div className="flex h-full">
          <div className={`w-80 border-r ${cardBorder} flex flex-col ${selectedClient ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
            <div className="p-3 border-b border-inherit">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search clients..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm ${textMuted}`}>No clients found</p>
                </div>
              ) : (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-all border-b ${cardBorder} ${
                      selectedClient?.id === client.id
                        ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                        : isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold truncate ${textPrimary}`}>{client.name}</p>
                        {unreadCounts[client.id] > 0 && (
                          <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                            {unreadCounts[client.id]}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${textMuted} flex items-center gap-1`}>
                        {client.user_role === 'therapist' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {client.user_role || 'client'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col ${!selectedClient ? 'hidden md:flex' : 'flex'}`}>
            {selectedClient ? (
              <>
                <div className={`flex items-center gap-3 p-4 border-b ${cardBorder}`}>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className={`md:hidden p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{selectedClient.name}</p>
                    <p className={`text-xs ${textMuted}`}>
                      {selectedClient.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${textMuted} opacity-30`} />
                      <p className={`text-sm ${textMuted}`}>No messages yet</p>
                      <p className={`text-xs ${textMuted} mt-1`}>Send a message to start the conversation</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isTherapist = msg.sender_role === 'therapist';
                      return (
                        <div key={msg.id} className={`flex ${isTherapist ? 'justify-end' : 'justify-start'} group`}>
                          {isTherapist && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isTherapist
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                              : isDark ? 'bg-slate-700 text-white rounded-bl-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isTherapist ? 'text-blue-100' : textMuted}`}>
                              <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                              {isTherapist && (
                                msg.read_at
                                  ? <CheckCheck className="w-3 h-3" />
                                  : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                          {!isTherapist && (
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
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {quickMessages.map((qm, i) => (
                      <button
                        key={i}
                        onClick={() => setNewMessage(qm)}
                        className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {qm.length > 40 ? qm.slice(0, 40) + '...' : qm}
                      </button>
                    ))}
                  </div>
                  {sendError && (
                    <div className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-lg">
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
                      className={`flex-1 px-4 py-2.5 rounded-xl border text-sm resize-none ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${textMuted} opacity-20`} />
                  <p className={`text-lg font-semibold ${textSecondary}`}>Select a client</p>
                  <p className={`text-sm ${textMuted} mt-1`}>Choose a client to view or send messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistMessages;
