// Backup of the previous CRM prototype for future development.
export default function CRMPrototypeBackup() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          The Financial <span>Reset</span>
        </div>
        <div style={{ marginTop: 32 }}>
          <a>Overview</a>
          <a>Leads</a>
          <a>Clients</a>
          <a>Tasks</a>
          <a>Payments</a>
          <a>Resources</a>
        </div>
      </aside>
      <main className="main">
        <div className="eyebrow">Internal CRM prototype</div>
        <h1 style={{ fontSize: '3rem' }}>Client Pipeline</h1>
        <div className="stats">
          <div className="stat">
            <span>New leads</span>
            <strong>12</strong>
          </div>
          <div className="stat">
            <span>Active clients</span>
            <strong>28</strong>
          </div>
          <div className="stat">
            <span>Follow-ups due</span>
            <strong>7</strong>
          </div>
          <div className="stat">
            <span>Monthly revenue</span>
            <strong>$4,850</strong>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 20 }}>
          <h3>Recent clients</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Status</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Jordan M.</td>
                <td>Personal Credit</td>
                <td><span className="badge">Active</span></td>
                <td>Review roadmap</td>
              </tr>
              <tr>
                <td>Taylor R.</td>
                <td>Business Credit</td>
                <td><span className="badge">Active</span></td>
                <td>Upload documents</td>
              </tr>
              <tr>
                <td>Chris D.</td>
                <td>Wellness Coaching</td>
                <td><span className="badge">New lead</span></td>
                <td>Schedule consultation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
