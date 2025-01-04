import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';
import PTORequestForm from '../components/pto/PTORequestForm';
import PTORequestList from '../components/pto/PTORequestList';
import PTOReviewForm from '../components/pto/PTOReviewForm';
import { mockPTORequests } from '../lib/mockPTOData';
import type { PTORequest } from '../lib/types';
import toast from 'react-hot-toast';

export default function PTO() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(mockPTORequests);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PTORequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<PTORequest | null>(null);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const userRequests = isAdmin ? requests : requests.filter(r => r.userId === user?.id);

  const handleCreateRequest = (data: { startDate: string; endDate: string; reason: string }) => {
    const newRequest: PTORequest = {
      id: `pto-${Date.now()}`,
      userId: user?.id || '',
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    setRequests([newRequest, ...requests]);
    setShowRequestForm(false);
    toast.success('PTO request submitted successfully');
  };

  const handleEditRequest = (data: { startDate: string; endDate: string; reason: string }) => {
    if (!editingRequest) return;

    const updatedRequests = requests.map(req =>
      req.id === editingRequest.id
        ? {
            ...req,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason
          }
        : req
    );

    setRequests(updatedRequests);
    setEditingRequest(null);
    toast.success('PTO request updated successfully');
  };

  const handleReviewRequest = (data: { status: 'approved' | 'rejected'; notes: string }) => {
    if (!selectedRequest || !user) return;

    const updatedRequests = requests.map(req =>
      req.id === selectedRequest.id
        ? {
            ...req,
            status: data.status,
            notes: data.notes,
            reviewedBy: user.id,
            reviewedAt: new Date().toISOString()
          }
        : req
    );

    setRequests(updatedRequests);
    setSelectedRequest(null);
    toast.success(`PTO request ${data.status}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PTO Requests</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Manage team PTO requests' : 'Request and track your time off'}
          </p>
        </div>
        {!isAdmin && !editingRequest && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Request PTO
          </button>
        )}
      </div>

      {(showRequestForm || editingRequest) && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingRequest ? 'Edit PTO Request' : 'New PTO Request'}
          </h2>
          <PTORequestForm
            onSubmit={editingRequest ? handleEditRequest : handleCreateRequest}
            onCancel={() => {
              setShowRequestForm(false);
              setEditingRequest(null);
            }}
            initialData={editingRequest || undefined}
            isEdit={!!editingRequest}
          />
        </div>
      )}

      <PTORequestList
        requests={userRequests}
        onReview={setSelectedRequest}
        onEdit={setEditingRequest}
        isAdmin={isAdmin}
      />

      {selectedRequest && (
        <PTOReviewForm
          request={selectedRequest}
          onSubmit={handleReviewRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}