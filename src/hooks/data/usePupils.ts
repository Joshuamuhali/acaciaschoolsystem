import { useState, useEffect, useCallback } from 'react';
import { Pupil } from '@/services/datasource/types';
import { dataSourceManager } from '@/services/datasource';

interface UsePupilsOptions {
  gradeId?: string;
  autoFetch?: boolean;
}

interface UsePupilsReturn {
  pupils: Pupil[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createPupil: (pupil: Omit<Pupil, 'id' | 'created_at' | 'grades'>) => Promise<Pupil>;
  updatePupil: (id: string, updates: Partial<Pupil>) => Promise<Pupil>;
  deletePupil: (id: string) => Promise<boolean>;
}

export function usePupils(options: UsePupilsOptions = {}): UsePupilsReturn {
  const { gradeId, autoFetch = true } = options;
  
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPupils = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await dataSourceManager.getPupils(gradeId);
      setPupils(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pupils';
      setError(errorMessage);
      console.error('Failed to fetch pupils:', err);
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  const reload = useCallback(async () => {
    await fetchPupils();
  }, [fetchPupils]);

  const createPupil = useCallback(async (pupil: Omit<Pupil, 'id' | 'created_at' | 'grades'>) => {
    try {
      const newPupil = await dataSourceManager.createPupil(pupil);
      setPupils(prev => [...prev, newPupil]);
      return newPupil;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pupil';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updatePupil = useCallback(async (id: string, updates: Partial<Pupil>) => {
    try {
      const updatedPupil = await dataSourceManager.updatePupil(id, updates);
      setPupils(prev => prev.map(p => p.id === id ? updatedPupil : p));
      return updatedPupil;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update pupil';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deletePupil = useCallback(async (id: string) => {
    try {
      await dataSourceManager.deletePupil(id);
      setPupils(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete pupil';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchPupils();
    }
  }, [autoFetch, fetchPupils]);

  return {
    pupils,
    loading,
    error,
    reload,
    createPupil,
    updatePupil,
    deletePupil,
  };
}

export function usePupil(id: string) {
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPupil = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await dataSourceManager.getPupil(id);
      setPupil(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pupil';
      setError(errorMessage);
      console.error('Failed to fetch pupil:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reload = useCallback(async () => {
    await fetchPupil();
  }, [fetchPupil]);

  useEffect(() => {
    fetchPupil();
  }, [fetchPupil]);

  return {
    pupil,
    loading,
    error,
    reload,
  };
}
