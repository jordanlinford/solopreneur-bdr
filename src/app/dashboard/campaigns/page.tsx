'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  prospects: number;
  sent: number;
  replies: number;
  meetings: number;
  createdDate: string;
  emailSubject: string;
  emailTemplate: string;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    emailSubject: '',
    emailTemplate: ''
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.emailSubject) {
      alert('Campaign name and email subject are required');
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      description: newCampaign.description,
      status: 'draft',
      prospects: 0,
      sent: 0,
      replies: 0,
      meetings: 0,
      createdDate: new Date().toISOString(),
      emailSubject: newCampaign.emailSubject,
      emailTemplate: newCampaign.emailTemplate
    };

    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', description: '', emailSubject: '', emailTemplate: '' });
    setShowCreateModal(false);
  };

  const updateCampaignStatus = (campaignId: string, newStatus: Campaign['status']) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === campaignId 
        ? { ...campaign, status: newStatus }
        : campaign
    ));
  };

  const deleteCampaign = (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
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

  const getResponseRate = (sent: number, replies: number) => {
    if (sent === 0) return '0%';
    return `${Math.round((replies / sent) * 100)}%`;
  };

  const sendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign? This will send emails to all prospects.')) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to send campaign');
      }

      const result = await response.json();
      alert(`Campaign sent successfully! ${result.sent} emails sent out of ${result.total} total.`);
      
      // Refresh campaigns to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your outreach campaigns and sequences.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Your Campaigns</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Create and manage your email outreach campaigns here.</p>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      {campaigns.length > 0 && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prospects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Replies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.prospects}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.sent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.replies}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getResponseRate(campaign.sent, campaign.replies)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(campaign.createdDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowDetailsModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => sendCampaign(campaign.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Send Campaign
                          </button>
                          <button
                            onClick={() => updateCampaignStatus(campaign.id, 'active')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Mark Active
                          </button>
                        </>
                      )}
                      {campaign.status === 'active' && (
                        <button
                          onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Pause
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => updateCampaignStatus(campaign.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
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
      )}

      {campaigns.length === 0 && (
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
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create New Campaign</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Campaign Name *</label>
                      <input
                        type="text"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Real Estate Agent Outreach"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                        rows={2}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Brief description of your campaign goals"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Subject *</label>
                      <input
                        type="text"
                        value={newCampaign.emailSubject}
                        onChange={(e) => setNewCampaign({...newCampaign, emailSubject: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Quick question about your real estate business"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Template</label>
                      <textarea
                        value={newCampaign.emailTemplate}
                        onChange={(e) => setNewCampaign({...newCampaign, emailTemplate: e.target.value})}
                        rows={6}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Hi [name],\n\nI noticed you're a real estate agent in [company]...\n\nBest regards,\n[sender_name]"
                      />
                                             <p className="mt-1 text-xs text-gray-500">
                         Use variables: [name], [company], [title], [sender_name]
                       </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCreateCampaign}
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                  >
                    Create Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewCampaign({ name: '', description: '', emailSubject: '', emailTemplate: '' });
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

      {/* Campaign Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {selectedCampaign.name}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedCampaign.status)}`}>
                        {selectedCampaign.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCampaign.description || 'No description'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Subject</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCampaign.emailSubject}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Template</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">{selectedCampaign.emailTemplate || 'No template'}</pre>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Prospects</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCampaign.prospects}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emails Sent</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCampaign.sent}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Replies</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCampaign.replies}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Response Rate</label>
                        <p className="mt-1 text-sm text-gray-900">{getResponseRate(selectedCampaign.sent, selectedCampaign.replies)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedCampaign.createdDate)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCampaign(null);
                    }}
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