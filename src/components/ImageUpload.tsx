import React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label, className = "" }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-muted">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center overflow-hidden bg-surface hover:bg-primary/5 hover:border-primary/50 ${
          value ? 'border-primary/30 h-48' : 'border-surface h-32'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {value ? (
          <>
            <img 
              src={value} 
              alt="Preview" 
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white font-medium text-sm flex items-center">
                <Upload size={16} className="mr-2" />
                Cambiar Imagen
              </p>
            </div>
            <button 
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-surface/90 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-2 text-muted shadow-sm">
              <ImageIcon size={24} />
            </div>
            <p className="text-sm font-medium text-muted">Haz clic para subir imagen</p>
            <p className="text-xs text-muted/60 mt-1">PNG, JPG hasta 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
};
