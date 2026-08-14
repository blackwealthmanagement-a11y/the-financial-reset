type DashboardHeroProps = {
  clientName: string;
  welcomeMessage: string;
  programName: string;
  clientStatus: string;
  memberSince: string;
  progressPercent: number;
};

export function DashboardHero({
  clientName,
  welcomeMessage,
  programName,
  clientStatus,
  memberSince,
  progressPercent,
}: DashboardHeroProps) {
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 18
      ? "Good Afternoon"
      : "Good Evening";

  const displayName = /\S+@\S+\.\S+/.test(clientName.trim()) ? "there" : clientName;
  const safeProgress = Math.min(100, Math.max(0, Number(progressPercent) || 0));

  const detailItems = [
    { label: "Program", value: programName },
    { label: "Status", value: clientStatus },
    { label: "Member Since", value: memberSince },
  ];

  return (
    <section
      style={{
        background: "linear-gradient(135deg, rgba(11,31,51,0.96), rgba(22,52,79,0.96))",
        border: "1px solid rgba(201,161,74,0.35)",
        borderRadius: 20,
        padding: "18px 18px 16px",
        boxShadow: "0 12px 32px rgba(11, 31, 51, 0.10)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
        width: "100%",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.65rem",
            lineHeight: 1.2,
            letterSpacing: "-0.04em",
            color: "#F8F4ED",
            fontWeight: 700,
          }}
        >
          {greeting}, {displayName} 👋
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#D7BE7D",
            letterSpacing: "0.02em",
          }}
        >
          Welcome back to The Financial Reset.
        </p>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "0.9rem",
          lineHeight: 1.5,
          color: "rgba(248, 244, 237, 0.82)",
        }}
      >
        {welcomeMessage}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginTop: 2,
        }}
      >
        {detailItems.map((item) => (
          <div
            key={item.label}
            style={{
              background: "rgba(248, 244, 237, 0.08)",
              border: "1px solid rgba(201, 161, 74, 0.28)",
              borderRadius: 12,
              padding: "8px 10px",
              minHeight: 52,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#D7BE7D",
                marginBottom: 4,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#F8F4ED",
                lineHeight: 1.3,
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#D7BE7D",
            }}
          >
            Journey Progress
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#F8F4ED",
            }}
          >
            {safeProgress}%
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: 10,
            background: "rgba(248, 244, 237, 0.14)",
            borderRadius: 999,
            overflow: "hidden",
            border: "1px solid rgba(201, 161, 74, 0.18)",
          }}
        >
          <div
            style={{
              width: `${safeProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #C9A14A 0%, #E7C782 100%)",
              boxShadow: "0 0 14px rgba(201, 161, 74, 0.45)",
            }}
          />
        </div>
      </div>
    </section>
  );
}