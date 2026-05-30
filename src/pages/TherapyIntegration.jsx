import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, FileText, CheckSquare, Clock, MessageSquare, Download, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Heart, Shield, Users, Play, Pause, Star, BookOpen, Target, Sparkles, Eye, Brain, AlertCircle, Lightbulb } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers } from '../lib/supabase';
import PreSessionCheckin from '../components/PreSessionCheckin';
import GuidedBreathing from '../components/GuidedBreathing';
import { clientAuth } from '../lib/supabasePersonalization';

const therapistClientActivities = [
  {
    id: 'session-prep',
    title: 'Pre-Session Preparation',
    icon: 'BookOpen',
    category: 'preparation',
    duration: '10-15 min',
    description: 'Prepare yourself before meeting with your advisor so you can make the most of your session time.',
    steps: [
      { title: 'Internal Check-In', instruction: 'Close your eyes and take 3 slow breaths. Notice which parts are present right now. Are any parts activated or anxious about the upcoming session?', duration: 3 },
      { title: 'Identify Session Focus', instruction: 'Ask inside: "What part most needs attention today?" Notice who speaks up. Write down the part\'s name and what it wants to share.', duration: 3 },
      { title: 'Note Protector Concerns', instruction: 'Check if any protective parts have concerns about today\'s work. What are they worried about? What do they need to feel safe enough to allow deeper work?', duration: 3 },
      { title: 'Set an Intention', instruction: 'Set a clear intention for today\'s session. Examples: "I want to understand my inner critic better" or "I\'m ready to witness my wounded child part." Write this down to share with your advisor.', duration: 2 },
      { title: 'Self-Energy Check', instruction: 'Rate your access to Self-energy right now (1-10). If below 5, do a brief grounding exercise. Your advisor can help you access more Self-energy at the start of your session.', duration: 2 }
    ],
    reflectionPrompts: [
      'Which parts showed up during your preparation?',
      'What feels most important to explore today?',
      'What might your protectors need to hear before deeper work begins?'
    ]
  },
  {
    id: 'parts-dialogue',
    title: 'Guided Parts Dialogue',
    icon: 'MessageSquare',
    category: 'in-session',
    duration: '20-30 min',
    description: 'A structured exercise for advisor-guided conversation with your internal parts. Your advisor leads while you turn inward.',
    steps: [
      { title: 'Find the Target Part', instruction: 'With your advisor\'s guidance, notice which part is most present. Where do you feel it in your body? What emotion does it carry? Describe what you notice to your advisor.', duration: 5 },
      { title: 'How Do You Feel Toward It?', instruction: 'Your advisor will ask: "How do you feel toward this part?" Notice your honest response. If you feel anything other than curiosity and compassion (like frustration, fear, or judgment), another part is blended. Ask that part to step back.', duration: 5 },
      { title: 'Get to Know the Part', instruction: 'From Self-energy, ask the part: "What do you want me to know about you?" Listen without judging. Let it share at its own pace. Your advisor will help you stay in Self.', duration: 5 },
      { title: 'Understand Its Role', instruction: 'Ask the part: "What is your job in my system? What are you trying to protect me from?" Appreciate its efforts, even if its methods have been painful. Every part has positive intent.', duration: 5 },
      { title: 'What Does It Need?', instruction: 'Ask: "What do you need from me right now?" and "What would you like me to know that I haven\'t understood yet?" Let the part guide the conversation.', duration: 5 },
      { title: 'Thank and Close', instruction: 'Thank the part for sharing. Ask if there\'s anything else before you close. Let it know you\'ll return. Your advisor will help you transition back.', duration: 3 }
    ],
    reflectionPrompts: [
      'What surprised you about what this part shared?',
      'Did you notice any shift in how you feel toward this part?',
      'What did you learn about why this part behaves the way it does?',
      'How did it feel to approach this part from Self-energy?'
    ]
  },
  {
    id: 'protector-negotiation',
    title: 'Protector Parts Negotiation',
    icon: 'Shield',
    category: 'in-session',
    duration: '25-35 min',
    description: 'Work with your advisor to help protective parts (Managers and Firefighters) feel safe enough to allow access to vulnerable exile parts.',
    steps: [
      { title: 'Identify the Protector', instruction: 'With your advisor, identify which protector is active. Is it a Manager (preventing pain through control) or a Firefighter (reacting to pain that\'s already leaked through)? Notice how it shows up in your body and behavior.', duration: 4 },
      { title: 'Acknowledge Its Work', instruction: 'Tell the protector: "I see how hard you\'ve been working to keep me safe. Thank you for protecting me all this time." Notice its response. Does it soften? Does it have more to say?', duration: 4 },
      { title: 'Understand the Fear', instruction: 'Ask the protector: "What are you afraid would happen if you stepped back, even a little?" Listen carefully. Its fears are usually about the exile it\'s guarding — the vulnerable part carrying old pain.', duration: 5 },
      { title: 'Address Its Concerns', instruction: 'With your advisor\'s help, address each fear directly. Reassure the protector: "I\'m an adult now with resources. I have my advisor here. I can handle what comes up." Ask what it needs to feel safe enough.', duration: 5 },
      { title: 'Negotiate Access', instruction: 'Ask the protector: "Would you be willing to relax just a little so I can get to know the part you\'re protecting? You can step back in anytime if it feels too much." Wait for genuine permission — don\'t force it.', duration: 5 },
      { title: 'Honor the Agreement', instruction: 'If permission is granted, proceed gently with your advisor. If the protector says no, respect that boundary. Ask what it would need before it could allow access in the future. Build trust over time.', duration: 4 },
      { title: 'Check Back In', instruction: 'After any deeper work, check back with the protector: "How are you doing? Was that okay? Do you need anything from me?" This builds trust for future sessions.', duration: 3 }
    ],
    reflectionPrompts: [
      'Which protector did you work with and what is its primary strategy?',
      'What is the protector most afraid of?',
      'Did the protector grant permission? What did it need to feel safe?',
      'How has your relationship with this protector shifted?'
    ]
  },
  {
    id: 'unburdening-ceremony',
    title: 'Unburdening Ceremony Guide',
    icon: 'Sparkles',
    category: 'in-session',
    duration: '30-45 min',
    description: 'A sacred step-by-step guide for the unburdening process. Best done with your advisor present for support and safety.',
    steps: [
      { title: 'Confirm Readiness', instruction: 'Check with all protectors: "Are you ready for this part to release its burdens?" Check with the exile: "Are you ready to let go of what you\'ve been carrying?" Both must say yes. If not, spend more time building trust.', duration: 5 },
      { title: 'Witness the Story', instruction: 'With your advisor holding space, let the exile show you what happened. Witness the original experience with compassion. You don\'t need to re-live it — just witness it from Self. Let the part know: "I see what happened to you. I\'m so sorry."', duration: 8 },
      { title: 'Retrieve the Part', instruction: 'Ask the part: "Would you like to leave that scene? Would you like to come with me to somewhere safe?" If yes, help the part leave the past. Bring it to a safe place — real or imagined. Let it know: "You\'re safe now. That\'s over."', duration: 5 },
      { title: 'Identify the Burdens', instruction: 'Ask the part: "What beliefs or feelings did you take on from that experience?" Common burdens: "I\'m not good enough," "I\'m unlovable," "It was my fault," "I\'m broken." Let the part name each burden.', duration: 5 },
      { title: 'Choose the Release', instruction: 'Ask the part: "How would you like to release these burdens?" Offer the elements: fire (burn away), water (wash away), wind (blow away), earth (bury/compost), light (dissolve into light). Let the part choose what feels right.', duration: 3 },
      { title: 'Release the Burdens', instruction: 'Guide the part through releasing each burden using its chosen element. Take your time. Notice what happens in the part and in your body as each burden lifts. Your advisor will support you through this.', duration: 8 },
      { title: 'Invite In Qualities', instruction: 'Ask the unburdened part: "What qualities would you like to take in to replace what you released?" Common qualities: worthiness, safety, love, joy, innocence, strength, freedom. Let the part absorb these new qualities.', duration: 4 },
      { title: 'Check the System', instruction: 'Notice how your protectors responded to the unburdening. Often they spontaneously relax or shift. Ask them: "How are you now?" Thank all parts involved for their courage and willingness.', duration: 4 }
    ],
    reflectionPrompts: [
      'What burdens did the part release? What element did it choose?',
      'What new qualities did the part take in?',
      'How do you feel different in your body after the unburdening?',
      'How did your protector parts respond to the exile\'s release?',
      'What shifted in your internal system?'
    ]
  },
  {
    id: 'post-session-integration',
    title: 'Post-Session Integration',
    icon: 'Heart',
    category: 'after-session',
    duration: '15-20 min',
    description: 'Process and integrate what happened in your therapy session. Best done within 24 hours of your session.',
    steps: [
      { title: 'Grounding Return', instruction: 'Find a quiet space. Take 5 slow breaths. Feel your feet on the ground. Place a hand on your heart. You\'re here, now, in the present moment. The session work is held safely inside you.', duration: 3 },
      { title: 'Session Recap', instruction: 'Without judgment, recall the key moments of your session. What parts did you work with? What did you learn? What emotions came up? Write a brief summary in your session notes.', duration: 4 },
      { title: 'Parts Check-In', instruction: 'Check in with the parts you worked with: "How are you feeling after our session?" Listen to each part. Some may feel relief, others may feel stirred up. All responses are valid. Offer comfort to any part that needs it.', duration: 4 },
      { title: 'Body Awareness', instruction: 'Scan your body from head to toe. Notice any areas of tension, release, warmth, or change since the session. These physical shifts often mirror internal healing. Note what you observe.', duration: 3 },
      { title: 'Integration Journaling', instruction: 'Write freely for 5 minutes about your experience. What shifted? What surprised you? What do you want to remember? What feels different? Don\'t edit — just let it flow.', duration: 5 },
      { title: 'Self-Care Plan', instruction: 'Based on what came up, what do you need in the next 24-48 hours? More rest? Gentle movement? Connection with a safe person? Creative expression? Make a simple self-care plan and commit to it.', duration: 3 }
    ],
    reflectionPrompts: [
      'What was the most meaningful moment of today\'s session?',
      'What do your parts need from you in the days ahead?',
      'What self-care will you prioritize this week?',
      'What would you like to explore further in your next session?'
    ]
  },
  {
    id: 'daily-parts-check',
    title: 'Daily Parts Check-In Practice',
    icon: 'Eye',
    category: 'daily-practice',
    duration: '5-10 min',
    description: 'A brief daily practice to maintain connection with your internal system between therapy sessions.',
    steps: [
      { title: 'Settle In', instruction: 'Find a comfortable position. Close your eyes or soften your gaze. Take 3 deep breaths to arrive in the present moment. Set the intention to connect with your internal family.', duration: 2 },
      { title: 'Invite All Parts', instruction: 'Silently say: "I\'d like to check in with all of my parts. Everyone is welcome." Notice who shows up. There\'s no right or wrong — just notice which parts are present today.', duration: 2 },
      { title: 'Listen Without Fixing', instruction: 'For each part that shows up, simply ask: "How are you today?" Listen to the response without trying to fix or change anything. Just acknowledge: "I hear you. Thank you for sharing."', duration: 3 },
      { title: 'Notice Any Needs', instruction: 'Ask: "Does anyone need anything from me today?" A protector might need reassurance. An exile might need comfort. Self might need space. Note what comes up.', duration: 2 },
      { title: 'Close with Gratitude', instruction: 'Thank all your parts for showing up. Remind them: "I\'m here for all of you. We\'re in this together." Take one final deep breath and gently open your eyes.', duration: 1 }
    ],
    reflectionPrompts: [
      'Which parts were most present today?',
      'Did any part have an urgent need?',
      'How is your relationship with your parts evolving over time?'
    ]
  },
  {
    id: 'trailhead-exploration',
    title: 'Trailhead Exploration Exercise',
    icon: 'Target',
    category: 'in-session',
    duration: '20-30 min',
    description: 'Use real-life triggers ("trailheads") as doorways to discover and heal parts. Bring a recent triggering event to explore with your advisor.',
    steps: [
      { title: 'Identify the Trigger', instruction: 'Think of a recent situation where you had a strong emotional reaction — anger, sadness, anxiety, shutdown. Describe the situation to your advisor: What happened? Who was involved? What was said or done?', duration: 4 },
      { title: 'Notice the Reaction', instruction: 'Recall your reaction in detail. What emotions came up? What thoughts? What physical sensations? What did you want to do (fight, flee, freeze, fix)? This reaction is a part — it\'s your trailhead.', duration: 4 },
      { title: 'Find the Part', instruction: 'Turn inward and locate the part that reacted. Where is it in your body? What does it look like? How old does it feel? Ask your advisor to help you stay curious rather than blended.', duration: 4 },
      { title: 'Explore the Chain', instruction: 'This reacting part is usually a protector. Ask it: "Who are you protecting?" Follow the chain inward. The protector guards an exile — a younger part carrying original pain. Notice who appears.', duration: 5 },
      { title: 'Connect the Pattern', instruction: 'With your advisor, explore how this trigger connects to older experiences. Ask the exile: "When did you first feel this way?" Let it show you the original wound, if it\'s ready.', duration: 5 },
      { title: 'Offer What Was Needed', instruction: 'Ask the younger part: "What did you need back then that you didn\'t get?" Then offer it now from Self: safety, comfort, validation, protection, love. Notice what the part receives.', duration: 4 },
      { title: 'Update the System', instruction: 'Let the protector know what you\'ve learned. Ask: "Now that I\'ve connected with the part you\'re protecting, would you be willing to try a different approach next time this trigger comes up?" Discuss alternatives.', duration: 4 }
    ],
    reflectionPrompts: [
      'What was the trailhead (trigger) you explored?',
      'What protector was activated, and who was it guarding?',
      'What original wound or experience did the exile reveal?',
      'What did the younger part need that it didn\'t receive?',
      'How might this pattern show up differently now that you\'ve connected with these parts?'
    ]
  },
  {
    id: 'self-energy-cultivation',
    title: 'Self-Energy Cultivation with Advisor',
    icon: 'Brain',
    category: 'in-session',
    duration: '15-20 min',
    description: 'Strengthen your connection to Self — the calm, compassionate, curious core of who you are. Your advisor guides you to access and deepen Self-energy.',
    steps: [
      { title: 'The 8 C\'s Inventory', instruction: 'Your advisor will guide you through the 8 C\'s of Self: Calm, Curiosity, Clarity, Compassion, Confidence, Courage, Creativity, Connectedness. Rate each one 1-10. Which are strongest? Which need development?', duration: 4 },
      { title: 'Unblending Practice', instruction: 'If a part is strongly blended (you ARE the emotion rather than noticing it), your advisor will help you unblend. Try: "I notice a part of me that feels [emotion]" rather than "I feel [emotion]." Notice the shift in perspective.', duration: 4 },
      { title: 'Self-Energy Expansion', instruction: 'Focus on an area of your body where you feel most like your true self. Your advisor will guide you to expand that feeling outward — like warm light spreading through your body. This IS Self-energy.', duration: 4 },
      { title: 'Parts as Visitors', instruction: 'Imagine yourself sitting in a peaceful place. Parts can come visit you there, but they don\'t overwhelm you. Practice noticing parts arriving and greeting them from Self: "I see you. Welcome. What brings you here?"', duration: 4 },
      { title: 'Anchoring Self', instruction: 'Create a physical anchor for Self-energy: a hand on your heart, a specific breath pattern, or a word/phrase. Practice accessing Self through this anchor. Your advisor will help you test it with activated parts.', duration: 4 }
    ],
    reflectionPrompts: [
      'Which of the 8 C\'s feel most natural to you?',
      'Which C\'s does your system most need to develop?',
      'What does Self-energy feel like in your body?',
      'What anchor did you create for accessing Self?'
    ]
  },
  {
    id: 'inner-child-rescue',
    title: 'Inner Child Rescue Mission',
    icon: 'Heart',
    category: 'in-session',
    duration: '25-40 min',
    description: 'A guided journey to find, comfort, and retrieve a young exile part stuck in a painful memory. Your advisor provides safety while you connect with your inner child.',
    steps: [
      { title: 'Safety Setup', instruction: 'With your advisor, establish a safe internal space — a peaceful place where you can bring the child part after the rescue. Describe it in detail: What does it look like? What does it feel like? Make it vivid and real.', duration: 4 },
      { title: 'Protector Permission', instruction: 'Ask your protector parts: "I\'d like to visit the young part you\'re guarding. Will you allow me to go to them with my advisor here?" Wait for genuine permission. If a protector is anxious, ask what it needs to feel safe enough.', duration: 5 },
      { title: 'Travel to the Child', instruction: 'Close your eyes. With your advisor guiding, let yourself be drawn to the young part. Notice the scene: Where is this child? What age? What\'s happening around them? Don\'t change anything yet — just arrive and observe.', duration: 5 },
      { title: 'Make Contact', instruction: 'Approach the child gently. Let them see you — the adult you are now. You might say: "Hi, I\'m you, grown up. I came to find you." Watch how the child responds. Some may be scared, some may run to you. Let it unfold naturally.', duration: 5 },
      { title: 'Witness and Validate', instruction: 'Ask the child: "What happened to you here?" Listen to their story. Validate their experience: "That should never have happened to you. It wasn\'t your fault. Your feelings make complete sense." Let them be fully heard.', duration: 6 },
      { title: 'Offer What Was Missing', instruction: 'Ask: "What did you need back then?" Give the child exactly what they needed — a hug, protection, comfort, words of love. This is a corrective emotional experience. Let your Self energy flow to them.', duration: 5 },
      { title: 'Bring Them Home', instruction: 'Ask the child: "Would you like to leave this place and come live with me now?" If yes, take their hand and bring them to the safe space you created. If not yet ready, let them know you\'ll come back and they\'re not forgotten.', duration: 4 },
      { title: 'Integration', instruction: 'Once the child is in the safe space, check in: "How do you feel now? What do you need?" Also check with your protectors — notice if they\'ve relaxed. Thank everyone involved in this healing moment.', duration: 4 }
    ],
    reflectionPrompts: [
      'How old was the child part and what scene were they in?',
      'What did the child need that they didn\'t receive originally?',
      'Did the child come to the safe space? How do they feel there?',
      'How did your protectors respond to the rescue?',
      'What emotions came up for you during this process?'
    ]
  },
  {
    id: 'parts-council',
    title: 'Parts Council Meeting',
    icon: 'Users',
    category: 'in-session',
    duration: '30-45 min',
    description: 'Facilitate a meeting between multiple parts with your advisor, allowing parts to communicate directly with each other and with Self to resolve internal conflicts.',
    steps: [
      { title: 'Set the Council Space', instruction: 'Imagine a round table or circle where all parts can gather. You (Self) sit at the center or head of the table. Your advisor will help you hold the space. Invite all parts who want to be heard today.', duration: 4 },
      { title: 'Roll Call', instruction: 'Notice who shows up. Go around the circle and acknowledge each part: "I see the Inner Critic, the People Pleaser, the Scared Child..." Let each part know they are welcome and will get a turn to speak.', duration: 5 },
      { title: 'Hear Each Voice', instruction: 'One at a time, let each part share what\'s on their mind. Your advisor will help you stay in Self as you listen. Ask each part: "What do you want the others to know?" No interrupting — just witnessing.', duration: 8 },
      { title: 'Acknowledge Conflicts', instruction: 'Often parts are in conflict — one wants to take risks while another wants safety. Name these tensions openly: "I notice the Adventurer and the Protector have different needs." Validate both sides.', duration: 5 },
      { title: 'Facilitate Understanding', instruction: 'Help parts see each other\'s perspectives. Ask the Protector: "Can you see that the Adventurer is trying to help too?" Often parts don\'t realize they share the same ultimate goal: your wellbeing.', duration: 6 },
      { title: 'Seek Agreement', instruction: 'From Self, propose a way forward that honors all parts. Ask: "What if we tried this approach? Would everyone be willing?" Negotiate until you find something all parts can accept, even if imperfect.', duration: 5 },
      { title: 'Close the Council', instruction: 'Thank every part for participating. Acknowledge their courage. Remind them: "We\'re all on the same team. I will keep listening." Set an intention to reconvene when needed.', duration: 3 }
    ],
    reflectionPrompts: [
      'Which parts showed up to the council?',
      'What conflicts or tensions were revealed between parts?',
      'Were any parts surprised by what other parts shared?',
      'What agreement or compromise did the system reach?',
      'How did it feel to lead the council from Self?'
    ]
  },
  {
    id: 'somatic-parts-work',
    title: 'Somatic Parts Work',
    icon: 'Activity',
    category: 'in-session',
    duration: '20-30 min',
    description: 'Use body sensations to discover and communicate with parts. Parts live in the body — this exercise uses somatic awareness to deepen the IFS work with your advisor.',
    steps: [
      { title: 'Body Scan Arrival', instruction: 'Close your eyes. Starting at the top of your head, slowly scan down through your body. Notice any area that has tension, tightness, warmth, cold, numbness, or tingling. These sensations often point to parts. Report what you find to your advisor.', duration: 4 },
      { title: 'Choose a Sensation', instruction: 'Pick the strongest or most interesting body sensation. Place your attention directly on it. Don\'t try to change it — just be with it. Describe it to your advisor: size, shape, temperature, color, texture, movement.', duration: 4 },
      { title: 'Ask the Sensation', instruction: 'Speak to the sensation as if it were a part: "What are you?" or "Who are you?" Wait patiently. Parts may communicate through images, words, emotions, memories, or changes in the sensation itself.', duration: 5 },
      { title: 'Follow the Story', instruction: 'As the part reveals itself, let the sensation guide you deeper. It may move, intensify, or shift. Follow wherever it leads. Your advisor will help you stay present and curious rather than overwhelmed.', duration: 5 },
      { title: 'Breath and Movement', instruction: 'Your advisor may guide you to breathe into the sensation, gently move the body area, or place a hand there. These somatic interventions help the part feel seen and contacted. Notice what shifts.', duration: 4 },
      { title: 'Release and Integration', instruction: 'If the part is ready, ask what it needs to release its tension. It might need a deep breath, a stretch, a cry, or simply to be held. Follow its guidance. Notice how the body sensation changes as the part is witnessed.', duration: 4 },
      { title: 'Final Body Check', instruction: 'Do one more quick body scan. Notice what has changed since the beginning. Are there new sensations? Has the original one shifted? Thank your body and parts for their communication.', duration: 3 }
    ],
    reflectionPrompts: [
      'Where in your body did you find the strongest sensation?',
      'What part was connected to that body sensation?',
      'What did the part communicate through the body?',
      'How did the sensation change during the exercise?',
      'What did you learn about the connection between your body and your parts?'
    ]
  },
  {
    id: 'attachment-repair',
    title: 'Attachment Repair Exercise',
    icon: 'Heart',
    category: 'in-session',
    duration: '30-40 min',
    description: 'Work with your advisor to repair attachment wounds by reparenting exile parts. This exercise addresses the core relational injuries that shape your protective system.',
    steps: [
      { title: 'Identify the Attachment Pattern', instruction: 'With your advisor, identify which attachment pattern is most active: anxious (clinging, fear of abandonment), avoidant (pushing away, fear of closeness), or disorganized (wanting closeness but also fearing it). Name the parts involved.', duration: 5 },
      { title: 'Find the Origin Story', instruction: 'Ask the exile carrying this attachment wound: "When did you first learn that relationships were unsafe?" Let it show you the earliest memory. Your advisor holds the space while you witness the child\'s experience.', duration: 6 },
      { title: 'Reparenting from Self', instruction: 'As the compassionate adult you are now, approach the child in the memory. Offer what the original caregiver couldn\'t provide: "I will never leave you. You are safe with me. Your needs matter. I see you and I choose you."', duration: 6 },
      { title: 'New Experience Practice', instruction: 'Your advisor models a healthy attachment relationship with you in this moment. Notice how it feels to be truly seen, heard, and accepted. Let this new experience sink in. This is what healthy attachment feels like.', duration: 5 },
      { title: 'Update Protectors', instruction: 'Let your attachment-related protectors know about this repair. The anxious part can learn that closeness is safe. The avoidant part can learn that vulnerability won\'t destroy you. Ask what they need to try new approaches.', duration: 5 },
      { title: 'Practice New Patterns', instruction: 'With your advisor, role-play or imagine a real relationship scenario. Practice responding from Self rather than from the old attachment pattern. Notice the difference. Your advisor will coach you through it.', duration: 5 },
      { title: 'Integration and Homework', instruction: 'Discuss with your advisor one small way you can practice this new attachment pattern before the next session. Maybe it\'s letting yourself be vulnerable with a safe person, or speaking a need out loud.', duration: 4 }
    ],
    reflectionPrompts: [
      'Which attachment pattern did you explore?',
      'What early experience shaped this pattern?',
      'What did the child part need to hear from a caregiver?',
      'How did it feel to receive healthy attunement from your therapist?',
      'What small step will you practice before your next session?'
    ]
  },
  {
    id: 'legacy-burden-release',
    title: 'Legacy Burden Exploration',
    icon: 'Star',
    category: 'in-session',
    duration: '25-35 min',
    description: 'Explore burdens passed down through your family system — beliefs, emotions, and patterns inherited from parents, grandparents, and cultural lineage. Work with your advisor to name and begin releasing them.',
    steps: [
      { title: 'Family Pattern Inventory', instruction: 'With your advisor, map out recurring patterns in your family: What beliefs were passed down? ("We don\'t show weakness," "Money is scarce," "Trust no one.") What emotional patterns repeat across generations? Write them down.', duration: 6 },
      { title: 'Find the Carrier Part', instruction: 'Ask inside: "Which part of me carries these family burdens?" Notice who steps forward. This part may not have created the burden — it inherited it. Acknowledge this: "You didn\'t choose this. It was given to you."', duration: 5 },
      { title: 'Trace the Lineage', instruction: 'Ask the part: "Where did this burden come from? Who gave it to you?" You may see images of parents, grandparents, or even ancestors you never met. Notice the chain of pain without judgment.', duration: 5 },
      { title: 'Compassion for the Line', instruction: 'From Self, offer compassion to your entire lineage: "They carried what they could. They passed on what they couldn\'t bear. But this burden doesn\'t have to continue through me." Feel the weight of this recognition.', duration: 5 },
      { title: 'Permission to Release', instruction: 'Ask the carrier part: "Are you ready to let go of what was never yours to carry?" If yes, choose a way to release: return it to the earth, dissolve it in light, let it flow downstream. If not ready, honor that too.', duration: 5 },
      { title: 'Break the Chain', instruction: 'Visualize the generational chain. See yourself as the link where the pattern transforms. You\'re not breaking from your family — you\'re healing what they couldn\'t. Let new qualities fill the space where the burden was.', duration: 5 },
      { title: 'New Legacy', instruction: 'Ask: "What do I want to carry forward instead?" Choose the qualities your lineage deserves: resilience, love, courage, joy. Feel these new qualities settling into your system. This is your new legacy.', duration: 4 }
    ],
    reflectionPrompts: [
      'What legacy burdens did you identify in your family system?',
      'Which part was carrying these burdens?',
      'What compassion arose for your family lineage?',
      'Were you able to release any legacy burdens? Which ones?',
      'What new legacy do you want to create going forward?'
    ]
  },
  {
    id: 'safety-mapping',
    title: 'Window of Tolerance Mapping',
    icon: 'Target',
    category: 'daily-practice',
    duration: '10-15 min',
    description: 'Map your window of tolerance — the zone where you can stay present and regulated. Identify which parts push you into hyperarousal (fight/flight) or hypoarousal (freeze/shutdown).',
    steps: [
      { title: 'Check Your Zone', instruction: 'Right now, where are you? Hyperarousal (anxious, angry, restless, can\'t sit still), Window of Tolerance (calm, present, able to think clearly), or Hypoarousal (numb, disconnected, foggy, collapsed). Rate each 1-10.', duration: 3 },
      { title: 'Map Your Triggers', instruction: 'List 3 things that push you into hyperarousal (fight/flight). What parts activate? List 3 things that push you into hypoarousal (freeze/shutdown). What parts activate? These patterns reveal your protective system.', duration: 4 },
      { title: 'Identify the Gatekeepers', instruction: 'Which parts control the boundaries of your window? There\'s usually a "too much" protector (shuts you down when emotions get too big) and a "too little" protector (ramps you up when you\'re too numb). Name them.', duration: 3 },
      { title: 'Expand the Window', instruction: 'Practice pendulation: shift attention between something comfortable and something slightly uncomfortable. Stay curious. This gentle back-and-forth gradually widens your window of tolerance. Do this for 3 minutes.', duration: 3 },
      { title: 'Anchor in the Window', instruction: 'Find what helps you stay in the window: breathing patterns, body positions, sensory experiences. Practice one right now. This becomes your go-to regulation tool. Share it with your advisor.', duration: 3 }
    ],
    reflectionPrompts: [
      'Where were you on the arousal spectrum today?',
      'What are your top triggers for hyperarousal and hypoarousal?',
      'Which parts serve as gatekeepers for your window of tolerance?',
      'What anchoring technique worked best for you?'
    ]
  },
  {
    id: 'compassionate-witness',
    title: 'Compassionate Witnessing Practice',
    icon: 'Eye',
    category: 'daily-practice',
    duration: '10-15 min',
    description: 'Develop the Self\'s capacity to witness your parts without becoming overwhelmed. This practice strengthens your ability to hold space for all parts, building trust in the system.',
    steps: [
      { title: 'Center in Self', instruction: 'Take 5 slow breaths. Place one hand on your heart and one on your belly. Set the intention: "I am here as a compassionate witness. I don\'t need to fix anything. I just need to be present."', duration: 2 },
      { title: 'Invite a Part', instruction: 'Gently invite a part to share something with you. Choose a part that\'s been active recently. Say: "I\'m here and I\'m listening. You can share whatever you need to at your own pace."', duration: 3 },
      { title: 'Listen Without Agenda', instruction: 'As the part shares (through feelings, images, thoughts, or body sensations), just receive. Don\'t analyze, fix, advise, or judge. Just witness. If your mind starts problem-solving, gently return to simply being present.', duration: 4 },
      { title: 'Validate What You Heard', instruction: 'Reflect back what the part shared: "I hear that you feel... I understand that you need... That makes sense because..." Validation is one of the most healing things Self can offer any part.', duration: 3 },
      { title: 'Close with Appreciation', instruction: 'Thank the part for trusting you enough to share. Say: "I\'m grateful you showed me this. I won\'t forget. I\'ll carry what you shared with me." Notice how the part responds to being truly seen.', duration: 2 }
    ],
    reflectionPrompts: [
      'Which part shared with you today?',
      'What was it like to listen without trying to fix?',
      'How did the part respond to being witnessed?',
      'What did you learn about this part that you didn\'t know before?'
    ]
  }
];

