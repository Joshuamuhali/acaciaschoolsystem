import React from 'react'
import { usePupils, useCreatePupil, useUpdatePupil, useDeletePupil } from '@/hooks/usePupils'
import { useGradeSummary } from '@/hooks/useBalance'
import { useGrades } from '@/hooks/useGrades'
import { PupilStatus } from '@/types/enums'
import { Database } from '@/types/supabase'

type Pupil = Database['public']['Tables']['pupils']['Row']
type Grade = Database['public']['Tables']['grades']['Row']

export default function PupilsPage() {
  const [statusFilter, setStatusFilter] = React.useState<PupilStatus | ''>('')
  const [gradeFilter, setGradeFilter] = React.useState<string>('')
  const [searchTerm, setSearchTerm] = React.useState<string>('')
  const [selectedPupil, setSelectedPupil] = React.useState<Pupil | null>(null)

  // Use typed hooks with fully typed data
  const { data: pupils, isLoading, error } = usePupils({
    status: statusFilter || undefined,
    gradeId: gradeFilter || undefined,
    search: searchTerm || undefined
  })

  const { data: grades } = useGrades()
  const { data: summary } = useGradeSummary()

  const createPupilMutation = useCreatePupil()
  const updatePupilMutation = useUpdatePupil()
  const deletePupilMutation = useDeletePupil()

  const handleCreatePupil = async (pupilData: Omit<Database['public']['Tables']['pupils']['Insert'], 'id'>) => {
    try {
      await createPupilMutation.mutateAsync(pupilData)
      // Success toast would be handled by mutation's onSuccess
    } catch (error) {
      console.error('Failed to create pupil:', error)
    }
  }

  const handleUpdatePupil = async (id: string, updates: Database['public']['Tables']['pupils']['Update']) => {
    try {
      await updatePupilMutation.mutateAsync({ id, updates })
    } catch (error) {
      console.error('Failed to update pupil:', error)
    }
  }

  const handleDeletePupil = async (id: string) => {
    if (confirm('Are you sure you want to delete this pupil?')) {
      try {
        await deletePupilMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete pupil:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading pupils...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading pupils: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Pupils Management</h1>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6 bg-white p-4 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PupilStatus)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="O">O</option>
              <option value="N">N</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Grade</label>
            <select 
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Grades</option>
              {grades?.map((grade: Grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pupils..."
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Total Pupils</h3>
              <p className="text-2xl font-bold text-blue-600">{summary.totalPupils}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Total Expected</h3>
              <p className="text-2xl font-bold text-green-600">
                {summary.totalExpected.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Total Collected</h3>
              <p className="text-2xl font-bold text-green-600">
                {summary.totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Collection Rate</h3>
              <p className="text-2xl font-bold text-purple-600">
                {summary.collectionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pupils Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pupils?.map((pupil: Pupil) => (
              <tr key={pupil.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {pupil.full_name}
                  </div>
                  {pupil.grades?.name && (
                    <div className="text-sm text-gray-500">
                      Grade: {pupil.grades.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pupil.status === 'active' ? 'bg-green-100 text-green-800' :
                    pupil.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pupil.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {pupil.parents?.full_name && `Parent: ${pupil.parents.full_name}`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedPupil(pupil)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePupil(pupil.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
