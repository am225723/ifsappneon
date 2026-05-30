import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, CheckCircle,
  Clock, Heart, Shield, MessageSquare, Sparkles, Eye, Brain, Users,
  Star, Target, BookOpen, Activity, AlertCircle, Save, FileText,
  Lightbulb, ChevronDown, ChevronUp, Map
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers, supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const therapistObservationPrompts = {
  'parts-dialogue': [
    'What level of Self-energy is the client accessing?',
    'Which parts are blended vs. observed?',
    'Client body language and somatic indicators:',
    'Protector activity level (1-10):',
    'Safety assessment — is the client regulated enough to continue?'
  ],
  'protector-negotiation': [
    'Is the protector a Manager or Firefighter?',
    'How activated is the protector (1-10)?',
    'Client ability to differentiate Self from protector:',
    'Protector willingness to negotiate:',
    'Any secondary protectors interfering?'
  ],
  'unburdening-ceremony': [
    'Readiness level of all parts for unburdening:',
    'Client emotional regulation status:',
    'Completeness of witnessing (did exile feel fully seen?):',
    'Element chosen for release and client resonance:',
    'System-wide response to the unburdening:'
  ],
  'inner-child-rescue': [
    'Age of the exile part encountered:',
    'Protector cooperation level:',
    'Client ability to maintain Self while witnessing:',
    'Quality of reparenting interaction:',
    'Integration response — how did the system react?'
  ],
  'parts-council': [
    'Number of parts present at the council:',
    'Key conflicts identified between parts:',
    'Client Self-leadership quality during facilitation:',
    'Parts that were reluctant to participate:',
    'Quality of agreements reached:'
  ],
  'somatic-parts-work': [
    'Primary body location of sensation:',
    'Client somatic awareness level (1-10):',
    'Did body sensation lead to a part? Which one?',
    'Somatic shifts observed during the exercise:',
    'Grounding level throughout the exercise:'
  ],
  'attachment-repair': [
    'Attachment pattern identified (anxious/avoidant/disorganized):',
    'Age and context of origin experience:',
    'Client receptivity to reparenting from Self:',
    'Therapeutic relationship used as corrective experience:',
    'Protector system response to attachment work:'
  ],
  'self-energy-cultivation': [
    'Strongest C qualities observed:',
    'C qualities needing development:',
    'Client ability to unblend:',
    'Physical anchor chosen and effectiveness:',
    'Overall Self-energy access rating (1-10):'
  ],
  'trailhead-exploration': [
    'Trigger/trailhead explored:',
    'Protector chain identified:',
    'Exile discovered behind the protector:',
    'Connection to original wound:',
    'System update achieved?'
  ]
};

const defaultObservationPrompts = [
  'Client emotional state and regulation:',
  'Parts activity observed:',
  'Self-energy access level (1-10):',
  'Key clinical observations:',
  'Safety and containment assessment:'
];

