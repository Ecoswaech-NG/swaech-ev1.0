"use client";

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface Accessory {
  id: number;
  name: string;
  brand: string;
  type: string;
  location: string;
  price: number;
}

export default function AccessoriesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [items, setItems] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchAccessories() {
      setLoading(true);
      try {
        const res = await fetch('/api/accessories', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setItems(Array.isArray(data) ? data : []);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Error fetching accessories:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAccessories();
  }, []);

  // Safe filtering with type checking
  const filtered = typeFilter && typeFilter !== ''
    ? items.filter(item => item?.type === typeFilter)
    : items;

  // Early return for loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0e7ff]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0e7ff]">
      <Navbar />
     
      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-[#18122b] text-center tracking-tight">
          EV Accessories & Parts
        </h1>
        <p className="text-gray-500 mb-8 text-center max-w-2xl">
          Explore collection of EV accessories and spare parts. Find everything you need for your electric vehicle.
        </p>

        {/* Type Filter Buttons */}
        <div className="mb-8 flex gap-2 flex-wrap justify-center">
          <button 
            onClick={() => setTypeFilter('')} 
            className={`px-4 py-2 rounded-full font-medium shadow transition ${
              typeFilter === '' ? 'bg-[#340a77] text-white' : 'bg-white text-[#340a77] border border-[#340a77] hover:bg-[#ffb86c] hover:text-[#340a77]'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setTypeFilter('Cables')} 
            className={`px-4 py-2 rounded-full font-medium shadow transition ${
              typeFilter === 'Cables' ? 'bg-[#340a77] text-white' : 'bg-white text-[#340a77] border border-[#340a77] hover:bg-[#ffb86c] hover:text-[#340a77]'
            }`}
          >
            Charging Cables
          </button>
          <button 
            onClick={() => setTypeFilter('Adapters')} 
            className={`px-4 py-2 rounded-full font-medium shadow transition ${
              typeFilter === 'Adapters' ? 'bg-[#340a77] text-white' : 'bg-white text-[#340a77] border border-[#340a77] hover:bg-[#ffb86c] hover:text-[#340a77]'
            }`}
          >
            Adapters
          </button>
          <button 
            onClick={() => setTypeFilter('Spare Parts')} 
            className={`px-4 py-2 rounded-full font-medium shadow transition ${
              typeFilter === 'Spare Parts' ? 'bg-[#340a77] text-white' : 'bg-white text-[#340a77] border border-[#340a77] hover:bg-[#ffb86c] hover:text-[#340a77]'
            }`}
          >
            Spare Parts
          </button>
        </div>

        {/* Accessories Grid */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-20 text-lg font-medium">
                No accessories found in this category.
              </div>
            ) : (
              filtered.map(item => (
                <div
                  key={item.id}
                  className="transition-transform hover:-translate-y-1 cursor-pointer"
                  onClick={() => router.push(`/accessoriesMart/${item.id}`)}
                >
                  <div className="bg-white rounded-3xl shadow-lg p-5 flex flex-col h-full border border-[#e0e7ff] hover:border-[#ffb86c] transition">
                    <div className="relative w-full h-48 flex items-center justify-center bg-[#f3f4f6] rounded-2xl mb-4 overflow-hidden">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRya5KEtoBCh3T1XMezRRClZI-jvPDzLRhHg&s"
                        alt={item.name}
                        className="object-contain h-full w-full"
                        onError={(e) => { 
                          const img = e.target as HTMLImageElement;
                          img.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg text-[#18122b] mb-1">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{item.brand}</p>
                      <p className="text-gray-500 text-xs mb-2">📍 {item.location || 'Location N/A'}</p>
                      <p className="font-bold text-xl text-[#340a77] mb-2">
                        ₦{item.price.toLocaleString()}
                      </p>
                      <span className="text-xs text-gray-400 mt-auto">View Details</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
 