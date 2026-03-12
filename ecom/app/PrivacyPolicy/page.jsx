"use client"


export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="py-12 md:py-16 bg-white border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600">Dhaka Prime Sweets</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <p className="text-gray-600 mb-8 leading-relaxed">
              Dhaka Prime Sweets values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our website, mobile app, or place orders with us.
            </p>

            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                1. Information We Collect
              </h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>Personal Information:</strong> Name, phone number, email address, delivery address.
                </li>
                <li>
                  <strong>Order Information:</strong> Order details, payment method, transaction history.
                </li>
                <li>
                  <strong>Payment Information:</strong> Processed securely via third-party gateways (no card data stored).
                </li>
                <li>
                  <strong>Technical Information:</strong> IP address, device, browser type, and usage data.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Process and deliver orders</li>
                <li>Confirm orders and communicate updates</li>
                <li>Provide customer support</li>
                <li>Improve services and user experience</li>
                <li>Prevent fraud and unauthorized activity</li>
                <li>Comply with legal requirements</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                3. Sharing of Information
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We do not sell or rent your personal data. Information may be shared only with delivery partners, payment gateways, service providers under confidentiality, or legal authorities when required.
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                4. Data Security
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We use reasonable technical and organizational measures to protect your data. However, no online system can guarantee 100% security.
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                5. Data Retention
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your information is retained only as long as necessary to fulfill services, comply with legal obligations, and resolve disputes.
              </p>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                6. Cookies & Tracking
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We may use cookies to improve functionality and analyze usage. You can disable cookies in your browser settings, but some features may not work properly.
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                7. User Responsibilities
              </h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Provide accurate information</li>
                <li>Keep account credentials secure</li>
                <li>Fraudulent or abusive behavior may result in account suspension</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                8. Children's Privacy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Our services are not intended for users under 18 years of age. We do not knowingly collect data from minors.
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                9. Policy Updates
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Dhaka Prime Sweets may update this Privacy Policy at any time. Continued use of our services implies acceptance of any changes.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                10. Contact Us
              </h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions or concerns regarding this Privacy Policy, please contact our support team.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}