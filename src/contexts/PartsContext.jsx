import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const PartsContext = createContext();

const defaultSelfPart = {
  id: 'self-1',
  type: 'self',
  name: 'Self',
  x: 300,
  y: 200,
  size: 80,
  notes: 'Your core essence - calm, curious, compassionate',
  role: 'Core compassionate essence',
  createdAt: new Date().toISOString()
};

export const PartsProvider = ({ children }) => {
  const [parts, setParts] = useState([defaultSelfPart]);
  const [lastSaved, setLastSaved] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFromSupabase();
  }, []);

  const addPart = useCallback((partData) => {
    const newPart = {
      id: `${partData.type}-${Date.now()}`,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 200,
      size: 60,
      notes: '',
      role: '',
      createdAt: new Date().toISOString(),
      ...partData
    };
    setParts(prev => [...prev, newPart]);
    savePartsToSupabase([...parts, newPart]);
    return newPart;
  }, [parts]);

  const updatePart = useCallback((id, updates) => {
    setParts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      savePartsToSupabase(updated);
      return updated;
    });
  }, []);

  const deletePart = useCallback((id) => {
    if (id === 'self-1') return;
    setParts(prev => {
      const updated = prev.filter(p => p.id !== id);
      savePartsToSupabase(updated);
      return updated;
    });
  }, []);

  const getPartsByType = useCallback((type) => {
    return parts.filter(p => p.type === type);
  }, [parts]);

  const savePartsToSupabase = async (partsData) => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) return;

      const { error } = await supabase
        .from('ifs_interactive_data')
        .upsert({
          client_id: client.id,
          module_id: 'parts_map',
          data: { parts: partsData },
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id,module_id' });

      if (!error) {
        setLastSaved(new Date().toISOString());
      }
    } catch (e) {
      console.error('Error saving parts to Supabase:', e);
    }
  };

  const saveToSupabase = useCallback(async () => {
    await savePartsToSupabase(parts);
  }, [parts]);

  const loadFromSupabase = useCallback(async () => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) {
        setLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from('ifs_interactive_data')
        .select('data')
        .eq('client_id', client.id)
        .eq('module_id', 'parts_map')
        .single();

      if (!error && data?.data?.parts && data.data.parts.length > 0) {
        setParts(data.data.parts);
      }
    } catch (e) {
      console.error('Error loading parts from Supabase:', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const value = {
    parts,
    setParts,
    addPart,
    updatePart,
    deletePart,
    getPartsByType,
    saveToSupabase,
    loadFromSupabase,
    lastSaved,
    loaded
  };

  return (
    <PartsContext.Provider value={value}>
      {children}
    </PartsContext.Provider>
  );
};

export const useParts = () => {
  const context = useContext(PartsContext);
  if (!context) {
    throw new Error('useParts must be used within a PartsProvider');
  }
  return context;
};

export default PartsContext;
