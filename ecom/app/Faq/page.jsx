"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How far in advance should I place my order?",
    answer: "For standard orders, we recommend placing them at least 3-5 days in advance. For wedding cakes or large custom orders, we suggest booking 4-6 weeks ahead to ensure availability.",
  },
  {
    question: "What dietary restrictions do you accommodate?",
    answer: "We offer a wide range of options for various dietary needs including gluten-free, vegan, nut-free, and dairy-free desserts. Please let us know about any specific requirements when placing your order.",
  },
  {
    question: "Do you offer home delivery?",
    answer: "Yes, we deliver across most areas of Dhaka.",
  },
  {
    question: "Do you accept online orders?",
    answer: "Yes, orders can be placed online or by phone.",
  },
  {
    question: "Do you take custom cake orders?",
    answer: "Yes, custom cakes are available with advance booking.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "Bank, Cash, bKash, Nagad, and Rocket.",
  },
  {
    question: "How long does delivery take?",
    answer: "Usually within 13 hours after confirmation.",
  },
  {
    question: "Do you guarantee freshness?",
    answer: "Yes, all our products are fresh and hygienically prepared.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900">
            Frequently Asked Questions
          </h1>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-8 pb-16 md:pb-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white border border-gray-200 rounded-lg px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}