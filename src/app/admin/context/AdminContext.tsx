'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface AdminContextType {
  isPending: boolean;
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
  executeMutation: <T>(
    apiPath: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body: any,
    onSuccess?: () => void,
    successMessage?: string
  ) => Promise<T | void>;
  
  // Specific handlers
  handleDelete: (type: 'subject' | 'lesson' | 'item', id: string, name: string) => Promise<void>;
  handleRename: (type: 'subject' | 'lesson' | 'item', id: string, oldName: string) => Promise<void>;
  handleMove: (type: 'lesson' | 'item', id: string, name: string) => Promise<void>;
  handleBatchDelete: (ids: string[]) => Promise<void>;
  handleCreateSubject: () => Promise<void>;
  handleCreateLesson: (subjectId: string) => Promise<void>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children, refreshPageData }: { children: React.ReactNode; refreshPageData: () => Promise<void> }) {
  const [isPending, setIsPending] = useState(false);

  // Reusable mutation hook logic
  const executeMutation = useCallback(async <T,>(
    apiPath: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body: any,
    onSuccess?: () => void,
    successMessage?: string
  ): Promise<T | void> => {
    try {
      setIsPending(true);
      const res = await fetch(apiPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        // Task 3: Improve Error Handling - specifically parse HTTP status and message
        const errorMessage = data.error || `HTTP ${res.status}: ${res.statusText}`;
        logger.error(`[AdminMutation] Failed on ${apiPath}`, { status: res.status, error: errorMessage });
        alert(`Operation Failed: ${errorMessage}`);
        return;
      }
      
      if (successMessage) alert(successMessage);
      if (onSuccess) onSuccess();
      await refreshPageData();
      return data as T;
    } catch (err: unknown) {
      logger.error('[AdminMutation] Network or System Error', { error: err });
      alert(`Network Error: ${err instanceof Error ? err.message : 'Unknown connection issue'}`);
    } finally {
      setIsPending(false);
    }
  }, [refreshPageData]);

  // Specific Actions
  const handleDelete = async (type: 'subject' | 'lesson' | 'item', id: string, name: string) => {
    if (!confirm(`Permanently delete ${type} "${name}"?`)) return;
    await executeMutation('/api/admin/delete', 'POST', { type, id });
  };

  const handleRename = async (type: 'subject' | 'lesson' | 'item', id: string, oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    await executeMutation('/api/admin/rename', 'POST', { type, id, title: newName });
  };

  const handleMove = async (type: 'lesson' | 'item', id: string, name: string) => {
    const targetType = type === 'item' ? 'Module' : 'Subject';
    const targetId = prompt(`Enter ID of target ${targetType} to move "${name}" to:`);
    if (!targetId) return;
    await executeMutation('/api/admin/move', 'POST', { type, id, targetId });
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} selected items?`)) return;
    await executeMutation('/api/admin/batch-delete', 'POST', { ids });
  };

  const handleCreateSubject = async () => {
    const title = prompt('New Subject Title:');
    if (!title) return;
    await executeMutation('/api/admin/subjects', 'POST', { title, icon: '📂' });
  };

  const handleCreateLesson = async (subjectId: string) => {
    const title = prompt('New Module Title:');
    if (!title || !subjectId) return;
    await executeMutation('/api/admin/lessons', 'POST', { subjectId, title });
  };

  return (
    <AdminContext.Provider value={{
      isPending,
      setIsPending,
      executeMutation,
      handleDelete,
      handleRename,
      handleMove,
      handleBatchDelete,
      handleCreateSubject,
      handleCreateLesson
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
