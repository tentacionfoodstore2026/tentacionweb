import React, { useEffect, useState, useRef } from 'react';
import { Bell, X, CheckCheck, Package, Truck, CheckCircle2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useStore';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  OrderNotification,
} from '../lib/orderService';

const ICON_MAP: Record<string, React.ReactNode> = {
  order_ready:              <Package size={16} className="text-purple-600" />,
  driver_assigned:          <Truck size={16} className="text-indigo-600" />,
  picked_up:                <Truck size={16} className="text-orange-500" />,
  delivered:                <CheckCircle2 size={16} className="text-green-600" />,
  order_ready_for_pickup:   <Package size={16} className="text-amber-600" />,
};

const BG_MAP: Record<string, string> = {
  order_ready:              'bg-purple-100',
  driver_assigned:          'bg-indigo-100',
  picked_up:                'bg-orange-100',
  delivered:                'bg-green-100',
  order_ready_for_pickup:   'bg-amber-100',
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    fetchNotifications(user.id, user.role).then(setNotifications);

    const channel = subscribeToNotifications(user.id, (notif) => {
      setNotifications(prev => [notif, ...prev]);
      // Vibrate on mobile if supported
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    });

    return () => { channel.unsubscribe(); };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-muted hover:text-accent transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={24} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center space-x-2">
                <Bell size={16} className="text-gray-700" />
                <span className="font-bold text-sm text-gray-900">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary font-semibold hover:underline flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-primary/5 transition-all"
                  >
                    <CheckCheck size={12} />
                    <span>Leer todo</span>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Sin notificaciones</p>
                  <p className="text-xs text-gray-300 mt-1">Te avisaremos sobre tus pedidos aquí</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleMarkRead(notif.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                      !notif.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${BG_MAP[notif.type] || 'bg-gray-100'}`}>
                        {ICON_MAP[notif.type] || <Bell size={16} className="text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-gray-900 truncate">{notif.title}</p>
                          {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">
                          {new Date(notif.created_at).toLocaleString('es', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
