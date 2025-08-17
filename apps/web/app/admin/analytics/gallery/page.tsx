"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PreviewGalleryItem {
  previewId: string;
  imageUrl: string;
  metadata: {
    style: string;
    model: string;
    generationTime: number;
    cost: number;
    prompt: string;
    createdAt: string;
    aspectRatio: string;
  };
}

interface GalleryResponse {
  items: PreviewGalleryItem[];
  total: number;
}

export default function PreviewGalleryPage() {
  const [gallery, setGallery] = useState<GalleryResponse>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<PreviewGalleryItem | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchGallery();
  }, [page, selectedStyle, selectedModel, search]);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(selectedStyle && { style: selectedStyle }),
        ...(selectedModel && { model: selectedModel }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/analytics/previews/gallery?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setGallery(data.gallery);
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGallery();
  };

  const totalPages = Math.ceil(gallery.total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preview Gallery</h1>
          <p className="mt-1 text-sm text-gray-600">
            Browse all generated preview images with metadata
          </p>
        </div>
        <Link
          href="/admin/analytics/previews"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Analytics
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Prompts
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in prompts..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Styles</option>
                <option value="watercolor">Watercolor</option>
                <option value="impressionist">Impressionist</option>
                <option value="storybook">Storybook</option>
                <option value="pencil_ink">Pencil & Ink</option>
                <option value="oil_painting">Oil Painting</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Models</option>
                <option value="flux-schnell">Flux Schnell</option>
                <option value="flux-dev">Flux Dev</option>
                <option value="sdxl">SDXL</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Showing {gallery.items.length} of {gallery.total} previews
          {(selectedStyle || selectedModel || search) && ' (filtered)'}
        </p>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-64 bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : gallery.items.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No previews found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gallery.items.map((item) => (
            <div
              key={item.previewId}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedImage(item)}
            >
              <div className="relative">
                <img
                  src={item.imageUrl}
                  alt={`Preview ${item.previewId}`}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {item.metadata.style}
                  </span>
                  <span className="bg-blue-500 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {item.metadata.model}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="bg-green-500 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    ${item.metadata.cost.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {item.metadata.prompt.substring(0, 100)}...
                </p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{item.metadata.generationTime.toFixed(1)}s</span>
                  <span>{new Date(item.metadata.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Preview Details</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedImage.imageUrl}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Preview ID</h4>
                    <p className="text-sm font-mono text-gray-600">{selectedImage.previewId}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Prompt</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedImage.metadata.prompt}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Style</h4>
                      <p className="text-sm text-gray-600 capitalize">{selectedImage.metadata.style}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Model</h4>
                      <p className="text-sm text-gray-600">{selectedImage.metadata.model}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Generation Time</h4>
                      <p className="text-sm text-gray-600">{selectedImage.metadata.generationTime.toFixed(1)}s</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Cost</h4>
                      <p className="text-sm text-gray-600">${selectedImage.metadata.cost.toFixed(3)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Aspect Ratio</h4>
                      <p className="text-sm text-gray-600">{selectedImage.metadata.aspectRatio}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Created</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedImage.metadata.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}