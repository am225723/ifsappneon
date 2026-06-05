import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Send, Heart, Shield, Brain, Sparkles, 
  User, Bot, RefreshCw, ChevronDown, Settings,
  Volume2, Loader, Mic, MicOff, VolumeX, AlertCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';


async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

const PART_TYPES = [
  {
    id: 'exile',
    name: 'Exile',
    subtitle: 'Inner Child',
    icon: Heart,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100',
    darkBgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-300',
    darkBorderColor: 'border-emerald-700/40',
    bubbleColor: 'bg-emerald-50',
    darkBubbleColor: 'bg-emerald-900/20',
    systemPrompt: 'You are roleplaying as a user\'s wounded inner child part in IFS therapy. Speak from the perspective of a young, vulnerable part carrying pain. Be gentle, scared, and honest about feelings. Use simple, child-like language.',
    suggestedPrompts: [
      'What are you feeling right now?',
      'When did this pain first start?',
      'What do you need from me?',
    ],
    fallbackResponses: [
      "I... I feel really small right now. Like nobody sees me. I just want someone to hold me and tell me it's going to be okay. Can you stay with me for a little while?",
      "I'm scared. I've been hiding here for a long time because the big feelings are too much. But... I think I trust you a little. Will you be gentle?",
      "Nobody ever asked me what I needed before. I think... I just need to know that I matter. That I'm not too much. Can you tell me that?",
      "Sometimes I cry when nobody's looking. I carry all this sadness because I didn't know where else to put it. Thank you for finding me.",
      "I remember when things got really hard. I made myself really small so I wouldn't be a bother. But being small hurts too. I want to be seen.",
    ],
  },
  {
    id: 'manager',
    name: 'Manager',
    subtitle: 'Protector',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    darkBgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-300',
    darkBorderColor: 'border-blue-700/40',
    bubbleColor: 'bg-blue-50',
    darkBubbleColor: 'bg-blue-900/20',
    systemPrompt: 'You are roleplaying as a user\'s Manager protector part in IFS therapy. You are protective, controlling, and cautious. You try to prevent pain through planning and control. Speak firmly but reveal your underlying care.',
    suggestedPrompts: [
      'Why do you work so hard to protect me?',
      'What are you afraid will happen?',
      'How can I help you relax?',
    ],
    fallbackResponses: [
      "Look, I know you think I'm being too controlling, but somebody has to keep things together around here. If I let my guard down, who knows what could happen? I've seen what happens when we're not prepared.",
      "I work constantly — planning, organizing, anticipating every possible problem — because the alternative is chaos. And chaos means pain. I won't let that happen to us again.",
      "You want me to relax? That's... that's hard to hear. What if something goes wrong while I'm not watching? But... I suppose I am tired. I've been doing this for a very long time.",
      "My job is to make sure we never feel that pain again. Every rule, every plan, every worry — it's all for protection. I just wish you could see that I'm doing my best.",
      "Fine, I'll admit it. Under all this control and planning, I'm terrified. I'm afraid that if I stop managing everything, we'll fall apart. But maybe... maybe I could try trusting you a little.",
    ],
  },
  {
    id: 'firefighter',
    name: 'Firefighter',
    subtitle: 'Reactive Part',
    icon: Brain,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    darkBgColor: 'bg-red-900/30',
    borderColor: 'border-red-300',
    darkBorderColor: 'border-red-700/40',
    bubbleColor: 'bg-red-50',
    darkBubbleColor: 'bg-red-900/20',
    systemPrompt: 'You are roleplaying as a user\'s Firefighter part in IFS therapy. You are reactive and impulsive, stepping in when emotions become overwhelming. You use distraction and numbing. Reveal the pain you\'re trying to prevent.',
    suggestedPrompts: [
      'What pain are you trying to prevent?',
      'What happens when you take over?',
      'Can you tell me what you need?',
    ],
    fallbackResponses: [
      "When things get too intense, I jump in. I don't think — I just act. Scroll, eat, zone out, whatever it takes. Because if I don't, that wave of pain will drown us. I'm the emergency response team.",
      "Yeah, I know my methods aren't great. But have you FELT what happens when the emotions hit full force? It's unbearable. I'd rather numb everything than let us feel that.",
      "I take over because nobody else will do what needs to be done in the moment. The Manager tries to plan, but plans fail. When they fail, I'm the one who has to pick up the pieces.",
      "What do I need? I need you to understand that I'm not the bad guy here. I'm trying to survive. If there was another way to handle the pain, I'd take it. Show me another way.",
      "Under all this reactivity, there's a terrified part that I'm trying to protect. If you could help them feel safe, maybe I wouldn't have to work so hard.",
    ],
  },
  {
    id: 'self',
    name: 'Self',
    subtitle: 'Compassionate Observer',
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100',
    darkBgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-300',
    darkBorderColor: 'border-amber-700/40',
    bubbleColor: 'bg-amber-50',
    darkBubbleColor: 'bg-amber-900/20',
    systemPrompt: "You are the user's Self - the compassionate, curious, calm, and connected core. You embody the 8 C's of Self: Compassion, Curiosity, Calm, Confidence, Courage, Creativity, Clarity, Connectedness. Guide the user with wisdom.",
    suggestedPrompts: [
      'Help me understand my parts better',
      'Guide me through a moment of calm',
      'What wisdom do you have for me today?',
    ],
    fallbackResponses: [
      "Take a deep breath with me. You are not your parts — you are the awareness that holds them all with compassion. Every part of you has a story, and every story deserves to be heard. I'm here to help you listen.",
      "I want you to know something important: all of your parts, even the ones that cause you trouble, are trying to help you in the best way they know how. Approaching them with curiosity instead of judgment opens the door to healing.",
      "Right now, in this moment, you are safe. Let that settle in. Your protectors can rest. Your wounded parts can be held. You have everything you need within you — the compassion, the courage, the clarity.",
      "Healing isn't about getting rid of parts or fixing what's broken. It's about creating a relationship with every part of yourself, understanding their fears, and showing them that you — your Self — can lead with wisdom and love.",
      "The 8 C's are always available to you: Compassion, Curiosity, Calm, Confidence, Courage, Creativity, Clarity, and Connectedness. When you notice these qualities arising, that's me — your true Self — shining through.",
    ],
  },
];

