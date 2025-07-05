import React, { useState, memo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Package,
  Palette,
  Tag,
  Loader2,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import type { Category } from '../../types';

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSave: (categoryData: Partial<Category>) => void;
  isLoading?: boolean;
}

const CategoryModal = memo(({ category, onClose, onSave, isLoading = false }: CategoryModalProps) => {
  const isEditing = !!category;
  
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#2563eb',
    icon: category?.icon || 'Package',
    is_active: category?.is_active ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const iconOptions = [
    'Package', 'Stethoscope', 'Scissors', 'Pill', 'TestTube', 
    'Heart', 'AlertTriangle', 'Trash2', 'Shield', 'Wrench'
  ];

  const colorOptions = [
    '#2563eb', '#dc2626', '#059669', '#7c2d12', '#0d9488',
    '#ea580c', '#7c3aed', '#be185d', '#1f2937', '#374151'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Category' : 'Add New Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter category name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter category description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleInputChange('color', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <select
              value={formData.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active Category
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Update Category' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

CategoryModal.displayName = 'CategoryModal';

const CategoriesSection = memo(() => {
  const { categories, createCategory, updateCategory, deleteCategory, isCreatingCategory, isUpdatingCategory, isDeletingCategory } = useInventory();
  const { canManageInventory } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleNewCategory = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      try {
        deleteCategory(category.id);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete category');
      }
    }
  };

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      if (selectedCategory) {
        updateCategory({ id: selectedCategory.id, updates: categoryData });
      } else {
        createCategory(categoryData as Omit<Category, 'id' | 'created_at' | 'updated_at'>);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Package, 
      Stethoscope: Package, // Fallback since Stethoscope might not be available
      Scissors: Edit, 
      Pill: Package, 
      TestTube: Package, 
      Heart: Package, 
      AlertTriangle, 
      Trash2, 
      Shield, 
      Wrench: Package
    };
    const IconComponent = iconMap[iconName] || Package;
    return IconComponent;
  };

  if (!canManageInventory) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">You don't have permission to manage categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Categories Management</h3>
          <p className="text-sm text-gray-600">Organize your inventory with custom categories</p>
        </div>
        <button
          onClick={handleNewCategory}
          disabled={isCreatingCategory}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          
          return (
            <div
              key={category.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: category.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-500">{category.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditCategory(category)}
                    disabled={isUpdatingCategory}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    title="Edit Category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    disabled={isDeletingCategory}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories</h3>
          <p className="text-gray-500 mb-4">Create your first category to organize inventory items.</p>
          <button
            onClick={handleNewCategory}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Category</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CategoryModal
          category={selectedCategory}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCategory}
          isLoading={isCreatingCategory || isUpdatingCategory}
        />
      )}
    </div>
  );
});

CategoriesSection.displayName = 'CategoriesSection';

export default CategoriesSection;