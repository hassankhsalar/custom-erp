// lib/api.js
const API_BASE_URL = 'http://localhost:3001/api'

export const api = {
  async getValuedCustomers() {
    const response = await fetch(`${API_BASE_URL}/valued-customers?limit=100&isActive=true`)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // The API returns { customers: [...], totalCount, totalPages, currentPage }
    return data // Return the whole response object
  },
  
  // If you want to use the /all endpoint which returns array directly
  async getAllValuedCustomers() {
    const response = await fetch(`${API_BASE_URL}/valued-customers/all`)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    return await response.json() // This returns array directly
  },

  
  async getHomeBanners() {
    const response = await fetch(`${API_BASE_URL}/home-banners/all`)
    if (!response.ok) throw new Error('Failed to fetch banners')
    return response.json()
  },

    // New methods for product collections
  async getCollectionByType(type, limit = 12) {
    const response = await fetch(`${API_BASE_URL}/product-collections/by-type/${type}?limit=${limit}`)
    if (!response.ok) throw new Error(`Failed to fetch ${type} products`)
    return response.json()
  },

  async getAllCollections() {
    const response = await fetch(`${API_BASE_URL}/product-collections`)
    if (!response.ok) throw new Error('Failed to fetch collections')
    return response.json()
  },

  // New method for food categories
  async getFoodCategories() {
    const response = await fetch(`${API_BASE_URL}/food-categories/all?isActive=true`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    return response.json()
  },

  // NEW: Get products by category name
  async getProductsByCategory(categoryName, page = 1, limit = 20) {
    const response = await fetch(
      `${API_BASE_URL}/products/by-category/${encodeURIComponent(categoryName)}?page=${page}&limit=${limit}`
    )
    if (!response.ok) throw new Error('Failed to fetch products')
    const data = await response.json()
    return data
  },

  // NEW: Get products for multiple categories at once (for homepage)
  async getProductsByCategories(categories, limit = 8) {
    const categoryString = categories.join(',')
    const response = await fetch(
      `${API_BASE_URL}/products/by-categories?categories=${encodeURIComponent(categoryString)}&limit=${limit}`
    )
    if (!response.ok) throw new Error('Failed to fetch products')
    return response.json()
  },

  // Optional: Get all products with pagination
  async getAllProducts(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page, limit })
    if (search) params.append('search', search)
    
    const response = await fetch(`${API_BASE_URL}/products?${params}`)
    if (!response.ok) throw new Error('Failed to fetch products')
    return response.json()
  },

  // Optional: Search products
  async searchProducts(query) {
    const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Failed to search products')
    return response.json()
  },

  // New method for outlets
  async getOutlets(page = 1, limit = 10) {
    const response = await fetch(`${API_BASE_URL}/outlets?page=${page}&limit=${limit}&isActive=true`)
    if (!response.ok) throw new Error('Failed to fetch outlets')
    return response.json()
  },

  async getAllOutlets() {
  try {
    const response = await fetch(`${API_BASE_URL}/outlets?limit=100&isActive=true`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json() // Read once
    console.log('Outlets API response:', data) // Debug log
    
    // Handle both paginated and non-paginated responses
    // If data has an 'outlets' property (paginated), return that
    // Otherwise return the data itself
    return data.outlets || data
  } catch (error) {
    console.error('Error fetching outlets:', error)
    throw error // Re-throw so the component can handle it
  }
},

  // Create a new order
  async createOrder(orderData) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })
    if (!response.ok) throw new Error('Failed to create order')
    return response.json()
  },

  // Get order by ID (for confirmation page)
  async getOrder(orderId) {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`)
    if (!response.ok) throw new Error('Failed to fetch order')
    return response.json()
  },

  // Get order by ID (for tracking)
async getOrder(orderId) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`)
  if (!response.ok) throw new Error('Failed to fetch order')
  return response.json()
},

// Get orders by phone number (for order history)
async getOrdersByPhone(phoneNumber) {
  const response = await fetch(`${API_BASE_URL}/orders/phone/${phoneNumber}`)
  if (!response.ok) throw new Error('Failed to fetch orders')
  return response.json()
},

// Track order by order number or ID
async trackOrder(query) {
  const response = await fetch(`${API_BASE_URL}/orders/track?q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('Failed to track order')
  return response.json()
}
}

