import React, { useState, memo } from 'react';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Smartphone,
  Globe,
  Palette,
  Clock,
  AlertTriangle,
  CheckCircle,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CategoriesSection from './CategoriesSection';

const SettingsPage = memo(() => {
  const [activeTab, setActiveTab] = useState('categories');
  const [settings, setSettings] = useState({
    // General Settings
    systemName: 'MedInventory',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    language: 'en',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    maintenanceReminders: true,
    overdueAlerts: true,
    alertThreshold: 10,
    
    // Security Settings
    sessionTimeout: 30,
    passwordExpiry: 90,
    twoFactorAuth: false,
    loginAttempts: 5,
    
    // Inventory Settings
    autoReorderEnabled: false,
    defaultReorderQuantity: 50,
    lowStockThreshold: 20,
    criticalStockThreshold: 5,
    
    // Email Settings
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: 'noreply@medcenter.com',
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // Simulate saving settings
    toast.success('Settings saved successfully!');
  };

  const tabs = [
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'inventory', label: 'Inventory', icon: Database },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'backup', label: 'Backup', icon: Database }
  ];

  const renderCategoriesSettings = () => <CategoriesSection />;

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Name
            </label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => handleSettingChange('systemName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleSettingChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-500">Receive notifications via email</div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">SMS Notifications</div>
              <div className="text-sm text-gray-500">Receive notifications via SMS</div>
            </div>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Low Stock Alerts</div>
              <div className="text-sm text-gray-500">Get notified when items are running low</div>
            </div>
            <input
              type="checkbox"
              checked={settings.lowStockAlerts}
              onChange={(e) => handleSettingChange('lowStockAlerts', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Maintenance Reminders</div>
              <div className="text-sm text-gray-500">Reminders for scheduled maintenance</div>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceReminders}
              onChange={(e) => handleSettingChange('maintenanceReminders', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Overdue Alerts</div>
              <div className="text-sm text-gray-500">Alerts for overdue items</div>
            </div>
            <input
              type="checkbox"
              checked={settings.overdueAlerts}
              onChange={(e) => handleSettingChange('overdueAlerts', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Expiry (days)
            </label>
            <input
              type="number"
              value={settings.passwordExpiry}
              onChange={(e) => handleSettingChange('passwordExpiry', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Login Attempts
            </label>
            <input
              type="number"
              value={settings.loginAttempts}
              onChange={(e) => handleSettingChange('loginAttempts', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="twoFactorAuth"
              checked={settings.twoFactorAuth}
              onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="twoFactorAuth" className="ml-2 text-sm text-gray-700">
              Enable Two-Factor Authentication
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventorySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Stock Threshold (%)
            </label>
            <input
              type="number"
              value={settings.lowStockThreshold}
              onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Critical Stock Threshold (%)
            </label>
            <input
              type="number"
              value={settings.criticalStockThreshold}
              onChange={(e) => handleSettingChange('criticalStockThreshold', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Reorder Quantity
            </label>
            <input
              type="number"
              value={settings.defaultReorderQuantity}
              onChange={(e) => handleSettingChange('defaultReorderQuantity', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoReorder"
              checked={settings.autoReorderEnabled}
              onChange={(e) => handleSettingChange('autoReorderEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoReorder" className="ml-2 text-sm text-gray-700">
              Enable Auto-Reorder
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Server
            </label>
            <input
              type="text"
              value={settings.smtpServer}
              onChange={(e) => handleSettingChange('smtpServer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Port
            </label>
            <input
              type="number"
              value={settings.smtpPort}
              onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={settings.smtpUsername}
              onChange={(e) => handleSettingChange('smtpUsername', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={settings.smtpPassword}
              onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email Address
            </label>
            <input
              type="email"
              value={settings.fromEmail}
              onChange={(e) => handleSettingChange('fromEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Frequency
            </label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retention Period (days)
            </label>
            <input
              type="number"
              value={settings.retentionDays}
              onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoBackup"
              checked={settings.autoBackup}
              onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoBackup" className="ml-2 text-sm text-gray-700">
              Enable Automatic Backups
            </label>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Database className="w-4 h-4" />
            <span>Create Backup Now</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'categories': 
          return renderCategoriesSettings();
        case 'general': 
          return renderGeneralSettings();
        case 'notifications': 
          return renderNotificationSettings();
        case 'security': 
          return renderSecuritySettings();
        case 'inventory': 
          return renderInventorySettings();
        case 'email': 
          return renderEmailSettings();
        case 'backup': 
          return renderBackupSettings();
        default: 
          return renderCategoriesSettings();
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Settings</h3>
          <p className="text-gray-500">Please try refreshing the page or contact support.</p>
        </div>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system preferences and options</p>
        </div>
        {activeTab !== 'categories' && (
          <button
            onClick={handleSaveSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;