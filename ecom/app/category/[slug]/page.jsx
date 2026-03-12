// app/category/[slug]/page.jsx
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import CategoryClient from './CategoryClient'

// Helper to create slug from category name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

export default async function CategoryPage({ params, searchParams }) {
  // Await both params and searchParams (they are Promises)
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  
  const { slug } = resolvedParams
  
  // First, try to get category name from query parameter
  let categoryName = resolvedSearchParams?.name
  
  if (!categoryName) {
    // If no query parameter, fetch all categories and find by slug
    const categories = await api.getFoodCategories()
    const category = categories.find(c => createSlug(c.name) === slug)
    
    if (!category) {
      notFound()
    }
    
    categoryName = category.name
  } else {
    // Decode the URI component
    categoryName = decodeURIComponent(categoryName)
  }

  return (
    <CategoryClient 
      categoryName={categoryName}
      slug={slug}
    />
  )
}