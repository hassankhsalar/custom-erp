const API_BASE_URL = 'http://localhost:3001/api'

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!res.ok) {
    throw new Error(`API call failed: ${res.statusText}`)
  }

  return res.json()
}

export const api = {
  // Valued Customers
  getValuedCustomers: () => fetchAPI('/valued-customers'),
  
  // Products
  getProducts: (params) => fetchAPI(`/products?${new URLSearchParams(params)}`),
  getProduct: (id) => fetchAPI(`/products/${id}`),
  
  // Categories
  getCategories: () => fetchAPI('/food-categories'),
  
  // Home page data
  getHomeBanners: () => fetchAPI('/home-banners'),
  getProductCollections: () => fetchAPI('/product-collections'),
}