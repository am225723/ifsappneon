import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Timer, Mic, MicOff, Volume2, VolumeX,
  Heart, Wind, Eye, Sun, Moon, Waves, Sparkles, ChevronRight,
  ChevronLeft, Download, Trash2, Clock, CheckCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { useData } from '../contexts/DataContext';

const MEDITATIONS = [
  {
    id: 'self-energy',
    title: 'Connect with Self Energy',
    duration: 300,
    icon: Sun,
    color: 'amber',
    category: 'foundation',
    audioSrc: '/audio/meditations/cultivating-self-energy.mp3',
    steps: [
      { time: 0, text: "Find a comfortable position. Close your eyes if that feels safe. Take three deep breaths, letting each exhale be longer than the inhale.", duration: 30 },
      { time: 30, text: "Begin to notice your body. Feel the weight of your body being supported. There's nothing you need to do right now except be present.", duration: 30 },
      { time: 60, text: "Bring your attention to the center of your chest — your heart space. Imagine a warm, golden light beginning to glow there.", duration: 30 },
      { time: 90, text: "This warm light is your Self energy. It has always been there. It is calm, curious, compassionate, and clear.", duration: 30 },
      { time: 120, text: "With each breath, let this golden light expand. Feel it filling your chest, your shoulders, your arms.", duration: 30 },
      { time: 150, text: "Now let it flow down through your belly, your legs, all the way to your toes. You are filled with Self energy.", duration: 30 },
      { time: 180, text: "From this place of Self, notice if any parts of you want your attention. You don't need to fix anything. Just notice with curiosity.", duration: 40 },
      { time: 220, text: "If a part appears, silently say to it: 'I see you. I'm here. You don't have to carry this alone.'", duration: 40 },
      { time: 260, text: "Take a few more breaths in this warm, connected space. Know that you can return here anytime you need.", duration: 30 },
      { time: 290, text: "Slowly bring your awareness back to the room. Wiggle your fingers and toes. When you're ready, open your eyes.", duration: 10 },
    ]
  },
  {
    id: 'parts-check-in',
    title: 'Parts Check-In',
    duration: 240,
    icon: Heart,
    color: 'rose',
    category: 'parts-work',
    audioSrc: '/audio/meditations/parts-check-in.mp3',
    steps: [
      { time: 0, text: "Settle into stillness. Take three slow breaths. With each exhale, release any tension you're holding.", duration: 25 },
      { time: 25, text: "Turn your attention inward. Gently ask: 'Who's here right now? Which parts of me want to be noticed?'", duration: 30 },
      { time: 55, text: "Wait patiently. A part might show up as a feeling, an image, a thought, or a sensation in your body.", duration: 30 },
      { time: 85, text: "When you notice a part, greet it with warmth. Ask: 'What do you want me to know?' Listen without judgment.", duration: 40 },
      { time: 125, text: "Thank this part for showing up. Ask: 'What do you need from me right now?' Simply listen.", duration: 40 },
      { time: 165, text: "Send this part compassion and understanding. Let it know that you, the Self, are here and paying attention.", duration: 35 },
      { time: 200, text: "Check if any other parts want to be acknowledged. If so, repeat the process of greeting and listening.", duration: 25 },
      { time: 225, text: "Thank all parts that showed up. Take a final deep breath and slowly return to the present moment.", duration: 15 },
    ]
  },
  {
    id: 'inner-safe-place',
    title: 'Create an Inner Safe Place',
    duration: 360,
    icon: Waves,
    color: 'cyan',
    category: 'grounding',
    audioSrc: '/audio/meditations/inner-safe-place.mp3',
    steps: [
      { time: 0, text: "Close your eyes and take five deep, slow breaths. With each breath, let yourself sink deeper into relaxation.", duration: 30 },
      { time: 30, text: "Imagine yourself walking along a peaceful path. The air is warm and gentle. You feel safe.", duration: 30 },
      { time: 60, text: "Ahead, you see a place that feels completely safe — it could be a meadow, a beach, a cozy room, or anywhere that feels right.", duration: 30 },
      { time: 90, text: "Step into this place. Look around. What do you see? Notice the colors, the light, the textures.", duration: 30 },
      { time: 120, text: "What do you hear? Maybe birds singing, water flowing, or peaceful silence. Let the sounds comfort you.", duration: 30 },
      { time: 150, text: "What do you feel? The ground beneath you, the temperature of the air, a gentle breeze perhaps.", duration: 30 },
      { time: 180, text: "Find a comfortable spot to rest. Sit or lie down. This is your sacred space. No one can enter without your permission.", duration: 40 },
      { time: 220, text: "In this safe place, you are free from worry, free from pain, free from the demands of the world.", duration: 30 },
      { time: 250, text: "If any part of you is hurting, you can invite it here. Show it this safe place. Tell it: 'You can rest here.'", duration: 40 },
      { time: 290, text: "Spend a moment just being here. Absorb the peace. Know that this place lives inside you always.", duration: 40 },
      { time: 330, text: "Slowly begin to return. Bring the feeling of safety with you. Wiggle your fingers, take a deep breath, and open your eyes.", duration: 30 },
    ]
  },
  {
    id: 'protector-appreciation',
    title: 'Appreciate Your Protectors',
    duration: 300,
    icon: Eye,
    color: 'purple',
    category: 'parts-work',
    audioSrc: '/audio/meditations/protector-appreciation.mp3',
    steps: [
      { time: 0, text: "Get comfortable and take several calming breaths. Let yourself settle into a quiet, receptive state.", duration: 25 },
      { time: 25, text: "Think about a protector part — a part that works hard to keep you safe, even if it sometimes causes problems.", duration: 30 },
      { time: 55, text: "Notice where this protector lives in your body. It might feel like tension, tightness, or energy somewhere.", duration: 30 },
      { time: 85, text: "Instead of wanting it to change, try something different. Say: 'I see how hard you work. Thank you for protecting me.'", duration: 35 },
      { time: 120, text: "Notice what happens. The protector might soften, or it might be surprised. Just stay present with it.", duration: 30 },
      { time: 150, text: "Ask: 'What are you afraid would happen if you stopped protecting me?' Listen with genuine curiosity.", duration: 40 },
      { time: 190, text: "Whatever it shares, respond with understanding: 'That makes sense. I understand why you work so hard.'", duration: 30 },
      { time: 220, text: "Ask: 'Is there anything you need from me?' Let the protector know that you, the Self, are growing stronger.", duration: 40 },
      { time: 260, text: "Send this protector gratitude and compassion. It has been doing its best with what it knows.", duration: 25 },
      { time: 285, text: "Take a deep breath. Carry this appreciation with you as you gently return to the present.", duration: 15 },
    ]
  },
  {
    id: 'body-scan-ifs',
    title: 'IFS Body Scan',
    duration: 360,
    icon: Wind,
    color: 'emerald',
    category: 'grounding',
    audioSrc: '/audio/meditations/ifs-body-scan.mp3',
    steps: [
      { time: 0, text: "Lie down or sit comfortably. Close your eyes. Take three deep breaths to center yourself.", duration: 25 },
      { time: 25, text: "Bring your attention to the top of your head. Notice any sensations — tingling, warmth, pressure, or nothing at all.", duration: 30 },
      { time: 55, text: "Move your awareness down to your face. Notice your forehead, eyes, jaw. Are any parts holding tension here?", duration: 30 },
      { time: 85, text: "Scan through your neck and shoulders. These areas often hold protector energy. Notice without trying to change anything.", duration: 35 },
      { time: 120, text: "Move into your chest and heart area. This is where many people feel their exile's pain or their Self energy. What do you notice?", duration: 35 },
      { time: 155, text: "If you notice a strong sensation, pause here. Ask: 'Is this a part? What does it want me to know?'", duration: 35 },
      { time: 190, text: "Continue down to your belly. The gut often holds intuition and younger parts. Breathe into this space.", duration: 30 },
      { time: 220, text: "Scan through your hips, legs, and feet. Notice any areas of holding, numbness, or warmth.", duration: 30 },
      { time: 250, text: "Now expand your awareness to your whole body at once. You are a living system of parts, all working together.", duration: 35 },
      { time: 285, text: "Send appreciation to your entire body and all the parts living within it. They are all welcome here.", duration: 35 },
      { time: 320, text: "Take three more deep breaths. Slowly open your eyes and return to the room, carrying awareness with you.", duration: 40 },
    ]
  },
  {
    id: 'compassion-breath',
    title: 'Compassion Breathing',
    duration: 180,
    icon: Moon,
    color: 'indigo',
    category: 'foundation',
    audioSrc: '/audio/meditations/compassion-breathing.mp3',
    steps: [
      { time: 0, text: "Sit quietly. Place one hand on your heart and one on your belly. Feel the warmth of your own touch.", duration: 20 },
      { time: 20, text: "Breathe in slowly for 4 counts. Hold for 4 counts. Breathe out for 6 counts. Repeat this pattern.", duration: 30 },
      { time: 50, text: "As you breathe in, imagine inhaling golden compassion. As you exhale, release any judgment or criticism.", duration: 30 },
      { time: 80, text: "With each breath, silently repeat: 'I am worthy of compassion. I am worthy of love. I am enough.'", duration: 30 },
      { time: 110, text: "If a critical part speaks up, acknowledge it gently: 'I hear you. Right now, we're practicing compassion.'", duration: 30 },
      { time: 140, text: "Feel the warmth under your hands. Your body is responding to your own kindness. This is Self energy.", duration: 25 },
      { time: 165, text: "Take one final deep breath of compassion. Carry this warmth with you into the rest of your day.", duration: 15 },
    ]
  },
  {
    id: 'exile-healing',
    title: 'Healing Your Exile',
    duration: 360,
    icon: Heart,
    color: 'pink',
    category: 'parts-work',
    audioSrc: '/audio/meditations/exile-healing.mp3',
    steps: [
      { time: 0, text: "Find a quiet, comfortable space. Close your eyes and take several slow breaths. Let your body settle and your mind grow still.", duration: 30 },
      { time: 30, text: "From your Self — that calm, wise center within you — gently turn your attention inward. You are looking for a younger part, an exile, who carries old pain.", duration: 35 },
      { time: 65, text: "You may sense this part as a child version of yourself, or as a feeling, an image, or a memory. Let it come to you naturally.", duration: 30 },
      { time: 95, text: "Notice where this part lives in your body. Perhaps your chest, your stomach, or your throat. Breathe warmth toward that area.", duration: 30 },
      { time: 125, text: "Let this young part know you see it. Say gently: 'I'm here now. I see you. You are not alone anymore.'", duration: 35 },
      { time: 160, text: "Ask this part: 'What happened to you? What do you want me to know?' Listen with your heart, not your head.", duration: 40 },
      { time: 200, text: "Whatever this part shares — sadness, fear, loneliness — receive it with compassion. You don't need to fix it. Just witness it.", duration: 35 },
      { time: 235, text: "Ask: 'What do you need from me right now?' It might need comfort, safety, to be held, or simply to be believed.", duration: 35 },
      { time: 270, text: "Offer this part exactly what it needs. Imagine yourself holding, comforting, or protecting this young one.", duration: 35 },
      { time: 305, text: "Let this part know: 'You don't have to carry this alone anymore. I am here. I am strong enough now.'", duration: 30 },
      { time: 335, text: "Take a few deep breaths. Thank this exile for trusting you. Slowly return your awareness to the room.", duration: 25 },
    ]
  },
  {
    id: 'grounding-anchor',
    title: 'Grounding Anchor',
    duration: 180,
    icon: Waves,
    color: 'teal',
    category: 'grounding',
    audioSrc: '/audio/meditations/grounding-anchor.mp3',
    steps: [
      { time: 0, text: "Press your feet firmly into the floor. Feel the solid ground beneath you. You are here. You are safe. You are present.", duration: 25 },
      { time: 25, text: "Name five things you can see. Look around slowly. Notice colors, shapes, light. Let each observation anchor you here.", duration: 25 },
      { time: 50, text: "Name four things you can touch. Feel the texture of your clothing, the chair beneath you, the air on your skin.", duration: 25 },
      { time: 75, text: "Name three things you can hear. Perhaps distant sounds, your own breathing, the hum of the room.", duration: 25 },
      { time: 100, text: "Name two things you can smell. Breathe deeply. Notice whatever scents are present, even subtle ones.", duration: 20 },
      { time: 120, text: "Name one thing you can taste. Notice the taste in your mouth right now, whatever it may be.", duration: 20 },
      { time: 140, text: "Place both hands on your chest. Feel your heartbeat. This rhythm has been with you since before you were born. It is your anchor.", duration: 25 },
      { time: 165, text: "Take three final breaths. You are grounded. You are present. You are safe. Carry this groundedness with you.", duration: 15 },
    ]
  },
  {
    id: 'inner-child-play',
    title: 'Inner Child Reconnection',
    duration: 300,
    icon: Sparkles,
    color: 'yellow',
    category: 'parts-work',
    audioSrc: '/audio/meditations/inner-child-reconnection.mp3',
    steps: [
      { time: 0, text: "Close your eyes and smile gently. Today, you are going to reconnect with the playful, joyful part of your younger self.", duration: 25 },
      { time: 25, text: "Imagine yourself walking into a beautiful garden. The sun is warm, flowers are blooming, and you feel light and free.", duration: 30 },
      { time: 55, text: "In this garden, you see a child — your inner child. Notice how old they are, what they look like, what they're doing.", duration: 30 },
      { time: 85, text: "Walk toward them slowly. Kneel down so you're at their eye level. Let them see your face — kind, warm, loving.", duration: 30 },
      { time: 115, text: "Ask your inner child: 'What would you like to do together?' Maybe they want to play, draw, run, dance, or just sit together.", duration: 35 },
      { time: 150, text: "Join them in whatever they choose. Let yourself feel the joy of play, the freedom of being a child with no responsibilities.", duration: 40 },
      { time: 190, text: "As you play together, tell your inner child: 'I love spending time with you. You matter to me. Your joy matters.'", duration: 30 },
      { time: 220, text: "Ask: 'What else do you need from me?' Listen to what comes up — perhaps more play, more attention, more laughter in daily life.", duration: 35 },
      { time: 255, text: "Give your inner child a warm hug. Promise to visit this garden again soon. This connection is always available to you.", duration: 30 },
      { time: 285, text: "Slowly bring your awareness back to the present. Carry the warmth of this connection into your day.", duration: 15 },
    ]
  },
  {
    id: 'release-tension',
    title: 'Tension Release & Letting Go',
    duration: 240,
    icon: Wind,
    color: 'sky',
    category: 'grounding',
    audioSrc: '/audio/meditations/tension-release.mp3',
    steps: [
      { time: 0, text: "Sit or lie down comfortably. Take a deep breath and let out a long, slow sigh. Give yourself permission to release.", duration: 25 },
      { time: 25, text: "Squeeze your fists tightly for five seconds. Feel the tension build. Now release. Notice the relief as your hands soften.", duration: 25 },
      { time: 50, text: "Lift your shoulders up to your ears. Hold the tension. Now drop them. Feel the weight fall away.", duration: 25 },
      { time: 75, text: "Clench your jaw tightly. Hold for a moment. Now let it go. Let your mouth fall slightly open. Feel the release.", duration: 25 },
      { time: 100, text: "Tighten your whole face — scrunch everything up. Hold. Now release completely. Feel your face smooth and soft.", duration: 25 },
      { time: 125, text: "Tense your whole body — every muscle. Hold for five seconds. And release everything at once. Feel the wave of relaxation.", duration: 30 },
      { time: 155, text: "Now scan your body for any remaining tension. Wherever you find it, breathe into that area and imagine it melting away.", duration: 30 },
      { time: 185, text: "Ask yourself: 'What emotional weight am I carrying today?' Name it silently. Then imagine setting it down beside you.", duration: 30 },
      { time: 215, text: "Take three cleansing breaths. You have released what you can. What remains, you can carry more lightly. Open your eyes gently.", duration: 25 },
    ]
  },
  {
    id: 'self-forgiveness',
    title: 'Self-Forgiveness Practice',
    duration: 300,
    icon: Sun,
    color: 'orange',
    category: 'foundation',
    audioSrc: '/audio/meditations/self-forgiveness.mp3',
    steps: [
      { time: 0, text: "Settle into a comfortable position. Close your eyes. Place a hand over your heart and feel its steady rhythm.", duration: 25 },
      { time: 25, text: "Think of something you've been holding against yourself — a mistake, a regret, a way you feel you've fallen short.", duration: 30 },
      { time: 55, text: "Notice the part of you that carries guilt or shame about this. Where does it live in your body? Acknowledge it gently.", duration: 30 },
      { time: 85, text: "Recognize that this part has been trying to make you better by holding onto this pain. Thank it for its intention.", duration: 30 },
      { time: 115, text: "Now, from your Self, speak to this part: 'You were doing the best you could with what you knew at the time.'", duration: 30 },
      { time: 145, text: "Repeat silently: 'I forgive myself for being human. I forgive myself for not knowing then what I know now.'", duration: 30 },
      { time: 175, text: "Imagine the guilt or shame as a heavy stone you've been carrying. Set it down. You don't need it to grow.", duration: 30 },
      { time: 205, text: "Feel the lightness as you release this weight. Breathe into the space that opens up. Fill it with compassion.", duration: 35 },
      { time: 240, text: "Tell yourself: 'I am worthy of forgiveness. I am learning. I am growing. That is enough.'", duration: 30 },
      { time: 270, text: "Take three deep breaths of self-compassion. Open your eyes when ready, carrying this forgiveness forward.", duration: 30 },
    ]
  },
  {
    id: 'morning-intention',
    title: 'Morning Intention Setting',
    duration: 180,
    icon: Sparkles,
    color: 'amber',
    category: 'foundation',
    audioSrc: '/audio/meditations/morning-intention.mp3',
    steps: [
      { time: 0, text: "Good morning. Before the day carries you away, take this moment to arrive fully. Three deep breaths.", duration: 20 },
      { time: 20, text: "Check in with your system. How are you feeling right now? What parts are already active this morning?", duration: 25 },
      { time: 45, text: "Acknowledge whatever is present without judgment. 'I notice I'm feeling...' Just observe.", duration: 25 },
      { time: 70, text: "Now, set an intention for today. Not a task — an intention. How do you want to show up? What quality do you want to lead with?", duration: 30 },
      { time: 100, text: "Perhaps today your intention is patience, or courage, or presence, or gentleness with yourself.", duration: 25 },
      { time: 125, text: "Speak your intention silently: 'Today, I choose to lead with...' Let it settle into your body.", duration: 25 },
      { time: 150, text: "Take one final breath. Carry your intention like a compass guiding you through whatever this day brings. You are ready.", duration: 30 },
    ]
  }
];

