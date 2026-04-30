import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPendingProperties,
  approveProperty,
  rejectProperty
} from '../../services/propertyService';

export default function VerifyProperties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState('');
  const [msgType, setMsgType]       = useState('success'); // 'success' | 'error'

  // Reject modal state
  const [rejectId, setRejectId]   = useState(null);
  const [reason, setReason]       = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await getPendingProperties();
      setProperties(res.data);
    } catch {
      showMsg('Failed to load properties.', 'error');
    }
    setLoading(false);
  };

  const showMsg = (text, type = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleApprove = async (id) => {
    try {
      await approveProperty(id);
      showMsg('✅ Property approved successfully!');
      fetchPending();
    } catch {
      showMsg('Approval failed. Try again.', 'error');
    }
  };

  const openRejectModal = (id) => {
    setRejectId(id);
    setReason('');
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }
    setRejecting(true);
    try {
      await rejectProperty(rejectId, reason);
      showMsg('Property rejected with reason sent to auctioneer.');
      setRejectId(null);
      fetchPending();
    } catch {
      showMsg('Rejection failed. Try again.', 'error');
    }
    setRejecting(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ── */}
        <div style={styles.topRow}>
          <button style={styles.backBtn}
            onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div>
            <h2 style={styles.title}>🔍 Verify Properties</h2>
            <p style={styles.subtitle}>
              Review and approve or reject auctioneer submissions
            </p>
          </div>
          <div style={styles.countBadge}>
            {properties.length} Pending
          </div>
        </div>

        {/* ── Alert ── */}
        {msg && (
          <div style={msgType === 'success' ? styles.successMsg : styles.errMsg}>
            {msg}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <div style={styles.center}>Loading properties...</div>}

        {/* ── Empty state ── */}
        {!loading && properties.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ color: '#64748b', fontSize: 16 }}>
              No pending properties! All caught up.
            </p>
          </div>
        )}

        {/* ── Property Cards ── */}
        {properties.map(p => (
          <div key={p.id} style={styles.card}>

            {/* Image */}
            <img
              src={`http://localhost:8081${p.imageUrl}`}
              alt={p.title}
              style={styles.img}
              onError={e => {
                e.target.src = 'https://placehold.co/220x160?text=No+Image';
              }}
            />

            {/* Details */}
            <div style={styles.info}>
              <div style={styles.cardTop}>
                <h3 style={styles.propTitle}>{p.title}</h3>
                <span style={styles.pendingBadge}>⏳ PENDING</span>
              </div>

              <p style={styles.meta}>📍 {p.address}</p>
              <p style={styles.meta}>
                👤 <strong>{p.auctioneer?.name}</strong> — {p.auctioneer?.email}
              </p>
              <p style={styles.desc}>{p.description}</p>

              <div style={styles.priceRow}>
                <span style={styles.price}>
                  Starting: ₹{p.startingPrice.toLocaleString('en-IN')}
                </span>
                <span style={styles.coords}>
                  🗺️ {p.latitude}, {p.longitude}
                </span>
              </div>

              {/* Document */}
              {p.documentUrl && (
                <a
                  href={`http://localhost:8081${p.documentUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.docLink}
                >
                  📄 View Ownership Document
                </a>
              )}

              {/* Action Buttons */}
              <div style={styles.btnRow}>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApprove(p.id)}
                >
                  ✅ Approve
                </button>
                <button
                  style={styles.rejectBtn}
                  onClick={() => openRejectModal(p.id)}
                >
                  ❌ Reject
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>❌ Reject Property</h3>
            <p style={styles.modalSub}>
              Provide a clear reason so the auctioneer can fix it and resubmit.
            </p>
            <textarea
              style={styles.modalTA}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Ownership documents are missing or unclear..."
              rows={4}
            />
            <div style={styles.modalBtns}>
              <button
                style={styles.cancelBtn}
                onClick={() => setRejectId(null)}
              >
                Cancel
              </button>
              <button
                style={rejecting ? styles.rejectBtnDisabled : styles.rejectBtn}
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  container: { maxWidth: 960, margin: '0 auto' },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16
  },
  backBtn: {
    background: 'none', border: 'none',
    color: '#2563eb', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
    padding: 0, marginTop: 6
  },
  title: {
    fontSize: 24, fontWeight: 800,
    color: '#1e293b', margin: '0 0 4px'
  },
  subtitle: { fontSize: 14, color: '#64748b', margin: 0 },
  countBadge: {
    background: '#fef3c7', color: '#92400e',
    padding: '6px 16px', borderRadius: 20,
    fontSize: 13, fontWeight: 700,
    whiteSpace: 'nowrap', marginTop: 4
  },
  card: {
    background: '#fff', borderRadius: 16,
    padding: 22, marginBottom: 18,
    boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: 22, alignItems: 'start'
  },
  img: {
    width: '100%', height: 160,
    objectFit: 'cover', borderRadius: 12
  },
  info: { display: 'flex', flexDirection: 'column', gap: 7 },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12
  },
  propTitle: {
    fontSize: 19, fontWeight: 700,
    color: '#1e293b', margin: 0
  },
  pendingBadge: {
    background: '#fef3c7', color: '#92400e',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
  },
  meta: { fontSize: 13, color: '#64748b', margin: 0 },
  desc: {
    fontSize: 14, color: '#475569',
    margin: 0, lineHeight: 1.6
  },
  priceRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 8
  },
  price: { fontSize: 16, fontWeight: 700, color: '#2563eb' },
  coords: { fontSize: 12, color: '#94a3b8' },
  docLink: {
    fontSize: 13, color: '#2563eb',
    textDecoration: 'none', fontWeight: 600
  },
  btnRow: { display: 'flex', gap: 10, marginTop: 6 },
  approveBtn: {
    padding: '9px 22px', background: '#16a34a',
    color: '#fff', border: 'none', borderRadius: 9,
    cursor: 'pointer', fontSize: 14, fontWeight: 700
  },
  rejectBtn: {
    padding: '9px 22px', background: '#dc2626',
    color: '#fff', border: 'none', borderRadius: 9,
    cursor: 'pointer', fontSize: 14, fontWeight: 700
  },
  rejectBtnDisabled: {
    padding: '9px 22px', background: '#fca5a5',
    color: '#fff', border: 'none', borderRadius: 9,
    cursor: 'not-allowed', fontSize: 14, fontWeight: 700
  },
  successMsg: {
    background: '#f0fdf4', color: '#16a34a',
    border: '1px solid #bbf7d0',
    padding: '12px 16px', borderRadius: 10,
    fontSize: 14, marginBottom: 20
  },
  errMsg: {
    background: '#fef2f2', color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '12px 16px', borderRadius: 10,
    fontSize: 14, marginBottom: 20
  },
  center: { textAlign: 'center', padding: 60, color: '#64748b' },
  empty: {
    textAlign: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)'
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#fff', borderRadius: 18,
    padding: '32px 36px', width: '100%',
    maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.15)'
  },
  modalTitle: {
    fontSize: 20, fontWeight: 800,
    color: '#1e293b', margin: '0 0 8px'
  },
  modalSub: { fontSize: 14, color: '#64748b', margin: '0 0 16px' },
  modalTA: {
    width: '100%', padding: '11px 14px',
    borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: 14, resize: 'vertical',
    boxSizing: 'border-box', marginBottom: 20,
    outline: 'none'
  },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '9px 20px', background: '#f1f5f9',
    border: 'none', borderRadius: 9,
    cursor: 'pointer', fontSize: 14, fontWeight: 600
  }
};