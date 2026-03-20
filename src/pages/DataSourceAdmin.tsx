import React from 'react';

const DataSourceAdmin: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Data Source Management</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Excel Mode</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Reads directly from Excel file</li>
              <li>• Perfect for schools using Excel</li>
              <li>• Read-only access</li>
              <li>• No database setup required</li>
              <li>• Automatic Term 1 2026 filtering</li>
            </ul>
          </div>
          
          <div className="p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Supabase Mode</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Full database operations</li>
              <li>• Create, read, update, delete</li>
              <li>• Multi-user support</li>
              <li>• Real-time synchronization</li>
              <li>• Cloud backup & security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSourceAdmin;
