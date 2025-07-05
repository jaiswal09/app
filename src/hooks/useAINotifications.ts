import { useState, useEffect, useCallback } from 'react';
import { generateSmartNotifications } from '../lib/openai';
import { useInventory } from './useInventory';

interface AINotification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
  category: 'stock' | 'maintenance' | 'usage' | 'efficiency' | 'system';
  timestamp: string;
  dismissed: boolean;
}

export const useAINotifications = () => {
  const [notifications, setNotifications] = useState<AINotification[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  
  const { items, transactions, alerts } = useInventory();

  const generateNotifications = useCallback(async () => {
    if (isGenerating || items.length === 0) return;

    setIsGenerating(true);
    try {
      const result = await generateSmartNotifications(items, transactions, alerts);
      
      if (result.notifications) {
        const newNotifications = result.notifications.map((notif: any) => ({
          ...notif,
          timestamp: new Date().toISOString(),
          dismissed: false
        }));

        setNotifications(prev => {
          // Remove old notifications and add new ones
          const filtered = prev.filter(n => n.priority === 'high' && !n.dismissed);
          return [...filtered, ...newNotifications];
        });
        
        setLastGenerated(new Date());
      }
    } catch (error) {
      console.error('Failed to generate AI notifications:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [items, transactions, alerts, isGenerating]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, dismissed: true } : notif
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-generate notifications every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastGenerated || Date.now() - lastGenerated.getTime() > 30 * 60 * 1000) {
        generateNotifications();
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Generate initial notifications after data loads
    if (items.length > 0 && !lastGenerated) {
      setTimeout(generateNotifications, 2000);
    }

    return () => clearInterval(interval);
  }, [generateNotifications, items.length, lastGenerated]);

  const activeNotifications = notifications.filter(n => !n.dismissed);
  const highPriorityNotifications = activeNotifications.filter(n => n.priority === 'high');

  return {
    notifications: activeNotifications,
    highPriorityNotifications,
    isGenerating,
    lastGenerated,
    generateNotifications,
    dismissNotification,
    clearAllNotifications
  };
};