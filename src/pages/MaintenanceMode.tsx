import React from 'react';
import { motion } from 'motion/react';
import { Construction, Clock, Mail, Phone, Heart } from 'lucide-react';

export const MaintenanceMode = () => {
  return (
    <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-2xl shadow-amber-200/50"
        >
          {/* Animated Icon */}
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              y: [0, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-200"
          >
            <Construction size={48} className="text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
            Estamos <span className="text-amber-500">Mejorando</span>
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            Nuestra tienda se encuentra en mantenimiento programado para brindarte una mejor experiencia. ¡Volveremos muy pronto!
          </p>

          <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 transition-hover hover:border-amber-200">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium uppercase">Tiempo Estimado</p>
                <p className="text-sm font-semibold text-gray-800">Menos de 2 horas</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium">¿Necesitas ayuda inmediata?</p>
            <div className="flex justify-center space-x-4">
              <a 
                href="mailto:soporte@tentacion.com" 
                className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-amber-600 hover:border-amber-500 transition-all shadow-sm"
              >
                <Mail size={20} />
              </a>
              <a 
                href="tel:+584120000000" 
                className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-amber-600 hover:border-amber-500 transition-all shadow-sm"
              >
                <Phone size={20} />
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex items-center justify-center space-x-2 text-gray-400 text-sm font-medium"
        >
          <span>Hecho con</span>
          <Heart size={14} className="text-red-400 fill-red-400" />
          <span>por Tentación Food Store</span>
        </motion.div>
      </div>
    </div>
  );
};
