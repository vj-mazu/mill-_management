import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
`;

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
`;

const DateInput = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #e5e7eb;
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const SummaryTitle = styled.h2`
  color: #1f2937;
  margin: 0;
  font-size: 1.5rem;
`;

const DateDisplay = styled.div`
  color: #6b7280;
  font-size: 1.1rem;
  font-weight: 600;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
`;

const EntryRow = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  align-items: baseline;
`;

const Amount = styled.div`
  font-weight: 700;
  color: #000;
  font-size: 1rem;
  min-width: 80px;
  text-align: right;
`;

const Details = styled.div`
  color: #000;
  font-size: 1rem;
  flex: 1;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  margin-top: 2rem;
`;

const TotalLabel = styled.div`
  color: white;
  font-size: 1.3rem;
  font-weight: 700;
`;

const TotalAmount = styled.div`
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
  font-size: 1.1rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.1rem;
`;

const PendingSection = styled.div`
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const PendingTitle = styled.h3`
  color: #d97706;
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
`;

const PendingEntry = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PendingDetails = styled.div`
  flex: 1;
`;

const ApproveButton = styled.button`
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #059669;
    transform: translateY(-2px);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const BulkApproveButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  width: 100%;
  font-size: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const HamaliBook: React.FC = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [approving, setApproving] = useState<number | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  useEffect(() => {
    fetchSummary();
    if (user?.role === 'manager' || user?.role === 'admin') {
      fetchPendingEntries();
    }
  }, [selectedDate, user]);

  const fetchPendingEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch ALL pending entries, not just for selected date
      const response = await axios.get<{ entries: any[] }>(
        `/hamali-entries?status=pending&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching pending hamali entries:', error);
    }
  };

  const handleApprove = async (entryId: number) => {
    setApproving(entryId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/hamali-entries/${entryId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Hamali entry approved successfully!');
      fetchSummary();
      fetchPendingEntries();
    } catch (error: any) {
      console.error('Error approving hamali entry:', error);
      toast.error(error.response?.data?.error || 'Failed to approve hamali entry');
    } finally {
      setApproving(null);
    }
  };

  const handleBulkApprove = async () => {
    if (pendingEntries.length === 0) return;

    setBulkApproving(true);
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let failCount = 0;

      // Approve all entries one by one
      for (const entry of pendingEntries) {
        try {
          await axios.post(
            `/hamali-entries/${entry.id}/approve`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to approve entry ${entry.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} hamali ${successCount === 1 ? 'entry' : 'entries'} approved successfully!`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} ${failCount === 1 ? 'entry' : 'entries'} failed to approve`);
      }

      fetchSummary();
      fetchPendingEntries();
    } catch (error) {
      toast.error('Failed to approve hamali entries');
    } finally {
      setBulkApproving(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const dateStr = selectedDate;

      const response = await axios.get<{ summary: any }>(
        `/hamali-entries/summary/${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching hamali summary:', error);
      toast.error('Failed to fetch hamali summary');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  return (
    <Container>
      <Title>📖 Hamali Book Summary</Title>

      <FilterSection>
        <Label>Select Date:</Label>
        <DateInput
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {summary && summary.totalEntries > 0 && (
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            📄 Download PDF
          </button>
        )}
      </FilterSection>



      {/* Pending Approvals Section - Only for Manager/Admin */}
      {(user?.role === 'manager' || user?.role === 'admin') && pendingEntries.length > 0 && (
        <PendingSection>
          <PendingTitle>⚠️ Pending Approvals ({pendingEntries.length})</PendingTitle>
          {pendingEntries.map((entry: any) => (
            <PendingEntry key={entry.id}>
              <PendingDetails>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  ₹{entry.grandTotal.toFixed(0)} - {entry.arrival?.slNo || 'N/A'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  📅 {formatDate(entry.date)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {entry.hasLoadingHamali && `Loading: ${entry.loadingBags} bags × ₹${entry.loadingRate}`}
                  {entry.hasLoadingHamali && entry.hasUnloadingHamali && ' | '}
                  {entry.hasUnloadingHamali && `Unloading (${entry.unloadingType?.toUpperCase()}): ${entry.unloadingBags} bags × ₹${entry.unloadingRate}`}
                  {(entry.hasLoadingHamali || entry.hasUnloadingHamali) && entry.hasLooseTumbiddu && ' | '}
                  {entry.hasLooseTumbiddu && `Loose: ${entry.looseBags} bags × ₹${entry.looseRate}`}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Created by: {entry.creator?.username || 'Unknown'}
                </div>
              </PendingDetails>
              <ApproveButton
                onClick={() => handleApprove(entry.id)}
                disabled={approving === entry.id || bulkApproving}
              >
                {approving === entry.id ? '⏳' : '✓'} Approve
              </ApproveButton>
            </PendingEntry>
          ))}
          <BulkApproveButton
            onClick={handleBulkApprove}
            disabled={bulkApproving || pendingEntries.length === 0}
          >
            {bulkApproving ? '⏳ Approving All...' : `✓ Approve All (${pendingEntries.length})`}
          </BulkApproveButton>
        </PendingSection>
      )}

      {loading ? (
        <LoadingState>Loading hamali summary...</LoadingState>
      ) : !summary || summary.totalEntries === 0 ? (
        <EmptyState>
          <p>No approved hamali entries found for {formatDate(selectedDate)}</p>
          {pendingEntries.length > 0 && (
            <p style={{ color: '#f59e0b', fontWeight: '600' }}>
              {pendingEntries.length} pending approval{pendingEntries.length > 1 ? 's' : ''} above
            </p>
          )}
        </EmptyState>
      ) : (
        <SummaryCard>
          <SummaryHeader>
            <SummaryTitle>Hamali Book Summary</SummaryTitle>
            <DateDisplay>{formatDate(selectedDate)}</DateDisplay>
          </SummaryHeader>

          {/* Loading Hamali Section */}
          {summary.loadingEntries && summary.loadingEntries.length > 0 && (
            <Section>
              <SectionTitle>Loading Hamali:</SectionTitle>
              {summary.loadingEntries.map((entry: any, index: number) => (
                <EntryRow key={index}>
                  <Amount>${entry.amount.toFixed(0)}</Amount>
                  <Details>{entry.bags} Bags from {entry.sourceDestination}</Details>
                </EntryRow>
              ))}
            </Section>
          )}

          {/* Unloading Hamali Section */}
          {summary.unloadingEntries && summary.unloadingEntries.length > 0 && (
            <Section>
              <SectionTitle>Unloading Hamali:</SectionTitle>
              {summary.unloadingEntries.map((entry: any, index: number) => (
                <EntryRow key={index}>
                  <Amount>${entry.amount.toFixed(0)}</Amount>
                  <Details>{entry.bags} Bags from {entry.sourceDestination}</Details>
                </EntryRow>
              ))}
            </Section>
          )}

          {/* Loose Tumbiddu Section */}
          {summary.looseEntries && summary.looseEntries.length > 0 && (
            <Section>
              <SectionTitle>Loose Tumbiddu:</SectionTitle>
              {summary.looseEntries.map((entry: any, index: number) => (
                <EntryRow key={index}>
                  <Amount>${entry.amount.toFixed(0)}</Amount>
                  <Details>{entry.bags} Bags    {entry.sourceDestination}</Details>
                </EntryRow>
              ))}
            </Section>
          )}

          {/* Total */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #000' }}>
            <EntryRow>
              <Amount style={{ fontSize: '1.3rem' }}>${summary.grandTotal.toFixed(0)}</Amount>
              <Details style={{ fontSize: '1.1rem', fontWeight: '600' }}>Total</Details>
            </EntryRow>
          </div>
        </SummaryCard>
      )}
    </Container>
  );
};

export default HamaliBook;
