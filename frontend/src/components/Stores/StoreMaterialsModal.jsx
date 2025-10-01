import React from 'react';

const StoreMaterialsModal = ({ materials, onClose }) => {
  if (!materials || materials.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Materials in Store</h3>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-4 py-2 border border-gray-300">Material Name</th>
              <th className="px-4 py-2 border border-gray-300">Stock</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(sm => (
              <tr key={sm.materialId}>
                <td className="border border-gray-300 px-4 py-2">{sm.material.name}</td>
                <td className="border border-gray-300 px-4 py-2">{sm.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreMaterialsModal;