'use client';

import { useSession } from 'next-auth/react';
import { useState, useRef } from 'react';

interface Prospect {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: 'new' | 'contacted' | 'replied' | 'meeting_booked';
  addedDate: string;
}

export default function ProspectsPage() {
  const { data: session } = useSession();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProspect, setNewProspect] = useState({
    name: '',
    email: '',
    company: '',
    title: ''
  });

  const handleAddProspect = () => {
    if (!newProspect.name || !newProspect.email) {
      alert('Name and email are required');
      return;
    }

    const prospect: Prospect = {
      id: Date.now().toString(),
      name: newProspect.name,
      email: newProspect.email,
      company: newProspect.company,
      title: newProspect.title,
      status: 'new',
      addedDate: new Date().toISOString()
    };

    setProspects([...prospects, prospect]);
    setNewProspect({ name: '', email: '', company: '', title: '' });
    setShowAddModal(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Expected headers: name, email, company, title
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const companyIndex = headers.findIndex(h => h.includes('company'));
      const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('position'));

      if (nameIndex === -1 || emailIndex === -1) {
        alert('CSV must contain at least "name" and "email" columns');
        setIsImporting(false);
        return;
      }

      const newProspects: Prospect[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values[nameIndex] && values[emailIndex]) {
          newProspects.push({
            id: `${Date.now()}-${i}`,
            name: values[nameIndex],
            email: values[emailIndex],
            company: companyIndex !== -1 ? values[companyIndex] || '' : '',
            title: titleIndex !== -1 ? values[titleIndex] || '' : '',
            status: 'new',
            addedDate: new Date().toISOString()
          });
        }
      }

      setProspects([...prospects, ...newProspects]);
      setShowImportModal(false);
      alert(`Successfully imported ${newProspects.length} prospects`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      replied: 'bg-green-100 text-green-800',
      meeting_booked: 'bg-purple-100 text-purple-800'
    };
    
    return statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Prospects</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your prospect database and contact information.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Your Prospects</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Import and manage your prospect contacts here.</p>
          </div>
          <div className="mt-5 space-x-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Prospect
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setShowCRMModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Connect CRM
            </button>
          </div>
        </div>
      </div>

      {/* Prospects Table */}
      {prospects.length > 0 && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prospects.map((prospect) => (
                  <tr key={prospect.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prospect.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prospect.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prospect.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prospect.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(prospect.status)}`}>
                        {prospect.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(prospect.addedDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {prospects.length === 0 && (
        <div className="mt-8">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No prospects</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first prospect or importing a CSV file.</p>
          </div>
        </div>
      )}

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Prospect</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        value={newProspect.name}
                        onChange={(e) => setNewProspect({...newProspect, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email *</label>
                      <input
                        type="email"
                        value={newProspect.email}
                        onChange={(e) => setNewProspect({...newProspect, email: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <input
                        type="text"
                        value={newProspect.company}
                        onChange={(e) => setNewProspect({...newProspect, company: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Acme Inc"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={newProspect.title}
                        onChange={(e) => setNewProspect({...newProspect, title: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="CEO"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleAddProspect}
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                  >
                    Add Prospect
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewProspect({ name: '', email: '', company: '', title: '' });
                    }}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Import Prospects from CSV</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
                                             <input
                         ref={fileInputRef}
                         type="file"
                         accept=".csv"
                         onChange={handleFileUpload}
                         disabled={isImporting}
                         title="Upload CSV file"
                         className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                       />
                    </div>
                    <div className="bg-gray-50 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">CSV Format Requirements:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Required columns: <strong>name</strong>, <strong>email</strong></li>
                        <li>• Optional columns: <strong>company</strong>, <strong>title</strong></li>
                        <li>• First row should contain column headers</li>
                        <li>• Example: name,email,company,title</li>
                      </ul>
                    </div>
                    {isImporting && (
                      <div className="flex items-center justify-center py-4">
                        <svg className="animate-spin h-5 w-5 text-indigo-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-600">Importing prospects...</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    disabled={isImporting}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRM Integration Modal */}
      {showCRMModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Connect Your CRM</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* HubSpot */}
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">H</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">HubSpot</h4>
                            <p className="text-sm text-gray-500">Import contacts from HubSpot CRM</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full bg-orange-50 text-orange-700 px-3 py-2 rounded text-sm font-medium hover:bg-orange-100">
                          Connect HubSpot
                        </button>
                      </div>

                      {/* Salesforce */}
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">S</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">Salesforce</h4>
                            <p className="text-sm text-gray-500">Import leads from Salesforce</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100">
                          Connect Salesforce
                        </button>
                      </div>

                      {/* Pipedrive */}
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">P</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">Pipedrive</h4>
                            <p className="text-sm text-gray-500">Import persons from Pipedrive</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100">
                          Connect Pipedrive
                        </button>
                      </div>

                      {/* Airtable */}
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">A</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">Airtable</h4>
                            <p className="text-sm text-gray-500">Import records from Airtable base</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full bg-yellow-50 text-yellow-700 px-3 py-2 rounded text-sm font-medium hover:bg-yellow-100">
                          Connect Airtable
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            CRM Integration Benefits
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>Automatically sync prospects from your existing database</li>
                              <li>Keep prospect status updated in both systems</li>
                              <li>No manual data entry required</li>
                              <li>Real-time synchronization with webhooks</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCRMModal(false)}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 