export const phase21AInteractiveWorksheetDemoPayload = {
  blocks: [
    { type: 'instruction', id: 'intro', text: 'A safe demo Interactive Practice for Parts Work.' },
    { type: 'sort', id: 'demo_sort', label: 'Sort parts-work cues', columns: ['Needs attention', 'Protective energy', 'Close to Self'], items: [{ id: 'cue_1', label: 'A tight yes/no feeling' }, { id: 'cue_2', label: 'A calm curiosity' }, { id: 'cue_3', label: 'A busy planning voice' }] },
    { type: 'match', id: 'demo_match', label: 'Pair parts with supportive questions', left: [{ id: 'part_1', label: 'Inner critic' }, { id: 'part_2', label: 'Tired part' }], right: [{ id: 'q_1', label: 'What are you trying to protect?' }, { id: 'q_2', label: 'What kind of rest would help?' }] },
    { type: 'body_map', id: 'demo_body', prompt: 'Notice where this part shows up in or around your body.', presets: ['Throat tightness', 'Warm chest', 'Heavy shoulders'] },
    { type: 'zone_map', id: 'demo_zone', label: 'Self-energy zone map', core: 'Self-energy', rings: ['Close to Self', 'Nearby', 'Protective edge', 'Deeply blended'], nodes: ['Planning part', 'Tender part', 'Curious Self-energy'] },
    { type: 'blank', id: 'demo_blank', label: 'Complete the reflection', template: [{ type: 'text', text: 'When I notice this part, I can offer' }, { type: 'input', placeholder: 'a kind phrase' }] },
    { type: 'slider', id: 'demo_slider', label: 'Self-energy check-in', min: 0, max: 10, metrics: [{ id: 'curiosity', label: 'Curiosity' }, { id: 'calm', label: 'Calm' }] },
    { type: 'timeline', id: 'demo_timeline', label: 'Timeline anchor', prompt: 'When did this protective strategy first feel important?', range: 'age or season' },
    { type: 'focus_card', id: 'demo_focus', part_id: 'selected_part', field: 'need', label: 'Focus card' },
    { type: 'virtual_paper', id: 'demo_paper', prompt: 'Use this space as your virtual piece of paper.' }
  ]
};
