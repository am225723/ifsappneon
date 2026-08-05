import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Heart, 
  Brain, 
  Shield, 
  Sparkles, 
  Clock, 
  Headphones, 
  Wind, 
  Moon, 
  Sun,
  Zap,
  Target,
  Eye,
  Hand
} from 'lucide-react';

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('inhale');
  const [breathingCount, setBreathingCount] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const hasAudio = selectedExercise && audioLoaded && !audioError;

  const exerciseCategories = [
    {
      id: 'connection',
      title: 'Self-Connection',
      description: 'Exercises to strengthen your Self energy',
      color: 'from-amber-400 to-amber-600',
      icon: Brain,
      exercises: [
        {
          id: 'meeting-self',
          title: 'Meeting Your Self',
          duration: '15 min',
          type: 'meditation',
          difficulty: 'Beginner',
          description: 'A guided meditation to connect with your core Self energy',
          transcript: `Welcome to this meditation to meet your Self. Begin by finding a comfortable position — seated or lying down, whatever feels right for you. Let your hands rest gently in your lap or at your sides.

Notice your breath. Don't try to change it — just observe. The rise and fall of your chest. The flow of air in and out. Each breath is an invitation to arrive more fully in this moment.

As you settle, I want you to begin noticing what's happening inside. Are there thoughts racing? Emotions bubbling? Tensions in your body? Whatever you find, just notice it. You don't need to fix anything.

Now, gently ask all of your parts — the worriers, the planners, the critics, the protectors — to step back, just for a few minutes. Let them know you appreciate them, and you'll return to them soon. But right now, you'd like some space to connect with your Self.

As your parts step back, notice what emerges. There may be a sense of spaciousness. A quiet calm. A feeling of being present without agenda. This is your Self energy beginning to come forward.

Your Self has always been here. It is the "you" beneath all the roles, all the defenses, all the pain. It is characterized by qualities like calmness, curiosity, compassion, and clarity.

Take a moment to feel into these qualities. Can you sense any calmness right now? Even a small amount? What about curiosity — a gentle interest in what you're experiencing? What about compassion? Can you feel any warmth toward yourself in this moment? Any tenderness toward the parts of you that struggle? And clarity — can you sense a knowing, a wisdom, that exists beneath the noise of daily life?

This is your Self. It cannot be damaged. It cannot be destroyed. No matter what you've been through, your Self has remained whole and available. The work of healing is simply about clearing the path back to it.

From this place of Self, you might want to say something to your parts. Something like: "I'm here. I see you. You don't have to work so hard. I can handle things."

Notice how your body feels right now. Is there more space? More ease? Even the smallest shift is significant. It means you're connecting with your Self.

In the days ahead, remember this feeling. You can return to this place anytime — not by forcing anything, but simply by asking your parts for a little space and noticing what's already there.

Take three deep breaths. With each exhale, anchor this experience in your body. When you're ready, gently open your eyes. Carry this connection with your Self into whatever comes next. You are not your parts. You have parts. And your Self is here, leading with wisdom and love.`,
          audioUrl: '/audio/exercises/meeting-self.mp3',
          benefits: ['Deeper Self-awareness', 'Increased clarity', 'Emotional balance']
        },
        {
          id: 'self-qualities',
          title: 'Cultivating Self Qualities',
          duration: '20 min',
          type: 'practice',
          difficulty: 'Intermediate',
          description: "Practice embodying the 8 C's of Self: curiosity, calmness, compassion, confidence, courage, creativity, clarity, and connectedness",
          transcript: `Today we'll explore the qualities of your Self — the eight C's that define who you truly are beneath your protective parts. Each quality is already within you, waiting to be noticed and strengthened.

Find a comfortable position and close your eyes. Take three slow, deep breaths. With each exhale, let go of whatever you're carrying from the day.

We'll spend time with each of the eight qualities. As we move through them, notice which ones feel most accessible and which ones feel more distant. There's no judgment — just information about where your parts may be more active.

Calmness. Let's begin with calmness. Imagine a perfectly still lake at dawn. No wind, no ripples. The surface is like glass, reflecting the sky. Feel that stillness inside you. Even if there's noise in your mind, beneath it, there is calm. Breathe into it.

Curiosity. Now shift to curiosity. Think of a child discovering something for the first time — the wonder in their eyes. Can you bring that same curiosity to your own inner world? Instead of judging what you find inside, what if you simply got interested in it? "Hmm, I wonder what this feeling is about..."

Compassion. Now let compassion rise. Place your hand on your heart. Think of someone you love deeply. Feel the warmth you have for them. Now, gently turn that same warmth toward yourself. Toward your struggles. Toward the parts of you that are hurting. You deserve the same compassion you give to others.

Confidence. Feel into confidence — not arrogance, but a quiet knowing. You have survived everything life has thrown at you. You are still here. You are still growing. Trust that you have what it takes to face whatever comes next. You have navigated hard things before. You can do it again.

Courage. Now invite courage. Courage doesn't mean the absence of fear — it means moving forward even when you're afraid. Think of the bravest thing you've ever done. Remember how it felt. That courage is still in you. It's part of who you are.

Clarity. Shift to clarity. Imagine the fog lifting on a mountain path. Suddenly you can see for miles. Clarity is the ability to see things as they are — not through the lens of fear, not through the lens of past pain, but clearly and truly. Ask yourself: "What do I know to be true right now?"

Creativity. Now let creativity flow. Creativity isn't just about art — it's about seeing new possibilities, finding unexpected solutions, approaching old problems in new ways. Your Self is naturally creative. When parts step back, creative solutions often emerge effortlessly.

Connectedness. Finally, feel into connectedness. You are not alone on this journey. You are connected to other people, to nature, to something larger than yourself. Even in your most isolated moments, connection is available. Feel that web of connection surrounding you now.

Now hold all eight qualities together. Calmness, curiosity, compassion, confidence, courage, clarity, creativity, and connectedness. They are the signature of your Self. They are who you are when your parts can relax.

Choose one quality that you want to lead with today. Just one. Let it settle into your body. Imagine it as a warm light radiating from your center.

Take three deep breaths, carrying this quality with you. When you're ready, open your eyes. Remember — these qualities are not things you need to create. They are already part of you. Your work is simply to clear the path so they can shine through.`,
          audioUrl: '/audio/exercises/self-qualities.mp3',
          benefits: ['Self-leadership', 'Emotional regulation', 'Inner wisdom']
        }
      ]
    },
    {
      id: 'inner-child',
      title: 'Inner Child Work',
      description: 'Connect with and heal your inner child',
      color: 'from-emerald-400 to-emerald-600',
      icon: Heart,
      exercises: [
        {
          id: 'meeting-inner-child',
          title: 'Meeting Your Inner Child',
          duration: '18 min',
          type: 'meditation',
          difficulty: 'Beginner',
          description: 'Safely meet and connect with your inner child part',
          transcript: `Create a safe space in your mind. This might be a room, a garden, a beach, or any place that feels warm and protected. Take a moment to make it vivid — notice the light, the temperature, the sounds.

You are here in your safe space as your adult self — the Self that has wisdom, strength, and compassion. You are here because a young part of you needs to be seen.

Gently call forth your inner child. You might say silently: "I'm here. It's safe. You can come forward when you're ready."

Notice how they appear. How old are they? What are they wearing? What's the expression on their face? Are they standing close or keeping their distance? Whatever you see is right. There's no wrong answer.

If your inner child seems cautious or afraid, that's okay. They may not trust you yet. They've been waiting a long time. Simply stay present. Let them see that you're not going anywhere.

When you feel a connection forming, try speaking to them. You might say: "I see you. I'm so glad you're here. I want to get to know you."

Notice how they respond. Do they move closer? Do they speak? Do they show you something — a memory, a feeling, an image? Whatever comes, receive it without judgment.

Ask your inner child: "What do you want me to know?" Then wait. Listen with your heart, not your head. The answer might come as words, feelings, images, or body sensations. Whatever they share, respond with warmth: "Thank you for telling me. I hear you. That matters to me."

Now ask: "What do you need from me?" They might need comfort, safety, attention, playfulness, or simply to know that you won't abandon them again. Offer them what they need. If they want to be held, imagine holding them. If they want to play, imagine playing with them. If they need reassurance, speak the words they needed to hear.

Before you leave this space, make a promise to your inner child. Something simple and true: "I will come back. I will keep visiting you. You are not alone anymore."

Let your inner child know they can stay in this safe space anytime. It belongs to them. They are protected here.

Take three deep breaths. Feel the connection between your adult self and your inner child. This bond can grow stronger each time you visit.

Slowly open your eyes. Carry the warmth of this meeting with you. Your inner child is part of you, and they deserve your attention and love.`,
          audioUrl: '/audio/exercises/meeting-inner-child.mp3',
          benefits: ['Inner connection', 'Emotional healing', 'Self-compassion']
        },
        {
          id: 'reparenting',
          title: 'Reparenting Meditation',
          duration: '25 min',
          type: 'practice',
          difficulty: 'Intermediate',
          description: 'Learn to parent your inner child with love and care',
          transcript: `Find a quiet, comfortable space where you won't be disturbed. This meditation goes deeper than most, so make sure you feel safe and settled. Close your eyes and take five slow breaths. With each exhale, let your body get heavier. Let the chair or the floor hold you.

Today, you are going to offer your inner child something they may not have received enough of — the experience of being truly parented with love, patience, and attention.

Imagine holding your inner child — really holding them. Feel their small body against yours. Feel the weight of them in your arms or on your lap. They are real. They are part of you.

What do they need to hear from you? Perhaps words they never heard growing up. Take a moment to feel into what those words might be. Try saying: "You are safe with me. I will never leave you. You don't have to earn my love — you have it just because you exist."

Notice how your inner child responds. Do they relax? Do they cry? Do they hold on tighter? Whatever happens is right. You are giving them something they've been waiting for.

Now offer the love they missed. If they missed being noticed, tell them: "I see you. I notice you. You are important to me." If they missed being protected, tell them: "I am strong enough to protect you now. No one will hurt you on my watch." If they missed being celebrated, tell them: "I am so proud of you. You are amazing just as you are. You don't need to be different." If they missed being comforted, simply hold them and say: "I'm here. I'm not going anywhere. You can cry as long as you need to."

Feel the love flowing from you to this young part. This is reparenting — becoming the parent your inner child needed. You have everything inside you to do this.

Now imagine a day in your inner child's life, but this time, you are there. You wake them up gently. You make them breakfast. You listen to their stories. You play with them. You tuck them in at night and tell them they are loved. This is what they needed. And even though you can't go back in time, you can give it to them now. Your inner child doesn't know the difference between a real memory and an imagined one, as long as it comes from a place of genuine love.

Make a commitment to this practice. Reparenting is not a one-time event — it's an ongoing relationship. Each time you show up for your inner child, the wound heals a little more.

Ask your inner child: "Is there anything else you need before I go?" Listen for the answer. Give them one final hug. Tell them: "I love you. I will keep coming back. You are my responsibility now, and I take that seriously."

Take three deep breaths. Feel the warmth and the weight of this experience. You have done important work today. Slowly open your eyes. Carry this loving presence into your day. You are both the parent and the child, and both of you deserve love.`,
          audioUrl: '/audio/exercises/reparenting.mp3',
          benefits: ['Healing neglect wounds', 'Self-nurturing', 'Emotional security']
        },
        {
          id: 'child-play',
          title: 'Inner Child Play',
          duration: '12 min',
          type: 'interactive',
          difficulty: 'Beginner',
          description: 'A playful exercise to reconnect with your inner child\'s joy',
          transcript: `Today is about something different — something lighter. Today, we play.

Close your eyes and take a few easy breaths. No pressure, no intensity. Just lightness.

Remember what brought you joy as a child. Really let yourself go back there. What did you love to do? Was it drawing? Running through sprinklers? Building with blocks? Reading under a blanket? Climbing trees? Dancing to music? Catching fireflies?

Pick one memory — one moment of pure childhood joy. Let it become vivid. Where were you? What time of day was it? What sounds did you hear? What did it feel like in your body?

Now step into that memory. You are there again. But this time, your adult Self is watching your inner child play. Notice the freedom in their body. The laughter. The total absorption in the moment. They are not worried about tomorrow. They are fully here.

Let yourself play freely. Join your inner child in whatever they're doing. Let go of being an adult for a few minutes. There's no one watching. No one judging. Just you, playing.

Feel the joy in your body. Maybe it shows up as lightness, warmth, energy, or a smile on your face. This joy is medicine. It heals the parts of you that forgot how to play.

Many of us stopped playing because our protectors decided it wasn't safe, or that play was a waste of time, or that we had to grow up too fast. But play is a fundamental need. It's not frivolous — it's essential.

Ask your inner child: "What would you like to do more of in our daily life?" Listen for the answer. It might surprise you.

Make a small promise — something realistic. Maybe it's spending five minutes drawing, or putting on a favorite song and dancing, or taking a walk with nowhere to go. Something that feeds the playful part of you.

Take three breaths filled with lightness and gratitude. When you open your eyes, carry this playful energy with you. Life is serious enough. Your inner child is asking you to remember how to play.`,
          audioUrl: '/audio/exercises/child-play.mp3',
          benefits: ['Joy and creativity', 'Stress relief', 'Authentic expression']
        }
      ]
    },
    {
      id: 'parts-work',
      title: 'Parts Work',
      description: 'Work directly with your internal parts',
      color: 'from-brand-stone-500 to-brand-stone-600',
      icon: Shield,
      exercises: [
        {
          id: 'unblending',
          title: 'Unblending Practice',
          duration: '15 min',
          type: 'technique',
          difficulty: 'Intermediate',
          description: 'Learn to separate from parts when you\'re blended',
          transcript: `This exercise is about learning one of the most important skills in IFS — unblending. Blending happens when a part takes over and you lose connection with your Self. Unblending is the process of gently creating space between you and the part.

Close your eyes and take a few centering breaths. Let yourself arrive in this moment.

Notice which part is present right now. Is there an emotion that's strong? A thought pattern running on repeat? A sensation in your body that's pulling your attention? That's a part.

When we're blended with a part, we believe we ARE that feeling. "I am anxious." "I am angry." "I am worthless." But in IFS, we learn to say instead: "A part of me feels anxious." This small shift changes everything.

Try it now. Whatever you're feeling, rephrase it: "A part of me feels..." Notice what happens when you say that. Even a small sense of distance means unblending is beginning.

Now, ask this part to give you some space. You might say: "I know you're here, and I want to hear what you have to say. But could you step back just a little, so I can listen from my Self?"

Feel the difference. When a part steps back, even slightly, you may notice more spaciousness. More calm. More curiosity about what the part is experiencing rather than being consumed by it.

If the part won't step back, that's okay. It may be afraid of what will happen if it relaxes. You can ask: "What are you afraid would happen if you gave me some space?" Listen for the answer. Reassure the part: "I'm not trying to get rid of you. I just want to be able to hear you better. When I'm blended with you, I can't help you as well as I'd like."

Notice the quality of your awareness now. Are you more observing than reacting? More curious than overwhelmed? That's Self energy. That's what unblending makes possible.

Practice this throughout your day. Whenever you notice a strong emotion, pause and say: "A part of me feels..." Then ask that part for a little space. Over time, this becomes second nature.

Take three deep breaths. Thank the part that showed up for being willing to work with you. Open your eyes, carrying this awareness with you.`,
          audioUrl: '/audio/exercises/unblending.mp3',
          benefits: ['Clear perspective', 'Self leadership', 'Emotional freedom']
        },
        {
          id: 'parts-council',
          title: 'Parts Council Meditation',
          duration: '30 min',
          type: 'meditation',
          difficulty: 'Advanced',
          description: 'Facilitate a meeting between your parts from Self energy',
          transcript: `This is an advanced meditation. Before beginning, make sure you feel grounded and have some experience connecting with your Self energy. If at any point this feels too intense, you can pause and return to your breath.

Close your eyes. Take five deep breaths. With each one, feel yourself settling deeper into your center.

Imagine a beautiful room — a council chamber. It might be a circle of comfortable chairs, a campfire circle, a garden with a round table, or any space that feels safe and welcoming. Make it vivid. This is where your parts will gather.

You, the Self, are at the center or head of this space. You are the facilitator. You are calm, curious, and compassionate. You have no agenda except to listen and to help.

Now, invite your parts to join you. You might say: "All parts are welcome here. This is a safe space. Every voice matters. I'd like to hear from you."

Notice who arrives first. What part shows up? Give them a seat. Notice how they appear — their posture, their expression, their energy. Greet them warmly.

As more parts arrive, notice them one by one. Some may be eager to speak. Others may hang back. Some might be wary of each other. That's all normal. Just hold the space.

When your council feels complete — or at least has several members present — begin. Turn to the part that seems most ready to speak. Say: "I'd like to hear from you. What do you want me to know?"

Let this part speak. Really listen. Not just to the words, but to the feeling behind them. What are they carrying? What do they need? Thank this part. Then ask: "Does anyone else have something to add, or a different perspective?"

Let another part respond. You may notice parts reacting to each other. A protector might disagree with an exile's wish. A manager might conflict with a firefighter's approach. This is normal. Your job as Self is not to pick sides but to hear everyone.

If conflict arises, you might say: "I hear both of you. You both have important things to say. Can you each take turns, and trust that I'm listening to all of you?"

Continue facilitating. Let each part that wants to speak have their moment. Respond with compassion and curiosity to each one.

Now, begin to draw the council to a close. Thank each part for showing up and being vulnerable enough to share. Ask: "Is there anything else anyone needs before we finish?" Give space for final words.

Let your parts know: "This council is always available. We can meet again anytime. You don't have to handle things alone — we're a team."

Watch as your parts settle. Some may feel relieved. Some may feel heard for the first time. Some may still be processing. All of that is okay.

Take five deep breaths. Bring your awareness back to your body, to the room around you. You have just facilitated a meeting of your inner family. That takes real courage and leadership.

Open your eyes. Write down anything that came up if you'd like. The insights from a parts council can be profound.`,
          audioUrl: '/audio/exercises/parts-council.mp3',
          benefits: ['Internal harmony', 'Conflict resolution', 'System integration']
        },
        {
          id: 'firefighter-work',
          title: 'Working with Firefighters',
          duration: '20 min',
          type: 'technique',
          difficulty: 'Intermediate',
          description: 'Learn to work with parts that act impulsively',
          transcript: `Firefighter parts are the parts that react when things get intense. They're the ones that reach for the phone, the food, the drink, the distraction — anything to get away from the pain that's surfacing. Today, we're going to get to know them with compassion.

Close your eyes. Take several slow breaths. Center yourself in your Self energy — calm, curious, and without judgment.

Think of a behavior you sometimes engage in that feels reactive or impulsive. Something you do when you're overwhelmed. It might be scrolling your phone for hours, overeating, snapping at someone, shutting down, or zoning out. Don't judge it — just name it.

Behind that behavior is a firefighter part. It's not trying to hurt you — it's trying to save you from unbearable feelings.

Acknowledge your firefighter parts. Say to them: "I know you're trying to help. I know you're doing your best to protect me from pain."

Thank them for protecting you. Genuinely. These parts have been working overtime, often since childhood. They jumped in when nobody else could help. Say: "Thank you for all the times you've stepped in when I was overwhelmed. I see your effort."

Now, with curiosity, ask: "What feeling are you trying to protect me from?" The answer might come as a word, an image, or a sensation. Maybe it's loneliness. Maybe it's shame. Maybe it's a helplessness so deep it feels bottomless. Don't go to that underlying feeling right now. Stay with the firefighter.

Let it know: "I'm not asking you to stop. I'm just trying to understand you better." Ask: "What would you need in order to relax a little? What would help you trust that I can handle things?"

Find what they need. Maybe it's rest. Maybe it's acknowledgment. Maybe it's the promise that you'll address the exile's pain so the firefighter doesn't have to keep putting out fires. The firefighter might need to see that you, the Self, are strong enough to face the pain it's been blocking. It might need to see that you have other resources now — therapy, meditation, supportive people. It might need to know it won't lose its job entirely.

Reassure it: "I'm not trying to get rid of you. You're part of my team. But I'd love to find you a new role — one that doesn't cost us so much."

Take three deep breaths. Thank your firefighter for this conversation. Let it know you'll check in again.

Open your eyes. Remember — firefighter parts aren't the enemy. They are fierce protectors doing the best they can. With patience and compassion, they can learn to trust your Self to lead.`,
          audioUrl: '/audio/exercises/firefighter-work.mp3',
          benefits: ['Impulse control', 'Understanding triggers', 'Self-protection']
        }
      ]
    },
    {
      id: 'breathing',
      title: 'Breathing Exercises',
      description: 'Regulate your nervous system through breath',
      color: 'from-brand-emerald-600 to-brand-emerald-700',
      icon: Wind,
      exercises: [
        {
          id: 'box-breathing',
          title: 'Box Breathing',
          duration: '10 min',
          type: 'breathing',
          difficulty: 'Beginner',
          description: 'Calm your nervous system with this simple 4-4-4-4 breathing pattern',
          transcript: `Welcome to box breathing — a simple, powerful technique to calm your nervous system and create inner stillness.

Sit comfortably with your feet flat on the floor. Let your hands rest in your lap. Close your eyes or soften your gaze.

Box breathing has four equal parts, like the four sides of a box. You'll inhale for 4 counts, hold for 4 counts, exhale for 4 counts, and hold for 4 counts. We'll do this together for 10 cycles.

Let's begin. Breathe in... two... three... four. Hold... two... three... four. Breathe out... two... three... four. Hold... two... three... four.

Good. Inhale... two... three... four. Hold... two... three... four. Exhale... two... three... four. Hold... two... three... four.

You're doing beautifully. With each cycle, notice your body settling. Your heart rate slowing. Your mind quieting.

Last cycle. Inhale... two... three... four. Hold... two... three... four. Exhale... two... three... four. Hold... two... three... four.

Now breathe naturally. Notice how you feel compared to when you started. There's often a significant difference — more calm, more centered, more present.

You can use box breathing anytime you need to reset — before a difficult conversation, when anxiety rises, when you can't sleep, or when a part starts to take over. Four counts in, four counts hold, four counts out, four counts hold.

Open your eyes when you're ready. Carry this calm with you.`,
          audioUrl: '/audio/exercises/box-breathing.mp3',
          benefits: ['Stress reduction', 'Focus', 'Anxiety relief']
        },
        {
          id: '4-7-8-breathing',
          title: '4-7-8 Breathing',
          duration: '12 min',
          type: 'breathing',
          difficulty: 'Intermediate',
          description: 'Powerful breathing technique for deep relaxation',
          transcript: `Welcome to the 4-7-8 breathing technique — sometimes called the "relaxing breath." This pattern is especially powerful for deep relaxation, preparing for sleep, and calming an activated nervous system.

Find a comfortable position. You can sit or lie down. Place the tip of your tongue against the ridge behind your upper front teeth. It will stay there throughout the exercise.

Here's the pattern: You'll inhale quietly through your nose for 4 counts. Then hold your breath for 7 counts. Then exhale completely through your mouth, making a whooshing sound, for 8 counts. The exhale is the key — it activates your body's relaxation response.

Let's begin. First, exhale completely through your mouth with a whoosh. Now, inhale through your nose... two... three... four. Hold... two... three... four... five... six... seven. Exhale through your mouth with a whoosh... two... three... four... five... six... seven... eight.

That's one cycle. Let's continue. Inhale... two... three... four. Hold... two... three... four... five... six... seven. Exhale with a whoosh... two... three... four... five... six... seven... eight.

With each cycle, you may notice your body getting heavier. Your thoughts slowing down. This is your parasympathetic nervous system activating — the "rest and digest" mode that counteracts stress and anxiety.

Last cycle. Inhale... two... three... four. Hold... two... three... four... five... six... seven. Exhale slowly... two... three... four... five... six... seven... eight.

Now return to natural breathing. Feel the relaxation spreading through your body. Some people feel a tingling in their hands or feet. Others feel a pleasant heaviness. Whatever you feel is right.

This technique becomes more powerful with practice. When you first start, you might feel a little dizzy — that's normal and will pass. With time, your body learns to relax more quickly and more deeply.

Use this before bed, during moments of stress, or whenever you need to quickly shift from a fight-or-flight state to a calm state. Your breath is one of the most powerful tools you have for regulating your nervous system.

When you're ready, open your eyes. Carry this deep relaxation with you.`,
          audioUrl: '/audio/exercises/4-7-8-breathing.mp3',
          benefits: ['Deep relaxation', 'Sleep preparation', 'Tension release']
        }
      ]
    }
  ];

  const breathingExercises = [
    {
      id: 'box-breathing',
      name: 'Box Breathing',
      inhale: 4,
      hold1: 4,
      exhale: 4,
      hold2: 4,
      cycles: 10
    },
    {
      id: '4-7-8',
      name: '4-7-8 Breathing',
      inhale: 4,
      hold1: 7,
      exhale: 8,
      hold2: 0,
      cycles: 8
    }
  ];

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!selectedExercise?.audioUrl) {
      setAudioLoaded(false);
      setAudioError(false);
      return;
    }
    setAudioLoaded(false);
    setAudioError(false);
    const audio = new Audio(selectedExercise.audioUrl);
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => {
      setAudioLoaded(true);
      setDuration(Math.floor(audio.duration));
    });
    audio.addEventListener('error', () => setAudioError(true));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; audioRef.current = null; };
  }, [selectedExercise?.id, selectedExercise?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : audioVolume;
  }, [audioVolume, isMuted]);

  useEffect(() => {
    if (!hasAudio || !isPlaying) return;
    const id = setInterval(() => {
      if (audioRef.current) setCurrentTime(Math.floor(audioRef.current.currentTime));
    }, 250);
    return () => clearInterval(id);
  }, [hasAudio, isPlaying]);

  const handleExerciseSelect = (exercise) => {
    if (audioRef.current) { audioRef.current.pause(); }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedExercise(exercise);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowTranscript(false);
    if (!exercise.audioUrl) {
      const durationMinutes = parseInt(exercise.duration);
      setDuration(durationMinutes * 60);
    }
  };

  const togglePlayPause = () => {
    if (hasAudio) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hasAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startBreathingExercise = (exercise) => {
    setSelectedExercise({
      ...exercise,
      isBreathing: true
    });
    setIsPlaying(true);
    setBreathingPhase('inhale');
    setBreathingCount(0);
    
    let currentPhase = 'inhale';
    let currentCount = 0;
    let cycleCount = 0;
    
    const breathingInterval = setInterval(() => {
      currentCount++;
      
      if (currentPhase === 'inhale' && currentCount >= exercise.inhale) {
        currentPhase = exercise.hold1 > 0 ? 'hold1' : 'exhale';
        currentCount = 0;
        setBreathingPhase(currentPhase === 'hold1' ? 'hold' : 'exhale');
      } else if (currentPhase === 'hold1' && currentCount >= exercise.hold1) {
        currentPhase = 'exhale';
        currentCount = 0;
        setBreathingPhase('exhale');
      } else if (currentPhase === 'exhale' && currentCount >= exercise.exhale) {
        if (exercise.hold2 > 0) {
          currentPhase = 'hold2';
          currentCount = 0;
          setBreathingPhase('hold');
        } else {
          currentPhase = 'inhale';
          currentCount = 0;
          setBreathingPhase('inhale');
          cycleCount++;
          setBreathingCount(cycleCount);
        }
      } else if (currentPhase === 'hold2' && currentCount >= exercise.hold2) {
        currentPhase = 'inhale';
        currentCount = 0;
        setBreathingPhase('inhale');
        cycleCount++;
        setBreathingCount(cycleCount);
      }
      
      setCurrentTime(prev => prev + 1);
      
      if (cycleCount >= exercise.cycles) {
        clearInterval(breathingInterval);
        setIsPlaying(false);
      }
    }, 1000);
  };

  if (selectedExercise && selectedExercise.isBreathing) {
    const phaseConfig = {
      inhale: { text: 'Inhale', color: 'from-brand-stone-500 to-brand-stone-600', duration: selectedExercise.inhale },
      hold: { text: 'Hold', color: 'from-amber-400 to-amber-600', duration: selectedExercise.hold1 || selectedExercise.hold2 },
      exhale: { text: 'Exhale', color: 'from-brand-emerald-600 to-brand-emerald-700', duration: selectedExercise.exhale }
    };
    
    const currentPhaseConfig = phaseConfig[breathingPhase];

    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          <button
            onClick={() => setSelectedExercise(null)}
            className="mb-6 text-brand-stone-600 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 transition-colors"
          >
            ← Back to Exercises
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">{selectedExercise.name}</h1>
            <p className="text-xl text-brand-stone-600 dark:text-slate-400 mb-12">Follow the breathing pattern</p>

            {/* Breathing Circle */}
            <div className="relative w-80 h-80 mx-auto mb-12">
              <div className={`absolute inset-0 bg-gradient-to-r ${currentPhaseConfig.color} rounded-full transition-all duration-1000 ${
                breathingPhase === 'inhale' ? 'scale-100' : 'scale-75'
              }`}></div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-6xl font-bold text-white mb-2 ${
                    breathingPhase === 'inhale' ? 'scale-110' : 'scale-100'
                  } transition-transform duration-1000`}>
                    {currentPhaseConfig.text}
                  </div>
                  <div className="text-2xl text-white/90">
                    {breathingPhase === 'inhale' && selectedExercise.inhale - (currentTime % selectedExercise.inhale)}
                    {breathingPhase === 'hold' && (
                      breathingCount < selectedExercise.cycles - 1 
                        ? selectedExercise.hold1 - (currentTime % selectedExercise.hold1)
                        : selectedExercise.hold2 - (currentTime % selectedExercise.hold2)
                    )}
                    {breathingPhase === 'exhale' && selectedExercise.exhale - (currentTime % selectedExercise.exhale)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="text-lg text-brand-stone-600 dark:text-slate-400 mb-2">
                Cycle {breathingCount + 1} of {selectedExercise.cycles}
              </div>
              <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3 max-w-md mx-auto">
                <div 
                  className="bg-gradient-to-r from-brand-emerald-600 to-brand-gold-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((breathingCount + 1) / selectedExercise.cycles) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                }}
                className="btn-sanctuary-primary text-xl px-8 py-4"
              >
                {isPlaying ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => setSelectedExercise(null)}
                className="btn-sanctuary-secondary text-xl px-8 py-4"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setSelectedExercise(null)}
              className="flex items-center text-brand-stone-600 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 transition-colors"
            >
              ← Back to Exercises
            </button>
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedExercise.difficulty === 'Beginner' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                selectedExercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {selectedExercise.difficulty}
              </span>
              <span className="text-brand-stone-600 dark:text-slate-400 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {selectedExercise.duration}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="soft-card p-8">
                <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">{selectedExercise.title}</h1>
                <p className="text-xl text-brand-stone-600 dark:text-slate-400 mb-8">{selectedExercise.description}</p>

                {/* Audio Player */}
                <div className="bg-gradient-to-r from-brand-gold-50 to-brand-emerald-50 dark:from-brand-gold-950/20 dark:to-brand-emerald-950/20 rounded-[28px] p-8 mb-8">
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 rounded-full flex items-center justify-center">
                        {isPlaying ? (
                          <Pause className="w-16 h-16 text-white" />
                        ) : (
                          <Play className="w-16 h-16 text-white ml-2" />
                        )}
                      </div>
                      {isPlaying && (
                        <div className="absolute inset-0 rounded-full border-4 border-amber-300 animate-ping"></div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-brand-stone-600 dark:text-slate-400 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div className="w-full bg-white/40 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={handleReset}
                      className="p-3 bg-white/40 rounded-full hover:bg-white/70 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-4 bg-white/80 rounded-full hover:bg-white/90 transition-colors shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-brand-stone-700 dark:text-slate-300" />
                      ) : (
                        <Play className="w-6 h-6 text-brand-stone-700 dark:text-slate-300 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 bg-white/40 rounded-full hover:bg-white/70 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                      )}
                    </button>
                  </div>
                  {hasAudio && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <Volume2 className="w-4 h-4 text-brand-stone-500 dark:text-slate-500" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : audioVolume}
                        onChange={(e) => { setAudioVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                        className="w-32 accent-amber-600"
                      />
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 mb-4">Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedExercise.benefits?.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-brand-stone-700 dark:text-slate-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Instructions */}
              <div className="soft-card p-6 mb-6">
                <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4 flex items-center">
                  <Headphones className="w-5 h-5 mr-2 text-amber-600" />
                  Instructions
                </h3>
                <ul className="space-y-3 text-brand-stone-600 dark:text-slate-400">
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Find a quiet, comfortable space
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Use headphones for best experience
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Close your eyes when ready
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Follow the guidance at your own pace
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Be gentle with yourself throughout
                  </li>
                </ul>
              </div>

              {/* Transcript Toggle */}
              <div className="soft-card p-6 mb-6">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-amber-600" />
                    Transcript
                  </h3>
                  <span className="text-amber-600">
                    {showTranscript ? 'Hide' : 'Show'}
                  </span>
                </button>
                
                {showTranscript && (
                  <div className="mt-4 p-4 bg-brand-stone-50 dark:bg-slate-800/50 rounded-lg max-h-96 overflow-y-auto">
                    <p className="text-brand-stone-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                      {selectedExercise.transcript}
                    </p>
                  </div>
                )}
              </div>

              {/* Related Exercises */}
              <div className="soft-card p-6">
                <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">Related Exercises</h3>
                <div className="space-y-3">
                  {exerciseCategories
                    .flatMap(cat => cat.exercises)
                    .filter(ex => ex.id !== selectedExercise.id)
                    .slice(0, 3)
                    .map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleExerciseSelect(exercise)}
                        className="w-full text-left p-3 bg-brand-stone-50 dark:bg-slate-800/50 rounded-lg hover:bg-brand-stone-100 dark:bg-slate-800/60 transition-colors"
                      >
                        <div className="font-medium text-brand-stone-900 dark:text-slate-100">{exercise.title}</div>
                        <div className="text-sm text-brand-stone-600 dark:text-slate-400">{exercise.duration}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-12 lg:pt-20">
        <div className="soft-card bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 text-white p-8 lg:p-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Guided Healing Exercises
            </h1>
            <p className="text-xl text-brand-emerald-50/90 max-w-3xl mx-auto">
              Transformative practices to strengthen your Self, heal your inner child, and harmonize your parts
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleExerciseSelect(exerciseCategories[0].exercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-amber-600" />
              </div>
              <Play className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Quick Self-Connection</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">5-minute practice to center yourself</p>
          </button>

          <button
            onClick={() => startBreathingExercise(breathingExercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-brand-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6 text-brand-emerald-600" />
              </div>
              <Play className="w-5 h-5 text-brand-emerald-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Box Breathing</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">Calm your nervous system instantly</p>
          </button>

          <button
            onClick={() => handleExerciseSelect(exerciseCategories[1].exercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-emerald-600" />
              </div>
              <Play className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Inner Child Check-in</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">Quick connection with your inner child</p>
          </button>
        </div>
      </div>

      {/* Exercise Categories */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {exerciseCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id} className="mb-12">
              <div className="flex items-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center mr-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{category.title}</h2>
                  <p className="text-brand-stone-600 dark:text-slate-400">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    onClick={() => handleExerciseSelect(exercise)}
                    className="soft-card p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exercise.difficulty === 'Beginner' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                        exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercise.difficulty}
                      </span>
                      <div className="flex items-center text-brand-stone-500 dark:text-slate-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">{exercise.duration}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 mb-2 group-hover:text-brand-gold-700 dark:group-hover:text-brand-gold-500 transition-colors">
                      {exercise.title}
                    </h3>
                    
                    <p className="text-brand-stone-600 dark:text-slate-400 mb-4 leading-relaxed">
                      {exercise.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        exercise.type === 'meditation' ? 'bg-amber-100 text-amber-700' :
                        exercise.type === 'practice' ? 'bg-brand-stone-100 text-brand-stone-600' :
                        exercise.type === 'technique' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {exercise.type}
                      </span>
                      <div className="flex items-center text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">Start</span>
                        <Play className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="soft-card bg-gradient-to-r from-brand-gold-50 to-brand-emerald-50 dark:from-brand-gold-950/20 dark:to-brand-emerald-950/20 p-8">
          <h2 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-6">Tips for Effective Practice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Be Consistent</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Regular practice builds deeper connections and lasting change</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Be Gentle</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Approach yourself with compassion, especially when working with wounded parts</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-brand-stone-500" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Create Safety</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Ensure you feel safe and supported before deep inner work</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Hand className="w-4 h-4 text-brand-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Stay Present</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Return to the present moment if you feel overwhelmed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exercises;