const therapistClientActivities = [
  {
    id: 'parts-dialogue',
    title: 'Guided Parts Dialogue',
    icon: 'MessageSquare',
    category: 'in-session',
    duration: '20-30 min',
    description: 'A structured exercise for advisor-guided conversation with your internal parts. Your advisor leads while you turn inward.',
    therapistGuidance: 'Watch for blending indicators. If client says "I AM angry" vs "I notice anger," they may be blended. Help them create separation. Monitor affect intensity.',
    steps: [
      { title: 'Find the Target Part', instruction: 'With your therapist\'s guidance, notice which part is most present. Where do you feel it in your body? What emotion does it carry? Describe what you notice to your therapist.', duration: 5, therapistNote: 'Observe client body posture. Ask: "Where in your body do you notice this part?" Look for somatic cues.' },
      { title: 'How Do You Feel Toward It?', instruction: 'Your therapist will ask: "How do you feel toward this part?" Notice your honest response. If you feel anything other than curiosity and compassion, another part is blended.', duration: 5, therapistNote: 'This is the critical Self-detection question. Anything other than curiosity/compassion = another part is present. Help unblend gently.' },
      { title: 'Get to Know the Part', instruction: 'From Self-energy, ask the part: "What do you want me to know about you?" Listen without judging. Let it share at its own pace.', duration: 5, therapistNote: 'Monitor pace. If client rushes, a Manager may be driving. If client shuts down, a protector may be blocking access.' },
      { title: 'Understand Its Role', instruction: 'Ask the part: "What is your job in my system? What are you trying to protect me from?" Appreciate its efforts, even if its methods have been painful.', duration: 5, therapistNote: 'Help client see the positive intent behind even destructive protective behaviors. Use: "So this part has been trying to help you by..."' },
      { title: 'What Does It Need?', instruction: 'Ask: "What do you need from me right now?" and "What would you like me to know that I haven\'t understood yet?"', duration: 5, therapistNote: 'Parts often need acknowledgment more than solutions. Witness the need without jumping to fix it.' },
      { title: 'Thank and Close', instruction: 'Thank the part for sharing. Ask if there\'s anything else before you close. Let it know you\'ll return.', duration: 3, therapistNote: 'Ensure clean closure. Check: "Is this part okay with us stopping here today?" Unresolved sessions can leave clients activated.' }
    ],
    reflectionPrompts: ['What surprised you about what this part shared?', 'Did you notice any shift in how you feel toward this part?', 'What did you learn about why this part behaves the way it does?']
  },
  {
    id: 'protector-negotiation',
    title: 'Protector Parts Negotiation',
    icon: 'Shield',
    category: 'in-session',
    duration: '25-35 min',
    description: 'Work with your advisor to help protective parts feel safe enough to allow access to vulnerable exile parts.',
    therapistGuidance: 'Never bypass protectors. Forcing access to exiles will increase protector activity. Build trust gradually. If protector says no, honor it completely.',
    steps: [
      { title: 'Identify the Protector', instruction: 'With your therapist, identify which protector is active. Is it a Manager or a Firefighter? Notice how it shows up in your body and behavior.', duration: 4, therapistNote: 'Help differentiate: Managers are proactive (control, perfectionism, people-pleasing). Firefighters are reactive (substances, dissociation, rage).' },
      { title: 'Acknowledge Its Work', instruction: 'Tell the protector: "I see how hard you\'ve been working to keep me safe. Thank you for protecting me all this time."', duration: 4, therapistNote: 'Watch for softening in client affect. If protector hardens, slow down. It may not trust the process yet.' },
      { title: 'Understand the Fear', instruction: 'Ask the protector: "What are you afraid would happen if you stepped back?" Listen carefully — its fears point to the exile it guards.', duration: 5, therapistNote: 'Note the specific fear. This reveals what the exile carries. Common: "They\'ll be overwhelmed," "The pain will never stop."' },
      { title: 'Address Its Concerns', instruction: 'Reassure the protector: "I\'m an adult now with resources. I have my therapist here. I can handle what comes up."', duration: 5, therapistNote: 'Lend your Self-energy here. Your calm presence helps protectors trust the process. Use your voice tone intentionally.' },
      { title: 'Negotiate Access', instruction: 'Ask: "Would you be willing to relax just a little so I can get to know the part you\'re protecting? You can step back in anytime."', duration: 5, therapistNote: 'If permission granted, proceed slowly. If denied, ask what the protector needs first. Never push past a "no."' },
      { title: 'Honor the Agreement', instruction: 'If permission is granted, proceed gently. If the protector says no, respect that boundary.', duration: 4, therapistNote: 'A "no" is a clinical win — it means the protector is communicating clearly. Document what it needs for next session.' },
      { title: 'Check Back In', instruction: 'After any deeper work, check with the protector: "How are you doing? Was that okay? Do you need anything?"', duration: 3, therapistNote: 'Always close the loop with protectors. This builds trust for future sessions and prevents backlash.' }
    ],
    reflectionPrompts: ['Which protector did you work with?', 'What is the protector most afraid of?', 'Did the protector grant permission? What did it need?']
  },
  {
    id: 'unburdening-ceremony',
    title: 'Unburdening Ceremony Guide',
    icon: 'Sparkles',
    category: 'in-session',
    duration: '30-45 min',
    description: 'A sacred step-by-step guide for the unburdening process. Best done with advisor present for support and safety.',
    therapistGuidance: 'This is advanced IFS work. Ensure all protectors have given genuine permission. Rushed unburdening can be re-traumatizing. Take your time.',
    steps: [
      { title: 'Confirm Readiness', instruction: 'Check with all protectors and the exile: "Are you ready for this part to release its burdens?" Both must say yes.', duration: 5, therapistNote: 'If ANY part says no, stop and address that part first. Premature unburdening fails or causes backlash.' },
      { title: 'Witness the Story', instruction: 'Let the exile show you what happened. Witness the original experience with compassion from Self.', duration: 8, therapistNote: 'Monitor activation level closely. If client becomes flooded, help them unblend: "Can you step back slightly and watch this scene rather than being IN it?"' },
      { title: 'Retrieve the Part', instruction: 'Ask: "Would you like to leave that scene and come with me somewhere safe?" Help the part leave the past.', duration: 5, therapistNote: 'Some parts resist leaving — they may feel they deserve to stay. Address this belief before proceeding.' },
      { title: 'Identify the Burdens', instruction: 'Ask: "What beliefs or feelings did you take on from that experience?" Let the part name each burden.', duration: 5, therapistNote: 'Common burdens: worthlessness, shame, fear of abandonment, belief of being broken. Help client articulate each one clearly.' },
      { title: 'Choose the Release', instruction: 'Offer the elements: fire, water, wind, earth, or light. Let the part choose how to release.', duration: 3, therapistNote: 'The element choice is deeply personal. Don\'t suggest — let the part choose. The choice often reveals important information.' },
      { title: 'Release the Burdens', instruction: 'Guide the part through releasing each burden using its chosen element. Notice what happens in body and system.', duration: 8, therapistNote: 'This is the most sacred moment. Hold space silently. Watch for spontaneous tears, breathing shifts, or expressions of relief.' },
      { title: 'Invite In Qualities', instruction: 'Ask: "What qualities would you like to take in to replace what you released?" Let the part absorb new qualities.', duration: 4, therapistNote: 'Common replacement qualities: worthiness, safety, love, joy, innocence. Notice which ones the part reaches for.' },
      { title: 'Check the System', instruction: 'Notice how protectors responded to the unburdening. Ask them: "How are you now?"', duration: 4, therapistNote: 'Protectors often spontaneously relax or transform their role after successful unburdening. Document these shifts.' }
    ],
    reflectionPrompts: ['What burdens were released?', 'What element was chosen?', 'What new qualities were taken in?', 'How did the system respond?']
  },
  {
    id: 'inner-child-rescue',
    title: 'Inner Child Rescue Mission',
    icon: 'Heart',
    category: 'in-session',
    duration: '25-40 min',
    description: 'A guided journey to find, comfort, and retrieve a young exile part stuck in a painful memory.',
    therapistGuidance: 'Maintain a calm, steady voice. Your regulation co-regulates the client. If the child part is very young (pre-verbal), use imagery and sensation rather than words.',
    steps: [
      { title: 'Safety Setup', instruction: 'Establish a safe internal space — a peaceful place to bring the child part after the rescue.', duration: 4, therapistNote: 'The safe place should be vivid and detailed. Ask about all senses: what they see, hear, smell, feel. This grounds the exercise.' },
      { title: 'Protector Permission', instruction: 'Ask protector parts for permission to visit the young part they guard.', duration: 5, therapistNote: 'If protectors are anxious, offer reassurance. Some therapists offer themselves as additional safety: "I\'m here too."' },
      { title: 'Travel to the Child', instruction: 'Close your eyes. Let yourself be drawn to the young part. Notice the scene.', duration: 5, therapistNote: 'Guide slowly. Ask: "What do you see? How old is this child? What\'s happening around them?" Don\'t rush the arrival.' },
      { title: 'Make Contact', instruction: 'Approach the child gently. Let them see the adult you are now.', duration: 5, therapistNote: 'Watch for client emotional activation. If they become overwhelmed, help them maintain observer position before approaching.' },
      { title: 'Witness and Validate', instruction: 'Ask the child what happened. Validate their experience fully.', duration: 6, therapistNote: 'This witnessing IS healing. Don\'t minimize or rationalize. Simple statements: "That should never have happened to you."' },
      { title: 'Offer What Was Missing', instruction: 'Ask what they needed. Give exactly that — comfort, protection, love.', duration: 5, therapistNote: 'Notice what the child asks for. This reveals the core wound. Sometimes they just need someone to stay.' },
      { title: 'Bring Them Home', instruction: 'Ask if they\'d like to leave and come to the safe space.', duration: 4, therapistNote: 'Don\'t force retrieval. If not ready, establish an ongoing connection: "I\'ll come visit you. You\'re not alone anymore."' },
      { title: 'Integration', instruction: 'Check in once the child is safe. Check with protectors too.', duration: 4, therapistNote: 'Allow time for the system to settle. The child may test whether adult Self is really trustworthy. This builds over time.' }
    ],
    reflectionPrompts: ['How old was the child? What scene were they in?', 'What did they need?', 'Did they come to the safe space?']
  },
  {
    id: 'parts-council',
    title: 'Parts Council Meeting',
    icon: 'Users',
    category: 'in-session',
    duration: '30-45 min',
    description: 'Facilitate a meeting between multiple parts, allowing them to communicate with each other and with Self.',
    therapistGuidance: 'This requires strong Self-energy from the client. If they can\'t hold the facilitator role, you may need to co-facilitate more actively.',
    steps: [
      { title: 'Set the Council Space', instruction: 'Imagine a round table or circle. You (Self) sit at the center. Invite all parts who want to be heard.', duration: 4, therapistNote: 'Notice which parts arrive first — they\'re usually the most activated. Late arrivals may be shyer or more wounded.' },
      { title: 'Roll Call', instruction: 'Acknowledge each part that shows up. Let each know they are welcome and will get a turn.', duration: 5, therapistNote: 'Count the parts. More than 5-6 may be overwhelming. You can suggest "those most important today" if too many arrive.' },
      { title: 'Hear Each Voice', instruction: 'One at a time, let each part share. No interrupting — just witnessing.', duration: 8, therapistNote: 'If parts interrupt each other, that\'s data. Help the client mediate: "Can you ask that part to wait? It will get its turn."' },
      { title: 'Acknowledge Conflicts', instruction: 'Name tensions openly. Validate both sides of every conflict.', duration: 5, therapistNote: 'Internal conflicts often mirror external relationship patterns. Note these parallels for future exploration.' },
      { title: 'Facilitate Understanding', instruction: 'Help parts see each other\'s perspectives and shared goals.', duration: 6, therapistNote: 'The breakthrough moment: parts realizing they share the goal of protecting the system, just with different strategies.' },
      { title: 'Seek Agreement', instruction: 'From Self, propose a way forward that honors all parts.', duration: 5, therapistNote: 'Agreements don\'t need to be permanent. "Can we try this for one week?" reduces part anxiety about change.' },
      { title: 'Close the Council', instruction: 'Thank every part. Remind them they\'re all on the same team.', duration: 3, therapistNote: 'Closing rituals matter. Some clients develop a consistent closing that becomes meaningful to their system.' }
    ],
    reflectionPrompts: ['Which parts showed up?', 'What conflicts were revealed?', 'What agreement was reached?']
  },
  {
    id: 'somatic-parts-work',
    title: 'Somatic Parts Work',
    icon: 'Activity',
    category: 'in-session',
    duration: '20-30 min',
    description: 'Use body sensations to discover and communicate with parts.',
    therapistGuidance: 'Clients with trauma may be disconnected from body awareness. Go slowly. Some clients may experience increased activation when tuning into the body.',
    steps: [
      { title: 'Body Scan Arrival', instruction: 'Slowly scan from head to toe. Notice tension, tightness, warmth, cold, numbness, or tingling.', duration: 4, therapistNote: 'Guide the scan verbally at a slow pace. Pause at each body region. Watch for client fidgeting — it may indicate a part activating.' },
      { title: 'Choose a Sensation', instruction: 'Pick the strongest body sensation. Place attention on it without changing it.', duration: 4, therapistNote: 'Ask for rich description: size, shape, temperature, color, texture, movement. This anchors the experience.' },
      { title: 'Ask the Sensation', instruction: 'Speak to the sensation: "What are you? Who are you?" Wait patiently.', duration: 5, therapistNote: 'Parts may communicate non-verbally through sensation changes. A warming = openness. A tightening = protective response.' },
      { title: 'Follow the Story', instruction: 'As the part reveals itself, let the sensation guide you deeper.', duration: 5, therapistNote: 'Monitor regulation. If sensation intensifies beyond the window of tolerance, help client pendulate between sensation and a resource.' },
      { title: 'Breath and Movement', instruction: 'Your therapist may guide you to breathe into the sensation or gently move.', duration: 4, therapistNote: 'Offer somatic interventions: directed breathing, gentle movement, hand placement. Let the part guide which feels right.' },
      { title: 'Release and Integration', instruction: 'If ready, ask what it needs to release its tension. Follow its guidance.', duration: 4, therapistNote: 'Release may come as tears, trembling, deep breath, yawn, or sighing. All are valid and healthy completions.' },
      { title: 'Final Body Check', instruction: 'Do one more quick scan. Notice what has changed.', duration: 3, therapistNote: 'Compare beginning and end states. Document shifts. These become evidence of change the client can reference.' }
    ],
    reflectionPrompts: ['Where was the strongest sensation?', 'What part was connected to it?', 'How did the sensation change?']
  },
  {
    id: 'attachment-repair',
    title: 'Attachment Repair Exercise',
    icon: 'Heart',
    category: 'in-session',
    duration: '30-40 min',
    description: 'Work with your advisor to repair attachment wounds by reparenting exile parts.',
    therapistGuidance: 'Your therapeutic relationship IS a corrective attachment experience. Use it intentionally. Be consistent, present, and attuned throughout.',
    steps: [
      { title: 'Identify the Attachment Pattern', instruction: 'Identify which pattern is most active: anxious, avoidant, or disorganized. Name the parts involved.', duration: 5, therapistNote: 'Attachment patterns often emerge in the therapy room itself. Notice: Does client seek reassurance (anxious)? Intellectualize (avoidant)? Alternate (disorganized)?' },
      { title: 'Find the Origin Story', instruction: 'Ask the exile: "When did you first learn relationships were unsafe?" Let it show you.', duration: 6, therapistNote: 'These are often pre-verbal or very early memories. Images, body sensations, and felt senses are more important than narrative.' },
      { title: 'Reparenting from Self', instruction: 'As your adult Self, approach the child and offer what the original caregiver couldn\'t provide.', duration: 6, therapistNote: 'Model the reparenting language: "I will never leave you. You are safe with me. Your needs matter." Watch for client affect shifts.' },
      { title: 'New Experience Practice', instruction: 'Your therapist models healthy attachment right now. Notice how it feels to be truly seen and accepted.', duration: 5, therapistNote: 'This is your most powerful tool. Your attunement, consistency, and genuine care create new neural pathways for the client.' },
      { title: 'Update Protectors', instruction: 'Let attachment-related protectors know about this repair. Ask what they need to try new approaches.', duration: 5, therapistNote: 'Protectors may be skeptical: "This won\'t last" or "People always leave." Don\'t argue — validate and demonstrate consistency.' },
      { title: 'Practice New Patterns', instruction: 'With your therapist, role-play a real scenario. Practice responding from Self.', duration: 5, therapistNote: 'Choose a low-stakes real-life scenario. Success here builds confidence for more challenging situations.' },
      { title: 'Integration and Homework', instruction: 'Discuss one small way to practice this new pattern before next session.', duration: 4, therapistNote: 'Homework should be specific, achievable, and not overwhelming. "This week, name one need to a safe person."' }
    ],
    reflectionPrompts: ['Which attachment pattern was explored?', 'What did the child part need?', 'What small step will you practice?']
  },
  {
    id: 'self-energy-cultivation',
    title: 'Self-Energy Cultivation',
    icon: 'Brain',
    category: 'in-session',
    duration: '15-20 min',
    description: 'Strengthen connection to Self — the calm, compassionate core.',
    therapistGuidance: 'Self-energy is the healing agent in IFS. Your job is to model it and help the client access it. The more YOU are in Self, the more the client can access theirs.',
    steps: [
      { title: 'The 8 C\'s Inventory', instruction: 'Rate each C quality 1-10: Calm, Curiosity, Clarity, Compassion, Confidence, Courage, Creativity, Connectedness.', duration: 4, therapistNote: 'Document the ratings. Track over time to show progress. Low ratings reveal which protectors are most active.' },
      { title: 'Unblending Practice', instruction: 'Practice shifting from "I feel angry" to "I notice a part of me that feels angry." Notice the perspective shift.', duration: 4, therapistNote: 'This linguistic shift is one of the most powerful IFS interventions. Celebrate even small shifts in language.' },
      { title: 'Self-Energy Expansion', instruction: 'Focus on where you feel most like your true self. Expand that feeling outward like warm light.', duration: 4, therapistNote: 'Some clients find this through heart-centered awareness, others through spaciousness, others through groundedness. All valid.' },
      { title: 'Parts as Visitors', instruction: 'Imagine yourself in a peaceful place. Parts can visit but don\'t overwhelm you. Greet each from Self.', duration: 4, therapistNote: 'This metaphor helps clients practice maintaining Self while parts are active. It\'s the core skill of IFS therapy.' },
      { title: 'Anchoring Self', instruction: 'Create a physical anchor: hand on heart, specific breath, or a word. Practice accessing Self through this anchor.', duration: 4, therapistNote: 'The anchor becomes a tool for between-session regulation. Practice it in session so it\'s "charged" with the experience.' }
    ],
    reflectionPrompts: ['Which C qualities are strongest?', 'What does Self-energy feel like for you?', 'What anchor did you create?']
  },
  {
    id: 'trailhead-exploration',
    title: 'Trailhead Exploration Exercise',
    icon: 'Target',
    category: 'in-session',
    duration: '20-30 min',
    description: 'Use real-life triggers as doorways to discover and heal parts.',
    therapistGuidance: 'Trailheads are the most naturalistic entry point to parts work. They connect everyday experiences to deeper healing. Start with moderate triggers, not the most intense ones.',
    steps: [
      { title: 'Identify the Trigger', instruction: 'Think of a recent situation with a strong emotional reaction. Describe it fully.', duration: 4, therapistNote: 'Help client be specific: Who, what, when, where. The more detailed the trailhead, the clearer the path to the part.' },
      { title: 'Notice the Reaction', instruction: 'Recall your reaction in detail — emotions, thoughts, physical sensations, impulses.', duration: 4, therapistNote: 'The reaction pattern (fight/flight/freeze/fix) points to the protector type. Document for pattern tracking over sessions.' },
      { title: 'Find the Part', instruction: 'Turn inward and locate the part that reacted. Where is it? What does it look like? How old?', duration: 4, therapistNote: 'If client can\'t visualize, use somatic cues: "Where in your body do you feel this part most?" or "What color is it?"' },
      { title: 'Explore the Chain', instruction: 'This protector guards an exile. Ask: "Who are you protecting?" Follow the chain inward.', duration: 5, therapistNote: 'The protector-exile chain is the core of IFS case conceptualization. Map it carefully — you\'ll return to this map.' },
      { title: 'Connect the Pattern', instruction: 'Explore how this trigger connects to older experiences. Ask the exile when it first felt this way.', duration: 5, therapistNote: 'This is where past and present connect. Help client see: "So this argument with your partner activated the same part that..."' },
      { title: 'Offer What Was Needed', instruction: 'Ask the younger part what it needed. Offer it now from Self.', duration: 4, therapistNote: 'This is micro-unburdening. Even brief contact between Self and exile is healing. Don\'t rush to full unburdening.' },
      { title: 'Update the System', instruction: 'Let the protector know what you\'ve learned. Ask if it could try a different approach next time.', duration: 4, therapistNote: 'Protectors change when they see the exile has been helped. They don\'t need to be convinced — they need evidence.' }
    ],
    reflectionPrompts: ['What was the trailhead?', 'What protector and exile were connected?', 'What did the exile need?']
  }
];

