"use client"


export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="py-12 md:py-16 bg-white border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4">
            Terms & Conditions
          </h1>
          <p className="text-gray-600">Dhaka Prime Sweets Terms & Conditions</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                1. Service Use
              </h2>
              <p className="text-gray-600 leading-relaxed">
                By placing an order with Dhaka Prime Sweets, you agree to comply with these Terms & Conditions.
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                2. Orders & Confirmation
              </h2>
              <p className="text-gray-600 leading-relaxed">
                All orders are subject to product availability and confirmation by the merchant. Dhaka Prime Sweets reserves the right to accept or reject any order.
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                3. Pricing & Payment
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Prices may change without prior notice. Payments must be completed using the available online payment methods or cash-on-delivery where applicable.
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                4. Delivery
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Delivery times are estimates and may vary due to traffic, weather, or other operational factors. Delays do not guarantee refunds unless stated in our refund policy.
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                5. Cancellations & Refunds
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Order cancellations and refunds are governed by our Refund Policy. Please review it carefully before placing an order.
              </p>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                6. User Conduct
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Any abusive, fraudulent, or inappropriate behavior toward staff or delivery personnel may result in order cancellation or account restriction.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                7. Policy Changes
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Dhaka Prime Sweets reserves the right to modify these Terms & Conditions at any time. Continued use of our services implies acceptance of the updated terms.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}