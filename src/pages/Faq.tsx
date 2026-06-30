import React from 'react';

export const Faq = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h1>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">¿Cómo realizo un pedido?</h3>
            <p className="mt-2 text-gray-600">
              Simplemente navega por los comercios, elige tus productos favoritos, añádelos al carrito y procede al pago.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">¿Cuáles son los métodos de pago?</h3>
            <p className="mt-2 text-gray-600">
              Aceptamos pagos en efectivo y transferencias (según la disponibilidad de cada comercio).
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">¿Cómo puedo registrar mi comercio?</h3>
            <p className="mt-2 text-gray-600">
              Actualmente los registros de nuevos comercios se gestionan directamente con nuestro equipo de administración.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