const iconMap = {
  MessageSquare, Shield, Sparkles, Heart, Users, Activity, Brain, Target, BookOpen, Eye, Star
};

export default function CoTherapySession() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [activeActivity, setActiveActivity] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stepTimer, setStepTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [therapistNotes, setTherapistNotes] = useState({});
  const [clientReflections, setClientReflections] = useState({});
  const [observationNotes, setObservationNotes] = useState({});
  const [expandedGuidance, setExpandedGuidance] = useState(true);
  const [completedActivities, setCompletedActivities] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [partsMapData, setPartsMapData] = useState(null);
  const [partsMapOpen, setPartsMapOpen] = useState(false);
  const [clientWoundData, setClientWoundData] = useState(null);

  useEffect(() => {
    const storedId = sessionStorage.getItem('co_therapy_client_id');
    const storedName = sessionStorage.getItem('co_therapy_client_name');
    if (storedId) setSelectedClientId(storedId);
    if (storedName) setSelectedClientName(storedName);
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const fetchPartsAndWounds = async () => {
      try {
        const [partsRes, woundsRes] = await Promise.all([
          supabase.from('ifs_interactive_data').select('data').eq('client_id', selectedClientId).eq('module_id', 'parts_map').maybeSingle(),
          supabase.from('ifs_interactive_data').select('data').eq('client_id', selectedClientId).eq('module_id', 'assessment_wounds').maybeSingle()
        ]);
        setPartsMapData(partsRes.data?.data || null);
        const wd = woundsRes.data?.data;
        setClientWoundData(wd ? { primary_wound: wd.primary, secondary_wound: wd.secondary } : null);
      } catch (err) {
        console.error('Error fetching parts map data:', err);
      }
    };
    fetchPartsAndWounds();
  }, [selectedClientId]);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setStepTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startActivity = (activity) => {
    setActiveActivity(activity);
    setActiveStep(0);
    setStepTimer(0);
    setIsTimerRunning(false);
    setTherapistNotes({});
    setClientReflections({});
    setObservationNotes({});
    setExpandedGuidance(true);
  };

  const nextStep = () => {
    if (activeActivity && activeStep < activeActivity.steps.length - 1) {
      setActiveStep(prev => prev + 1);
      setStepTimer(0);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      setStepTimer(0);
    }
  };

  const completeActivity = async () => {
    if (!activeActivity || !selectedClientId) return;

    const progressEntry = {
      data: {
        coTherapy: true,
        therapistNotes,
        observationNotes,
        sessionDate: new Date().toISOString(),
        therapistId: clientAuth.getCurrentClient()?.id
      },
      completed: true,
      reflections: clientReflections
    };

    try {
      await supabaseHelpers.saveTherapyActivityProgress(selectedClientId, activeActivity.id, progressEntry);
    } catch (err) {
      console.error('Error saving co-therapy progress:', err);
    }

    setCompletedActivities(prev => ({ ...prev, [activeActivity.id]: true }));
    setActiveActivity(null);
    setActiveStep(0);
    setStepTimer(0);
    setIsTimerRunning(false);
  };

  const isDark = theme.isDark;
  const cardBg = isDark ? 'bg-slate-800/90' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900';

  if (!selectedClientId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/therapist-dashboard')} className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-6 transition-colors`}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className={`${cardBg} rounded-xl border ${cardBorder} p-12 text-center`}>
          <Heart className={`w-12 h-12 mx-auto mb-4 ${textMuted}`} />
          <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>No Client Selected</h2>
          <p className={`${textSecondary} mb-4`}>Please select a client from the Therapist Dashboard to begin a co-therapy session.</p>
          <button onClick={() => navigate('/therapist-dashboard')} className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (activeActivity) {
    const step = activeActivity.steps[activeStep];
    const totalSteps = activeActivity.steps.length;
    const observationPromptsForActivity = therapistObservationPrompts[activeActivity.id] || defaultObservationPrompts;
    const ActivityIcon = iconMap[activeActivity.icon] || Heart;

    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { if (confirm('End this activity? Notes will be lost unless you complete it.')) { setActiveActivity(null); setActiveStep(0); }}} className={`flex items-center gap-2 ${textSecondary} hover:text-red-500 transition-colors text-sm`}>
            <ArrowLeft className="w-4 h-4" /> Exit Activity
          </button>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'} border ${isDark ? 'border-emerald-800' : 'border-emerald-200'}`}>
              <Heart className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-medium ${textPrimary}`}>Co-Therapy with {selectedClientName}</span>
            </div>
            <button
              onClick={() => setPartsMapOpen(!partsMapOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                partsMapOpen
                  ? `${isDark ? 'bg-violet-900/40 border-violet-700 text-violet-300' : 'bg-violet-100 border-violet-300 text-violet-700'} border`
                  : `${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-600'} border`
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Parts Map
            </button>
          </div>
        </div>

        <div className={`${cardBg} rounded-xl border ${cardBorder} p-5 mb-4`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>{activeActivity.title}</h2>
              <p className={`text-sm ${textSecondary}`}>Step {activeStep + 1} of {totalSteps} | {step.title}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className={`flex items-center gap-1 text-sm ${textSecondary}`}>
                <Clock className="w-4 h-4" />
                {formatTime(stepTimer)} / ~{step.duration} min
              </div>
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`p-2 rounded-lg ${isTimerRunning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} transition-colors`}>
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-rose-600 rounded-full transition-all" style={{ width: `${((activeStep + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <BookOpen className="w-4 h-4 text-amber-500" />
                Client Instructions
              </h3>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'} border ${isDark ? 'border-slate-600' : 'border-amber-100'}`}>
                <p className={`text-sm ${textPrimary} leading-relaxed`}>{step.instruction}</p>
              </div>
            </div>

            {step.therapistNote && (
              <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
                <button onClick={() => setExpandedGuidance(!expandedGuidance)} className={`w-full flex items-center justify-between`}>
                  <h3 className={`font-semibold ${textPrimary} flex items-center gap-2`}>
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Advisor Guidance
                  </h3>
                  {expandedGuidance ? <ChevronUp className={`w-4 h-4 ${textMuted}`} /> : <ChevronDown className={`w-4 h-4 ${textMuted}`} />}
                </button>
                {expandedGuidance && (
                  <div className={`mt-3 p-4 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'} border ${isDark ? 'border-amber-800' : 'border-amber-100'}`}>
                    <p className={`text-sm ${textSecondary} leading-relaxed`}>{step.therapistNote}</p>
                  </div>
                )}
              </div>
            )}

            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <FileText className="w-4 h-4 text-blue-500" />
                Advisor Notes for This Step
              </h3>
              <textarea
                value={therapistNotes[activeStep] || ''}
                onChange={(e) => setTherapistNotes(prev => ({ ...prev, [activeStep]: e.target.value }))}
                rows={3}
                placeholder="Record your observations, client responses, clinical notes..."
                className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <Eye className="w-4 h-4 text-stone-500" />
                Clinical Observation Checklist
              </h3>
              <div className="space-y-3">
                {observationPromptsForActivity.map((prompt, i) => (
                  <div key={i}>
                    <label className={`text-xs font-medium ${textSecondary} block mb-1`}>{prompt}</label>
                    <input
                      type="text"
                      value={observationNotes[`${activeStep}-${i}`] || ''}
                      onChange={(e) => setObservationNotes(prev => ({ ...prev, [`${activeStep}-${i}`]: e.target.value }))}
                      placeholder="..."
                      className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-stone-500 outline-none text-sm`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {partsMapOpen && (
              <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
                <h3 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                  <Map className="w-4 h-4 text-violet-500" />
                  Client's Parts Map
                </h3>
                {clientWoundData?.primary_wound && (
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-rose-900/30 text-rose-300 border border-rose-800' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                      Primary Wound: {clientWoundData.primary_wound.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                )}
                {partsMapData?.parts && partsMapData.parts.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const groups = { Self: [], Manager: [], Firefighter: [], Exile: [] };
                      const groupStyles = {
                        Self: { bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', border: isDark ? 'border-emerald-800' : 'border-emerald-200', badge: isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700', label: 'Self' },
                        Manager: { bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', border: isDark ? 'border-blue-800' : 'border-blue-200', badge: isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700', label: 'Managers' },
                        Firefighter: { bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-800' : 'border-amber-200', badge: isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700', label: 'Firefighters' },
                        Exile: { bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50', border: isDark ? 'border-rose-800' : 'border-rose-200', badge: isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-700', label: 'Exiles' }
                      };
                      partsMapData.parts.forEach(part => {
                        const type = part.type || 'Manager';
                        if (groups[type]) groups[type].push(part);
                        else groups.Manager.push(part);
                      });
                      return Object.entries(groups).filter(([, parts]) => parts.length > 0).map(([type, parts]) => {
                        const style = groupStyles[type];
                        return (
                          <div key={type}>
                            <div className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>{style.label}</div>
                            <div className="space-y-1.5">
                              {parts.map(part => (
                                <div key={part.id} className={`p-2.5 rounded-lg ${style.bg} border ${style.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-medium ${textPrimary}`}>{part.name}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${style.badge}`}>{type}</span>
                                  </div>
                                  {part.role && <p className={`text-xs ${textSecondary} leading-relaxed`}>{part.role}</p>}
                                  {part.notes && <p className={`text-xs ${textMuted} mt-1 italic`}>{part.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'} text-center`}>
                    <Map className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} />
                    <p className={`text-sm ${textSecondary}`}>No parts map data available for this client</p>
                  </div>
                )}
              </div>
            )}

            {activeStep === totalSteps - 1 && activeActivity.reflectionPrompts && (
              <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
                <h3 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  Client Reflections
                </h3>
                <div className="space-y-3">
                  {activeActivity.reflectionPrompts.map((prompt, i) => (
                    <div key={i}>
                      <label className={`text-xs font-medium ${textSecondary} block mb-1`}>{prompt}</label>
                      <textarea
                        value={clientReflections[i] || ''}
                        onChange={(e) => setClientReflections(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={2}
                        placeholder="Client's response..."
                        className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between mt-6 ${cardBg} rounded-xl border ${cardBorder} p-4`}>
          <button
            onClick={prevStep}
            disabled={activeStep === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeStep === 0 ? `${textMuted} cursor-not-allowed` : `${textPrimary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Previous Step
          </button>

          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === activeStep ? 'bg-emerald-500 scale-125' : i < activeStep ? 'bg-emerald-300' : isDark ? 'bg-slate-600' : 'bg-gray-300'
              }`} />
            ))}
          </div>

          {activeStep < totalSteps - 1 ? (
            <button onClick={nextStep} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-rose-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-rose-700 transition-all">
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={completeActivity} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all">
              <CheckCircle className="w-4 h-4" /> Complete & Save
            </button>
          )}
        </div>
      </div>
    );
  }

  const filteredActivities = selectedCategory === 'all'
    ? therapistClientActivities
    : therapistClientActivities.filter(a => a.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/therapist-dashboard')} className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-6 transition-colors`}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Co-Therapy Session</h1>
            <p className={`text-sm ${textSecondary}`}>Guiding therapy activities with <span className="font-semibold text-emerald-500">{selectedClientName}</span></p>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-xl border ${cardBorder} p-5 mb-6`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h3 className={`font-semibold ${textPrimary} text-sm`}>Session Guide</h3>
        </div>
        <p className={`text-sm ${textSecondary} leading-relaxed`}>
          Each activity includes step-by-step instructions to read with your client, advisor-specific clinical guidance visible only to you,
          observation checkpoints to document what you notice, and space for both your notes and client reflections. All session data saves to the client's record.
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Activities' },
          { id: 'in-session', label: 'In-Session' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-md'
                : `${cardBg} ${textSecondary} border ${cardBorder} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map(activity => {
          const ActivityIcon = iconMap[activity.icon] || Heart;
          const isCompleted = completedActivities[activity.id];
          return (
            <div key={activity.id} className={`${cardBg} rounded-xl border ${cardBorder} p-5 transition-all hover:shadow-lg ${isCompleted ? 'ring-2 ring-emerald-400' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-emerald-500 to-rose-600'} flex items-center justify-center flex-shrink-0`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : <ActivityIcon className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${textPrimary} text-sm`}>{activity.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                      <Clock className="w-3 h-3" />
                      {activity.duration}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                      {activity.steps.length} steps
                    </span>
                  </div>
                </div>
              </div>
              <p className={`text-xs ${textSecondary} leading-relaxed mb-3`}>{activity.description}</p>
              {activity.therapistGuidance && (
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'} border ${isDark ? 'border-amber-800' : 'border-amber-100'} mb-3`}>
                  <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                    <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="italic">{activity.therapistGuidance}</span>
                  </p>
                </div>
              )}
              <button
                onClick={() => startActivity(activity)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isCompleted
                    ? `border ${cardBorder} ${textSecondary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`
                    : 'bg-gradient-to-r from-emerald-500 to-rose-600 text-white hover:from-emerald-600 hover:to-rose-700 shadow-sm'
                }`}
              >
                {isCompleted ? <><Eye className="w-4 h-4" /> Do Again</> : <><Play className="w-4 h-4" /> Start Together</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
