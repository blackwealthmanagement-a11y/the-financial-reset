type SendEmailButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
};

export function SendEmailButton({ disabled = false, loading = false, onClick }: SendEmailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        border: 'none',
        borderRadius: 999,
        padding: '10px 16px',
        background: disabled ? '#D9D5CD' : '#0B1F33',
        color: '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700
      }}
    >
      {loading ? 'Sending…' : 'Send email'}
    </button>
  );
}
