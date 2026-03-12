"use client"
import Link from 'next/link';
import React from 'react';
import { Facebook, Instagram, Youtube, ArrowRight } from "lucide-react";

const usefulLinks = [
  { name: "About Us", href: "/AboutUs" },
  { name: "Contact", href: "/ContactPage" },
  { name: "FAQ", href: "Faq" },
  { name: "Privacy Policy", href: "/PrivacyPolicy" },
  { name: "Terms and Conditions", href: "/TermsAndConditions" },
];

const categories = [
  { name: "লাড্ডু", href: "/categories/Laddu" },
  { name: "ড্রাই", href: "/categories/DryItem" },
  { name: "দই", href: "/categories/Curd" },
  { name: "আদি মিষ্টি", href: "/categories/TraditionalSweets" },
  { name: "সন্দেশ", href: "/categories/Shondesh" },
  { name: "স্পেশাল মিষ্টি", href: "/categories/specialSweets" },
];

const outlets = [
  {
    name: "লিংক রোড",
    address: "বাড্ডা লিংক রোড, গুলশান, ঢাকা",
    image: "https://ext.same-assets.com/3310335706/1353419133.jpeg",
  },
  {
    name: "শান্তিনগর",
    address: "দোকান নং- ৪১, শান্তিনগর মসজিদ মার্কেট, পল্টন, ঢাকা",
    image: "https://ext.same-assets.com/3310335706/2343161758.jpeg",
  },
  {
    name: "কল্যাণপুর",
    address: "বিআরটিসি মার্কেট, কল্যাণপুর বাসস্ট্যান্ড, মিরপুর রোড, ঢাকা",
    image: "https://ext.same-assets.com/3310335706/2343161758.jpeg",
  },
];

const Footer = () => {
  return (
    <footer
      style={{
        position: 'relative',
        width: '100%',
        backgroundImage: 'url("/bg.png")',
        backgroundSize: '600px',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat-x',
        color: '#fff',
        marginTop: 'auto',
      }}
    >
      {/* Red tint overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(77, 4, 6, 0.95)',
          zIndex: 1,
        }}
      ></div>

      {/* Footer content - sits above the overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
        }}
      >
        {/* Social Links */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>Reach Us:</span>
            <a
              href="https://www.facebook.com/dhakaprimesweet"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s',
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C6A13B'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://www.instagram.com/dhakaprimesweets"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s',
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C6A13B'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://www.youtube.com/@dhakaprimesweetsltd6369"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s',
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C6A13B'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <Youtube size={20} />
            </a>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem',
        }}>
          {/* Useful Links */}
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', position: 'relative' }}>
              Useful Links
              <span style={{ position: 'absolute', bottom: '-8px', left: 0, width: '48px', height: '2px', backgroundColor: '#C6A13B' }} />
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0 0' }}>
              {usefulLinks.map((link) => (
                <li key={link.name} style={{ marginBottom: '0.75rem' }}>
                  <Link
                    href={link.href}
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'color 0.3s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#C6A13B'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                  >
                    <ArrowRight size={14} />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', position: 'relative' }}>
              Categories
              <span style={{ position: 'absolute', bottom: '-8px', left: 0, width: '48px', height: '2px', backgroundColor: '#C6A13B' }} />
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0 0' }}>
              {categories.map((category) => (
                <li key={category.name} style={{ marginBottom: '0.75rem' }}>
                  <Link
                    href={category.href}
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'color 0.3s',
                      fontFamily: 'var(--font-baloo), sans-serif',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#C6A13B'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                  >
                    <ArrowRight size={14} />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Outlets */}
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 600, position: 'relative' }}>
                Our Outlets
                <span style={{ position: 'absolute', bottom: '-8px', left: 0, width: '48px', height: '2px', backgroundColor: '#C6A13B' }} />
              </h4>
              <Link
                href="/AllOutlets"
                style={{
                  color: '#C6A13B',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#C6A13B'}
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              {outlets.map((outlet) => (
                <div key={outlet.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={outlet.image}
                      alt={outlet.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 'bold', fontFamily: 'var(--font-baloo), sans-serif', fontSize: '1.125rem', margin: 0 }}>{outlet.name}</h5>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontFamily: 'var(--font-baloo), sans-serif', margin: '0.25rem 0 0 0' }}>{outlet.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>
            &copy; 2026 Dhaka -Name- Sweets All Right Reserved | Developed by 
            <span style={{ color: '#C6A13B' }}> Kh salar hassan</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src="https://ext.same-assets.com/3310335706/853063867.png"
              alt="Payment Methods"
              style={{ height: '32px' }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;