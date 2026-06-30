import React from 'react';

export const AboutUs = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Quiénes Somos</h1>
        <div className="prose max-w-none text-gray-600">
          <p className="mb-4">
            Tentación Food Store es la plataforma líder para conectar con tus comercios locales favoritos y pedir de forma rápida y sencilla.
          </p>
          <p className="mb-4">
            Nuestro objetivo es apoyar a los emprendedores locales brindándoles una plataforma tecnológica de primer nivel para gestionar sus pedidos y llegar a más clientes.
          </p>
          <p>
            ¡Gracias por ser parte de nuestra comunidad!
          </p>
        </div>
      </div>
    </div>
  );
};
