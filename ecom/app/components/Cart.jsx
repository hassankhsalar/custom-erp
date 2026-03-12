"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Minus, Plus, Trash2, ShoppingBag, X } from "lucide-react"
import { useCart } from "@/app/context/CartContext"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

const ADMIN_PANEL_URL = 'http://localhost:3001'

const getImageUrl = (imagePath) => {
  if (!imagePath) return '/placeholder.jpg'
  if (imagePath.startsWith('http')) return imagePath
  if (imagePath.startsWith('/uploads')) {
    return `${ADMIN_PANEL_URL}${imagePath}`
  }
  return `${ADMIN_PANEL_URL}/uploads/${imagePath}`
}

export function Cart() {
  const router = useRouter()
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal,
    clearCart 
  } = useCart()

  const [step, setStep] = useState(1) // 1: Cart, 2: Checkout
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(false)
  const [orderType, setOrderType] = useState("pickup")
  const [loadingOutlets, setLoadingOutlets] = useState(false) // ADD THIS LINE
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    mobile: "",
    address: "",
    notes: ""
  })

  // Fetch outlets for pickup
  useEffect(() => {
  if (orderType === "pickup") {
    console.log('Order type changed to pickup, fetching outlets...');
    fetchOutlets()
  }
}, [orderType])

// Also add this to see when outlets state changes
useEffect(() => {
  console.log('Outlets state updated:', outlets);
}, [outlets])

  const fetchOutlets = async () => {
  setLoadingOutlets(true) // Now this works
  try {
    console.log('Fetching outlets...')
    const outletsData = await api.getAllOutlets()
    console.log('Fetched outlets data:', outletsData)
    
    // Ensure we have an array
    const outletsArray = Array.isArray(outletsData) ? outletsData : []
    setOutlets(outletsArray)
    
    if (outletsArray.length > 0) {
      setSelectedOutlet(outletsArray[0].id.toString())
    }
  } catch (error) {
    console.error('Error fetching outlets:', error)
    setOutlets([])
  } finally {
    setLoadingOutlets(false)
  }
}

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCustomerInfo(prev => ({ ...prev, [name]: value }))
  }

  const validateCheckout = () => {
    if (!customerInfo.name) return "Name is required"
    if (!customerInfo.mobile) return "Mobile number is required"
    if (orderType === "pickup" && !selectedOutlet) return "Please select an outlet"
    if (orderType === "delivery" && !customerInfo.address) return "Delivery address is required"
    return null
  }

  const handlePlaceOrder = async () => {
  const validationError = validateCheckout()
  if (validationError) {
    alert(validationError)
    return
  }

  setLoading(true)
  try {
    // Calculate total from cart items
    const totalAmount = getCartTotal()
    
    // Format items for the order
    const orderItems = cartItems.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: item.price,
      productName: item.name
    }))

    const orderData = {
      total: totalAmount, // Make sure this is included
      items: orderItems,
      orderType,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email || null,
      customerMobile: customerInfo.mobile,
      notes: customerInfo.notes || null,
      status: "pending"
    }

    // Add conditional fields based on order type
    if (orderType === "pickup") {
      orderData.outletId = parseInt(selectedOutlet)
    } else {
      orderData.deliveryAddress = customerInfo.address
    }

    console.log('Sending order data:', orderData) // Debug log

    const response = await api.createOrder(orderData)
    
    // Clear cart and close drawer
    clearCart()
    setIsCartOpen(false)
    
    // Redirect to order confirmation page
    router.push(`/order-confirmation/${response.id}`)
    
  } catch (error) {
    console.error('Error placing order:', error)
    alert('Failed to place order. Please try again.')
  } finally {
    setLoading(false)
  }
}

  const cartTotal = getCartTotal()
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  return (
    <Drawer open={isCartOpen} onOpenChange={setIsCartOpen} direction="right">
      <DrawerContent className="h-full w-full sm:w-[500px]">
        <div className="flex h-full flex-col">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <DrawerTitle>Your Cart ({itemCount} items)</DrawerTitle>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription>
              {step === 1 ? "Review your items" : "Complete your order"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {step === 1 ? (
              // Cart Items View
              cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12">
                  <ShoppingBag className="h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-500">Your cart is empty</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-lg border p-3">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        <Image
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-500">Unit: {item.unit || 'N/A'}</p>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-semibold">
                            ৳{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Checkout Form View
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Customer Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={customerInfo.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      value={customerInfo.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter your mobile number"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Order Type</h3>
                  
                  <RadioGroup value={orderType} onValueChange={setOrderType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup">Pickup from Outlet</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery">Home Delivery</Label>
                    </div>
                  </RadioGroup>

                  {orderType === "pickup" ? (
                    <div className="space-y-2">
                      <Label htmlFor="outlet">Select Outlet *</Label>
                      <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an outlet" />
                        </SelectTrigger>
                        <SelectContent>
                          {outlets.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id.toString()}>
                              {outlet.name} - {outlet.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="address">Delivery Address *</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={customerInfo.address}
                        onChange={handleInputChange}
                        placeholder="Enter your full delivery address"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={customerInfo.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions?"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="border-t">
            {cartItems.length > 0 && (
              <>
                <div className="mb-4 flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>৳{cartTotal.toFixed(2)}</span>
                </div>

                {step === 1 ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => setStep(2)}
                    >
                      Proceed to Checkout
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Continue Shopping</Button>
                    </DrawerClose>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handlePlaceOrder}
                      disabled={loading}
                    >
                      {loading ? "Placing Order..." : "Place Order"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      Back to Cart
                    </Button>
                  </div>
                )}
              </>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}