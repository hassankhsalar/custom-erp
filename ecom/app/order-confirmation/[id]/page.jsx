import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ShoppingBag, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function OrderConfirmationPage({ params }) {
  const { id } = await params
  
  try {
    const order = await api.getOrder(id)
    
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-20 w-20 text-green-500" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Order Confirmed!
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              Thank you for your order. We'll process it shortly.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold">Order #{order.orderNumber || order.id}</h2>
              </div>
              
              <div className="space-y-3">
                <p><span className="font-medium">Name:</span> {order.customerName}</p>
                <p><span className="font-medium">Mobile:</span> {order.customerMobile}</p>
                {order.customerEmail && (
                  <p><span className="font-medium">Email:</span> {order.customerEmail}</p>
                )}
                <p><span className="font-medium">Order Type:</span> {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                {order.orderType === 'pickup' && (
                  <p><span className="font-medium">Pickup Outlet:</span> {order.outlet?.name || 'N/A'}</p>
                )}
                {order.orderType === 'delivery' && (
                  <p><span className="font-medium">Delivery Address:</span> {order.deliveryAddress}</p>
                )}
                <p><span className="font-medium">Total Amount:</span> ৳{order.total}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {order.status}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button className="w-full sm:w-auto">Continue Shopping</Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Package className="mr-2 h-4 w-4" />
                  View All Orders
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}