const categoryLabels = {
  'preparation': { label: 'Before Session', color: 'blue' },
  'in-session': { label: 'With Advisor', color: 'purple' },
  'after-session': { label: 'After Session', color: 'green' },
  'daily-practice': { label: 'Daily Practice', color: 'amber' }
};

const iconMap = {
  BookOpen, MessageSquare, Shield, Sparkles, Heart, Eye, Target, Brain, Users, Star, Activity: Lightbulb
};

export default function TherapyIntegration() {
  const { theme, getAnimationClass } = useTheme();
  const [activeTab, setActiveTab] = useState('activities');
  const [sessions, setSessions] = useState([]);
  const [homework, setHomework] = useState([]);
  const [activityProgress, setActivityProgress] = useState({});
  const [activeActivity, setActiveActivity] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stepTimer, setStepTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activityReflections, setActivityReflections] = useState({});
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPreSessionCheckin, setShowPreSessionCheckin] = useState(false);
  const [showGuidedBreathing, setShowGuidedBreathing] = useState(false);
  const [newSession, setNewSession] = useState({
    date: new Date().toISOString().split('T')[0],
    therapistNotes: '',
    myNotes: '',
    partsDiscussed: '',
    insights: '',
    nextSessionGoals: ''
  });
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    dueDate: '',
    completed: false
  });

  useEffect(() => {
    const loadData = async () => {
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (!clientId) return;
      try {
        const [sessionsData, homeworkData, activityData] = await Promise.all([
          supabaseHelpers.getTherapySessions(clientId),
          supabaseHelpers.getTherapyHomework(clientId),
          supabaseHelpers.getTherapyActivityProgress(clientId)
        ]);
        setSessions(sessionsData || []);
        setHomework(homeworkData || []);
        const progressObj = {};
        (activityData || []).forEach(item => {
          progressObj[item.activity_id] = {
            completedAt: item.updated_at,
            reflections: item.reflections || {},
            timesCompleted: item.progress_data?.timesCompleted || 1,
            completed: item.completed
          };
        });
        setActivityProgress(progressObj);
      } catch (err) {
        console.error('Error loading therapy data:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const client = clientAuth.getCurrentClient();
    const room = client?.therapy_room || client?.id || 'default';
    const events = new EventSource(`/api/sse-therapy-sync?room=${encodeURIComponent(room)}`);
    events.addEventListener('start-exercise', (event) => {
      const payload = JSON.parse(event.data || '{}');
      if (payload.exercise === 'guided-breathing') setShowGuidedBreathing(true);
    });
    return () => events.close();
  }, []);

  useEffect(() => {
    let interval;
    if (isTimerRunning && activeActivity) {
      interval = setInterval(() => {
        setStepTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeActivity]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startActivity = (activity) => {
    if (activity.id === 'grounding-breath' || /breath/i.test(activity.title)) {
      const client = clientAuth.getCurrentClient();
      const room = client?.therapy_room || client?.id || 'default';
      fetch(`/api/sse-therapy-sync?room=${encodeURIComponent(room)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'start-exercise', exercise: 'guided-breathing', activityId: activity.id })
      }).catch(() => {});
      setShowGuidedBreathing(true);
    }
    setActiveActivity(activity);
    setActiveStep(0);
    setStepTimer(0);
    setIsTimerRunning(false);
    setActivityReflections({});
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
    if (activeActivity) {
      const newTimesCompleted = (activityProgress[activeActivity.id]?.timesCompleted || 0) + 1;
      const progressEntry = {
        completedAt: new Date().toISOString(),
        reflections: activityReflections,
        timesCompleted: newTimesCompleted
      };
      setActivityProgress(prev => ({ ...prev, [activeActivity.id]: progressEntry }));
      const client = clientAuth.getCurrentClient();
      if (client?.id) {
        try {
          await supabaseHelpers.saveTherapyActivityProgress(client.id, activeActivity.id, {
            data: { timesCompleted: newTimesCompleted },
            completed: true,
            reflections: activityReflections
          });
        } catch (err) {
          console.error('Error saving activity progress:', err);
        }
      }
      setActiveActivity(null);
      setActiveStep(0);
      setStepTimer(0);
      setIsTimerRunning(false);
    }
  };

  const addSession = async () => {
    if (!newSession.date) return;
    const client = clientAuth.getCurrentClient();
    const clientId = client?.id;
    const sessionData = {
      date: newSession.date,
      therapistNotes: newSession.therapistNotes,
      myNotes: newSession.myNotes,
      partsDiscussed: newSession.partsDiscussed,
      insights: newSession.insights,
      nextSessionGoals: newSession.nextSessionGoals
    };
    let savedSession = { id: Date.now(), ...newSession, createdAt: new Date().toISOString() };
    if (clientId) {
      try {
        const result = await supabaseHelpers.saveTherapySession(clientId, sessionData);
        if (result) savedSession = result;
      } catch (err) {
        console.error('Error saving session:', err);
      }
    }
    setSessions(prev => [savedSession, ...prev]);
    setNewSession({
      date: new Date().toISOString().split('T')[0],
      therapistNotes: '',
      myNotes: '',
      partsDiscussed: '',
      insights: '',
      nextSessionGoals: ''
    });
    setShowAddSession(false);
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const addHomework = async () => {
    if (!newHomework.title) return;
    const client = clientAuth.getCurrentClient();
    const clientId = client?.id;
    const hwData = {
      title: newHomework.title,
      description: newHomework.description,
      dueDate: newHomework.dueDate,
      completed: false
    };
    let savedHw = { id: Date.now(), ...newHomework, createdAt: new Date().toISOString() };
    if (clientId) {
      try {
        const result = await supabaseHelpers.saveTherapyHomework(clientId, hwData);
        if (result) savedHw = result;
      } catch (err) {
        console.error('Error saving homework:', err);
      }
    }
    setHomework(prev => [savedHw, ...prev]);
    setNewHomework({ title: '', description: '', dueDate: '', completed: false });
    setShowAddHomework(false);
  };

  const toggleHomework = async (id) => {
    const hw = homework.find(h => h.id === id);
    if (!hw) return;
    const newCompleted = !hw.completed;
    setHomework(prev => prev.map(h =>
      h.id === id ? { ...h, completed: newCompleted } : h
    ));
    try {
      await supabaseHelpers.updateTherapyHomework(id, { completed: newCompleted });
    } catch (err) {
      console.error('Error updating homework:', err);
    }
  };

  const deleteHomework = (id) => {
    setHomework(prev => prev.filter(h => h.id !== id));
  };

  const exportSessionNotes = () => {
    let content = 'IFS THERAPY SESSION NOTES\n' + '='.repeat(50) + '\n\n';

    content += sessions.map(s => `SESSION: ${new Date(s.date).toLocaleDateString()}
${'='.repeat(40)}

My Notes:
${s.myNotes || 'N/A'}

Parts Discussed:
${s.partsDiscussed || 'N/A'}

Key Insights:
${s.insights || 'N/A'}

Next Session Goals:
${s.nextSessionGoals || 'N/A'}

Advisor Notes:
${s.therapistNotes || 'N/A'}
`).join('\n---\n');

    if (Object.keys(activityProgress).length > 0) {
      content += '\n\n' + '='.repeat(50) + '\nACTIVITY COMPLETION LOG\n' + '='.repeat(50) + '\n\n';
      Object.entries(activityProgress).forEach(([id, data]) => {
        const activity = therapistClientActivities.find(a => a.id === id);
        if (activity) {
          content += `${activity.title} - Completed ${data.timesCompleted} time(s)\n`;
          content += `Last completed: ${new Date(data.completedAt).toLocaleDateString()}\n`;
          if (data.reflections && Object.keys(data.reflections).length > 0) {
            content += 'Reflections:\n';
            Object.entries(data.reflections).forEach(([q, a]) => {
              content += `  Q: ${q}\n  A: ${a}\n`;
            });
          }
          content += '\n';
        }
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapy-integration-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingHomework = homework.filter(h => !h.completed);
  const completedHomework = homework.filter(h => h.completed);

  const filteredActivities = selectedCategory === 'all'
    ? therapistClientActivities
    : therapistClientActivities.filter(a => a.category === selectedCategory);

  const completedActivitiesCount = Object.keys(activityProgress).length;

  if (activeActivity) {
    const step = activeActivity.steps[activeStep];
    const isLastStep = activeStep === activeActivity.steps.length - 1;
    return (
      <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => { setActiveActivity(null); setIsTimerRunning(false); }}
            className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 ${getAnimationClass('transition')}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Activities
          </button>

          <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-6`}>
            <div className="flex items-center justify-between mb-2">
              <h1 className={`text-2xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeActivity.title}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                {activeActivity.duration}
              </span>
            </div>
            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {activeActivity.description}
            </p>

            <div className="flex items-center gap-2 mt-4">
              {activeActivity.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${getAnimationClass('transition')}`}
                  style={{
                    backgroundColor: i <= activeStep ? theme.accentColor : (theme.isDark ? '#334155' : '#e2e8f0')
                  }}
                />
              ))}
            </div>
            <p className={`text-xs mt-2 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Step {activeStep + 1} of {activeActivity.steps.length}
            </p>
          </div>

          <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-8 mb-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
              {step.title}
            </h2>
            <p className={`leading-relaxed mb-6 ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {step.instruction}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'} ${getAnimationClass('transition')}`}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {formatTime(stepTimer)}
                </button>
                <span className={`text-sm ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  ~{step.duration} min suggested
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeStep > 0 && (
                  <button
                    onClick={prevStep}
                    className={`px-4 py-2 rounded-lg text-sm ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'} ${getAnimationClass('transition')}`}
                  >
                    Previous
                  </button>
                )}
                {!isLastStep ? (
                  <button
                    onClick={nextStep}
                    className={`px-4 py-2 rounded-lg text-white text-sm ${getAnimationClass('transition')}`}
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={completeActivity}
                    className={`px-4 py-2 rounded-lg text-white text-sm ${getAnimationClass('transition')}`}
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Complete Activity
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLastStep && activeActivity.reflectionPrompts && (
            <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6`}>
              <h3 className={`font-semibold mb-4 ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                Reflection Questions
              </h3>
              <div className="space-y-4">
                {activeActivity.reflectionPrompts.map((prompt, i) => (
                  <div key={i}>
                    <label className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} block mb-1`}>
                      {prompt}
                    </label>
                    <textarea
                      value={activityReflections[prompt] || ''}
                      onChange={(e) => setActivityReflections(prev => ({ ...prev, [prompt]: e.target.value }))}
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Write your reflection..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <PreSessionCheckin open={showPreSessionCheckin} onClose={() => setShowPreSessionCheckin(false)} />
      {showGuidedBreathing && <GuidedBreathing onClose={() => setShowGuidedBreathing(false)} />}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 ${getAnimationClass('transition')}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
              Therapy Integration
            </h1>
            <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
              Bridge your in-person therapy with your self-guided healing work.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreSessionCheckin(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-amber-100 text-amber-700'} ${getAnimationClass('transition')}`}
            >
              <Calendar className="w-4 h-4" />
              Pre-session Check-in
            </button>
          {sessions.length > 0 && (
            <button
              onClick={exportSessionNotes}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'} ${getAnimationClass('transition')}`}
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          )}
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-3 mb-8 p-1 rounded-xl ${theme.isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
          {[
            { id: 'activities', label: 'Guided Activities', icon: Sparkles },
            { id: 'sessions', label: 'Session Notes', icon: Calendar },
            { id: 'homework', label: 'Homework', icon: CheckSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${getAnimationClass('transition')} ${
                activeTab === tab.id
                  ? 'text-white shadow-md'
                  : theme.isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              style={activeTab === tab.id ? { backgroundColor: theme.accentColor } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'activities' && (
          <div>
            <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-6`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: theme.accentColor + '20' }}>
                  <Users className="w-6 h-6" style={{ color: theme.accentColor }} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                    Advisor & Client Activities
                  </h2>
                  <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {completedActivitiesCount} of {therapistClientActivities.length} activities completed
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? '#334155' : '#e2e8f0' }}>
                <div
                  className={`h-full rounded-full ${getAnimationClass('transition')}`}
                  style={{ width: `${(completedActivitiesCount / therapistClientActivities.length) * 100}%`, backgroundColor: theme.accentColor }}
                />
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'preparation', label: 'Before Session' },
                { id: 'in-session', label: 'With Advisor' },
                { id: 'after-session', label: 'After Session' },
                { id: 'daily-practice', label: 'Daily Practice' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${getAnimationClass('transition')} ${
                    selectedCategory === cat.id
                      ? 'text-white'
                      : theme.isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: theme.accentColor } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {filteredActivities.map(activity => {
                const IconComponent = iconMap[activity.icon] || Heart;
                const progress = activityProgress[activity.id];
                const catInfo = categoryLabels[activity.category];

                return (
                  <div
                    key={activity.id}
                    className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 ${getAnimationClass('transition')} hover:shadow-xl cursor-pointer`}
                    onClick={() => startActivity(activity)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.accentColor + '20' }}>
                          <IconComponent className="w-5 h-5" style={{ color: theme.accentColor }} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                            {activity.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              catInfo.color === 'blue' ? (theme.isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                              catInfo.color === 'purple' ? (theme.isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700') :
                              catInfo.color === 'green' ? (theme.isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                              (theme.isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700')
                            }`}>
                              {catInfo.label}
                            </span>
                            <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {activity.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                      {progress && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" style={{ color: theme.accentColor }} />
                          <span className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {progress.timesCompleted}x
                          </span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-600'} mb-3`}>
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {activity.steps.length} guided steps
                      </span>
                      <span className="text-sm font-medium" style={{ color: theme.accentColor }}>
                        {progress ? 'Do Again' : 'Start'} →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                Session Notes
              </h2>
              <button
                onClick={() => setShowAddSession(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${getAnimationClass('transition')}`}
                style={{ backgroundColor: theme.accentColor }}
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            </div>

            {showAddSession && (
              <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>New Session</h3>
                  <button onClick={() => setShowAddSession(false)} className="p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Session Date</label>
                    <input
                      type="date"
                      value={newSession.date}
                      onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>My Notes</label>
                    <textarea
                      value={newSession.myNotes}
                      onChange={(e) => setNewSession(prev => ({ ...prev, myNotes: e.target.value }))}
                      rows={3}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="What came up for me in this session..."
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Parts Discussed</label>
                    <input
                      type="text"
                      value={newSession.partsDiscussed}
                      onChange={(e) => setNewSession(prev => ({ ...prev, partsDiscussed: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="e.g., Inner Critic, Wounded Child"
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Key Insights</label>
                    <textarea
                      value={newSession.insights}
                      onChange={(e) => setNewSession(prev => ({ ...prev, insights: e.target.value }))}
                      rows={2}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="What did I learn or realize?"
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Goals for Next Session</label>
                    <input
                      type="text"
                      value={newSession.nextSessionGoals}
                      onChange={(e) => setNewSession(prev => ({ ...prev, nextSessionGoals: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="What I want to explore next..."
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Advisor Notes (optional)</label>
                    <textarea
                      value={newSession.therapistNotes}
                      onChange={(e) => setNewSession(prev => ({ ...prev, therapistNotes: e.target.value }))}
                      rows={2}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Notes or guidance from your advisor..."
                    />
                  </div>
                  <button
                    onClick={addSession}
                    className={`w-full py-2 rounded-lg text-white font-medium ${getAnimationClass('transition')}`}
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Save Session
                  </button>
                </div>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-8 text-center`}>
                <Calendar className={`w-12 h-12 mx-auto mb-3 ${theme.isDark ? 'text-slate-500' : 'text-gray-300'}`} />
                <p className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>
                  No sessions recorded yet. Add your first session after your next therapy appointment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`${theme.cardBg} backdrop-blur-sm rounded-xl shadow-sm border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} overflow-hidden`}
                  >
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className={`w-full p-4 flex items-center justify-between ${getAnimationClass('transition')}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: theme.accentColor + '20' }}>
                          <Calendar className="w-5 h-5" style={{ color: theme.accentColor }} />
                        </div>
                        <div className="text-left">
                          <p className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                          {session.partsDiscussed && (
                            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              Parts: {session.partsDiscussed}
                            </p>
                          )}
                        </div>
                      </div>
                      {expandedSession === session.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSession === session.id && (
                      <div className={`px-4 pb-4 border-t ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                        <div className="pt-4 space-y-4">
                          {session.myNotes && (
                            <div>
                              <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-1`}>My Notes</h4>
                              <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{session.myNotes}</p>
                            </div>
                          )}
                          {session.insights && (
                            <div>
                              <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-1`}>Key Insights</h4>
                              <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{session.insights}</p>
                            </div>
                          )}
                          {session.nextSessionGoals && (
                            <div>
                              <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-1`}>Next Session Goals</h4>
                              <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{session.nextSessionGoals}</p>
                            </div>
                          )}
                          {session.therapistNotes && (
                            <div>
                              <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-1`}>Advisor Notes</h4>
                              <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{session.therapistNotes}</p>
                            </div>
                          )}
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Session
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'homework' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                Homework & Tasks
              </h2>
              <button
                onClick={() => setShowAddHomework(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${getAnimationClass('transition')}`}
                style={{ backgroundColor: theme.accentColor }}
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

            {showAddHomework && (
              <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>New Homework</h3>
                  <button onClick={() => setShowAddHomework(false)} className="p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Task Title</label>
                    <input
                      type="text"
                      value={newHomework.title}
                      onChange={(e) => setNewHomework(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="e.g., Journal about inner critic"
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Description</label>
                    <textarea
                      value={newHomework.description}
                      onChange={(e) => setNewHomework(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Details about the assignment..."
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Due Date (optional)</label>
                    <input
                      type="date"
                      value={newHomework.dueDate}
                      onChange={(e) => setNewHomework(prev => ({ ...prev, dueDate: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                  <button
                    onClick={addHomework}
                    className={`w-full py-2 rounded-lg text-white font-medium ${getAnimationClass('transition')}`}
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Add Homework
                  </button>
                </div>
              </div>
            )}

            {pendingHomework.length > 0 && (
              <div className="mb-6">
                <h3 className={`text-sm font-medium ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} mb-3`}>Pending</h3>
                <div className="space-y-2">
                  {pendingHomework.map(hw => (
                    <div
                      key={hw.id}
                      className={`${theme.cardBg} backdrop-blur-sm rounded-xl shadow-sm border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-4 flex items-start gap-3`}
                    >
                      <button
                        onClick={() => toggleHomework(hw.id)}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 ${theme.isDark ? 'border-slate-500' : 'border-gray-300'}`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>{hw.title}</p>
                        {hw.description && (
                          <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} mt-1`}>{hw.description}</p>
                        )}
                        {hw.dueDate && (
                          <p className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'} mt-2 flex items-center gap-1`}>
                            <Clock className="w-3 h-3" />
                            Due: {new Date(hw.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteHomework(hw.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedHomework.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} mb-3`}>Completed</h3>
                <div className="space-y-2">
                  {completedHomework.map(hw => (
                    <div
                      key={hw.id}
                      className={`${theme.cardBg} backdrop-blur-sm rounded-xl shadow-sm border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-4 flex items-start gap-3 opacity-60`}
                    >
                      <button
                        onClick={() => toggleHomework(hw.id)}
                        className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium line-through ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{hw.title}</p>
                      </div>
                      <button
                        onClick={() => deleteHomework(hw.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {homework.length === 0 && !showAddHomework && (
              <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-8 text-center`}>
                <CheckSquare className={`w-12 h-12 mx-auto mb-3 ${theme.isDark ? 'text-slate-500' : 'text-gray-300'}`} />
                <p className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>
                  No homework assigned yet. Add tasks from your therapy sessions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
