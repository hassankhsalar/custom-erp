import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';

const AddShop = () => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [shop_keeper, setShopKeeper] = useState('');
  const [mobile, setMobile] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [newProduct, setNewProduct] = useState({ product_id: '', product_name: '', stock: '' });
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', stock: '' });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductsAndMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const productsResponse = await axios.get(API_ROUTES.PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllProducts(productsResponse.data.products);

        const materialsResponse = await axios.get(API_ROUTES.MATERIALS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllMaterials(materialsResponse.data.materials);
      } catch (error) {
        console.error('Error fetching products or materials:', error);
      }
    };
    fetchProductsAndMaterials();
  }, []);

  useEffect(() => {
    if (productSearchTerm) {
      setFilteredProducts(
        allProducts.filter(product =>
          product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchTerm, allProducts]);

  useEffect(() => {
    if (materialSearchTerm) {
      setFilteredMaterials(
        allMaterials.filter(material =>
          material.name.toLowerCase().includes(materialSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredMaterials([]);
    }
  }, [materialSearchTerm, allMaterials]);

  const handleAddOrUpdateProduct = () => {
    if (newProduct.product_id && newProduct.stock) {
      if (editingProductIndex !== null) {
        const updatedProducts = [...selectedProducts];
        updatedProducts[editingProductIndex] = newProduct;
        setSelectedProducts(updatedProducts);
        setEditingProductIndex(null);
      } else {
        setSelectedProducts([...selectedProducts, newProduct]);
      }
      setNewProduct({ product_id: '', product_name: '', stock: '' });
      setProductSearchTerm('');
    }
  };

  const handleSelectProduct = (product) => {
    setNewProduct({ ...newProduct, product_id: product.id, product_name: product.name });
    setProductSearchTerm(product.name);
    setFilteredProducts([]);
  };

  const handleDeleteProduct = (index) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
  };

  const handleEditProduct = (product, index) => {
    setNewProduct(product);
    setEditingProductIndex(index);
    setProductSearchTerm(product.product_name);
  };

  const handleAddOrUpdateMaterial = () => {
    if (newMaterial.material_id && newMaterial.stock) {
      if (editingMaterialIndex !== null) {
        const updatedMaterials = [...selectedMaterials];
        updatedMaterials[editingMaterialIndex] = newMaterial;
        setSelectedMaterials(updatedMaterials);
        setEditingMaterialIndex(null);
      } else {
        setSelectedMaterials([...selectedMaterials, newMaterial]);
      }
      setNewMaterial({ material_id: '', material_name: '', stock: '' });
      setMaterialSearchTerm('');
    }
  };

  const handleSelectMaterial = (material) => {
    setNewMaterial({ ...newMaterial, material_id: material.id, material_name: material.name });
    setMaterialSearchTerm(material.name);
    setFilteredMaterials([]);
  };

  const handleDeleteMaterial = (index) => {
    const updatedMaterials = [...selectedMaterials];
    updatedMaterials.splice(index, 1);
    setSelectedMaterials(updatedMaterials);
  };

  const handleEditMaterial = (material, index) => {
    setNewMaterial(material);
    setEditingMaterialIndex(index);
    setMaterialSearchTerm(material.material_name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(API_ROUTES.SHOPS, {
        name,
        address,
        shop_keeper,  // Changed from shop_keeper to shop_keeper
        mobile,
        shopProducts: selectedProducts.map(p => ({ 
          product_id: parseInt(p.product_id), 
          stock: parseFloat(p.stock) 
        })),
        shopMaterials: selectedMaterials.map(m => ({ 
          material_id: parseInt(m.material_id), 
          stock: parseFloat(m.stock) 
        })),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/shop/all');
    } catch (error) {
      console.error('Error creating shop:', error);
      alert(error.response?.data?.error || 'Failed to create shop');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Shop</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
            Address
          </label>
          <input
            type="text"
            id="address"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="shop_keeper">
            Shop Keeper
          </label>
          <input
            type="text"
            id="shop_keeper"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={shop_keeper}
            onChange={(e) => setShopKeeper(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mobile">
            Mobile
          </label>
          <input
            type="text"
            id="mobile"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        {/* Products Section */}
        <div className="border border-gray-300 p-4 rounded mt-4">
          <h2 className="text-xl font-semibold mb-2">Products in Shop</h2>
          <table className="min-w-full bg-white mb-4">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-2 px-4">Product</th>
                <th className="py-2 px-4">Stock</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts.map((prod, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{prod.product_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{prod.stock}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button type="button" onClick={() => handleEditProduct(prod, index)} className="bg-yellow-500 text-white p-1 rounded mr-2">Edit</button>
                    <button type="button" onClick={() => handleDeleteProduct(index)} className="bg-red-500 text-white p-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="relative">
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="Search for a product"
              className="w-full p-2 border border-gray-300"
            />
            {filteredProducts.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto">
                {filteredProducts.map(product => (
                  <li
                    key={product.id}
                    onMouseDown={() => handleSelectProduct(product)}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                  >
                    {product.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <input type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="Stock" className="p-2 border border-gray-300" />
            <button type="button" onClick={handleAddOrUpdateProduct} className="bg-blue-500 text-white p-2 px-8 cursor-pointer rounded">
              {editingProductIndex !== null ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </div>

        {/* Materials Section */}
        <div className="border border-gray-300 p-4 rounded mt-4">
          <h2 className="text-xl font-semibold mb-2">Materials in Shop</h2>
          <table className="min-w-full bg-white mb-4">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-2 px-4">Material</th>
                <th className="py-2 px-4">Stock</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedMaterials.map((mat, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{mat.material_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{mat.stock}</td>
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
              value={materialSearchTerm}
              onChange={(e) => setMaterialSearchTerm(e.target.value)}
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
            <input type="number" value={newMaterial.stock} onChange={(e) => setNewMaterial({ ...newMaterial, stock: e.target.value })} placeholder="Stock" className="p-2 border border-gray-300" />
            <button type="button" onClick={handleAddOrUpdateMaterial} className="bg-blue-500 text-white p-2 px-8 cursor-pointer rounded">
              {editingMaterialIndex !== null ? 'Update Material' : 'Add Material'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Shop
          </button>
          <Link to="/shops/all" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AddShop;