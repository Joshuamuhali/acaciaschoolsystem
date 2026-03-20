import { supabase } from "@/lib/supabase";

export interface Parent {
  id: string;
  parent_code: string;
  full_name: string;
  phone: string;
  email?: string;
  nrc?: string;
  address?: string;
  occupation?: string;
  emergency_contact?: string;
  relationship_to_pupil: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentWithPupils extends Parent {
  pupils: Array<{
    id: string;
    full_name: string;
    grade_id: string;
    grade_name?: string;
    relationship_type: string;
    is_primary_contact: boolean;
  }>;
  pupils_count: number;
}

// Get all parents with their pupils
export const getParents = async (): Promise<ParentWithPupils[]> => {
  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .order('full_name');

  if (parentError) throw parentError;

  // Get pupils for each parent
  const parentsWithPupils: ParentWithPupils[] = [];
  
  for (const parent of parents || []) {
    const { data: pupils, error: pupilError } = await supabase
      .from('pupils')
      .select('id, full_name, grade_id')
      .eq('parent_id', parent.id);
    
    if (pupilError) {
      console.error('Error fetching pupils for parent:', pupilError);
      continue;
    }

    parentsWithPupils.push({
      id: parent.id,
      parent_code: parent.id.toString(), // Use ID as code since no code field
      full_name: parent.full_name,
      phone: parent.phone,
      email: '',
      nrc: '',
      address: '',
      occupation: '',
      emergency_contact: '',
      relationship_to_pupil: 'Parent',
      is_active: true,
      created_at: '',
      updated_at: '',
      pupils: (pupils || []).map(p => ({
        id: p.id?.toString() || '',
        full_name: p.full_name || '',
        grade_id: p.grade_id?.toString() || '',
        grade_name: '',
        relationship_type: 'Parent',
        is_primary_contact: true
      })),
      pupils_count: pupils?.length || 0
    });
  }

  return parentsWithPupils;
};

// Get a single parent by ID
export const getParentById = async (id: string): Promise<Parent | null> => {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Create a new parent
export const createParent = async (parent: Omit<Parent, 'id' | 'parent_code' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .insert([parent])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a parent
export const updateParent = async (id: string, updates: Partial<Parent>): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a parent (soft delete by setting is_active to false)
export const deleteParent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('parents')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
};

// Hard delete a parent (permanently remove)
export const hardDeleteParent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('parents')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Link a parent to a pupil
export const linkParentToPupil = async (
  parentId: string, 
  pupilId: string, 
  relationshipType: string = 'Parent',
  isPrimaryContact: boolean = false
): Promise<void> => {
  const { error } = await supabase
    .from('pupil_parent_relationships')
    .insert({
      pupil_id: pupilId,
      parent_id: parentId,
      relationship_type: relationshipType,
      is_primary_contact: isPrimaryContact
    });

  if (error) throw error;
};

// Unlink a parent from a pupil
export const unlinkParentFromPupil = async (parentId: string, pupilId: string): Promise<void> => {
  const { error } = await supabase
    .from('pupil_parent_relationships')
    .delete()
    .eq('parent_id', parentId)
    .eq('pupil_id', pupilId);

  if (error) throw error;
};

// Get parents for a specific pupil
export const getParentsForPupil = async (pupilId: string): Promise<ParentWithPupils[]> => {
  const { data: pupil, error: pupilError } = await supabase
    .from('pupils')
    .select('parent_id')
    .eq('id', pupilId)
    .single();

  if (pupilError || !pupil?.parent_id) return [];

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .eq('id', pupil.parent_id)
    .single();

  if (parentError || !parent) return [];

  return [{
    id: parent.id,
    parent_code: parent.id.toString(),
    full_name: parent.full_name,
    phone: parent.phone,
    email: '',
    nrc: '',
    address: '',
    occupation: '',
    emergency_contact: '',
    relationship_to_pupil: 'Parent',
    is_active: true,
    created_at: '',
    updated_at: '',
    pupils: [{
      id: pupilId,
      full_name: '',
      grade_id: '',
      grade_name: '',
      relationship_type: 'Parent',
      is_primary_contact: true
    }],
    pupils_count: 1
  }];
};

// Search parents by name or phone
export const searchParents = async (query: string): Promise<ParentWithPupils[]> => {
  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('full_name');

  if (parentError) throw parentError;

  // Get pupils for each parent
  const parentsWithPupils: ParentWithPupils[] = [];
  
  for (const parent of parents || []) {
    const { data: pupils, error: pupilError } = await supabase
      .from('pupils')
      .select('id, full_name, grade_id')
      .eq('parent_id', parent.id);
    
    if (pupilError) {
      console.error('Error fetching pupils for parent:', pupilError);
      continue;
    }

    parentsWithPupils.push({
      id: parent.id,
      parent_code: parent.id.toString(),
      full_name: parent.full_name,
      phone: parent.phone,
      email: '',
      nrc: '',
      address: '',
      occupation: '',
      emergency_contact: '',
      relationship_to_pupil: 'Parent',
      is_active: true,
      created_at: '',
      updated_at: '',
      pupils: (pupils || []).map(p => ({
        id: p.id?.toString() || '',
        full_name: p.full_name || '',
        grade_id: p.grade_id?.toString() || '',
        grade_name: '',
        relationship_type: 'Parent',
        is_primary_contact: true
      })),
      pupils_count: pupils?.length || 0
    });
  }

  return parentsWithPupils;
};
