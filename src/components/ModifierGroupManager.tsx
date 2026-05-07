import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, PlusCircle, ChevronDown, ChevronRight, Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  extra_price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  business_id?: string | null;
  sort_order?: number;
  options: ModifierOption[];
}

interface ModifierGroupManagerProps {
  businessId: string;
}

const emptyGroup = (): Partial<ModifierGroup> => ({
  name: '',
  selection_type: 'single',
  is_required: false,
  min_selections: 0,
  max_selections: 1,
  sort_order: 0,
  options: [],
});

export const ModifierGroupManager: React.FC<ModifierGroupManagerProps> = ({ businessId }) => {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<Partial<ModifierGroup> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [businessId]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modifier_groups')
        .select(`*, modifier_options(*)`)
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setGroups(data.map((g: any) => ({
          ...g,
          selection_type: g.type,
          is_required: g.required,
          options: (g.modifier_options || []).map((opt: any) => ({
            ...opt,
            extra_price: opt.price
          })).sort((a: any, b: any) => a.sort_order - b.sort_order),
        })));
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingGroup?.name) return;
    setIsSaving(true);
    try {
      const groupData = {
        name: editingGroup.name,
        type: editingGroup.selection_type || 'single',
        required: editingGroup.is_required || false,
        business_id: businessId,
        sort_order: editingGroup.id ? editingGroup.sort_order : groups.length,
      };

      let groupId = editingGroup.id;

      if (groupId) {
        const { error: updateError } = await supabase.from('modifier_groups').update(groupData).eq('id', groupId);
        if (updateError) throw updateError;
        
        // Delete existing options and re-insert for simplicity
        await supabase.from('modifier_options').delete().eq('group_id', groupId);
      } else {
        const { data, error: insertError } = await supabase.from('modifier_groups').insert(groupData).select().single();
        if (insertError) throw insertError;
        if (!data) throw new Error('No se pudo crear el grupo');
        groupId = data.id;
      }

      if (groupId && editingGroup.options && editingGroup.options.length > 0) {
        const optionsData = editingGroup.options.map((opt, idx) => ({
          group_id: groupId,
          name: opt.name || 'Sin nombre',
          price: opt.extra_price || 0,
          sort_order: idx,
        }));
        const { error: optionsError } = await supabase.from('modifier_options').insert(optionsData);
        if (optionsError) throw optionsError;
      }

      setEditingGroup(null);
      await fetchGroups();
    } catch (err: any) {
      console.error('Error saving modifier group:', err);
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
      if (error) throw error;
      
      setTimeout(async () => {
        await fetchGroups();
        setConfirmDeleteId(null);
      }, 300);
      
    } catch (err: any) {
      console.error('Error deleting group:', err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const moveGroup = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === groups.length - 1) return;

    const newGroups = [...groups];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    // Intercambiar
    const temp = newGroups[index];
    newGroups[index] = newGroups[swapIndex];
    newGroups[swapIndex] = temp;

    // Actualizar sort_order localmente
    newGroups.forEach((g, i) => {
      g.sort_order = i;
    });

    setGroups(newGroups);

    try {
      // Guardar cambios en DB
      const updates = newGroups.map((g) => ({
        id: g.id,
        sort_order: g.sort_order,
      }));

      for (const update of updates) {
        await supabase.from('modifier_groups').update({ sort_order: update.sort_order }).eq('id', update.id);
      }
    } catch (err: any) {
      console.error('Error reordering groups:', err);
      alert('Error al reordenar grupos. Los cambios pueden no haberse guardado.');
      fetchGroups(); // Revert on failure
    }
  };

  const addOption = () => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      options: [...(editingGroup.options || []), { id: Date.now().toString(), group_id: '', name: '', extra_price: 0, is_available: true, sort_order: 0 }],
    });
  };

  const removeOption = (idx: number) => {
    if (!editingGroup) return;
    setEditingGroup({ ...editingGroup, options: (editingGroup.options || []).filter((_, i) => i !== idx) });
  };

  const updateOption = (idx: number, field: string, value: any) => {
    if (!editingGroup) return;
    const opts = [...(editingGroup.options || [])];
    (opts[idx] as any)[field] = value;
    setEditingGroup({ ...editingGroup, options: opts });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">Grupos Globales de Modificadores</p>
          <p className="text-[9px] font-medium text-muted/50 mt-1 uppercase italic">Crea una vez, asigna a múltiples productos</p>
        </div>
        <button
          onClick={() => setEditingGroup(emptyGroup())}
          className="h-10 px-5 bg-dark text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 hover:bg-accent hover:text-dark transition-all shadow-md"
        >
          <Plus size={14} /> Nuevo Grupo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-surface rounded-2xl">
          <Settings2 className="mx-auto text-muted/20 mb-3" size={36} />
          <p className="text-[10px] font-medium text-muted uppercase tracking-widest opacity-40">No hay grupos creados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => (
            <div key={group.id} className="bg-surface/50 rounded-2xl border border-surface overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface/80 transition-all"
                onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === group.id ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                  <div>
                    <p className="text-sm font-semibold text-dark">{group.name}</p>
                    <p className="text-[9px] font-medium text-muted uppercase tracking-wider mt-0.5">
                      {group.selection_type === 'single' ? 'Selección única' : 'Múltiple'} · {group.options.length} opciones
                      {group.is_required && ' · Obligatorio'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Botones de Ordenar */}
                  <div className="flex bg-surface rounded-xl border border-border/50 overflow-hidden mr-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveGroup(index, 'up');
                      }}
                      disabled={index === 0}
                      className="px-2 py-2 text-muted hover:text-dark hover:bg-white disabled:opacity-30 transition-all border-r border-border/50"
                      title="Mover arriba"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveGroup(index, 'down');
                      }}
                      disabled={index === groups.length - 1}
                      className="px-2 py-2 text-muted hover:text-dark hover:bg-white disabled:opacity-30 transition-all"
                      title="Mover abajo"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <button
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      setEditingGroup({ ...group }); 
                    }}
                    className="p-2 hover:bg-primary/10 text-muted hover:text-accent rounded-xl transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      if (confirmDeleteId === group.id) {
                        handleDelete(group.id);
                      } else {
                        setConfirmDeleteId(group.id);
                      }
                    }}
                    className={`p-2 rounded-xl transition-all ${
                      confirmDeleteId === group.id 
                        ? 'bg-red-500 text-white hover:bg-red-600 px-3 text-[10px] font-bold tracking-widest uppercase' 
                        : 'hover:bg-red-50 text-red-400'
                    }`}
                  >
                    {confirmDeleteId === group.id ? '¿Seguro?' : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === group.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 space-y-2 border-t border-surface">
                      {group.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between py-2">
                          <span className="text-xs font-medium text-dark">{opt.name}</span>
                          <span className="text-xs font-semibold text-accent font-mono">
                            {opt.extra_price > 0 ? `+$${opt.extra_price}` : 'Gratis'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingGroup && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingGroup(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden z-10">
              <div className="px-8 py-5 border-b border-surface flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark uppercase tracking-tight">{editingGroup.id ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
                <button onClick={() => setEditingGroup(null)} className="p-2 hover:bg-surface rounded-xl text-muted"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-muted mb-2 uppercase tracking-widest">Nombre del grupo</label>
                  <input
                    value={editingGroup.name || ''}
                    onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    placeholder="Ej: Tipo de Pan, Proteína, Salsas..."
                    className="w-full bg-surface border-none rounded-2xl px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-accent/10"
                  />
                </div>

                {/* Type & Required */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted mb-2 uppercase tracking-widest">Tipo de selección</label>
                    <select
                      value={editingGroup.selection_type}
                      onChange={e => setEditingGroup({ ...editingGroup, selection_type: e.target.value as any })}
                      className="w-full bg-surface border-none rounded-2xl px-4 py-3 text-sm font-medium"
                    >
                      <option value="single">Única (radio)</option>
                      <option value="multiple">Múltiple (checkbox)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted mb-2 uppercase tracking-widest">¿Obligatorio?</label>
                    <select
                      value={editingGroup.is_required ? 'true' : 'false'}
                      onChange={e => setEditingGroup({ ...editingGroup, is_required: e.target.value === 'true' })}
                      className="w-full bg-surface border-none rounded-2xl px-4 py-3 text-sm font-medium"
                    >
                      <option value="true">Sí, obligatorio</option>
                      <option value="false">No, opcional</option>
                    </select>
                  </div>
                </div>

                {/* Min / Max */}
                {editingGroup.selection_type === 'multiple' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted mb-2 uppercase tracking-widest">Mín. selecciones</label>
                      <input type="number" min={0} value={editingGroup.min_selections} onChange={e => setEditingGroup({ ...editingGroup, min_selections: Number(e.target.value) })} className="w-full bg-surface border-none rounded-2xl px-4 py-3 text-sm font-semibold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted mb-2 uppercase tracking-widest">Máx. selecciones</label>
                      <input type="number" min={1} value={editingGroup.max_selections} onChange={e => setEditingGroup({ ...editingGroup, max_selections: Number(e.target.value) })} className="w-full bg-surface border-none rounded-2xl px-4 py-3 text-sm font-semibold" />
                    </div>
                  </div>
                )}

                {/* Options */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-widest">Opciones</label>
                    <button type="button" onClick={addOption} className="text-[9px] font-semibold text-accent flex items-center gap-1 hover:opacity-70 uppercase tracking-widest">
                      <PlusCircle size={12} /> Añadir
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editingGroup.options || []).map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          placeholder="Nombre de la opción..."
                          value={opt.name}
                          onChange={e => updateOption(idx, 'name', e.target.value)}
                          className="flex-1 bg-surface border-none rounded-xl px-4 py-2.5 text-xs font-medium"
                        />
                        <div className="relative w-24">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[9px]">+$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={opt.extra_price}
                            onChange={e => updateOption(idx, 'extra_price', Number(e.target.value))}
                            className="w-full bg-surface border-none rounded-xl pl-7 pr-3 py-2.5 text-xs font-semibold"
                          />
                        </div>
                        <button onClick={() => removeOption(idx)} className="p-2 text-muted/30 hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(editingGroup.options || []).length === 0 && (
                      <p className="text-[10px] text-muted/40 text-center py-4 font-medium uppercase tracking-widest">Añade al menos una opción</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-surface flex gap-4 bg-gray-50">
                <button onClick={() => setEditingGroup(null)} className="flex-1 py-3 font-semibold text-muted text-xs uppercase tracking-widest hover:text-dark">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editingGroup.name}
                  className="flex-1 bg-accent text-dark py-3 rounded-xl font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-dark border-r-transparent rounded-full" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
