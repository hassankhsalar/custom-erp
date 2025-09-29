import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const EditFactory = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [factory, setFactory] = useState({
    name: '',
    phone: '',
    manager: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    const fetchFactory = async () => {
      try {
        const response = await axios.get(`${API_ROUTES.FACTORIES}/${id}`);
        setFactory(response.data);
      } catch (error) {
        console.error('Error fetching factory:', error);
      }
    };
    fetchFactory();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFactory((prevFactory) => ({
      ...prevFactory,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_ROUTES.FACTORIES}/${id}`, factory);
      navigate('/factories/all');
    } catch (error) {
      console.error('Error updating factory:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Edit Factory</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={factory.name}
              onChange={handleChange}
              placeholder="Name"
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={factory.phone}
              onChange={handleChange}
              placeholder="Phone"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="manager">
              Manager
            </label>
            <input
              type="text"
              name="manager"
              value={factory.manager}
              onChange={handleChange}
              placeholder="Manager"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={factory.email}
              onChange={handleChange}
              placeholder="Email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={factory.address}
              onChange={handleChange}
              placeholder="Address"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Update Factory</button>
      </form>
    </div>
  );
};

export default EditFactory;
