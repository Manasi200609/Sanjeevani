export default function PatientSectionHeader({
  eyebrow,
  title,
  action,
}) {
  return (
    <div className="p-section-header">
      <div>
        {eyebrow && (
          <div className="p-section-eyebrow">
            {eyebrow}
          </div>
        )}
        <h2 className="p-section-title">{title}</h2>
      </div>
      {action && <div>{action}</div>}

      <style>{`
        .p-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .p-section-eyebrow {
          color: #14B8A6;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.25px;
          margin-bottom: 4px;
        }

        .p-section-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #F0F4F8;
        }
      `}</style>
    </div>
  );
}
