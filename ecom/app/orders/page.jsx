"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from '@/lib/api'
import { 
  Package, 
  Search, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from "lucide-react"

const ADMIN_PANEL_URL = 'http://localhost:3001'

const getImageUrl = (imagePath) => {
  if (!imagePath) return '/placeholder.jpg'
  if (imagePath.startsWith('http')) return imagePath
  if (imagePath.startsWith('/uploads')) {
    return `${ADMIN_PANEL_URL}${imagePath}`
  }
  return `${ADMIN_PANEL_URL}/uploads/${imagePath}`
}

const statusColors = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: Clock,
    label: "Pending"
  },
  confirmed: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: CheckCircle,
    label: "Confirmed"
  },
  processing: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: Package,
    label: "Processing"
  },
  ready: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: CheckCircle,
    label: "Ready for Pickup"
  },
  completed: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: CheckCircle,
    label: "Completed"
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: XCircle,
    label: "Cancelled"
  }
}

const orderTypeIcons = {
  pickup: MapPin,
  delivery: Truck
}

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")

  // Auto-search if phone is provided in URL
  useEffect(() => {
    const phoneFromUrl = searchParams.get('phone')
    if (phoneFromUrl) {
      setPhoneNumber(phoneFromUrl)
      handleSearchWithPhone(phoneFromUrl)
    }
  }, [searchParams])

  const handleSearchWithPhone = async (phone) => {
    setLoading(true)
    try {
      const data = await api.getOrdersByPhone(phone)
      const ordersArray = Array.isArray(data) ? data : (data.orders || [])
      setOrders(ordersArray)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!phoneNumber.trim()) return
    await handleSearchWithPhone(phoneNumber)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredOrders = filterStatus === "all" 
    ? orders 
    : orders.filter(order => order.status === filterStatus)

  const getStatusComponent = (status) => {
    const statusConfig = statusColors[status] || statusColors.pending
    const StatusIcon = statusConfig.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        <StatusIcon className="h-3 w-3" />
        {statusConfig.label}
      </span>
    )
  }

  const getOrderTypeIcon = (type) => {
    const Icon = orderTypeIcons[type] || MapPin
    return <Icon className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-lg text-gray-600">
            Track and manage all your orders in one place
          </p>
        </div>

        {/* Search by Phone */}
        <div className="max-w-md mx-auto mb-12">
          <form onSubmit={handleSearch} className="space-y-4">
            <Label htmlFor="phone" className="text-center block">
              Enter your phone number to view orders
            </Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +8801726798844"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Orders List */}
        {searched && (
          <>
            {/* Filter Tabs */}
            {orders.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Your Orders ({orders.length})
                  </h2>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready for Pickup</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {loading ? (
                // Loading skeletons
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                  <Package className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-medium text-gray-700 mb-2">
                    {orders.length === 0 ? "No orders found" : "No orders match filter"}
                  </h3>
                  <p className="text-gray-500 mb-8">
                    {orders.length === 0 
                      ? "No orders found with this phone number"
                      : "Try changing your filter selection"}
                  </p>
                  <div className="flex gap-4 justify-center">
                    {orders.length === 0 ? (
                      <Link href="/">
                        <Button>Start Shopping</Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => setFilterStatus("all")}
                      >
                        View All Orders
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Order Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.orderNumber || order.id}
                            </h3>
                            {getStatusComponent(order.status)}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            ৳{order.total}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                            {getOrderTypeIcon(order.orderType)}
                            <span className="capitalize">{order.orderType}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="px-6 py-4 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{order.customerMobile}</span>
                        </div>
                        {order.customerEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{order.customerEmail}</span>
                          </div>
                        )}
                        {order.orderType === 'pickup' && order.outlet && (
                          <div className="flex items-center gap-2 text-sm md:col-span-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{order.outlet.name} - {order.outlet.address}</span>
                          </div>
                        )}
                        {order.orderType === 'delivery' && order.deliveryAddress && (
                          <div className="flex items-center gap-2 text-sm md:col-span-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{order.deliveryAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="px-6 py-4">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Items ({order.items?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {order.items?.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 w-8 text-center">
                                {item.quantity}x
                              </span>
                              <span className="text-gray-700">{item.productName}</span>
                            </div>
                            <span className="font-medium text-gray-900">
                              ৳{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <p className="text-sm text-gray-500 mt-2">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Summary & Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Subtotal:</span> ৳{order.total}
                          </p>
                          {order.notes && (
                            <p className="text-sm text-gray-500 italic">
                              Note: {order.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/order-confirmation/${order.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                          {order.status === "ready" && order.orderType === "pickup" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Ready for Pickup
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Initial State - No Search Yet */}
        {!searched && !loading && (
          <div className="text-center py-16">
            <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-gray-700 mb-3">
              Track Your Orders
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Enter your phone number above to view all your orders and track their status
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/">
                <Button>Continue Shopping</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('phone')?.focus()}
              >
                <Search className="mr-2 h-4 w-4" />
                Search Orders
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}