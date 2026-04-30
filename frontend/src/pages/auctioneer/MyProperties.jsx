import { useEffect, useState } from 'react';
import { getMyProperties } from '../../services/propertyService';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLE = {
  PENDING:  { background: '#fef3c7', color: '#92400e', label: '⏳ Pending Review' },
  APPROVED: { background: '#f0fdf4', color: '#16a34a', label: '✅ Approved' },
  REJECTED: { background: '#fef2f2', color: '#dc2626', label: '❌ Rejected' }
};

export default function MyProperties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    getMyProperties()
      .then(res => setProperties(res.data))
      .catch(() => setError('Failed to load your properties.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ── */}
        <div style={styles.topRow}>
          <button style={styles.backBtn}
            onClick={() => navigate('/auctioneer/dashboard')}>
            ← Back
          </button>
          <div>
            <h2 style={styles.title}>🏘️ My Properties</h2>
            <p style={styles.subtitle}>Track the status of your submitted properties</p>
          </div>
          <button style={styles.addBtn}
            onClick={() => navigate('/auctioneer/add-property')}>
            ➕ Add New
          </button>
        </div>

        {/* ── States ── */}
        {error   && <div style={styles.errBox}>{error}</div>}
        {loading && <div style={styles.center}>Loading...</div>}

        {!loading && properties.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
            <p style={{ color: '#64748b', fontSize: 16 }}>
              You haven't submitted any properties yet.
            </p>
            <button style={styles.addBtn}
              onClick={() => navigate('/auctioneer/add-property')}>
              ➕ Add Your First Property
            </button>
          </div>
        )}

        {/* ── Property Cards ── */}
        {properties.map(p => {
          const st = STATUS_STYLE[p.status] || STATUS_STYLE.PENDING;
          return (
            <div key={p.id} style={styles.card}>

              {/* Image */}
              <img
                src={`http://localhost:8081${p.imageUrl}`}
                alt={p.title}
                style={styles.img}
                onError={e => {
                  e.target.src = 'https://placehold.co/200x140?text=No+Image';
                }}
              />

              {/* Details */}
              <div style={styles.info}>
                <div style={styles.cardTop}>
                  <h3 style={styles.propTitle}>{p.title}</h3>
                  <span style={{ ...styles.badge, ...st }}>
                    {st.label}
                  </span>
                </div>

                <p style={styles.address}>📍 {p.address}</p>
                <p style={styles.desc}>
                  {p.description.length > 120
                    ? p.description.substring(0, 120) + '...'
                    : p.description}
                </p>

                <div style={styles.priceRow}>
                  <span style={styles.price}>
                    ₹{p.startingPrice.toLocaleString('en-IN')}
                  </span>
                  <span style={styles.date}>
                    Submitted: {new Date(p.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {/* Rejection reason */}
                {p.status === 'REJECTED' && p.rejectionReason && (
                  <div style={styles.rejectReason}>
                    ⚠️ <strong>Reason:</strong> {p.rejectionReason}
                  </div>
                )}

                {/* Document link */}
                {p.documentUrl && (
                  <a
                    href={`http://localhost:8081${p.documentUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.docLink}
                  >
                    📄 View Uploaded Document
                  </a>
                )}
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '32px 16px',
    fontFamily: "'Segoe UI', sans-serif"
  },
  container: {
    maxWidth: 900,
    margin: '0 auto'
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    padding: 0,
    marginTop: 6
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1e293b',
    margin: '0 0 4px'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0
  },
  addBtn: {
    padding: '10px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 20,
    alignItems: 'start'
  },
  img: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
    borderRadius: 12
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  propTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0
  },
  badge: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    margin: 0
  },
  desc: {
    fontSize: 14,
    color: '#475569',
    margin: 0,
    lineHeight: 1.5
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  price: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2563eb'
  },
  date: {
    fontSize: 12,
    color: '#94a3b8'
  },
  rejectReason: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 13,
    marginTop: 4
  },
  docLink: {
    fontSize: 13,
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
    marginTop: 4
  },
  errBox: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 14
  },
  center: {
    textAlign: 'center',
    padding: 60,
    color: '#64748b'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)'
  }
};