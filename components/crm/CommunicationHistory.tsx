type CommunicationRecord = {
  id: string;
  subject: string;
  recipient: string;
  delivery_status: string;
  sent_at: string | null;
};

type CommunicationHistoryProps = {
  history: CommunicationRecord[];
};

export function CommunicationHistory({ history }: CommunicationHistoryProps) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <strong>Communication history</strong>
      {history.length === 0 ? (
        <div style={{ border: '1px dashed #E8E1D4', borderRadius: 12, padding: 16, color: '#5F6D7A' }}>
          No emails have been sent yet.
        </div>
      ) : (
        history.map((item) => (
          <div key={item.id} style={{ border: '1px solid #E8E1D4', borderRadius: 12, padding: 12, background: '#ffffff' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.subject}</div>
            <div style={{ fontSize: 13, color: '#5F6D7A', marginBottom: 4 }}>To: {item.recipient}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#0B1F33' }}>{item.delivery_status}</span>
              <span style={{ fontSize: 12, color: '#5F6D7A' }}>{item.sent_at ? new Date(item.sent_at).toLocaleString() : 'Pending'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
