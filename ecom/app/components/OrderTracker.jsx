"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from '@/lib/api'
import { useRouter } from "next/navigation"
import { Package, Search, Loader2, Phone, Hash } from "lucide-react"

export function OrderTracker({ isOpen, onClose }) {
  const router = useRouter()
  const [orderId, setOrderId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchType, setSearchType] = useState("orderId") // "orderId" or "phone"

  const handleTrackOrder = async (e) => {
    e.preventDefault()
    
    // Validate based on search type
    if (searchType === "orderId") {
      if (!orderId.trim()) {
        setError("Please enter an order ID")
        return
      }
    } else {
      if (!phoneNumber.trim()) {
        setError("Please enter your phone number")
        return
      }
      // Basic phone validation (optional)
      if (phoneNumber.trim().length < 10) {
        setError("Please enter a valid phone number")
        return
      }
    }

    setLoading(true)
    setError("")

    try {
      if (searchType === "orderId") {
        // Search by order ID
        const order = await api.trackOrder(orderId)
        if (order && order.id) {
          onClose()
          router.push(`/order-confirmation/${order.id}`)
        } else {
          setError("Order not found")
        }
      } else {
        // Search by phone number - get all orders and show list
        const orders = await api.getOrdersByPhone(phoneNumber)
        if (orders && orders.length > 0) {
          onClose()
          // If multiple orders, go to orders page with phone filter
          router.push(`/orders?phone=${encodeURIComponent(phoneNumber)}`)
        } else {
          setError("No orders found with this phone number")
        }
      }
    } catch (error) {
      console.error('Error tracking order:', error)
      setError("Order not found. Please check and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Track Your Order
          </DialogTitle>
          <DialogDescription>
            Search by Order ID or Phone Number
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="orderId" onValueChange={setSearchType} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orderId" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Order ID
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleTrackOrder} className="space-y-4 mt-4">
            <TabsContent value="orderId" className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                placeholder="e.g., ORD-12345678 or 123"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter your order number (e.g., ORD-12345678) or order ID
              </p>
            </TabsContent>

            <TabsContent value="phone" className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +8801726798844"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter the phone number used when placing the order
              </p>
            </TabsContent>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Track Order
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}