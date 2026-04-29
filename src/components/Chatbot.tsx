import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Hola! Soy tu asistente de Tentación Food Store. ¿En qué puedo ayudarte hoy? Puedo recomendarte los mejores platos o ayudarte con información de nuestros comercios.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [businessesData, setBusinessesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: bData } = await supabase.from('businesses').select('*');
      if (bData) setBusinessesData(bData);
      
      const { data: pData } = await supabase.from('products').select('*');
      if (pData) setProductsData(pData);
    };
    fetchData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const context = `
        Eres el asistente virtual oficial de "Tentación Food Store", un marketplace de comida premium.
        Tu ÚNICO objetivo es brindar atención al cliente y recomendaciones basadas ESTRICTAMENTE en los datos proporcionados a continuación.
        
        Información de Comercios (Base de datos):
        ${JSON.stringify(businessesData, null, 2)}
        
        Información de Productos/Menús (Base de datos):
        ${JSON.stringify(productsData, null, 2)}
        
        REGLAS ESTRICTAS E INQUEBRANTABLES:
        1. SOLO puedes recomendar, mencionar o dar información sobre los comercios y productos que aparecen en los datos JSON de arriba.
        2. BAJO NINGUNA CIRCUNSTANCIA debes inventar comercios, productos, precios, horarios o información que no esté en los datos proporcionados.
        3. Si el usuario pregunta por un local, restaurante o producto que NO está en la lista de arriba, DEBES responder cortésmente que ese comercio o producto no está registrado en nuestro portal "Tentación Food Store".
        4. No respondas a preguntas generales que no tengan relación con los comercios o productos del marketplace.
        5. Sé amable, servicial y profesional.
        6. Mantén tus respuestas concisas pero informativas.
        7. Habla siempre en español.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp", // Using a stable flash model
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
      });

      const aiText = response.text || "Lo siento, tuve un problema al procesar tu solicitud. ¿Podrías intentar de nuevo?";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, estoy experimentando dificultades técnicas. Por favor, intenta más tarde.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-surface rounded-2xl shadow-2xl border border-surface w-[280px] sm:w-[300px] h-[380px] flex flex-col mb-3 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-2.5 flex justify-between items-center text-dark">
              <div className="flex items-center space-x-2">
                <div className="bg-dark/10 p-1 rounded-lg">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="font-medium text-[11px]">Asistente Tentación</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-accent/30 rounded-full animate-pulse" />
                    <p className="text-[8px] opacity-80 uppercase tracking-wider">En línea</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-dark/10 p-1 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-surface/50">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-1.5 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary/10 text-accent' : 'bg-surface text-muted border border-surface shadow-sm'}`}>
                      {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div className={`p-2 rounded-2xl text-[11px] leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-primary text-dark rounded-tr-none shadow-sm' 
                        : 'bg-surface text-dark border border-surface rounded-tl-none shadow-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-surface border border-surface flex items-center justify-center shadow-sm">
                      <Bot size={12} className="text-muted" />
                    </div>
                    <div className="bg-surface p-2 rounded-2xl rounded-tl-none border border-surface shadow-sm flex space-x-1">
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2.5 bg-surface border-t border-surface">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-surface/50 border border-surface rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-primary text-dark p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-dark p-3 rounded-full shadow-xl shadow-primary/50 hover:bg-accent transition-all flex items-center justify-center border-2 border-surface"
      >
        {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
      </motion.button>
    </div>
  );
};