const TIMER_PRESETS = [60, 120, 180, 300, 600];

export default function GuidedMeditation() {
  const { theme } = useTheme();
  const { awardXP } = useData();
  const isDark = theme.isDark;

  const [selectedMeditation, setSelectedMeditation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [view, setView] = useState('list');

  const [timerMode, setTimerMode] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerPlaying, setTimerPlaying] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [recordingError, setRecordingError] = useState(null);
  const recordingSupported = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof MediaRecorder !== 'undefined';
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState(0.85);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(null);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const lastSpokenStepRef = useRef(-1);

  const audioRef = useRef(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const hasAudio = selectedMeditation?.audioSrc && audioLoaded && !audioError;

  const [completedMeditations, setCompletedMeditations] = useState([]);

  useEffect(() => {
    const loadCompleted = async () => {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      try {
        const data = await supabaseHelpers.getInteractiveData(client.id, 'meditation_history');
        if (data?.completed) setCompletedMeditations(data.completed);
      } catch (e) { console.error(e); }
    };
    loadCompleted();
  }, []);

  useEffect(() => {
    if (ttsSupported) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const speakText = useCallback((text) => {
    if (!voiceEnabled || !synthRef.current || !ttsSupported) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('samantha'))
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [voiceEnabled, voiceRate]);

  useEffect(() => {
    if (!isPlaying || !selectedMeditation || !voiceEnabled) return;
    if (hasAudio) return;
    if (currentStepIdx !== lastSpokenStepRef.current) {
      lastSpokenStepRef.current = currentStepIdx;
      const step = selectedMeditation.steps[currentStepIdx];
      if (step) speakText(step.text);
    }
  }, [currentStepIdx, isPlaying, selectedMeditation, voiceEnabled, speakText, hasAudio]);

  const saveCompletion = useCallback(async (medId) => {
    const client = clientAuth.getCurrentClient();
    if (!client?.id) return;
    const updated = [...new Set([...completedMeditations, medId])];
    setCompletedMeditations(updated);
    try {
      await supabaseHelpers.saveInteractiveData(client.id, 'meditation_history', {
        completed: updated,
        lastCompleted: medId,
        lastCompletedAt: new Date().toISOString()
      });
      awardXP(15);
    } catch (e) { console.error(e); }
  }, [completedMeditations, awardXP]);

  useEffect(() => {
    if (!selectedMeditation?.audioSrc) {
      setAudioLoaded(false);
      setAudioError(false);
      return;
    }
    setAudioLoaded(false);
    setAudioError(false);
    const audio = new Audio(selectedMeditation.audioSrc);
    audio.preload = 'auto';
    audio.volume = audioVolume;
    audio.oncanplaythrough = () => setAudioLoaded(true);
    audio.onerror = () => setAudioError(true);
    audio.onended = () => {
      setIsPlaying(false);
      setCompleted(true);
      saveCompletion(selectedMeditation.id);
    };
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [selectedMeditation?.id, selectedMeditation?.audioSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);



  useEffect(() => {
    if (!isPlaying || !selectedMeditation) return;
    intervalRef.current = setInterval(() => {
      let currentTime;
      if (hasAudio && audioRef.current) {
        currentTime = Math.floor(audioRef.current.currentTime);
      } else {
        currentTime = null;
      }

      setElapsed(prev => {
        const next = currentTime !== null ? currentTime : prev + 1;
        if (!hasAudio && next >= selectedMeditation.duration) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          setCompleted(true);
          saveCompletion(selectedMeditation.id);
          return selectedMeditation.duration;
        }
        const stepIdx = selectedMeditation.steps.findIndex((s, i) => {
          const nextStep = selectedMeditation.steps[i + 1];
          return next >= s.time && (!nextStep || next < nextStep.time);
        });
        if (stepIdx >= 0) setCurrentStepIdx(stepIdx);
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, selectedMeditation, saveCompletion, hasAudio]);

  useEffect(() => {
    if (!timerPlaying) return;
    timerIntervalRef.current = setInterval(() => {
      setTimerElapsed(prev => {
        if (prev + 1 >= timerDuration) {
          clearInterval(timerIntervalRef.current);
          setTimerPlaying(false);
          return timerDuration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timerIntervalRef.current);
  }, [timerPlaying, timerDuration]);

  const startMeditation = (med) => {
    setSelectedMeditation(med);
    setElapsed(0);
    setCurrentStepIdx(0);
    setCompleted(false);
    setView('meditation');
    lastSpokenStepRef.current = -1;
    setTimeout(() => {
      setIsPlaying(true);
      if (audioRef.current && med.audioSrc) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const togglePlay = () => {
    if (completed) {
      setElapsed(0);
      setCurrentStepIdx(0);
      setCompleted(false);
      setIsPlaying(true);
      lastSpokenStepRef.current = -1;
      if (audioRef.current && selectedMeditation?.audioSrc) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (isPlaying) {
        if (synthRef.current) synthRef.current.cancel();
        if (audioRef.current) audioRef.current.pause();
      } else {
        if (audioRef.current && selectedMeditation?.audioSrc) {
          audioRef.current.play().catch(() => {});
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetMeditation = () => {
    setElapsed(0);
    setCurrentStepIdx(0);
    setCompleted(false);
    setIsPlaying(false);
    lastSpokenStepRef.current = -1;
    if (synthRef.current) synthRef.current.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const startRecording = async () => {
    if (!recordingSupported) {
      setRecordingError('Voice recording is not supported in this browser.');
      return;
    }
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings(prev => [...prev, { url, timestamp: Date.now(), name: `Reflection ${prev.length + 1}` }]);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setRecordingError('Microphone access was denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = (idx) => {
    setRecordings(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].url);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const colorMap = {
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600', ring: 'ring-amber-300', darkBg: 'bg-amber-900/30', darkText: 'text-amber-300' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700', icon: 'text-rose-600', ring: 'ring-rose-300', darkBg: 'bg-rose-900/30', darkText: 'text-rose-300' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'text-cyan-600', ring: 'ring-cyan-300', darkBg: 'bg-cyan-900/30', darkText: 'text-cyan-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-300', darkBg: 'bg-purple-900/30', darkText: 'text-purple-300' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600', ring: 'ring-emerald-300', darkBg: 'bg-emerald-900/30', darkText: 'text-emerald-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-600', ring: 'ring-indigo-300', darkBg: 'bg-indigo-900/30', darkText: 'text-indigo-300' },
  };

  if (view === 'meditation' && selectedMeditation) {
    const step = selectedMeditation.steps[currentStepIdx];
    const progress = (elapsed / selectedMeditation.duration) * 100;
    const colors = colorMap[selectedMeditation.color];
    const Icon = selectedMeditation.icon;

    return (
      <div className={`max-w-2xl mx-auto px-4 py-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <button onClick={() => { setView('list'); setIsPlaying(false); clearInterval(intervalRef.current); if (synthRef.current) synthRef.current.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } }}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
          <ChevronLeft className="w-4 h-4" /> Back to Meditations
        </button>

        <div className={`rounded-2xl border p-6 mb-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl ${isDark ? colors.darkBg : colors.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{selectedMeditation.title}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{formatTime(selectedMeditation.duration)} guided meditation</p>
            </div>
          </div>

          <div className={`w-full h-2 rounded-full mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className={`h-2 rounded-full transition-all duration-1000 ${isDark ? 'bg-amber-500' : 'bg-amber-600'}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs mb-6">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{formatTime(elapsed)}</span>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{formatTime(selectedMeditation.duration)}</span>
          </div>

          {completed ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Meditation Complete</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>You've earned 15 XP for this practice</p>
            </div>
          ) : (
            <div className={`rounded-xl p-6 mb-6 text-center min-h-[120px] flex items-center justify-center ${isDark ? 'bg-slate-900/60 border border-slate-700/50' : 'bg-amber-50/50 border border-amber-100'}`}>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {step?.text}
              </p>
            </div>
          )}

          {hasAudio && (
            <div className={`flex items-center justify-center gap-2 mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Playing recorded narration</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button onClick={resetMeditation} className={`p-3 rounded-full ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={togglePlay}
              className="p-4 rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30 transition-all">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            {hasAudio ? (
              <button
                onClick={() => {
                  const newVol = audioVolume > 0 ? 0 : 1.0;
                  setAudioVolume(newVol);
                }}
                className={`p-3 rounded-full transition-all ${
                  audioVolume > 0
                    ? (isDark ? 'bg-amber-700 hover:bg-amber-600 text-amber-200' : 'bg-amber-100 hover:bg-amber-200 text-amber-700')
                    : (isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-400')
                }`}
                title={audioVolume > 0 ? 'Mute audio' : 'Unmute audio'}
              >
                {audioVolume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            ) : ttsSupported ? (
              <button
                onClick={() => {
                  setVoiceEnabled(v => !v);
                  if (voiceEnabled && synthRef.current) synthRef.current.cancel();
                }}
                className={`p-3 rounded-full transition-all ${
                  voiceEnabled
                    ? (isDark ? 'bg-amber-700 hover:bg-amber-600 text-amber-200' : 'bg-amber-100 hover:bg-amber-200 text-amber-700')
                    : (isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-400')
                } ${isSpeaking ? 'ring-2 ring-amber-400 ring-opacity-60' : ''}`}
                title={voiceEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            ) : null}
          </div>

          {hasAudio ? (
            <div className={`flex items-center justify-center gap-3 mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <VolumeX className="w-3.5 h-3.5" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-32 h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
              <Volume2 className="w-3.5 h-3.5" />
            </div>
          ) : ttsSupported && voiceEnabled ? (
            <div className={`flex items-center justify-center gap-3 mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className="text-xs">Speed:</span>
              {[
                { label: 'Slow', value: 0.7 },
                { label: 'Normal', value: 0.85 },
                { label: 'Fast', value: 1.0 }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setVoiceRate(opt.value)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    voiceRate === opt.value
                      ? (isDark ? 'bg-amber-700 text-amber-200' : 'bg-amber-100 text-amber-700')
                      : (isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100')
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex justify-center gap-1">
            {selectedMeditation.steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i === currentStepIdx ? 'bg-amber-500 scale-125' :
                i < currentStepIdx ? (isDark ? 'bg-emerald-500' : 'bg-emerald-400') :
                isDark ? 'bg-slate-700' : 'bg-gray-300'
              }`} />
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
            Voice Reflections
          </h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Record your thoughts and feelings after the meditation
          </p>
          {recordingError && (
            <p className="text-xs text-red-500 mb-3">{recordingError}</p>
          )}
          <div className="flex items-center gap-3 mb-4">
            {recordingSupported && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : isDark ? 'bg-slate-700 text-amber-400 hover:bg-slate-600' : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Stop Recording' : 'Record Reflection'}
            </button>
            )}
            {!recordingSupported && (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Voice recording is not available in this browser</p>
            )}
            {isRecording && (
              <span className="flex items-center gap-1 text-xs text-red-500 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Recording...
              </span>
            )}
          </div>

          {recordings.length > 0 && (
            <div className="space-y-2">
              {recordings.map((rec, idx) => (
                <div key={rec.timestamp} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  <Volume2 className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                  <span className={`text-sm flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{rec.name}</span>
                  <audio src={rec.url} controls className="flex-1 h-8" style={{ minWidth: 0 }} />
                  <a href={rec.url} download={`${rec.name}.webm`} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteRecording(idx)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'timer' || timerMode) {
    const timerProgress = timerDuration > 0 ? (timerElapsed / timerDuration) * 100 : 0;
    const timerDone = timerElapsed >= timerDuration && timerDuration > 0;

    return (
      <div className={`max-w-2xl mx-auto px-4 py-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <button onClick={() => { setView('list'); setTimerMode(false); setTimerPlaying(false); clearInterval(timerIntervalRef.current); }}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
          <ChevronLeft className="w-4 h-4" /> Back to Meditations
        </button>

        <div className={`rounded-2xl border p-8 text-center ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Timer className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Silent Meditation Timer</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Set a timer for unguided practice</p>

          {!timerPlaying && timerElapsed === 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {TIMER_PRESETS.map(t => (
                <button key={t} onClick={() => setTimerDuration(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timerDuration === t
                      ? 'bg-amber-600 text-white shadow-md'
                      : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  {formatTime(t)}
                </button>
              ))}
            </div>
          )}

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="6" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#d97706" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerProgress / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{formatTime(timerDuration - timerElapsed)}</span>
            </div>
          </div>

          {timerDone ? (
            <div className="mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-600">Session complete</p>
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { setTimerElapsed(0); setTimerPlaying(false); clearInterval(timerIntervalRef.current); }}
              className={`p-3 rounded-full ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => {
              if (timerDone) { setTimerElapsed(0); setTimerPlaying(true); }
              else setTimerPlaying(!timerPlaying);
            }}
              className="p-4 rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30">
              {timerPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 mt-6 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
            Voice Reflections
          </h3>
          {recordingError && <p className="text-xs text-red-500 mb-2">{recordingError}</p>}
          <div className="flex items-center gap-3">
            {recordingSupported && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : isDark ? 'bg-slate-700 text-amber-400 hover:bg-slate-600' : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
              }`}>
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Stop' : 'Record'}
            </button>
            )}
            {!recordingSupported && (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Voice recording not available</p>
            )}
            {isRecording && <span className="text-xs text-red-500 animate-pulse">Recording...</span>}
          </div>
          {recordings.length > 0 && (
            <div className="space-y-2 mt-3">
              {recordings.map((rec, idx) => (
                <div key={rec.timestamp} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{rec.name}</span>
                  <audio src={rec.url} controls className="flex-1 h-8" style={{ minWidth: 0 }} />
                  <button onClick={() => deleteRecording(idx)} className={`p-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const categories = [
    { id: 'foundation', label: 'Foundation', icon: Sun },
    { id: 'parts-work', label: 'Parts Work', icon: Heart },
    { id: 'grounding', label: 'Grounding', icon: Wind },
  ];

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Guided Meditations
        </h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          IFS-focused meditations to deepen your inner work
        </p>
      </div>

      <button onClick={() => { setTimerMode(true); setView('timer'); }}
        className={`w-full flex items-center gap-3 p-4 rounded-xl mb-6 border transition-all ${
          isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700' : 'bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-100 hover:border-amber-200'
        }`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
          <Timer className="w-5 h-5 text-amber-600" />
        </div>
        <div className="text-left">
          <span className="text-sm font-semibold">Silent Meditation Timer</span>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Set your own timer for unguided practice</p>
        </div>
        <ChevronRight className={`w-4 h-4 ml-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
      </button>

      {categories.map(cat => {
        const CatIcon = cat.icon;
        const meditationItems = MEDITATIONS.filter(m => m.category === cat.id);
        return (
          <div key={cat.id} className="mb-6">
            <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <CatIcon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              {cat.label}
            </h2>
            <div className="space-y-3">
              {meditationItems.map(meditation => {
                const MedIcon = meditation.icon;
                const colors = colorMap[meditation.color];
                const isCompleted = completedMeditations.includes(meditation.id);
                return (
                  <button key={meditation.id} onClick={() => startMeditation(meditation)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:border-amber-200 hover:shadow-sm'
                    }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? colors.darkBg : colors.bg}`}>
                      <MedIcon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{meditation.title}</span>
                        {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {formatTime(meditation.duration)}
                        <span className="mx-1">&middot;</span>
                        {meditation.steps.length} steps
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
