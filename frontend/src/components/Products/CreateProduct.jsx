import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const CreateProduct = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    sale_price: '',
    wholesale_price: '',
    cost: '',
  });
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', material_quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(API_ROUTES.MATERIALS);
        setAllMaterials(response.data.materials);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMaterials(
        allMaterials.filter(material =>
          material.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredMaterials([]);
    }
  }, [searchTerm, allMaterials]);

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleAddOrUpdateMaterial = () => {
    if (newMaterial.material_id && newMaterial.material_quantity && newMaterial.price) {
      if (editingMaterialIndex !== null) {
        const updatedMaterials = [...materials];
        updatedMaterials[editingMaterialIndex] = newMaterial;
        setMaterials(updatedMaterials);
        setEditingMaterialIndex(null);
      } else {
        setMaterials([...materials, newMaterial]);
      }
      setNewMaterial({ material_id: '', material_name: '', material_quantity: '', price: '' });
      setSearchTerm('');
    }
  };

  const handleSelectMaterial = (material) => {
    setNewMaterial({ ...newMaterial, material_id: material.id, material_name: material.name });
    setSearchTerm(material.name);
    setFilteredMaterials([]);
  };

  const handleDeleteMaterial = (index) => {
    const updatedMaterials = [...materials];
    updatedMaterials.splice(index, 1);
    setMaterials(updatedMaterials);
  };

  const handleEditMaterial = (material, index) => {
    setNewMaterial(material);
    setEditingMaterialIndex(index);
    setSearchTerm(material.material_name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = {
      ...product,
      sale_price: parseFloat(product.sale_price),
      wholesale_price: parseFloat(product.wholesale_price),
      cost: parseFloat(product.cost),
      materials: materials.map(m => ({...m, material_id: parseInt(m.material_id), material_quantity: parseFloat(m.material_quantity), price: parseFloat(m.price)})),
    };

    try {
      await axios.post(API_ROUTES.PRODUCTS, productData);
      alert('Product created successfully!');
      // Clear form
      setProduct({ name: '', description: '', sale_price: '', wholesale_price: '', cost: '' });
      setMaterials([]);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product');
    }
  };

  const selectedMaterial = allMaterials.find(
  (m) => m.id === parseInt(newMaterial.material_id)
);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className='grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-4'>
          <input type="text" name="name" value={product.name} onChange={handleProductChange} placeholder="Product Name" className="w-full p-2 border border-gray-300" required />
          <input type="number" name="sale_price" value={product.sale_price} onChange={handleProductChange} placeholder="Sale Price" className="w-full p-2 border border-gray-300" required />
          <input type="number" name="wholesale_price" value={product.wholesale_price} onChange={handleProductChange} placeholder="Wholesale Price" className="w-full p-2 border border-gray-300" required />
          <input type="number" name="cost" value={product.cost} onChange={handleProductChange} placeholder="Cost" className="w-full p-2 border border-gray-300" required />
        </div>
        <textarea name="description" value={product.description} onChange={handleProductChange} placeholder="Description" className="w-full p-2 border border-gray-300"></textarea>
        
        <div className="border border-gray-300 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Materials</h2>
          <table className="min-w-full bg-white mb-4">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-2 px-4">Material</th>
                <th className="py-2 px-4">Quantity</th>
                <th className="py-2 px-4">Price</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{mat.material_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{mat.material_quantity}</td>
                  <td className="border border-gray-300 px-4 py-2">{mat.price}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button type="button" onClick={() => handleEditMaterial(mat, index)} className="bg-yellow-500 text-white p-1 rounded mr-2">Edit</button>
                    <button type="button" onClick={() => handleDeleteMaterial(index)} className="bg-red-500 text-white p-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a material"
              className="w-full p-2 border border-gray-300"
            />
            {filteredMaterials.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto">
                {filteredMaterials.map(material => (
                  <li
                    key={material.id}
                    onMouseDown={() => handleSelectMaterial(material)}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                  >
                    {material.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <input type="number" value={newMaterial.material_quantity} onChange={(e) => setNewMaterial({ ...newMaterial, material_quantity: e.target.value })} placeholder="Quantity" className="p-2 border border-gray-300" />
            
            <input type="number" value={newMaterial.price} onChange={(e) => setNewMaterial({ ...newMaterial, price: e.target.value })} placeholder={selectedMaterial?.unit_cost || "Price"} className="p-2 border border-gray-300" />

            <button type="button" onClick={handleAddOrUpdateMaterial} className="bg-blue-500 text-white p-2 px-8 cursor-pointer rounded">
              {editingMaterialIndex !== null ? 'Update Material' : 'Add Material'}
            </button>
          </div>
        </div>

        <button type="submit" className="bg-green-500 text-white p-2 px-8 cursor-pointer rounded">Create Product</button>
      </form>
    </div>
  );
};

export default CreateProduct;
