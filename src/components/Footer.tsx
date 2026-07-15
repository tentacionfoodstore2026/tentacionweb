import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';
import { useAuthStore } from '../store/useStore';

export const Footer = () => {
  const { portalSettings } = useAuthStore();
  
  return (
    <footer className="bg-surface border-t border-surface pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              {portalSettings?.logo_url ? (
                <img
                  src={portalSettings.logo_url}
                  alt={portalSettings.name || 'Tentación Food Store'}
                  className="h-10 object-contain"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-dark font-medium text-xl">
                    T
                  </div>
                  <span className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    {portalSettings?.name || 'Tentación Food Store'}
                  </span>
                </>
              )}
            </Link>
            <p className="text-muted text-sm leading-relaxed">
              La plataforma líder para conectar con tus comercios locales favoritos y pedir de forma rápida y sencilla.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-dark mb-6">Plataforma</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><Link to="/about" className="hover:text-accent transition-colors">Quienes Somos</Link></li>
              <li><Link to="/terms" className="hover:text-accent transition-colors">Terminos y condiciones</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-colors">Politicas de privacidad</Link></li>
              <li><Link to="/faq" className="hover:text-accent transition-colors">Preguntas frecuentes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-dark mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li className="flex items-center space-x-2">
                <Mail size={16} />
                <span>{portalSettings?.support_email || 'soporte@tentacion.com'}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={16} />
                <span>{portalSettings?.support_phone || '+54 11 1234-5678'}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-dark mb-6">Síguenos</h4>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-surface rounded-2xl flex items-center justify-center text-muted hover:bg-primary/10 hover:text-accent transition-all">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-surface rounded-2xl flex items-center justify-center text-muted hover:bg-primary/10 hover:text-accent transition-all">
                <Facebook size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-surface rounded-2xl flex items-center justify-center text-muted hover:bg-primary/10 hover:text-accent transition-all">
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-surface text-center">
          <p className="text-xs text-muted font-medium">
            © 2026 {portalSettings?.name || 'Tentación Food Store'}. Todos los derechos reservados. - Creador por <a href="https://ideasdelsur.cl" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">ideasdelsur.cl</a>
          </p>
        </div>
      </div>
    </footer>
  );
};
