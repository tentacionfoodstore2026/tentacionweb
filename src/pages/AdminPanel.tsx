import React, { useEffect, useState } from 'react';
import { Users, Store, ShieldCheck, Search, MoreVertical, CheckCircle, XCircle, Trash2, Edit, Filter, Save, X, Image as ImageIcon, Clock, Truck, MapPin, Phone, Settings, Tag, Plus, Printer, Menu as MenuIcon, Calendar, CreditCard, Hash, User, Star, Mail, Info, ClipboardList, UtensilsCrossed, Bell, Send, DollarSign, TrendingUp, ShoppingBag, ChefHat, LayoutDashboard, Eye, EyeOff, Shield, Database, Upload, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Business, Coupon, useAuthStore, Role, Driver, useDriverStore } from '../store/useStore';
import { ImageUpload } from '../components/ImageUpload';
import { MenuEditor } from '../components/MenuEditor';
import { supabase } from '../lib/supabase';
import { uploadImageToStorage } from '../lib/uploadImage';

// ─────────────────────────────────────────────────────
// Administración de Accesos — Subcomponent
// ─────────────────────────────────────────────────────

const ROLE_DEFINITIONS = [
  {
    id: 'user',
    label: 'Cliente',
    description: 'Acceso al marketplace para hacer pedidos.',
    icon: '👤',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    activeColor: 'bg-slate-900 border-slate-900 text-white',
    badge: 'bg-slate-100 text-slate-600',
  },
  {
    id: 'repartidor',
    label: 'Conductor',
    description: 'Panel de logística, rutas y gestión de pedidos asignados.',
    icon: '🛵',
    color: 'bg-orange-50 border-orange-100 text-orange-700',
    activeColor: 'bg-orange-500 border-orange-500 text-white',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'cocina',
    label: 'Cocina',
    description: 'Panel operativo para control de tiempos y preparación.',
    icon: '👨‍🍳',
    color: 'bg-blue-50 border-blue-100 text-blue-700',
    activeColor: 'bg-blue-600 border-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'comercio',
    label: 'Comercio',
    description: 'Administración de catálogo, ventas y sucursal.',
    icon: '🏪',
    color: 'bg-amber-50 border-amber-100 text-amber-700',
    activeColor: 'bg-amber-500 border-amber-500 text-white',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Control de comercios, usuarios, pedidos y reportes.',
    icon: '⚙️',
    color: 'bg-purple-50 border-purple-100 text-purple-700',
    activeColor: 'bg-purple-600 border-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Acceso total irrestricto. Gestión de infraestructura.',
    icon: '👑',
    color: 'bg-red-50 border-red-100 text-red-700',
    activeColor: 'bg-red-600 border-red-600 text-white',
    badge: 'bg-red-100 text-red-700',
  },
];

interface AdminSectionProps {
  users: any[];
  currentUser: any;
  updateUserRole: (id: string, role: any) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
}

