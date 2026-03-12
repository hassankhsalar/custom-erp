'use client'

import { api } from '@/lib/api'
import Image from "next/image"
import { useEffect, useState } from 'react'

const ADMIN_PANEL_URL = 'http://localhost:3001'

export default function CustomersGrid() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await api.getValuedCustomers()
        setCustomers(response.customers || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomers()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          Loading customers...
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error loading customers: {error}
      </div>
    )
  }

  if (!customers || customers.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-red-900">
          Our Valued Customers
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex justify-center items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition"
            >
              {customer.image ? (
                <img
                  src={`${ADMIN_PANEL_URL}${customer.image}`}
                  alt={`Customer ${customer.id}`}
                  width={180}
                  height={100}
                  className="object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML += '<div class="w-[180px] h-[100px] bg-gray-200 flex items-center justify-center text-gray-500">Image Error</div>'
                  }}
                />
              ) : (
                <div className="w-[180px] h-[100px] bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}