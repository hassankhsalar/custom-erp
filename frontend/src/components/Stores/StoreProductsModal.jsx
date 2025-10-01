import React from 'react';

const StoreProductsModal = ({ products, onClose }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Products in Store</h3>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-4 py-2 border border-gray-300">Product Name</th>
              <th className="px-4 py-2 border border-gray-300">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(sp => (
              <tr key={sp.productId}>
                <td className="border border-gray-300 px-4 py-2">{sp.product.name}</td>
                <td className="border border-gray-300 px-4 py-2">{sp.stock}</td>
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

export default StoreProductsModal;