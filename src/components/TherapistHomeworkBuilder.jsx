import { useMemo, useState } from 'react';
import { BookOpen, Send, CheckCircle, Loader2 } from 'lucide-react';
import { curriculumModules } from '../data/curriculumData';
import { assignModuleHomework } from '../lib/assignedHomework';
import { clientAuth } from '../lib/supabasePersonalization';

export default function TherapistHomeworkBuilder({ clientId, clients = [], onAssigned }) {
  const therapist = clientAuth.getCurrentClient();
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [moduleId, setModuleId] = useState(curriculumModules[0]?.id || '');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const modulesByCategory = useMemo(() => curriculumModules.reduce((acc, module) => {
    const category = module.category || 'other';
    acc[category] = acc[category] || [];
    acc[category].push(module);
    return acc;
  }, {}), []);

  const targetClientId = clientId || selectedClientId;
  const selectedModule = curriculumModules.find(module => module.id === moduleId);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!therapist?.id || !targetClientId || !moduleId) return;
    setSaving(true);
    setMessage('');
    const { error } = await assignModuleHomework({
      therapistId: therapist.id,
      clientId: targetClientId,
      moduleId,
      title: selectedModule?.title,
      instructions: instructions || null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message || 'Unable to assign module.');
      return;
    }
    setMessage(`Assigned ${selectedModule?.title || 'module'} successfully.`);
    setInstructions('');
    onAssigned?.();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Assign Curriculum Homework</h3>
          <p className="text-sm text-gray-600">Assigned modules bypass normal curriculum locks for the client.</p>
        </div>
      </div>

      {!clientId && (
        <label className="block text-sm font-medium text-gray-700">
          Client
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2">
            <option value="">Select a client...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name || client.id}</option>)}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium text-gray-700">
        Module
        <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2">
          {Object.entries(modulesByCategory).map(([category, modules]) => (
            <optgroup key={category} label={category.replace(/_/g, ' ')}>
              {modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {selectedModule && <p className="rounded-lg bg-white/80 p-3 text-sm text-gray-600">{selectedModule.description}</p>}

      <label className="block text-sm font-medium text-gray-700">
        Instructions (optional)
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2" placeholder="Add context, focus points, or encouragement..." />
      </label>

      <button type="submit" disabled={saving || !targetClientId || !moduleId} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Assign Module
      </button>
      {message && <p className="text-sm text-amber-700 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {message}</p>}
    </form>
  );
}