const AdministrationSection: React.FC<AdminSectionProps> = ({ 
  users, 
  currentUser, 
  updateUserRole,
  toggleUserStatus 
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email?.toLowerCase() === 'joseluisquiroga76@gmail.com';
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pendingRole, setPendingRole] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const filteredUsers = users.filter(u => {
    // Super admins are completely invisible to non-super_admin users
    if (u.role === 'super_admin' && !isSuperAdmin) return false;
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const getRoleDef = (roleId: string) =>
    ROLE_DEFINITIONS.find(r => r.id === roleId) || ROLE_DEFINITIONS[0];

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    setPendingRole(u.role || 'user');
  };

  const handleSave = async () => {
    if (!selectedUser || pendingRole === selectedUser.role) return;
    setSaving(true);
    try {
      await updateUserRole(selectedUser.id, pendingRole as any);
      setSavedId(selectedUser.id);
      setSelectedUser((prev: any) => ({ ...prev, role: pendingRole }));
      setTimeout(() => setSavedId(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.name) {
      alert('⚠️ Por favor completa todos los campos.');
      return;
    }

    setCreatingUser(true);
    try {
      // Intentar crear el usuario en Auth
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role
          }
        }
      });

      if (error) throw error;

      alert(`✅ Usuario ${newUser.name} creado con éxito. \n\nIMPORTANTE: Si la página se recarga, por favor inicia sesión nuevamente con tu cuenta de Admin.`);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      
      // Intentar recargar la lista de usuarios
      window.location.reload(); 
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert('❌ Error al crear usuario: ' + error.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const roleCounts = ROLE_DEFINITIONS.map(r => ({
    ...r,
    count: users.filter(u => u.role === r.id).length,
  }));

  return (
    <div className="space-y-10 mb-12">
      {/* Stats bar Premium */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {roleCounts.map(r => {
          // Non-super_admins can see the count of super admins, but cannot click to filter/reveal them
          const isProtected = r.id === 'super_admin' && !isSuperAdmin;
          return (
          <button
            key={r.id}
            onClick={() => !isProtected && setFilterRole(prev => prev === r.id ? 'all' : r.id)}
            disabled={isProtected}
            title={isProtected ? 'Acceso restringido — Solo Super Admin' : undefined}
            className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all group ${
              isProtected ? 'cursor-not-allowed opacity-80' :
              filterRole === r.id 
                ? r.activeColor + ' shadow-2xl shadow-dark/20 scale-[1.02]' 
                : r.color + ' border-transparent hover:border-surface hover:shadow-xl'
            }`}
          >
            <div className="relative z-10">
              <span className="text-3xl mb-3 block transform group-hover:scale-110 transition-transform duration-300">{r.icon}</span>
              <p className="text-2xl font-medium  leading-none mb-1">{r.count}</p>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] opacity-60">{r.label}</p>
              {isProtected && (
                <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 mt-1">🔒 Restringido</p>
              )}
            </div>
            {/* Background Decorative Element */}
            <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full opacity-10 blur-xl ${filterRole === r.id ? 'bg-white' : 'bg-dark'}`} />
          </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* User List Panel (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-surface shadow-2xl shadow-dark/5 overflow-hidden flex flex-col h-[600px] lg:h-[750px]">
          <div className="p-8 border-b border-surface bg-gradient-to-br from-surface/50 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-medium text-dark tracking-tight uppercase">Directorio de Usuarios</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Gestión de accesos y estatus</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-primary text-dark px-4 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={16} />
                  <span>NUEVO USUARIO</span>
                </button>

                <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
            {filteredUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mb-4">
                  <Users size={40} className="text-muted/30" />
                </div>
                <p className="text-dark font-medium tracking-tight">No se encontraron usuarios</p>
                <p className="text-xs text-muted mt-1 uppercase tracking-widest">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const roleDef = getRoleDef(u.role);
                const isSelected = selectedUser?.id === u.id;
                const wasSaved = savedId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center space-x-5 px-6 py-5 rounded-2xl text-left transition-all relative group ${
                      isSelected 
                        ? 'bg-dark text-white shadow-2xl shadow-dark/20 translate-x-2' 
                        : 'hover:bg-surface border-2 border-transparent hover:border-surface/50'
                    }`}
                  >
                    {/* Avatar Premium */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-medium shadow-inner flex-shrink-0 relative overflow-hidden ${isSelected ? 'bg-white/10' : roleDef.color}`}>
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                      {/* Active Indicator */}
                      {u.status !== 'inactive' && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className={`font-medium text-base tracking-tight truncate ${isSelected ? 'text-white' : 'text-dark'}`}>
                          {u.name || 'Usuario sin nombre'}
                        </p>
                        {u.status === 'inactive' && (
                          <span className="bg-red-500/20 text-red-500 text-[8px] font-medium px-2 py-0.5 rounded-full uppercase ">
                            Bloqueado
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate font-medium ${isSelected ? 'text-white/60' : 'text-muted'}`}>{u.email}</p>
                    </div>

                    <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                      <span className={`text-[9px] font-medium px-3 py-1.5 rounded-xl uppercase tracking-wider ${isSelected ? 'bg-white/10 text-white' : roleDef.badge}`}>
                        {roleDef.icon} {roleDef.label}
                      </span>
                      {wasSaved && (
                        <motion.span 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-primary text-[9px] font-medium flex items-center space-x-1 uppercase"
                        >
                          <CheckCircle size={10} />
                          <span>Actualizado</span>
                        </motion.span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Role & Access Control Panel (5/12) */}
        <div className="lg:col-span-5 h-full">
          {!selectedUser ? (
            <div className="bg-surface/50 rounded-2xl border-4 border-dashed border-surface p-12 text-center h-full flex flex-col items-center justify-center group hover:border-primary/20 transition-all">
              <div className="w-24 h-24 bg-surface rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={48} className="text-muted/20" />
              </div>
              <p className="text-dark font-medium text-xl tracking-tight uppercase">Control de Accesos</p>
              <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Selecciona un usuario para editar permisos</p>
            </div>
          ) : (
            <motion.div
              key={selectedUser.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-surface shadow-2xl shadow-dark/5 overflow-hidden sticky top-24 max-h-[calc(100vh-120px)] flex flex-col"
            >
              <div className="flex-1 overflow-y-auto scrollbar-hide p-0">
              {/* User Profile Summary */}
              <div className="p-8 border-b border-surface relative">
                {/* Decorative background */}
                <div className={`absolute inset-0 opacity-[0.03] ${getRoleDef(selectedUser.role).color}`} />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-medium shadow-2xl ${getRoleDef(selectedUser.role).color}`}>
                      {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="text-2xl font-medium text-dark tracking-tight leading-none mb-1">{selectedUser.name}</h4>
                      <p className="text-xs text-muted font-medium mb-3">{selectedUser.email}</p>
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider ${getRoleDef(selectedUser.role).badge}`}>
                        <span>{getRoleDef(selectedUser.role).icon}</span>
                        <span>Rol: {getRoleDef(selectedUser.role).label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-10">
                {/* Account Actions */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-medium text-muted uppercase tracking-[0.3em]">Estado de la Cuenta</h5>
                  <div className="flex items-center justify-between p-6 bg-surface/30 rounded-2xl border border-surface">
                    <div>
                      <p className="text-sm font-medium text-dark uppercase tracking-tight">
                        {selectedUser.status === 'inactive' ? 'Cuenta Bloqueada' : 'Cuenta Activa'}
                      </p>
                      <p className="text-[10px] text-muted font-medium mt-1">
                        {selectedUser.status === 'inactive' 
                          ? 'El usuario no puede iniciar sesión ni realizar pedidos.' 
                          : 'El usuario tiene acceso normal a la plataforma.'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const newStatus = selectedUser.status === 'inactive' ? 'active' : 'inactive';
                        await toggleUserStatus(selectedUser.id);
                        setSelectedUser({ ...selectedUser, status: newStatus });
                      }}
                      className={`p-4 rounded-2xl transition-all border-2 shadow-lg ${
                        selectedUser.status === 'inactive'
                          ? 'bg-green-500 border-green-400 text-white shadow-green-500/20'
                          : 'bg-red-500 border-red-400 text-white shadow-red-500/20'
                      }`}
                    >
                      {selectedUser.status === 'inactive' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                    </button>
                  </div>
                </div>

                {/* Role Switcher */}
                <div className="space-y-6">
                  <h5 className="text-[10px] font-medium text-muted uppercase tracking-[0.3em]">Asignación de Responsabilidades</h5>
                  <div className="grid grid-cols-1 gap-3">
                    {ROLE_DEFINITIONS.map(role => {
                      const isActive = pendingRole === role.id;
                      const isCurrent = selectedUser.role === role.id;
                      const isRestricted = role.id === 'super_admin' && !isSuperAdmin;
                      
                      return (
                        <button
                          key={role.id}
                          onClick={() => !isRestricted && setPendingRole(role.id)}
                          disabled={isRestricted}
                          className={`relative w-full flex items-center space-x-4 px-6 py-4 rounded-2xl border-2 text-left transition-all group ${
                            isRestricted ? 'opacity-30 cursor-not-allowed border-transparent grayscale' :
                            isActive 
                              ? 'bg-dark border-dark shadow-2xl shadow-dark/20 text-white' 
                              : 'bg-white border-surface hover:border-primary/30 text-dark'
                          }`}
                        >
                          <span className={`text-2xl transform group-hover:scale-110 transition-transform ${isActive ? '' : 'filter drop-shadow-sm'}`}>
                            {role.icon}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm tracking-tight leading-none uppercase">{role.label}</p>
                              {isCurrent && (
                                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded uppercase ${isActive ? 'bg-white/20' : 'bg-surface'}`}>
                                  Actual
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] font-medium mt-1 leading-tight ${isActive ? 'text-white/60' : 'text-muted'}`}>
                              {role.description}
                            </p>
                          </div>
                          {isActive && <CheckCircle size={20} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save Section */}
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving || pendingRole === selectedUser.role}
                    className="w-full bg-primary hover:bg-accent text-dark font-medium py-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-2xl shadow-primary/30 uppercase text-xs tracking-[0.2em] active:scale-95"
                  >
                    {saving ? (
                      <div className="w-6 h-6 border-3 border-dark border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        <span>Actualizar Privilegios</span>
                      </>
                    )}
                  </button>
                </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-dark/60 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col h-full max-h-[95vh] md:max-h-[85vh] overflow-hidden border border-white/20"
            >
              {/* Fixed Header */}
              <div className="p-6 border-b border-surface flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-dark uppercase tracking-tight">Crear Nuevo Usuario</h3>
                  <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">Registrar personal o clientes</p>
                </div>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="p-2.5 hover:bg-surface rounded-xl transition-colors text-muted"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden">
                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-hide">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                          type="text"
                          required
                          value={newUser.name}
                          onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="Ej: Juan Pérez"
                          className="w-full bg-surface border-2 border-transparent rounded-xl py-3 pl-11 pr-4 text-xs font-medium focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                          type="email"
                          required
                          value={newUser.email}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="email@ejemplo.com"
                          className="w-full bg-surface border-2 border-transparent rounded-xl py-3 pl-11 pr-4 text-xs font-medium focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Contraseña Temporal</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-surface border-2 border-transparent rounded-xl py-3 pl-11 pr-11 text-xs font-medium focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Rol Asignado</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLE_DEFINITIONS.filter(r => r.id !== 'super_admin' || isSuperAdmin).map(role => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setNewUser({ ...newUser, role: role.id })}
                            className={`flex items-center space-x-2 p-2.5 rounded-xl border-2 transition-all text-[10px] font-medium uppercase ${
                              newUser.role === role.id 
                                ? 'bg-dark border-dark text-white' 
                                : 'bg-white border-surface hover:border-primary/30 text-dark'
                            }`}
                          >
                            <span>{role.icon}</span>
                            <span className="truncate">{role.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="flex space-x-3">
                      <Info className="text-amber-600 shrink-0" size={16} />
                      <p className="text-[9px] text-amber-800 font-medium leading-relaxed">
                        NOTA: Por seguridad, serás desconectado de tu sesión actual al crear un usuario nuevo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-6 border-t border-surface bg-surface/30 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 bg-white border border-surface text-muted font-bold py-3.5 rounded-xl hover:bg-surface transition-all text-[10px] uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex-[2] bg-primary hover:bg-accent text-dark font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center space-x-2 shadow-xl shadow-primary/20 text-[10px] uppercase tracking-widest"
                  >
                    {creatingUser ? (
                      <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Crear Usuario</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// Dashboard Content — Subcomponent
// ─────────────────────────────────────────────────────

const DashboardContent: React.FC<{
  orders: any[];
  users: any[];
  businesses: any[];
}> = ({ orders, users, businesses }) => {
  // Process Data
  const totalSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  
  // Sales by Day (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const salesByDay = last7Days.map(day => ({
    name: day.split('-')[2], // Just the day number
    total: orders
      .filter(o => o.created_at.startsWith(day))
      .reduce((acc, o) => acc + (o.total || 0), 0)
  }));

  // Top Selling Products
  const productCounts: Record<string, { name: string; count: number; total: number }> = {};
  orders.forEach(order => {
    order.order_items?.forEach((item: any) => {
      const pName = item.products?.name || 'Producto Desconocido';
      if (!productCounts[pName]) productCounts[pName] = { name: pName, count: 0, total: 0 };
      productCounts[pName].count += item.quantity || 1;
      productCounts[pName].total += (item.price || 0) * (item.quantity || 1);
    });
  });

  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sales by Business
  const businessSales: Record<string, { name: string; total: number; orders: number }> = {};
  orders.forEach(order => {
    const bName = order.businesses?.name || 'Varios';
    if (!businessSales[bName]) businessSales[bName] = { name: bName, total: 0, orders: 0 };
    businessSales[bName].total += order.total || 0;
    businessSales[bName].orders += 1;
  });

  const topBusinesses = Object.values(businessSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Role Counts
  const roleStats = [
    { name: 'Clientes', value: users.filter(u => u.role === 'user').length, color: '#6366f1', icon: User },
    { name: 'Conductores', value: users.filter(u => u.role === 'repartidor').length, color: '#f97316', icon: Truck },
    { name: 'Cocina', value: users.filter(u => u.role === 'cocina').length, color: '#3b82f6', icon: ChefHat },
    { name: 'Comercios', value: users.filter(u => u.role === 'comercio').length, color: '#f59e0b', icon: Store },
    { name: 'Admin', value: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length, color: '#a855f7', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-surface shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Ventas Totales</p>
          <h3 className="text-3xl font-medium text-dark">${totalSales.toLocaleString()}</h3>
          <p className="text-[10px] text-green-600 font-medium mt-2">+12% vs mes anterior</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-surface shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShoppingBag size={24} />
            </div>
            <div className="flex items-center text-blue-500">
              <span className="text-xs font-medium mr-1">{activeOrders}</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Pedidos Totales</p>
          <h3 className="text-3xl font-medium text-dark">{totalOrders}</h3>
          <p className="text-[10px] text-muted font-medium mt-2">{activeOrders} pedidos en curso</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-surface shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Users size={24} />
            </div>
          </div>
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Usuarios Totales</p>
          <h3 className="text-3xl font-medium text-dark">{users.length}</h3>
          <p className="text-[10px] text-muted font-medium mt-2">{users.filter(u => u.status === 'active').length} activos actualmente</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-surface shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Store size={24} />
            </div>
          </div>
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Comercios</p>
          <h3 className="text-3xl font-medium text-dark">{businesses.length}</h3>
          <p className="text-[10px] text-muted font-medium mt-2">{businesses.filter(b => b.isOpen).length} abiertos ahora</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Sales Chart */}
        <div className="lg:col-span-8 bg-white p-8 rounded-2xl border border-surface shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-medium text-dark">Rendimiento de Ventas</h3>
              <p className="text-xs text-muted uppercase tracking-widest mt-1">Últimos 7 días</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffb800" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ffb800" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: any) => [`$${value}`, 'Ventas']}
                />
                <Area type="monotone" dataKey="total" stroke="#ffb800" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution */}
        <div className="lg:col-span-4 bg-white p-8 rounded-2xl border border-surface shadow-sm flex flex-col">
          <h3 className="text-xl font-medium text-dark mb-1">Equipo y Usuarios</h3>
          <p className="text-xs text-muted uppercase tracking-widest mb-8">Distribución por rol</p>
          
          <div className="flex-1 space-y-6">
            {roleStats.map((role) => (
              <div key={role.name} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                      <role.icon size={14} />
                    </div>
                    <span className="font-medium text-dark">{role.name}</span>
                  </div>
                  <span className="font-bold text-dark">{role.value}</span>
                </div>
                <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(role.value / users.length) * 100}%` }}
                    className="h-full rounded-full" 
                    style={{ backgroundColor: role.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-surface">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-medium text-dark">{users.filter(u => u.status === 'active').length}</p>
                <p className="text-[10px] text-muted uppercase font-bold">Activos</p>
              </div>
              <div className="text-center border-l border-surface">
                <p className="text-2xl font-medium text-red-500">{users.filter(u => u.status === 'inactive').length}</p>
                <p className="text-[10px] text-muted uppercase font-bold">Baneados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white p-8 rounded-2xl border border-surface shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-medium text-dark">Top 5 Productos</h3>
            <button className="text-xs font-medium text-primary hover:underline">Ver todos</button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-surface/50 rounded-2xl hover:bg-surface transition-colors border border-transparent hover:border-surface">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-accent text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-dark">{product.name}</p>
                    <p className="text-[10px] text-muted uppercase font-bold">{product.count} vendidos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-dark">${product.total.toLocaleString()}</p>
                  <p className="text-[10px] text-green-600 font-medium">En ingresos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Businesses */}
        <div className="bg-white p-8 rounded-2xl border border-surface shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-medium text-dark">Top Comercios</h3>
            <button className="text-xs font-medium text-primary hover:underline">Ver Reporte</button>
          </div>
          <div className="space-y-4">
            {topBusinesses.map((biz, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-surface/50 rounded-2xl hover:bg-surface transition-colors border border-transparent hover:border-surface">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-dark text-white flex items-center justify-center font-bold text-lg">
                    {biz.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-dark">{biz.name}</p>
                    <p className="text-[10px] text-muted uppercase font-bold">{biz.orders} pedidos registrados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent text-lg">${biz.total.toLocaleString()}</p>
                  <div className="flex items-center justify-end text-[10px] text-muted font-medium">
                    <TrendingUp size={10} className="text-green-500 mr-1" />
                    <span>Líder de categoría</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [settingsTab, setSettingsTab] = React.useState('portal');
  const [showSupabaseKey, setShowSupabaseKey] = React.useState(false);
  const [showMapsKey, setShowMapsKey] = React.useState(false);
  const [mapsApiKey, setMapsApiKey] = React.useState('');
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [orders, setOrders] = React.useState<any[]>([]);
  const [isEditingBusiness, setIsEditingBusiness] = React.useState(false);
  const [currentBusiness, setCurrentBusiness] = React.useState<Partial<Business> | null>(null);
  const [isEditingCoupon, setIsEditingCoupon] = React.useState(false);
  const [currentCoupon, setCurrentCoupon] = React.useState<Partial<Coupon> | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditingMenu, setIsEditingMenu] = React.useState(false);
  const [activeBusinessForMenu, setActiveBusinessForMenu] = React.useState<Business | null>(null);
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email?.toLowerCase() === 'joseluisquiroga76@gmail.com';
  const { drivers, addDriver, updateDriver, deleteDriver, toggleDriverStatus } = useDriverStore();
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Partial<Driver> | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    target: 'all', // all, drivers, specific
    userId: '',
    title: '',
    message: '',
    image: '',
    link: ''
  });

  const [portalSettings, setPortalSettings] = useState({
    name: 'Tentacion Food Store',
    support_email: 'soporte@tentacion.com',
    support_phone: '+58 412 000 0000',
    address: 'Arica, Chile',
    maintenance_mode: false,
    primary_color: '#fbbf24',
    logo_url: '',
    favicon_url: '',
    google_maps_key: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      console.log('[AdminPanel] Fetching data from Supabase...');
      // Fetch Businesses
      const { data: bizData, error: bizError } = await supabase.from('businesses').select('*');
      if (bizError) console.error('[AdminPanel] Error fetching businesses:', bizError);
      
      if (bizData) {
        console.log(`[AdminPanel] Fetched ${bizData.length} businesses.`);
        const mappedBiz = bizData.map(b => ({
          ...b,
          deliveryFee: b.delivery_fee,
          deliveryTime: b.delivery_time,
          isOpen: b.is_open,
          openingHours: b.opening_hours
        }));
        setBusinesses(mappedBiz);
      }

      // Fetch Users (Profiles)
      const { data: userData } = await supabase.from('profiles').select('*');
      if (userData) setUsers(userData);

      // Fetch Promotions
      const { data: promoData } = await supabase.from('promotions').select('*');
      if (promoData) setCoupons(promoData);

      // Fetch Orders — use left join to get profile & business info
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, profiles!orders_user_id_fkey(name, email), businesses(name, address), order_items(*, products(name))')
        .order('created_at', { ascending: false });
      if (orderError) console.error('[AdminPanel] Error fetching orders:', orderError);
      if (orderData) {
        console.log(`[AdminPanel] Fetched ${orderData.length} orders.`);
        setOrders(orderData);
      }

      // Fetch Portal Settings
      console.log('[AdminPanel] Fetching portal settings...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      if (settingsError) {
        console.warn('[AdminPanel] Could not fetch portal settings (table might be missing):', settingsError.message);
      } else if (settingsData) {
        setPortalSettings(settingsData);
        if (settingsData.google_maps_key) setMapsApiKey(settingsData.google_maps_key);
      }
    };

    fetchData();

    // Realtime listener: refresh orders list when any order is inserted or updated
    const ordersChannel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        supabase
          .from('orders')
          .select('*, profiles!orders_user_id_fkey(name, email), businesses(name, address), order_items(*, products(name))')
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setOrders(data); });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    return () => { ordersChannel.unsubscribe(); };
  }, [currentUser?.id]);

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      alert('⚠️ Por favor completa el título y el mensaje.');
      return;
    }

    try {
      setIsSaving(true);
      // Aquí iría la lógica de envío real (OneSignal, FCM, etc.)
      console.log('Enviando notificación:', notificationForm);
      
      // Simulación de delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('✅ Notificación enviada correctamente.');
      setNotificationForm({
        target: 'all',
        userId: '',
        title: '',
        message: '',
        image: '',
        link: ''
      });
    } catch (error) {
      console.error('Error enviando notificación:', error);
      alert('❌ Error al enviar la notificación.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePortalSettings = async () => {
    try {
      setIsSaving(true);
      console.log('[AdminPanel] Saving portal settings:', portalSettings);
      
      let finalLogoUrl = portalSettings.logo_url;
      let finalFaviconUrl = portalSettings.favicon_url;

      if (finalLogoUrl && finalLogoUrl.startsWith('data:image')) {
        finalLogoUrl = await uploadImageToStorage(finalLogoUrl, 'branding');
      }
      if (finalFaviconUrl && finalFaviconUrl.startsWith('data:image')) {
        finalFaviconUrl = await uploadImageToStorage(finalFaviconUrl, 'branding');
      }

      const { error } = await supabase
        .from('portal_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          ...portalSettings,
          logo_url: finalLogoUrl,
          favicon_url: finalFaviconUrl,
          google_maps_key: mapsApiKey
        });

      if (error) throw error;
      
      // Actualizar estado local con las URLs finales de Storage
      setPortalSettings(prev => ({
        ...prev,
        logo_url: finalLogoUrl,
        favicon_url: finalFaviconUrl
      }));
      
      alert('✅ Configuración guardada correctamente.');
    } catch (error: any) {
      console.error('Error saving portal settings:', error);
      alert(`❌ Error al guardar: ${error.message || 'Verifica la consola'}. Asegúrate de haber ejecutado el SQL de portal_settings.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusiness = async (e?: React.FormEvent) => {
    try {
      if (e) e.preventDefault();
      
      console.log('DEBUG: Iniciando proceso de guardado...');
      
      if (!currentBusiness) {
        alert('❌ Error: No hay datos del comercio.');
        return;
      }

      if (!currentBusiness.name || !currentBusiness.whatsapp || !currentBusiness.address) {
        alert('⚠️ Faltan datos obligatorios: Nombre, WhatsApp y Dirección.');
        return;
      }

      setIsSaving(true);
      
      console.log('DEBUG: Procesando imágenes...');
      // Subir imágenes grandes a Storage si es Base64
      let finalImageUrl = currentBusiness.image || 'https://picsum.photos/seed/food/800/600';
      let finalBannerUrl = currentBusiness.banner || 'https://picsum.photos/seed/banner/1200/400';

      if (finalImageUrl.startsWith('data:image')) {
        finalImageUrl = await uploadImageToStorage(finalImageUrl, 'images');
      }
      if (finalBannerUrl.startsWith('data:image')) {
        finalBannerUrl = await uploadImageToStorage(finalBannerUrl, 'images');
      }
      
      console.log('DEBUG: Preparando datos para Supabase...');
      const businessData: any = {
        name: currentBusiness.name,
        description: currentBusiness.description || '',
        category: currentBusiness.category || 'Pizza',
        image: finalImageUrl,
        banner: finalBannerUrl,
        whatsapp: currentBusiness.whatsapp,
        address: currentBusiness.address,
        delivery_fee: Number(currentBusiness.deliveryFee) || 0,
        delivery_time: currentBusiness.deliveryTime || '30-45 min',
        is_open: currentBusiness.isOpen ?? true,
        status: currentBusiness.status || 'active',
        rating: Number(currentBusiness.rating) || 5.0,
        instagram: currentBusiness.instagram || '',
        facebook: currentBusiness.facebook || '',
        website: currentBusiness.website || '',
        opening_hours: currentBusiness.openingHours || []
      };

      let result;
      if (currentBusiness.id) {
        console.log('DEBUG: Actualizando comercio ID:', currentBusiness.id);
        result = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', currentBusiness.id)
          .select()
          .single();
      } else {
        console.log('DEBUG: Insertando nuevo comercio');
        result = await supabase
          .from('businesses')
          .insert(businessData)
          .select()
          .single();
      }
      
      const { data, error } = result;

      if (error) {
        console.error('DEBUG: Error de Supabase:', error);
        // Si el error es porque faltan columnas, avisar específicamente
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          alert('❌ ERROR DE BASE DE DATOS: Faltan columnas en la tabla "businesses". Por favor, ejecuta el script SQL proporcionado en el editor de Supabase.');
        } else {
          alert('❌ Error al guardar: ' + error.message);
        }
        setIsSaving(false);
        return;
      }

      if (data) {
        const mapped = {
          ...data,
          deliveryFee: data.delivery_fee,
          deliveryTime: data.delivery_time,
          isOpen: data.is_open,
          openingHours: data.opening_hours
        };

        if (currentBusiness.id) {
          setBusinesses(businesses.map(b => b.id === currentBusiness.id ? mapped : b));
        } else {
          setBusinesses([mapped, ...businesses]);
        }
      }
      
      alert('✅ Comercio guardado con éxito');
      setIsEditingBusiness(false);
      setCurrentBusiness(null);
    } catch (err: any) {
      console.error('DEBUG: Error crítico:', err);
      alert('❌ ERROR CRÍTICO: ' + (err.message || 'Ocurrió un error inesperado'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleBusinessStatus = async (id: string) => {
    const business = businesses.find(b => b.id === id);
    if (!business) return;
    
    const newStatus = business.status === 'active' ? 'inactive' : 'active';
    const { data } = await supabase
      .from('businesses')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();
      
    if (data) {
      const mapped = {
        ...data,
        deliveryFee: data.delivery_fee,
        deliveryTime: data.delivery_time,
        isOpen: data.is_open,
        openingHours: data.opening_hours
      };
      setBusinesses(businesses.map(b => b.id === id ? mapped : b));
    }
  };



  const updateUserRole = async (id: string, newRole: Role) => {
    if (!isSuperAdmin) {
      alert('Solo el Super Admin puede cambiar roles.');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar el rol.');
    } else if (data) {
      setUsers(users.map(u => u.id === id ? data : u));
    }
  };

  const toggleUserStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado del usuario.');
    } else if (data) {
      setUsers(users.map(u => u.id === id ? data : u));
    }
  };

  const handleSaveDriver = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDriver?.name) return;

    if (currentDriver.id) {
      updateDriver(currentDriver as Driver);
    } else {
      const newDriver: Driver = {
        ...currentDriver as Driver,
        id: `drv-${Math.random().toString(36).substr(2, 9)}`,
        status: 'active',
        rating: 5.0,
        totalDeliveries: 0,
        balance: 0,
        joinedAt: new Date().toISOString(),
        vehicle: currentDriver.vehicle || {
          type: 'moto',
          model: '',
          plate: '',
          color: '',
          year: '',
          insurancePolicy: '',
          insuranceExpiry: ''
        } as any
      } as Driver;
      addDriver(newDriver);
    }
    setIsEditingDriver(false);
    setCurrentDriver(null);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For admin, we might need a way to assign to a business or global
    // Assuming global for now if no business is selected
    const businessId = currentCoupon?.businessId && currentCoupon.businessId !== 'all' 
      ? currentCoupon.businessId 
      : businesses[0]?.id; // Fallback to first business for prototype

    if (currentCoupon?.id) {
      const { data } = await supabase
        .from('promotions')
        .update({
          title: currentCoupon.description,
          description: currentCoupon.description,
          discount_percentage: currentCoupon.value,
          code: currentCoupon.code,
          valid_until: currentCoupon.endDate
        })
        .eq('id', currentCoupon.id)
        .select()
        .single();
        
      if (data) {
        setCoupons(coupons.map(c => c.id === currentCoupon.id ? data : c));
      }
    } else {
      const { data } = await supabase
        .from('promotions')
        .insert({
          business_id: businessId,
          title: currentCoupon?.description || 'Promoción Global',
          description: currentCoupon?.description,
          discount_percentage: currentCoupon?.value,
          code: currentCoupon?.code,
          valid_until: currentCoupon?.endDate || new Date().toISOString()
        })
        .select()
        .single();
        
      if (data) {
        setCoupons([...coupons, data]);
      }
    }
    setIsEditingCoupon(false);
    setCurrentCoupon(null);
  };

  const deleteCoupon = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este cupón?')) {
      await supabase.from('promotions').delete().eq('id', id);
      setCoupons(coupons.filter(c => c.id !== id));
    }
  };

  const toggleCouponStatus = async (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    if (!coupon) return;
    
    // Toggle valid_until to past or future to simulate status change
    const newDate = new Date(coupon.valid_until) > new Date() 
      ? new Date(Date.now() - 86400000).toISOString() // Yesterday
      : new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days from now
      
    const { data } = await supabase
      .from('promotions')
      .update({ valid_until: newDate })
      .eq('id', id)
      .select()
      .single();
      
    if (data) {
      setCoupons(coupons.map(c => c.id === id ? data : c));
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users
    // Si no es super_admin, ocultar usuarios con rol super_admin de la lista
    .filter(u => isSuperAdmin || u.role !== 'super_admin')
    .filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Error al actualizar el estado: ' + error.message);
      return;
    }
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    // When kitchen marks as ready, broadcast to all drivers
    if (newStatus === 'ready') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const { notifyDriversOrderReady } = await import('../lib/orderService');
        await notifyDriversOrderReady(
          orderId,
          order.businesses?.name || 'Comercio',
          order.businesses?.address || ''
        );
      }
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':    return { label: 'Pendiente',           color: 'bg-yellow-100 text-yellow-700' };
      case 'confirmed':  return { label: 'En Cocina',           color: 'bg-blue-100 text-blue-700' };
      case 'ready':      return { label: 'Listo para Envío',    color: 'bg-purple-100 text-purple-700' };
      case 'assigned':   return { label: 'Conductor Asignado',  color: 'bg-indigo-100 text-indigo-700' };
      case 'picked_up':  return { label: 'En Camino',           color: 'bg-orange-100 text-orange-700' };
      case 'delivering': return { label: 'En Reparto',          color: 'bg-orange-100 text-orange-700' };
      case 'delivered':  return { label: 'Entregado',           color: 'bg-green-100 text-green-700' };
      case 'cancelled':  return { label: 'Cancelado',           color: 'bg-red-100 text-red-700' };
      default:           return { label: status,                color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface pt-16 flex">
      <style>
        {`
          @media print {
            aside, nav, .no-print, button, input {
              display: none !important;
            }
            main {
              margin-left: 0 !important;
              padding: 0 !important;
            }
            .max-w-6xl {
              max-width: 100% !important;
            }
            .bg-surface {
              background-color: white !important;
            }
            .shadow-sm, .shadow-lg {
              shadow: none !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #eee !important;
            }
          }
        `}
      </style>
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-surface hidden md:flex flex-col fixed h-full pt-20">
        <div className="px-6 mb-6">
          <h2 className="text-xs font-medium text-muted uppercase tracking-widest">Panel Admin</h2>
        </div>
        <nav className="flex-1 px-4 overflow-y-auto pb-6 flex flex-col">
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
              { id: 'businesses', label: 'Comercios', icon: Store },
              { id: 'users', label: 'Usuarios', icon: Users },
              { id: 'orders', label: 'Pedidos', icon: ClipboardList },
              { id: 'kitchen', label: 'Cocina', icon: UtensilsCrossed },
              { id: 'drivers', label: 'Conductores', icon: Truck },
              { id: 'discounts', label: 'Descuentos', icon: Tag },
              { id: 'notifications', label: 'Notificaciones', icon: Bell },
              { id: 'administration', label: 'Administración', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                  activeTab === item.id
                    ? 'bg-primary/10 text-accent'
                    : 'text-muted hover:bg-surface hover:text-dark'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {isSuperAdmin && (
            <div className="mt-4 pt-3 border-t border-surface space-y-1">
              <p className="text-[9px] font-bold text-muted/60 uppercase tracking-[0.2em] px-4 pb-1">Super Admin</p>
              {[
                { id: 'settings', label: 'Configuración', icon: Settings },
                { id: 'logs', label: 'Logs del Sistema', icon: Hash },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-accent'
                      : 'text-muted hover:bg-surface hover:text-dark'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 sm:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 no-print">
            <div>
              <h1 className="text-4xl font-medium text-dark mb-2">
                {activeTab === 'dashboard' ? 'Panel de Control' :
                 activeTab === 'businesses' ? 'Gestión de Comercios' : 
                 activeTab === 'users' ? 'Gestión de Usuarios' : 
                 activeTab === 'orders' ? 'Todos los Pedidos' : 
                 activeTab === 'kitchen' ? 'Panel de Cocina' : 
                 activeTab === 'drivers' ? 'Gestión de Conductores' : 
                 activeTab === 'discounts' ? 'Gestión de Descuentos' : 
                 activeTab === 'notifications' ? 'Centro de Notificaciones' : 
                 activeTab === 'administration' ? 'Administración de Accesos' : 
                 activeTab === 'logs' ? 'Logs de Actividad' : 'Configuración Global'}
              </h1>
              <p className="text-muted">
                {activeTab === 'dashboard' ? 'Visualiza el rendimiento general de tu negocio en tiempo real.' :
                 activeTab === 'businesses' ? 'Supervisa y edita los comercios registrados.' : 
                 activeTab === 'users' ? 'Administra los usuarios y sus roles.' : 
                 activeTab === 'orders' ? 'Historial completo de pedidos realizados en la plataforma.' : 
                 activeTab === 'kitchen' ? 'Pedidos entrantes para preparación inmediata.' : 
                 activeTab === 'drivers' ? 'Administra a los repartidores activos de la plataforma.' : 
                 activeTab === 'discounts' ? 'Crea y gestiona cupones globales.' : 
                 activeTab === 'notifications' ? 'Envía mensajes y promociones push a tus usuarios.' : 
                 activeTab === 'administration' ? 'Asigna roles y permisos de acceso a los usuarios del sistema.' : 
                 activeTab === 'logs' ? 'Registro detallado de acciones y eventos del sistema.' : 'Ajustes del sistema.'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-surface p-4 rounded-2xl border border-surface shadow-sm flex items-center space-x-3">
                <Users className="text-blue-500" size={24} />
                <div>
                  <p className="text-xs font-medium text-muted uppercase">Usuarios</p>
                  <p className="text-xl font-medium text-dark">{users.length}</p>
                </div>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-surface shadow-sm flex items-center space-x-3">
                <Store className="text-accent" size={24} />
                <div>
                  <p className="text-xs font-medium text-muted uppercase">Comercios</p>
                  <p className="text-xl font-medium text-dark">{businesses.length}</p>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <DashboardContent orders={orders} users={users} businesses={businesses} />
          )}

          {(activeTab === 'businesses' || activeTab === 'users') && (
            <div className="bg-surface rounded-2xl border border-surface shadow-sm overflow-hidden mb-12">
              <div className="hidden print:block mb-6 p-6 border-b">
                <h1 className="text-2xl font-medium">
                  {activeTab === 'businesses' ? 'Reporte de Comercios' : 'Reporte de Usuarios'}
                </h1>
                <p className="text-sm text-muted">Generado el: {new Date().toLocaleString()}</p>
              </div>
              <div className="p-6 border-b border-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-medium text-dark">
                    {activeTab === 'businesses' ? 'Lista de Comercios' : 'Lista de Usuarios'}
                  </h2>
                  {activeTab === 'businesses' && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setCurrentBusiness({
                            name: '',
                            description: '',
                            category: 'Pizza',
                            image: 'https://picsum.photos/seed/food/800/600',
                            banner: 'https://picsum.photos/seed/banner/1200/400',
                            whatsapp: '',
                            address: '',
                            deliveryFee: 0,
                            deliveryTime: '30-45 min',
                            isOpen: true,
                            status: 'active',
                            rating: 5.0,
                            openingHours: [
                              { day: 'Lunes', open: '09:00', close: '22:00', closed: false },
                              { day: 'Martes', open: '09:00', close: '22:00', closed: false },
                              { day: 'Miércoles', open: '09:00', close: '22:00', closed: false },
                              { day: 'Jueves', open: '09:00', close: '22:00', closed: false },
                              { day: 'Viernes', open: '09:00', close: '23:00', closed: false },
                              { day: 'Sábado', open: '10:00', close: '23:00', closed: false },
                              { day: 'Domingo', open: '10:00', close: '21:00', closed: true },
                            ]
                          });
                          setIsEditingBusiness(true);
                        }}
                        className="bg-primary/10 text-accent px-4 py-2 rounded-xl font-medium text-xs flex items-center space-x-2 hover:bg-primary/20 transition-all"
                      >
                        <Plus size={16} />
                        <span>Agregar Comercio</span>
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="bg-surface border border-surface text-muted px-4 py-2 rounded-xl font-medium text-xs flex items-center space-x-2 hover:bg-dark/5 transition-all"
                      >
                        <Printer size={16} />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder={activeTab === 'businesses' ? "Buscar comercio..." : "Buscar usuario..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-surface border border-surface rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'businesses' ? (
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-surface">
                      <tr>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Comercio</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Categoría</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">WhatsApp</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Atención</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right no-print">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface">
                      {filteredBusinesses.map((biz) => (
                        <tr key={biz.id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                          <img 
                            src={biz.image} 
                            alt={biz.name} 
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
                            className="w-10 h-10 rounded-md object-cover" 
                          />
                              <div>
                                <p className="font-medium text-dark">{biz.name}</p>
                                <p className="text-xs text-muted">{biz.address}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted font-medium">{biz.category}</td>
                          <td className="px-6 py-4 font-mono text-sm text-dark">{biz.whatsapp}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-medium uppercase ${
                              biz.isOpen ? 'bg-primary/20 text-accent' : 'bg-surface text-muted'
                            }`}>
                              {biz.isOpen ? 'Abierto' : 'Cerrado'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase ${
                              biz.status === 'active' ? 'bg-primary/20 text-accent' : 'bg-red-100 text-red-700'
                            }`}>
                              {biz.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right no-print">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => toggleBusinessStatus(biz.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  biz.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-accent hover:bg-primary/10'
                                }`}
                                title={biz.status === 'active' ? 'Desactivar' : 'Activar'}
                              >
                                {biz.status === 'active' ? <XCircle size={20} /> : <CheckCircle size={20} />}
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveBusinessForMenu(biz);
                                  setIsEditingMenu(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-surface text-muted rounded-lg hover:bg-primary hover:text-dark transition-all font-medium text-xs"
                                title="Ver Menú"
                              >
                                <MenuIcon size={14} />
                                <span>Menú</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setCurrentBusiness(biz);
                                  setIsEditingBusiness(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-surface text-muted rounded-lg hover:bg-primary hover:text-dark transition-all font-medium text-xs"
                              >
                                <Edit size={14} />
                                <span>Editar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-surface">
                      <tr>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Usuario</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Email</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Rol</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right no-print">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface">
                      {filteredUsers.map((user) => {
                        // Un super_admin solo es visible/editable por otro super_admin
                        const isProtectedSuperAdmin = user.role === 'super_admin' && !isSuperAdmin;
                        return (
                        <tr key={user.id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                                isProtectedSuperAdmin ? 'bg-amber-100 text-amber-600' : 'bg-surface text-muted'
                              }`}>
                                {isProtectedSuperAdmin ? '👑' : user.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-dark">
                                  {isProtectedSuperAdmin ? 'Super Administrador' : user.name}
                                </span>
                                {isProtectedSuperAdmin && (
                                  <p className="text-[10px] text-amber-500 font-medium">Cuenta protegida del sistema</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted font-medium">
                            {isProtectedSuperAdmin
                              ? <span className="tracking-widest text-amber-400 select-none">••••••@••••••.•••</span>
                              : user.email
                            }
                          </td>
                          <td className="px-6 py-4">
                            {isSuperAdmin ? (
                              <select 
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as Role)}
                                className="bg-surface border border-surface rounded-md text-[10px] font-medium uppercase p-1 focus:outline-none"
                              >
                                <option value="user">Cliente</option>
                                <option value="repartidor">Conductor</option>
                                <option value="cocina">Cocina</option>
                                <option value="comercio">Comercio</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-md text-[10px] font-medium uppercase ${
                                user.role === 'super_admin' ? 'bg-amber-100 text-amber-700' :
                                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                user.role === 'cocina' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'repartidor' ? 'bg-orange-100 text-orange-700' :
                                user.role === 'comercio' ? 'bg-amber-100 text-amber-700' : 'bg-surface text-muted'
                              }`}>
                                {user.role === 'super_admin' ? '👑 Super Admin' : user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isProtectedSuperAdmin ? (
                              <span className="px-3 py-1 rounded-full text-[10px] font-medium uppercase bg-amber-100 text-amber-700">
                                🔒 Protegido
                              </span>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase ${
                                user.status === 'active' ? 'bg-primary/20 text-accent' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right no-print">
                            {isProtectedSuperAdmin ? (
                              <span className="text-[10px] text-muted italic">Sin acceso</span>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => toggleUserStatus(user.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    user.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-accent hover:bg-primary/10'
                                  }`}
                                >
                                  {user.status === 'active' ? <XCircle size={20} /> : <CheckCircle size={20} />}
                                </button>
                                <button className="p-2 text-muted hover:text-red-600 transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden mb-12">
              <div className="p-6 border-b border-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-medium text-dark">Listado de Pedidos</h2>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar pedido, cliente o comercio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-surface border border-surface rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface border-b border-surface">
                    <tr>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">ID Pedido</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Fecha</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Comercio</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Total</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-dark">{order.id.split('-')[0]}...</td>
                        <td className="px-6 py-4 text-sm text-muted">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-dark">{order.profiles?.name}</p>
                          <p className="text-xs text-muted">{order.profiles?.email}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-dark">{order.businesses?.name}</td>
                        <td className="px-6 py-4 font-bold text-accent">${order.total}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase ${getStatusInfo(order.status).color}`}>
                            {getStatusInfo(order.status).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => alert('Detalles del pedido:\n' + order.order_items?.map((i: any) => `- ${i.quantity}x ${i.products?.name} ($${i.price})`).join('\n'))}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            Ver Items
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {orders.filter(o => ['pending', 'confirmed', 'ready'].includes(o.status)).length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-surface">
                  <UtensilsCrossed size={48} className="mx-auto text-muted mb-4 opacity-20" />
                  <p className="text-muted font-medium">No hay pedidos pendientes en cocina.</p>
                </div>
              ) : (
                orders.filter(o => ['pending', 'confirmed', 'ready'].includes(o.status)).map((order) => (
                  <div key={order.id} className="bg-white rounded-3xl border border-surface shadow-sm overflow-hidden flex flex-col">
                    <div className={`p-4 flex justify-between items-center ${order.status === 'pending' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Pedido #{order.id.split('-')[0]}</p>
                        <p className="text-xs text-muted">{new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusInfo(order.status).color}`}>
                        {getStatusInfo(order.status).label}
                      </span>
                    </div>
                    <div className="p-6 flex-1">
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted uppercase mb-2">Comercio</p>
                        <p className="font-bold text-dark">{order.businesses?.name}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted uppercase">Items a preparar</p>
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center bg-surface p-3 rounded-2xl">
                            <div className="flex items-center space-x-3">
                              <span className="bg-primary text-dark w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs">{item.quantity}</span>
                              <span className="font-medium text-dark text-sm">{item.products?.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                     <div className="p-4 bg-surface border-t border-surface space-y-2">
                       {order.status === 'pending' ? (
                         <button 
                           onClick={() => updateOrderStatus(order.id, 'confirmed')}
                           className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                         >
                           <CheckCircle size={18} />
                           <span>Aceptar y Empezar</span>
                         </button>
                       ) : order.status === 'confirmed' ? (
                         <button 
                           onClick={() => updateOrderStatus(order.id, 'ready')}
                           className="w-full bg-purple-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                         >
                           <Truck size={18} />
                           <span>✨ Listo — Notificar Conductores</span>
                         </button>
                       ) : (
                         <div className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 py-3 rounded-2xl text-sm font-bold">
                           <CheckCircle size={16} />
                           <span>Esperando conductor...</span>
                         </div>
                       )}
                       <button 
                         onClick={() => updateOrderStatus(order.id, 'cancelled')}
                         className="w-full bg-red-50 text-red-600 py-2 rounded-2xl font-medium text-sm hover:bg-red-100 transition-all"
                       >
                         Cancelar Pedido
                       </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'discounts' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-medium text-dark">Cupones Globales</h2>
                <button 
                  onClick={() => {
                    setCurrentCoupon({ code: '', type: 'percentage', value: 0, description: '' });
                    setIsEditingCoupon(true);
                  }}
                  className="bg-primary text-dark px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={20} />
                  <span>Nuevo Cupón Global</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-surface rounded-2xl border border-surface shadow-sm p-6 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                        <Tag size={24} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                          new Date(coupon.valid_until) > new Date() ? 'bg-primary/20 text-primary' : 'bg-red-100 text-red-700'
                        }`}>
                          {new Date(coupon.valid_until) > new Date() ? 'Activo' : 'Inactivo'}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button 
                            onClick={() => {
                              setCurrentCoupon({
                                id: coupon.id,
                                code: coupon.code,
                                description: coupon.description,
                                value: coupon.discount_percentage,
                                endDate: coupon.valid_until
                              } as any);
                              setIsEditingCoupon(true);
                            }}
                            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => deleteCoupon(coupon.id)}
                            className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-dark mb-1">{coupon.code}</h3>
                    <p className="text-sm text-muted mb-4">{coupon.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-surface">
                      <span className="font-medium text-primary">
                        {coupon.discount_percentage}% OFF
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-muted font-medium">-</span>
                        <button 
                          onClick={() => toggleCouponStatus(coupon.id)}
                          className={`text-[10px] font-medium uppercase ${new Date(coupon.valid_until) > new Date() ? 'text-red-500' : 'text-primary'} hover:underline`}
                        >
                          {new Date(coupon.valid_until) > new Date() ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-medium text-dark">Gestión de Conductores</h2>
                  <p className="text-muted">Administra el personal de entrega y sus vehículos.</p>
                </div>
                <button 
                  onClick={() => {
                    setCurrentDriver({
                      name: '',
                      email: '',
                      phone: '',
                      dni: '',
                      address: '',
                      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
                      status: 'active',
                      vehicle: {
                        type: 'moto',
                        model: '',
                        plate: '',
                        color: '',
                        year: '',
                        insurancePolicy: '',
                        insuranceExpiry: ''
                      }
                    } as any);
                    setIsEditingDriver(true);
                  }}
                  className="bg-primary text-dark px-6 py-3 rounded-2xl font-medium hover:bg-accent transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
                >
                  <Plus size={20} />
                  <span>Nuevo Conductor</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers.filter(d => 
                  d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  d.vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((driver) => (
                  <div key={driver.id} className="bg-surface rounded-2xl border border-surface shadow-sm p-6 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <img src={driver.avatar} alt={driver.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-surface shadow-sm" />
                        <div>
                          <h3 className="font-medium text-dark text-lg leading-tight">{driver.name}</h3>
                          <p className="text-xs text-muted font-medium">{driver.licenseType || 'Licencia no especificada'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                        driver.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-red-50 text-red-500'
                      }`}>
                        {driver.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-3 text-sm text-muted">
                        <Truck size={16} className="text-primary" />
                        <span className="font-medium text-dark">{driver.vehicle?.model || 'Sin vehículo'}</span>
                        {driver.vehicle?.plate && (
                          <span className="text-[10px] font-medium bg-surface px-2 py-0.5 rounded-lg border border-surface uppercase">{driver.vehicle.plate}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-muted">
                        <Phone size={16} className="text-primary" />
                        <span>{driver.phone}</span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-surface">
                        <div className="flex items-center space-x-1">
                          <Star size={14} className="text-accent fill-accent" />
                          <span className="text-sm font-medium text-dark">{driver.rating}</span>
                        </div>
                        <div className="text-xs text-muted">
                          <span className="font-medium text-dark">{driver.totalDeliveries}</span> entregas
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setCurrentDriver(driver);
                          setIsEditingDriver(true);
                        }}
                        className="flex-1 bg-surface border border-surface text-dark py-2.5 rounded-xl font-medium text-sm hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center space-x-2"
                      >
                        <Edit size={14} />
                        <span>Ver Ficha</span>
                      </button>
                      <button 
                        onClick={() => toggleDriverStatus(driver.id)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          driver.status === 'active' 
                            ? 'border-red-100 text-red-500 hover:bg-red-50' 
                            : 'border-primary/20 text-primary hover:bg-primary/10'
                        }`}
                      >
                        {driver.status === 'active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('¿Estás seguro de eliminar este conductor?')) {
                            deleteDriver(driver.id);
                          }
                        }}
                        className="p-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Formulario */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-surface rounded-2xl border border-surface shadow-sm p-8 space-y-6"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-dark">Nueva Notificación</h2>
                    <p className="text-xs text-muted">Configura el mensaje para tus usuarios.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">Destinatario</label>
                    <select 
                      value={notificationForm.target}
                      onChange={(e) => setNotificationForm({...notificationForm, target: e.target.value})}
                      className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark"
                    >
                      <option value="all">Público General</option>
                      <option value="drivers">Conductores / Repartidores</option>
                      <option value="specific">Usuario Específico</option>
                    </select>
                  </div>

                  {notificationForm.target === 'specific' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <label className="block text-sm font-medium text-dark mb-2">Seleccionar Usuario</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <select 
                          value={notificationForm.userId}
                          onChange={(e) => setNotificationForm({...notificationForm, userId: e.target.value})}
                          className="w-full bg-surface border border-surface rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark appearance-none"
                        >
                          <option value="">Buscar usuario...</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">Título de la Notificación</label>
                    <input 
                      type="text" 
                      placeholder="Ej: ¡Promo Relámpago! ⚡"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                      className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">Mensaje / Texto</label>
                    <textarea 
                      rows={4}
                      placeholder="Escribe el contenido de la notificación..."
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                      className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">URL de la Imagen (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/foto.jpg"
                      value={notificationForm.image}
                      onChange={(e) => setNotificationForm({...notificationForm, image: e.target.value})}
                      className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">Link / Acción (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="https://tentacion.com/promos"
                      value={notificationForm.link}
                      onChange={(e) => setNotificationForm({...notificationForm, link: e.target.value})}
                      className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark"
                    />
                  </div>

                  <button 
                    onClick={handleSendNotification}
                    disabled={isSaving}
                    className="w-full bg-primary text-dark py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Enviar Notificación</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Vista Previa */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 flex flex-col items-center"
              >
                <div className="w-full flex justify-between items-center px-4">
                  <h2 className="text-xl font-medium text-dark">Vista Previa (Móvil)</h2>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">Live Preview</span>
                </div>
                
                <div className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-20"></div>
                  
                  {/* Wallpaper Mockup */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-60"></div>
                  
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-10 px-8 flex justify-between items-center text-white z-10">
                    <span className="text-[10px] font-bold">14:18</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                      <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                    </div>
                  </div>

                  {/* Notification Card */}
                  <AnimatePresence mode="wait">
                    {(notificationForm.title || notificationForm.message) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-16 left-4 right-4 z-30"
                      >
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/40">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                              <span className="text-xs font-medium text-dark">T</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-dark/60 uppercase tracking-widest">TENTACIÓN</p>
                              <p className="text-[9px] text-dark/40 font-medium">Ahora</p>
                            </div>
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-dark line-clamp-1">{notificationForm.title || 'Título de ejemplo'}</h4>
                            <p className="text-xs text-dark/70 leading-relaxed line-clamp-3">{notificationForm.message || 'Contenido del mensaje...'}</p>
                            
                            {notificationForm.image && (
                              <motion.img 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                src={notificationForm.image} 
                                alt="Preview" 
                                className="w-full h-32 object-cover rounded-2xl mt-3 border border-black/5 shadow-inner"
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bottom Indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full"></div>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden mb-12">
              <div className="p-6 border-b border-surface flex items-center justify-between">
                <h2 className="text-xl font-medium text-dark">Historial de Eventos</h2>
                <div className="flex items-center space-x-2 text-xs font-medium text-muted">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Monitoreo en tiempo real</span>
                </div>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead className="bg-surface border-b border-surface">
                    <tr>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Evento</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Usuario</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">IP / Origen</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {orders.slice(0, 5).map((order, i) => (
                      <tr key={i} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 text-accent rounded-lg">
                              <Hash size={14} />
                            </div>
                            <span className="font-medium text-dark text-sm">
                              {order.status === 'pending' ? 'Nuevo Pedido' : 
                               order.status === 'confirmed' ? 'Pedido Confirmado' : 
                               order.status === 'delivered' ? 'Pedido Entregado' : 'Actualización de Pedido'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted font-medium">{order.profiles?.email || 'Sistema'}</td>
                        <td className="px-6 py-4 text-xs font-mono text-muted">ID: {order.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 text-right text-xs text-muted font-medium">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-surface/30 text-center border-t border-surface">
                <button className="text-accent text-xs font-bold hover:underline">Cargar más registros antiguos</button>
              </div>
            </div>
          )}

          {activeTab === 'administration' && (
            <AdministrationSection
              users={users}
              currentUser={currentUser}
              updateUserRole={updateUserRole}
              toggleUserStatus={toggleUserStatus}
            />
          )}

          {activeTab === 'settings' && isSuperAdmin && (
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-surface overflow-x-auto scrollbar-hide">
                {[
                  { id: 'portal', label: '🏪 Datos del Portal' },
                  { id: 'branding', label: '🎨 Identidad Gráfica' },
                  { id: 'apis', label: '🔑 Credenciales' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors shrink-0 ${
                      settingsTab === tab.id
                        ? 'border-primary text-dark'
                        : 'border-transparent text-muted hover:text-dark'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: Datos del Portal ── */}
              {settingsTab === 'portal' && (
                <div className="max-w-3xl space-y-8">
                  <div className="bg-surface rounded-2xl border border-surface p-6 space-y-5">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Store size={16} className="text-primary" />
                      </div>
                      <h3 className="font-bold text-dark text-sm uppercase tracking-widest">Datos del Portal</h3>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Nombre del Marketplace</label>
                      <input
                        type="text"
                        value={portalSettings.name}
                        onChange={e => setPortalSettings({...portalSettings, name: e.target.value})}
                        className="w-full bg-white border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Email de Soporte</label>
                      <input
                        type="email"
                        value={portalSettings.support_email}
                        onChange={e => setPortalSettings({...portalSettings, support_email: e.target.value})}
                        className="w-full bg-white border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Teléfono / WhatsApp de Contacto</label>
                      <input
                        type="tel"
                        value={portalSettings.support_phone}
                        onChange={e => setPortalSettings({...portalSettings, support_phone: e.target.value})}
                        className="w-full bg-white border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Ciudad / Región</label>
                      <input
                        type="text"
                        value={portalSettings.address}
                        onChange={e => setPortalSettings({...portalSettings, address: e.target.value})}
                        className="w-full bg-white border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium text-dark text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                      <div>
                        <p className="font-medium text-dark text-sm">Modo Mantenimiento</p>
                        <p className="text-[10px] text-muted uppercase mt-0.5">Bloquea el acceso público al sitio.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={portalSettings.maintenance_mode}
                          onChange={e => setPortalSettings({...portalSettings, maintenance_mode: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-muted/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-muted/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>

                    <button 
                      onClick={handleSavePortalSettings}
                      disabled={isSaving}
                      className="w-full bg-primary text-dark py-3 rounded-2xl font-medium hover:bg-accent transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar Datos del Portal'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB 2: Identidad Gráfica ── */}
              {settingsTab === 'branding' && (
                <div className="max-w-3xl space-y-8">
                    <div className="bg-surface rounded-2xl border border-surface p-6 space-y-5">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          <ImageIcon size={16} className="text-purple-500" />
                        </div>
                        <h3 className="font-bold text-dark text-sm uppercase tracking-widest">Apariencia</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Logo del Portal</label>
                          <div className="bg-white border border-surface rounded-2xl p-4">
                            <ImageUpload 
                              label="Subir Logo (Horizontal)"
                              value={portalSettings.logo_url}
                              onChange={(val) => setPortalSettings({ ...portalSettings, logo_url: val })}
                            />
                            <p className="text-[9px] text-muted mt-2 text-center">Recomendado: 400x120px (Transparente)</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Favicon / Icono</label>
                          <div className="bg-white border border-surface rounded-2xl p-4">
                            <ImageUpload 
                              label="Subir Icono (Cuadrado)"
                              value={portalSettings.favicon_url}
                              onChange={(val) => setPortalSettings({ ...portalSettings, favicon_url: val })}
                            />
                            <p className="text-[9px] text-muted mt-2 text-center">Recomendado: 512x512px</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Color Principal</label>
                        <div className="flex items-center flex-wrap gap-3">
                          {[
                            { color: '#fbbf24', name: 'Ámbar' },
                            { color: '#ef4444', name: 'Rojo' },
                            { color: '#3b82f6', name: 'Azul' },
                            { color: '#10b981', name: 'Verde' },
                            { color: '#8b5cf6', name: 'Violeta' },
                            { color: '#f97316', name: 'Naranja' },
                          ].map(({ color, name }) => (
                            <button
                              key={color}
                              title={name}
                              onClick={() => setPortalSettings({...portalSettings, primary_color: color})}
                              className={`w-9 h-9 rounded-xl border-4 transition-all hover:scale-110 ${portalSettings.primary_color === color ? 'border-dark/20 scale-110 ring-2 ring-dark/10' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Modo Visual</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button className="p-3 bg-white border-2 border-primary rounded-xl flex items-center space-x-2 shadow-sm">
                            <Sun size={16} className="text-primary" />
                            <span className="font-medium text-dark text-xs">Claro</span>
                          </button>
                          <button className="p-3 bg-zinc-800 border-2 border-transparent rounded-xl flex items-center space-x-2 opacity-60">
                            <Moon size={16} className="text-white" />
                            <span className="font-medium text-white text-xs">Oscuro</span>
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={handleSavePortalSettings}
                        disabled={isSaving}
                        className="w-full bg-purple-500 text-white py-3 rounded-2xl font-medium hover:bg-purple-600 transition-all text-sm disabled:opacity-50"
                      >
                        {isSaving ? 'Guardando...' : 'Aplicar Apariencia'}
                      </button>
                    </div>
                </div>
              )}

              {/* ── TAB 3: Credenciales ── */}
              {settingsTab === 'apis' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-3">
                    <Shield size={18} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">Estas claves conectan el portal con servicios externos. La clave de Supabase se lee del archivo <code className="bg-blue-100 px-1 rounded">.env</code>. La de Google Maps es editable para activar la geolocalización.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Supabase */}
                    <div className="bg-surface rounded-2xl border border-surface p-6 space-y-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Database size={16} className="text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-dark text-sm">Supabase</h3>
                          <p className="text-[9px] text-emerald-600 font-bold uppercase">Base de Datos · Activa</p>
                        </div>
                        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">URL del Proyecto</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={(import.meta as any).env.VITE_SUPABASE_URL || 'No configurada en .env'}
                            className="w-full bg-white border border-surface rounded-xl px-4 py-2.5 text-xs font-medium text-dark pr-10 cursor-default"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500"></div>
                        </div>
                        <p className="text-[9px] text-muted mt-1 ml-1">Solo lectura — definida en VITE_SUPABASE_URL</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Clave Pública (Anon Key)</label>
                        <div className="relative">
                          <input
                            type={showSupabaseKey ? 'text' : 'password'}
                            readOnly
                            value={(import.meta as any).env.VITE_SUPABASE_ANON_KEY || ''}
                            className="w-full bg-white border border-surface rounded-xl px-4 py-2.5 text-xs font-medium text-dark pr-10 cursor-default"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors"
                          >
                            {showSupabaseKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        <p className="text-[9px] text-muted mt-1 ml-1">Solo lectura — definida en VITE_SUPABASE_ANON_KEY</p>
                      </div>

                      <div className="bg-emerald-50 rounded-xl p-3 grid grid-cols-2 gap-3">
                        {[
                          { label: 'Entorno', value: 'Production' },
                          { label: 'Región', value: 'South America' },
                          { label: 'Latencia', value: '42ms' },
                          { label: 'Versión', value: 'v2.4.0' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[8px] text-muted uppercase">{label}</p>
                            <p className="text-xs font-bold text-dark">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Google Maps */}
                    <div className="bg-surface rounded-2xl border border-surface p-6 space-y-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                          <MapPin size={16} className="text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-dark text-sm">Google Maps</h3>
                          <p className="text-[9px] text-amber-600 font-bold uppercase">Geolocalización · Pendiente</p>
                        </div>
                        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"></div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Google Maps API Key</label>
                        <div className="relative">
                          <input
                            type={showMapsKey ? 'text' : 'password'}
                            value={mapsApiKey}
                            onChange={e => setMapsApiKey(e.target.value)}
                            placeholder="AIzaSyA••••••••••••••••••••••••••"
                            className="w-full bg-white border border-surface rounded-xl px-4 py-2.5 text-xs font-medium text-dark pr-10 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMapsKey(!showMapsKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors"
                          >
                            {showMapsKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        <p className="text-[9px] text-amber-600 font-bold mt-1 ml-1 uppercase">⚠ Necesaria para mostrar mapas y rastreo de repartidores</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Cómo obtener tu clave</label>
                        <ol className="space-y-1.5 text-[11px] text-muted list-none">
                          <li className="flex items-start space-x-2"><span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span><span>Ve a <strong>console.cloud.google.com</strong></span></li>
                          <li className="flex items-start space-x-2"><span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span><span>Crea un proyecto y activa <strong>Maps JavaScript API</strong></span></li>
                          <li className="flex items-start space-x-2"><span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">3</span><span>Copia la clave y pégala arriba</span></li>
                        </ol>
                      </div>

                      <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                        <p className="text-[9px] font-bold text-amber-700 uppercase">Funcionalidades que activa:</p>
                        {['Mapa interactivo de comercios', 'Rastreo en tiempo real del repartidor', 'Cálculo de distancia y tarifa', 'Autocompletado de direcciones'].map(f => (
                          <div key={f} className="flex items-center space-x-2">
                            <CheckCircle size={11} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] text-amber-800">{f}</p>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleSavePortalSettings}
                        disabled={isSaving}
                        className="w-full bg-blue-500 text-white py-3 rounded-2xl font-medium hover:bg-blue-600 transition-all text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Clave de Mapas'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Business Editor Modal */}
      <AnimatePresence>
        {isEditingBusiness && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingBusiness(false)}
              className="fixed inset-0 bg-dark/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
            >
              {/* Header Premium */}
              <div className="p-8 border-b border-surface flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent shrink-0">
                <div className="flex items-center space-x-5">
                  <div className="p-4 bg-primary text-dark rounded-2xl shadow-xl shadow-primary/20">
                    <Store size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-medium text-dark tracking-tight leading-none">
                      {currentBusiness?.id ? 'Ficha Técnica de Comercio' : 'Alta de Nuevo Comercio'}
                    </h3>
                    <div className="flex items-center mt-2 space-x-3">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Panel Administrativo</span>
                      {currentBusiness?.id && (
                        <>
                          <div className="w-1 h-1 bg-muted/30 rounded-full" />
                          <span className="text-[10px] bg-dark text-white px-2 py-0.5 rounded font-mono">ID: {currentBusiness?.id.slice(0, 8)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingBusiness(false)} 
                  className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-muted group"
                >
                  <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <form onSubmit={handleSaveBusiness} noValidate className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  
                  {/* Columna Izquierda: Identidad y Visual (4/12) */}
                  <div className="lg:col-span-4 space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <ImageIcon size={14} className="mr-3 text-primary" />
                        Identidad Visual
                      </h4>
                      <div className="space-y-6 bg-surface/30 p-8 rounded-2xl border border-surface">
                        <ImageUpload 
                          label="Logotipo del Comercio"
                          value={currentBusiness?.image}
                          onChange={(val) => setCurrentBusiness({ ...currentBusiness, image: val })}
                        />
                        <ImageUpload 
                          label="Banner de Portada"
                          value={currentBusiness?.banner}
                          onChange={(val) => setCurrentBusiness({ ...currentBusiness, banner: val })}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <Phone size={14} className="mr-3 text-primary" />
                        Presencia Digital
                      </h4>
                      <div className="bg-surface/30 p-6 rounded-2xl border border-surface space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Instagram</label>
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">@</span>
                            <input 
                              type="text" 
                              placeholder="usuario"
                              value={currentBusiness?.instagram || ''}
                              onChange={e => setCurrentBusiness({ ...currentBusiness, instagram: e.target.value })}
                              className="w-full bg-white border-2 border-surface rounded-2xl pl-10 pr-5 py-3 focus:outline-none focus:border-primary/50 font-medium text-dark transition-all" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Facebook</label>
                          <input 
                            type="text" 
                            placeholder="facebook.com/..."
                            value={currentBusiness?.facebook || ''}
                            onChange={e => setCurrentBusiness({ ...currentBusiness, facebook: e.target.value })}
                            className="w-full bg-white border-2 border-surface rounded-2xl px-5 py-3 focus:outline-none focus:border-primary/50 font-medium text-dark transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Datos y Logística (8/12) */}
                  <div className="lg:col-span-8 space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <Settings size={14} className="mr-3 text-primary" />
                        Información Base y Logística
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Nombre del Comercio</label>
                          <input 
                            type="text" 
                            required
                            value={currentBusiness?.name || ''}
                            onChange={e => setCurrentBusiness({ ...currentBusiness, name: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 font-medium text-xl text-dark tracking-tight" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Categoría</label>
                          <select 
                            value={currentBusiness?.category || ''}
                            onChange={e => setCurrentBusiness({ ...currentBusiness, category: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-bold text-dark appearance-none"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Restaurante">Restaurante</option>
                            <option value="Cafetería">Cafetería</option>
                            <option value="Heladería">Heladería</option>
                            <option value="Minimarket">Minimarket</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">WhatsApp de Pedidos</label>
                          <input 
                            type="text" 
                            required
                            value={currentBusiness?.whatsapp || ''}
                            onChange={e => setCurrentBusiness({ ...currentBusiness, whatsapp: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-bold text-dark" 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Dirección Física</label>
                          <input 
                            type="text" 
                            required
                            value={currentBusiness?.address || ''}
                            onChange={e => setCurrentBusiness({ ...currentBusiness, address: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-medium text-dark" 
                          />
                        </div>
                        
                        <div className="md:col-span-2 bg-primary/5 p-6 rounded-2xl border border-primary/10 grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2">Envío ($)</label>
                            <input 
                              type="number" 
                              value={currentBusiness?.deliveryFee || 0}
                              onChange={e => setCurrentBusiness({ ...currentBusiness, deliveryFee: Number(e.target.value) })}
                              className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2 font-medium text-dark" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2">Tiempo</label>
                            <input 
                              type="text" 
                              value={currentBusiness?.deliveryTime || '30-45 min'}
                              onChange={e => setCurrentBusiness({ ...currentBusiness, deliveryTime: e.target.value })}
                              className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2 font-bold text-dark" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2">Rating</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={currentBusiness?.rating || 5.0}
                              onChange={e => setCurrentBusiness({ ...currentBusiness, rating: Number(e.target.value) })}
                              className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2 font-medium text-dark" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2">Estado</label>
                            <select 
                              value={currentBusiness?.status || 'active'}
                              onChange={e => setCurrentBusiness({ ...currentBusiness, status: e.target.value as any })}
                              className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2 font-bold text-dark"
                            >
                              <option value="active">Activo</option>
                              <option value="inactive">Inactivo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <Clock size={14} className="mr-3 text-primary" />
                        Horarios de Atención
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(currentBusiness?.openingHours || [
                          { day: 'Lunes', open: '09:00', close: '22:00', closed: false },
                          { day: 'Martes', open: '09:00', close: '22:00', closed: false },
                          { day: 'Miércoles', open: '09:00', close: '22:00', closed: false },
                          { day: 'Jueves', open: '09:00', close: '22:00', closed: false },
                          { day: 'Viernes', open: '09:00', close: '23:00', closed: false },
                          { day: 'Sábado', open: '10:00', close: '23:00', closed: false },
                          { day: 'Domingo', open: '10:00', close: '21:00', closed: true },
                        ]).map((hour, idx) => (
                          <div key={idx} className={`p-4 rounded-2xl border ${hour.closed ? 'bg-surface/50 border-surface' : 'bg-white border-surface shadow-sm'}`}>
                            <p className="text-[10px] font-medium text-dark uppercase mb-2">{hour.day}</p>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="time" 
                                value={hour.open} 
                                disabled={hour.closed}
                                onChange={(e) => {
                                  const newHours = [...(currentBusiness?.openingHours || [])];
                                  newHours[idx] = { ...hour, open: e.target.value };
                                  setCurrentBusiness({ ...currentBusiness, openingHours: newHours });
                                }}
                                className="w-full bg-surface rounded-lg px-1 py-1 text-[10px] font-bold text-dark disabled:opacity-30"
                              />
                              <span className="text-[8px] text-muted">A</span>
                              <input 
                                type="time" 
                                value={hour.close} 
                                disabled={hour.closed}
                                onChange={(e) => {
                                  const newHours = [...(currentBusiness?.openingHours || [])];
                                  newHours[idx] = { ...hour, close: e.target.value };
                                  setCurrentBusiness({ ...currentBusiness, openingHours: newHours });
                                }}
                                className="w-full bg-surface rounded-lg px-1 py-1 text-[10px] font-bold text-dark disabled:opacity-30"
                              />
                            </div>
                            <label className="flex items-center mt-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!hour.closed}
                                onChange={(e) => {
                                  const newHours = [...(currentBusiness?.openingHours || [])];
                                  newHours[idx] = { ...hour, closed: !e.target.checked };
                                  setCurrentBusiness({ ...currentBusiness, openingHours: newHours });
                                }}
                                className="hidden"
                              />
                              <div className={`w-3 h-3 rounded-sm border mr-2 flex items-center justify-center ${!hour.closed ? 'bg-primary border-primary' : 'bg-white border-surface'}`}>
                                {!hour.closed && <div className="w-1.5 h-1.5 bg-dark rounded-full" />}
                              </div>
                              <span className="text-[9px] font-bold text-muted uppercase ">{hour.closed ? 'Cerrado' : 'Abierto'}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer acciones */}
              <div className="p-8 border-t border-surface bg-surface/30 flex justify-end items-center space-x-5 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsEditingBusiness(false)}
                  className="px-8 py-4 rounded-2xl font-bold text-muted hover:bg-surface hover:text-dark transition-all uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveBusiness}
                  disabled={isSaving}
                  className="bg-primary text-dark px-12 py-4 rounded-2xl font-medium hover:bg-accent transition-all shadow-2xl shadow-primary/30 flex items-center space-x-3 uppercase text-xs tracking-widest active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                  <span>{currentBusiness?.id ? 'Guardar Cambios' : 'Registrar Comercio'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Coupon Editor Modal */}
      <AnimatePresence>
        {isEditingCoupon && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingCoupon(false)}
              className="fixed inset-0 bg-dark/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 border-b border-surface flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary text-dark rounded-2xl shadow-lg shadow-primary/20">
                    <Tag size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-dark tracking-tight">
                      {currentCoupon?.id ? 'Editar Cupón' : 'Nuevo Cupón Global'}
                    </h3>
                    <p className="text-xs text-muted font-semibold uppercase tracking-widest">Configuración de beneficios</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingCoupon(false)} 
                  className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-muted"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {/* Sección 1: Identificación */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center">
                    <div className="w-8 h-[1px] bg-primary/30 mr-2" />
                    Identificación del Cupón
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Código Promocional</label>
                      <input 
                        type="text" 
                        required
                        value={currentCoupon?.code || ''}
                        onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })}
                        className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium uppercase text-lg tracking-widest text-dark transition-all" 
                        placeholder="EJ: VERANO2024"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Descripción Corta</label>
                      <input 
                        type="text"
                        required
                        value={currentCoupon?.description || ''}
                        onChange={e => setCurrentCoupon({ ...currentCoupon, description: e.target.value })}
                        className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark transition-all" 
                        placeholder="Ej: 10% de descuento en tu primera compra"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 2: Valor del Descuento */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center">
                    <div className="w-8 h-[1px] bg-primary/30 mr-2" />
                    Beneficio Económico
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Tipo de Descuento</label>
                      <div className="relative">
                        <select 
                          value={currentCoupon?.type || 'percentage'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, type: e.target.value })}
                          className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-bold text-dark appearance-none transition-all cursor-pointer"
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Monto Fijo ($)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                          <Filter size={16} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Valor del Descuento</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          required
                          value={currentCoupon?.value || 0}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, value: Number(e.target.value) })}
                          className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark transition-all" 
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-primary">
                          {currentCoupon?.type === 'percentage' ? '%' : '$'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Vigencia Temporal */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center">
                    <div className="w-8 h-[1px] bg-primary/30 mr-2" />
                    Periodo de Validez
                  </h4>
                  <div className="bg-surface/50 p-6 rounded-3xl border border-surface space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1 flex items-center">
                          <Calendar size={12} className="mr-1.5" /> Fecha Inicio
                        </label>
                        <input 
                          type="date" 
                          required
                          value={currentCoupon?.startDate || ''}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, startDate: e.target.value })}
                          className="w-full bg-white border-2 border-surface rounded-2xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark text-sm transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1 flex items-center">
                          <Calendar size={12} className="mr-1.5 text-red-400" /> Fecha Fin
                        </label>
                        <input 
                          type="date" 
                          required
                          value={currentCoupon?.endDate || ''}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, endDate: e.target.value })}
                          className="w-full bg-white border-2 border-surface rounded-2xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark text-sm transition-all" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1 flex items-center">
                          <Clock size={12} className="mr-1.5" /> Hora Inicio
                        </label>
                        <input 
                          type="time" 
                          required
                          value={currentCoupon?.startTime || '00:00'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, startTime: e.target.value })}
                          className="w-full bg-white border-2 border-surface rounded-2xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark text-sm transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1 flex items-center">
                          <Clock size={12} className="mr-1.5 text-red-400" /> Hora Fin
                        </label>
                        <input 
                          type="time" 
                          required
                          value={currentCoupon?.endTime || '23:59'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, endTime: e.target.value })}
                          className="w-full bg-white border-2 border-surface rounded-2xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-medium text-dark text-sm transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 4: Notas Internas (Opcional) */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center">
                    <div className="w-8 h-[1px] bg-primary/30 mr-2" />
                    Información Adicional
                  </h4>
                  <textarea 
                    value={currentCoupon?.internal_notes || ''}
                    onChange={e => setCurrentCoupon({ ...currentCoupon, internal_notes: e.target.value })}
                    className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-28 resize-none font-medium text-dark text-sm transition-all" 
                    placeholder="Notas internas para el equipo administrativo (opcional)..."
                  />
                </div>
              </form>

              {/* Footer Actions */}
              <div className="p-8 border-t border-surface bg-surface/30 flex justify-end items-center space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsEditingCoupon(false)}
                  className="px-8 py-3.5 rounded-2xl font-bold text-muted hover:bg-surface hover:text-dark transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCoupon}
                  className="bg-primary text-dark px-10 py-3.5 rounded-2xl font-medium hover:bg-accent transition-all shadow-xl shadow-primary/20 flex items-center space-x-3"
                >
                  <Save size={20} />
                  <span>{currentCoupon?.id ? 'Actualizar Cupón' : 'Crear Cupón'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver Editor Modal */}
      <AnimatePresence>
        {isEditingDriver && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingDriver(false)}
              className="fixed inset-0 bg-dark/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
            >
              {/* Header Premium */}
              <div className="p-8 border-b border-surface flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent shrink-0">
                <div className="flex items-center space-x-5">
                  <div className="p-4 bg-primary text-dark rounded-2xl shadow-xl shadow-primary/20">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-medium text-dark tracking-tight leading-none">
                      {currentDriver?.id ? 'Expediente del Conductor' : 'Alta de Nuevo Repartidor'}
                    </h3>
                    <div className="flex items-center mt-2 space-x-3">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Gestión de Personal</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingDriver(false)} 
                  className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-muted group"
                >
                  <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <form onSubmit={handleSaveDriver} noValidate className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  
                  {/* Columna Izquierda: Identidad y Documentación (5/12) */}
                  <div className="lg:col-span-5 space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <User size={14} className="mr-3 text-primary" />
                        Identidad y Perfil
                      </h4>
                      <div className="bg-surface/30 p-8 rounded-2xl border border-surface text-center">
                        <ImageUpload 
                          label="Fotografía Profesional"
                          value={currentDriver?.avatar || ''}
                          onChange={(val) => setCurrentDriver({ ...currentDriver, avatar: val })}
                        />
                        <p className="text-[10px] text-muted mt-4 italic font-medium">Recomendado: Fondo neutro, rostro despejado.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <ShieldCheck size={14} className="mr-3 text-primary" />
                        Licencia de Conducir
                      </h4>
                      <div className="bg-surface/50 p-8 rounded-2xl border border-surface space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Nº de Documento / Licencia</label>
                          <input 
                            type="text" 
                            required
                            placeholder="AA-00000000"
                            value={currentDriver?.licenseNumber || ''}
                            onChange={e => setCurrentDriver({ ...currentDriver, licenseNumber: e.target.value })}
                            className="w-full bg-white border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-medium text-dark tracking-wider" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Clase</label>
                            <input 
                              type="text" 
                              placeholder="Ej: A.3"
                              value={currentDriver?.licenseType || ''}
                              onChange={e => setCurrentDriver({ ...currentDriver, licenseType: e.target.value })}
                              className="w-full bg-white border-2 border-surface rounded-2xl px-5 py-3 focus:outline-none focus:border-primary/50 font-bold text-dark" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Vencimiento</label>
                            <input 
                              type="date" 
                              required
                              value={currentDriver?.licenseExpiry || ''}
                              onChange={e => setCurrentDriver({ ...currentDriver, licenseExpiry: e.target.value })}
                              className="w-full bg-white border-2 border-surface rounded-2xl px-4 py-3 focus:outline-none focus:border-primary/50 font-bold text-dark text-[10px]" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Datos y Vehículo (7/12) */}
                  <div className="lg:col-span-7 space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <Settings size={14} className="mr-3 text-primary" />
                        Datos del Repartidor
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Nombre Completo</label>
                          <input 
                            type="text" 
                            required
                            value={currentDriver?.name || ''}
                            onChange={e => setCurrentDriver({ ...currentDriver, name: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 font-medium text-xl text-dark" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">DNI / Pasaporte</label>
                          <input 
                            type="text" 
                            required
                            value={currentDriver?.dni || ''}
                            onChange={e => setCurrentDriver({ ...currentDriver, dni: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-bold text-dark" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Teléfono / WhatsApp</label>
                          <input 
                            type="tel" 
                            required
                            value={currentDriver?.phone || ''}
                            onChange={e => setCurrentDriver({ ...currentDriver, phone: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-bold text-dark" 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Correo Electrónico</label>
                          <input 
                            type="email" 
                            required
                            value={currentDriver?.email || ''}
                            onChange={e => setCurrentDriver({ ...currentDriver, email: e.target.value })}
                            className="w-full bg-surface border-2 border-surface rounded-2xl px-5 py-3.5 focus:outline-none focus:border-primary/50 font-medium text-dark" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center">
                        <Truck size={14} className="mr-3 text-primary" />
                        Unidad de Transporte
                      </h4>
                      <div className="bg-primary/5 p-8 rounded-2xl border border-primary/20 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Tipo de Vehículo</label>
                            <select 
                              value={currentDriver?.vehicle?.type || 'moto'}
                              onChange={e => setCurrentDriver({ 
                                ...currentDriver, 
                                vehicle: { ...currentDriver?.vehicle, type: e.target.value as any } as any 
                              })}
                              className="w-full bg-white border-2 border-primary/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary/50 font-bold text-dark appearance-none cursor-pointer"
                            >
                              <option value="moto">Motocicleta</option>
                              <option value="auto">Automóvil</option>
                              <option value="bici">Bicicleta / Eléctrico</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Patente / Dominio</label>
                            <input 
                              type="text" 
                              placeholder="AAA 000"
                              value={currentDriver?.vehicle?.plate || ''}
                              onChange={e => setCurrentDriver({ 
                                ...currentDriver, 
                                vehicle: { ...currentDriver?.vehicle, plate: e.target.value.toUpperCase() } as any 
                              })}
                              className="w-full bg-white border-2 border-primary/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary/50 font-medium text-dark text-center tracking-widest" 
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-bold text-muted uppercase mb-2 ml-1">Póliza de Seguro</label>
                            <input 
                              type="text" 
                              placeholder="Nº Póliza"
                              value={currentDriver?.vehicle?.insurancePolicy || ''}
                              onChange={e => setCurrentDriver({ 
                                ...currentDriver, 
                                vehicle: { ...currentDriver?.vehicle, insurancePolicy: e.target.value } as any 
                              })}
                              className="w-full bg-white border-2 border-primary/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary/50 font-bold text-dark" 
                            />
                          </div>
                          <div className="bg-white/50 p-4 rounded-2xl border border-primary/5">
                            <p className="text-[10px] font-bold text-muted uppercase mb-1">Estatus Operativo</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-dark uppercase ">
                                {currentDriver?.status === 'active' ? 'Disponible' : 'Inactivo'}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={currentDriver?.status === 'active'}
                                  onChange={(e) => setCurrentDriver({ ...currentDriver, status: e.target.checked ? 'active' : 'inactive' })}
                                  className="sr-only peer" 
                                />
                                <div className="w-10 h-5 bg-muted/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-[0.3em] flex items-center px-2">
                        <Info size={14} className="mr-2 text-primary" />
                        Métricas de Rendimiento
                      </h4>
                      <div className="bg-surface/50 p-8 rounded-2xl border border-surface grid grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-[9px] font-medium text-muted uppercase mb-2">Rating</p>
                          <div className="flex items-center justify-center space-x-1.5">
                            <Star size={14} className="text-accent fill-accent" />
                            <span className="text-lg font-medium text-dark">{currentDriver?.rating || 0}</span>
                          </div>
                        </div>
                        <div className="text-center border-x border-surface">
                          <p className="text-[9px] font-medium text-muted uppercase mb-2">Entregas</p>
                          <p className="text-lg font-medium text-dark">{currentDriver?.totalDeliveries || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-medium text-muted uppercase mb-2">Balance</p>
                          <p className="text-lg font-medium text-primary">${currentDriver?.balance || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-surface flex justify-end space-x-4 sticky bottom-0 bg-surface pb-4 z-10">
                  <button 
                    type="button"
                    onClick={() => setIsEditingDriver(false)}
                    className="px-8 py-3 rounded-2xl font-medium text-muted hover:bg-surface transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary text-dark px-10 py-3 rounded-2xl font-medium hover:bg-accent transition-all shadow-xl shadow-primary/20 flex items-center space-x-3 text-xs uppercase tracking-widest active:scale-95"
                  >
                    <Save size={18} />
                    <span>{currentDriver?.id ? 'Actualizar Ficha' : 'Completar Registro'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {isEditingMenu && activeBusinessForMenu && (
          <MenuEditor 
            businessId={activeBusinessForMenu.id} 
            businessName={activeBusinessForMenu.name}
            onClose={() => {
              setIsEditingMenu(false);
              setActiveBusinessForMenu(null);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