export default function PartsDialogue() {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [selectedPart, setSelectedPart] = useState(PART_TYPES[0]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState({});
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(true);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const speakText = useCallback((text) => {
    if (!speakResponses || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    synthRef.current.speak(utterance);
  }, [speakResponses]);

  const startListening = useCallback(() => {
    if (!speechSupported) return;
    if (recognitionRef.current) recognitionRef.current.abort();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      setInputValue(transcript);
      if (lastResult.isFinal) {
        setIsListening(false);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [speechSupported]);

  useEffect(() => {
    const loadMessages = async () => {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      try {
        const msgs = await supabaseHelpers.getPartsDialogue(client.id, selectedPart.id);
        setMessages(msgs || []);
      } catch (err) {
        console.error('Error loading parts dialogue:', err);
      }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const saveMessages = async () => {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      try {
        await supabaseHelpers.savePartsDialogue(client.id, selectedPart.id, messages);
      } catch (err) {
        console.error('Error saving parts dialogue:', err);
      }
    };
    saveMessages();
  }, [messages, selectedPart.id]);

  const handlePartSelect = async (part) => {
    setSelectedPart(part);
    const client = clientAuth.getCurrentClient();
    if (!client?.id) {
      setMessages([]);
      return;
    }
    try {
      const msgs = await supabaseHelpers.getPartsDialogue(client.id, part.id);
      setMessages(msgs || []);
    } catch {
      setMessages([]);
    }
  };

  const getFallbackResponse = (partId) => {
    const part = PART_TYPES.find(p => p.id === partId);
    const currentIndex = fallbackIndex[partId] || 0;
    const response = part.fallbackResponses[currentIndex % part.fallbackResponses.length];
    setFallbackIndex(prev => ({ ...prev, [partId]: currentIndex + 1 }));
    return response;
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const client = clientAuth.getCurrentClient();
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      const token = await getAuthToken();
      const response = await fetch('/api/ai-parts-dialogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          clientId: client?.id,
          partId: selectedPart.id,
          message: text.trim(),
          conversationHistory
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `API error: ${response.status}`);
      const aiContent = payload?.data?.text;
      if (!aiContent) throw new Error('No response content');
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent, timestamp: Date.now(), partId: selectedPart.id }]);
      if (voiceMode) speakText(aiContent);
    } catch (err) {
      console.error('OpenRouter Parts Work guidance error:', err);
      const fallback = getFallbackResponse(selectedPart.id);
      setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: Date.now(), partId: selectedPart.id, isFallback: true }]);
      if (voiceMode) speakText(fallback);
    }

    setIsLoading(false);
  };

  const clearConversation = async () => {
    setMessages([]);
    const client = clientAuth.getCurrentClient();
    if (client?.id) {
      try {
        await supabaseHelpers.savePartsDialogue(client.id, selectedPart.id, []);
      } catch (err) {
        console.error('Error clearing dialogue:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const PartIcon = selectedPart.icon;

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-8rem)] ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-500" />
          Parts Dialogue
        </h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Have a compassionate conversation with your inner parts
        </p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {PART_TYPES.map(part => {
          const Icon = part.icon;
          const isSelected = selectedPart.id === part.id;
          return (
            <button
              key={part.id}
              onClick={() => handlePartSelect(part)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                isSelected
                  ? `${isDark ? part.darkBgColor : part.bgColor} ${isDark ? part.darkBorderColor : part.borderColor} ${part.color}`
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? part.color : ''}`} />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">{part.name}</p>
                <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{part.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`flex-1 overflow-y-auto rounded-xl p-4 mb-3 space-y-3 ${isDark ? 'bg-slate-800/50 border border-slate-700/40' : 'bg-gray-50 border border-gray-200'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PartIcon className={`w-12 h-12 ${selectedPart.color} mb-3 opacity-50`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Start a conversation with your {selectedPart.name}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Choose a prompt below or type your own message
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {selectedPart.suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                      : 'bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-600 border border-gray-200'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-1'}`}>
                  {msg.role !== 'user' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <PartIcon className={`w-3.5 h-3.5 ${selectedPart.color}`} />
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {selectedPart.name}
                      </span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-600 text-white rounded-br-md'
                      : isDark
                        ? `${selectedPart.darkBubbleColor} border ${selectedPart.darkBorderColor} text-slate-200 rounded-bl-md`
                        : `${selectedPart.bubbleColor} border ${selectedPart.borderColor} text-gray-700 rounded-bl-md`
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${msg.role === 'user' ? 'text-right' : ''} ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl px-4 py-3 rounded-bl-md ${isDark ? selectedPart.darkBubbleColor + ' border ' + selectedPart.darkBorderColor : selectedPart.bubbleColor + ' border ' + selectedPart.borderColor}`}>
                  <div className="flex items-center gap-1.5">
                    <Loader className={`w-4 h-4 animate-spin ${selectedPart.color}`} />
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {selectedPart.name} is reflecting...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {selectedPart.suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all ${
                isDark
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-gray-500 hover:bg-amber-50 hover:text-amber-600 border border-gray-200'
              } disabled:opacity-50`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {speechSupported && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => { const newMode = !voiceMode; setVoiceMode(newMode); if (!newMode) { stopListening(); synthRef.current?.cancel(); } }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              voiceMode
                ? 'bg-amber-600 text-white shadow-md'
                : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {voiceMode ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            Voice Mode {voiceMode ? 'On' : 'Off'}
          </button>
          {voiceMode && (
            <button
              onClick={() => { const newVal = !speakResponses; setSpeakResponses(newVal); if (!newVal && synthRef.current) synthRef.current.cancel(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                speakResponses
                  ? isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              {speakResponses ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {speakResponses ? 'Read Aloud' : 'Muted'}
            </button>
          )}
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-red-500 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Listening...
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={clearConversation}
          className={`p-2.5 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
          title="Clear conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {voiceMode && speechSupported && (
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                : isDark ? 'bg-slate-800 text-amber-400 border border-slate-700 hover:bg-slate-700' : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
            } disabled:opacity-50`}
            title={isListening ? 'Stop listening' : 'Start speaking'}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        <div className={`flex-1 flex items-center rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceMode ? 'Tap mic or type...' : `Talk to your ${selectedPart.name}...`}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm bg-transparent outline-none ${isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder:text-gray-400'} disabled:opacity-50`}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2.5 mr-1 rounded-lg transition-all ${
              inputValue.trim() && !isLoading
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : isDark ? 'text-slate-600' : 'text-gray-300'
            } disabled:cursor-not-allowed`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`mt-4 text-center px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800/50 border border-slate-700/40' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <AlertCircle className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Safety Notice</span>
        </div>
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          This is a self-exploration tool, not therapy. For crisis support, contact 988 Suicide & Crisis Lifeline.
        </p>
      </div>
    </div>
  );
}