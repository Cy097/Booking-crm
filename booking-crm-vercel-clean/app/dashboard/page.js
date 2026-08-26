'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function formatINR(num) {
  const val = parseFloat(num) || 0;
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getDiscountDisplay(discountType) {
  if (!discountType || discountType === "None") return "No Discount";
  const presets = ["50", "60", "75", "85", "100", "115", "125", "150", "175", "200"];
  if (presets.includes(discountType)) return `₹${discountType} Off`;
  return discountType;
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // Admin Mode Toggle
  const [adminMode, setAdminMode] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("dateDesc");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  
  // Form State
  const [customId, setCustomId] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDetails, setBookingDetails] = useState("");
  const [discountType, setDiscountType] = useState("None");
  const [tokenStatus, setTokenStatus] = useState("Token Paid");
  const [tokenAmount, setTokenAmount] = useState("");
  const [bookingStatus, setBookingStatus] = useState("Confirmed");
  const [notes, setNotes] = useState("");
  
  // Toasts
  const [toast, setToast] = useState(null);

  const showNotification = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/login');
        } else {
          setUser(data.user);
          if (data.user.role === 'admin') {
            setAdminMode(true);
          }
          fetchBookings(data.user.role === 'admin');
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const fetchBookings = async (isAdmin = adminMode) => {
    try {
      const url = isAdmin ? '/api/bookings?admin=true' : '/api/bookings';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setIsCloudConnected(Boolean(data.isCloudConnected));
      }
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminView = () => {
    const nextAdmin = !adminMode;
    setAdminMode(nextAdmin);
    fetchBookings(nextAdmin);
    showNotification(nextAdmin ? "👑 Admin View Activated: Showing ALL users' bookings" : "👤 Personal View Activated", "info");
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  const openAddModal = () => {
    setEditingBooking(null);
    setCustomId("");
    setPhone("");
    setBookingDate(new Date().toISOString().split("T")[0]);
    setBookingDetails("");
    setDiscountType("None");
    setTokenStatus("Token Paid");
    setTokenAmount("");
    setBookingStatus("Confirmed");
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (b) => {
    setEditingBooking(b);
    setCustomId(b.customId || "");
    setPhone(b.phone || "");
    setBookingDate(b.bookingDate || "");
    setBookingDetails(b.bookingDetails || "");
    setDiscountType(b.discountType || "None");
    setTokenStatus(b.tokenStatus || "Token Paid");
    setTokenAmount(b.tokenAmount || "");
    setBookingStatus(b.bookingStatus || "Confirmed");
    setNotes(b.notes || "");
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !bookingDate || !bookingDetails) {
      showNotification("Phone number, date, and details are required.", "danger");
      return;
    }

    const payload = {
      customId,
      phone,
      bookingDate,
      bookingDetails,
      discountType,
      tokenStatus,
      tokenAmount: parseFloat(tokenAmount) || 0,
      bookingStatus,
      notes,
      isAdmin: adminMode
    };

    try {
      if (editingBooking) {
        const res = await fetch(`/api/bookings/${editingBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showNotification("Booking record updated successfully.", "success");
          fetchBookings();
        }
      } else {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showNotification("Saved new booking record!", "success");
          fetchBookings();
        }
      }
      setShowModal(false);
    } catch (err) {
      showNotification(err.message, "danger");
    }
  };

  const toggleTokenStatus = async (b) => {
    const nextStatus = b.tokenStatus === "Token Paid" ? "Token Not Paid" : "Token Paid";
    const nextAmt = nextStatus === "Token Paid" ? (b.tokenAmount > 0 ? b.tokenAmount : 500) : 0;
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenStatus: nextStatus, tokenAmount: nextAmt, isAdmin: adminMode })
      });
      if (res.ok) {
        showNotification(`Updated token status to ${nextStatus}`, "info");
        fetchBookings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cycleBookingStatus = async (b) => {
    const statuses = ["Confirmed", "Pending", "Not Confirmed"];
    const nextStatus = statuses[(statuses.indexOf(b.bookingStatus) + 1) % statuses.length];
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: nextStatus, isAdmin: adminMode })
      });
      if (res.ok) {
        showNotification(`Booking status changed to ${nextStatus}`, "info");
        fetchBookings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (b) => {
    if (confirm(`Delete booking record (${b.phone})?`)) {
      try {
        const res = await fetch(`/api/bookings/${b.id}`, { method: 'DELETE' });
        if (res.ok) {
          showNotification("Deleted booking record.", "danger");
          fetchBookings();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const exportToExcel = () => {
    if (typeof window === 'undefined' || !window.XLSX) {
      alert("SheetJS engine loading... Please click again.");
      return;
    }

    const filtered = getFilteredBookings();
    if (filtered.length === 0) {
      showNotification("No records available to export.", "danger");
      return;
    }

    let totalTokenAmt = 0;
    const rows = filtered.map((b, idx) => {
      totalTokenAmt += (b.tokenStatus === "Token Paid" ? (parseFloat(b.tokenAmount) || 0) : 0);
      return {
        "S.No": idx + 1,
        "Booking ID": b.customId || "N/A",
        "Phone Number": b.phone,
        "Booking Date": b.bookingDate,
        "Booking Details": b.bookingDetails,
        "Discount Applied": getDiscountDisplay(b.discountType),
        "Token Status": b.tokenStatus,
        "Token Paid Amount (₹)": (parseFloat(b.tokenAmount) || 0).toFixed(2),
        "Booking Status": b.bookingStatus,
        "User Creator": b.creatorEmail || user?.email || "Me",
        "Notes": b.notes || ""
      };
    });

    rows.push({});
    rows.push({
      "S.No": "TOTALS",
      "Booking ID": `Count: ${filtered.length}`,
      "Phone Number": "",
      "Booking Date": "",
      "Booking Details": adminMode ? "ADMIN MASTER SYSTEM SUMMARY" : "MY LEDGER SUMMARY",
      "Discount Applied": "",
      "Token Status": "TOTAL TOKENS",
      "Token Paid Amount (₹)": totalTokenAmt.toFixed(2),
      "Booking Status": "",
      "User Creator": adminMode ? "ALL USERS DATA" : user?.email,
      "Notes": `Exported on ${new Date().toLocaleDateString('en-IN')}`
    });

    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, adminMode ? "Master All Users Ledger" : "My Bookings");
    window.XLSX.writeFile(workbook, `${adminMode ? "Admin_All_Users" : "My_Personal"}_Bookings_${new Date().toISOString().split("T")[0]}.xlsx`);
    showNotification(`Exported ${filtered.length} records to Excel`, "success");
  };

  const getFilteredBookings = () => {
    let result = [...bookings];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        (b.customId && b.customId.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.bookingDetails && b.bookingDetails.toLowerCase().includes(q)) ||
        (b.creatorEmail && b.creatorEmail.toLowerCase().includes(q)) ||
        (b.creatorName && b.creatorName.toLowerCase().includes(q))
      );
    }

    if (activeTab === "PAID") {
      result = result.filter(b => b.tokenStatus === "Token Paid");
    } else if (activeTab === "UNPAID") {
      result = result.filter(b => b.tokenStatus === "Token Not Paid");
    } else if (activeTab === "CONFIRMED") {
      result = result.filter(b => b.bookingStatus === "Confirmed");
    } else if (activeTab === "PENDING") {
      result = result.filter(b => b.bookingStatus === "Pending");
    } else if (activeTab === "GROUP") {
      result = result.filter(b => b.discountType && b.discountType.startsWith("Group offer"));
    }

    if (discountTypeFilter !== "ALL") {
      if (discountTypeFilter === "NUMERICAL") {
        const presets = ["50", "60", "75", "85", "100", "115", "125", "150", "175", "200"];
        result = result.filter(b => presets.includes(b.discountType));
      } else if (discountTypeFilter === "GROUP") {
        result = result.filter(b => b.discountType && b.discountType.startsWith("Group offer"));
      } else {
        result = result.filter(b => b.discountType === discountTypeFilter);
      }
    }

    if (sortBy === "dateDesc") {
      result.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    } else if (sortBy === "dateAsc") {
      result.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
    }

    return result;
  };

  const filteredBookings = getFilteredBookings();

  const tokenPaidCount = bookings.filter(b => b.tokenStatus === "Token Paid").length;
  const tokenUnpaidCount = bookings.filter(b => b.tokenStatus === "Token Not Paid").length;
  const tokenPaidAmt = bookings.reduce((sum, b) => sum + (b.tokenStatus === "Token Paid" ? (parseFloat(b.tokenAmount) || 0) : 0), 0);
  const confirmedCount = bookings.filter(b => b.bookingStatus === "Confirmed").length;
  const pendingCount = bookings.filter(b => b.bookingStatus === "Pending").length;
  const groupOfferCount = bookings.filter(b => b.discountType && b.discountType.startsWith("Group offer")).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <p style={{ color: '#5f6368', fontFamily: 'Roboto, sans-serif' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px', color: '#0f9d58' }}></i>
          Loading Master Booking Control Hub...
        </p>
      </div>
    );
  }

  return (
    <div className="crm-container">
      {/* Header */}
      <header className="crm-header">
        <div className="header-left">
          <div className="logo-box">
            <i className={`fa-solid ${adminMode ? "fa-crown" : "fa-user-gear"} logo-icon`} style={{ color: adminMode ? '#b06000' : '#0f9d58' }}></i>
            <div>
              <h1 className="app-title">
                {adminMode ? "Admin Master Access" : "My Personal"} <span className="badge-tag" style={{ background: adminMode ? '#fef7e0' : '#e6f4ea', color: adminMode ? '#b06000' : '#137333' }}>
                  {adminMode ? "👑 All Users View" : "Personal Hub"}
                </span>
              </h1>
              <p className="app-subtitle">{getTimeGreeting()}, <strong>{user?.name || user?.email}</strong> 👋 {adminMode ? "Super Admin Access: Viewing ALL bookings across system" : "Personal Booking & Token Dashboard"}</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Admin Mode Toggle Button */}
          <button onClick={toggleAdminView} className="btn" style={{ background: adminMode ? '#fef7e0' : '#e6f4ea', color: adminMode ? '#b06000' : '#137333', border: '1px solid #dadce0', fontWeight: '600' }}>
            <i className={`fa-solid ${adminMode ? "fa-user" : "fa-crown"}`}></i>
            {adminMode ? "Switch to Personal View" : "👑 Admin Super Access"}
          </button>

          {user && (
            <button onClick={() => setShowAccountModal(true)} className="btn btn-secondary" title="View Account Profile">
              <span className="user-avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</span>
              <span>Account</span>
            </button>
          )}
          <button onClick={exportToExcel} className="btn btn-excel">
            <i className="fa-solid fa-file-excel"></i> Export Sheet (.xlsx)
          </button>
          <button onClick={openAddModal} className="btn btn-primary">
            <i className="fa-solid fa-plus"></i> New Booking
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" title="Sign Out">
            <i className="fa-solid fa-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </header>

      {/* Metrics Dashboard */}
      <section className="metrics-grid">
        <div className="metric-card card-gradient-1" onClick={() => setActiveTab("ALL")} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">{adminMode ? "All System Bookings" : "My Total Bookings"}</span>
            <div className="metric-icon"><i className="fa-solid fa-folder-open"></i></div>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{bookings.length} <span className="unit">Bookings</span></h2>
            <div className="metric-subtext">{adminMode ? "Aggregate Across All Users" : "Personal Saved Ledger Records"}</div>
          </div>
        </div>

        <div className="metric-card card-gradient-2" onClick={() => setActiveTab("PAID")} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">{adminMode ? "System Token Ledger" : "My Token Collected"}</span>
            <div className="metric-icon"><i className="fa-solid fa-coins"></i></div>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{formatINR(tokenPaidAmt)}</h2>
            <div className="metric-subtext">
              <span className="text-success"><i className="fa-solid fa-check"></i> {tokenPaidCount} Paid</span> &bull; <span className="text-danger">{tokenUnpaidCount} Unpaid</span>
            </div>
          </div>
        </div>

        <div className="metric-card card-gradient-3" onClick={() => setActiveTab("CONFIRMED")} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">Confirmations</span>
            <div className="metric-icon"><i className="fa-solid fa-circle-check"></i></div>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{confirmedCount} <span className="unit">Confirmed</span></h2>
            <div className="metric-subtext">Pending Review: <strong>{pendingCount}</strong></div>
          </div>
        </div>

        <div className="metric-card card-gradient-4" onClick={() => setActiveTab("GROUP")} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-title">Group Offers</span>
            <div className="metric-icon"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{groupOfferCount}</h2>
            <div className="metric-subtext">Group Offers (4, 6, 8) Claimed</div>
          </div>
        </div>
      </section>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#5f6368', marginRight: '6px' }}>
          <i className="fa-solid fa-filter"></i> Quick Filter:
        </span>
        <button className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("ALL")}>
          All Bookings ({bookings.length})
        </button>
        <button className={`btn btn-sm ${activeTab === "PAID" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("PAID")}>
          <i className="fa-solid fa-circle-check" style={{ color: '#137333' }}></i> Token Paid ({tokenPaidCount})
        </button>
        <button className={`btn btn-sm ${activeTab === "UNPAID" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("UNPAID")}>
          <i className="fa-solid fa-circle-xmark" style={{ color: '#c5221f' }}></i> Token Unpaid ({tokenUnpaidCount})
        </button>
        <button className={`btn btn-sm ${activeTab === "CONFIRMED" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("CONFIRMED")}>
          Confirmed ({confirmedCount})
        </button>
        <button className={`btn btn-sm ${activeTab === "PENDING" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("PENDING")}>
          Pending ({pendingCount})
        </button>
        <button className={`btn btn-sm ${activeTab === "GROUP" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("GROUP")}>
          Group Offers ({groupOfferCount})
        </button>
      </div>

      {/* Search & Toolbar */}
      <section className="toolbar-card">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder={adminMode ? "Search all users by Phone, Booking ID, Details, or User Email..." : "Search my bookings by Phone, Booking ID, or Details..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select className="form-select" value={discountTypeFilter} onChange={(e) => setDiscountTypeFilter(e.target.value)}>
            <option value="ALL">All Discounts</option>
            <option value="NUMERICAL">Presets (50 to 200)</option>
            <option value="GROUP">Group Offers (4, 6, 8)</option>
            <option value="50">50</option>
            <option value="60">60</option>
            <option value="75">75</option>
            <option value="85">85</option>
            <option value="100">100</option>
            <option value="115">115</option>
            <option value="125">125</option>
            <option value="150">150</option>
            <option value="175">175</option>
            <option value="200">200</option>
            <option value="Group offer for 4">Group offer for 4</option>
            <option value="Group offer for 6">Group offer for 6</option>
            <option value="Group offer for 8">Group offer for 8</option>
            <option value="None">No Discount (0)</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setActiveTab("ALL"); setDiscountTypeFilter("ALL"); }}>
            <i className="fa-solid fa-filter-circle-xmark"></i> Clear Filters
          </button>
        </div>
      </section>

      {/* Table */}
      <main className="table-container-card">
        <div className="table-header-bar">
          <div style={{ fontSize: '0.85rem' }}>
            Showing <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> {adminMode ? "master system" : "personal"} rows
          </div>
          <div>
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="dateDesc">Booking Date (Newest)</option>
              <option value="dateAsc">Booking Date (Oldest)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>ID / Phone Number</th>
                <th>Date & Details</th>
                <th>Discount Applied</th>
                <th>Token Paid Status</th>
                <th>Booking Status</th>
                {adminMode && <th>User Creator</th>}
                <th style={{ textAlign: 'center' }}>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={adminMode ? 7 : 6} style={{ textAlign: 'center', padding: '50px 20px', color: '#5f6368' }}>
                    <i className="fa-solid fa-clipboard-user" style={{ fontSize: '3rem', color: '#0f9d58', marginBottom: '12px', display: 'block' }}></i>
                    <h3>No Records Found</h3>
                    <p style={{ marginTop: '4px', fontSize: '0.88rem' }}>No booking entries match your filter. Click <strong>"+ New Booking"</strong> to log a record!</p>
                    <button onClick={openAddModal} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
                      <i className="fa-solid fa-plus"></i> Add Booking Entry
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        {b.customId && <span className="booking-id-badge">{b.customId}</span>}
                        <div style={{ fontWeight: '600' }}>
                          <i className="fa-solid fa-phone" style={{ marginRight: '6px', color: '#0f9d58' }}></i> {b.phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{b.bookingDate}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>{b.bookingDetails}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`discount-badge ${b.discountType?.startsWith("Group") ? "group-badge" : (b.discountType === "None" ? "none-badge" : "")}`}>
                        {getDiscountDisplay(b.discountType)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${b.tokenStatus === "Token Paid" ? "token-paid" : "token-unpaid"}`} onClick={() => toggleTokenStatus(b)} title="Click to toggle Token Status">
                        <i className={`fa-solid ${b.tokenStatus === "Token Paid" ? "fa-circle-check" : "fa-circle-xmark"}`}></i>
                        {b.tokenStatus === "Token Paid" ? `Token Paid (${formatINR(b.tokenAmount)})` : "Token Not Paid"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${b.bookingStatus === "Confirmed" ? "status-confirmed" : (b.bookingStatus === "Pending" ? "status-pending" : "status-not-confirmed")}`} onClick={() => cycleBookingStatus(b)} title="Click to cycle status">
                        {b.bookingStatus}
                      </span>
                    </td>
                    {adminMode && (
                      <td>
                        <div style={{ fontSize: '0.78rem' }}>
                          <strong>{b.creatorName || 'User'}</strong>
                          <div style={{ color: '#5f6368' }}>{b.creatorEmail || 'Private'}</div>
                        </div>
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-btn-group">
                        <button className="action-btn" onClick={() => openEditModal(b)} title="Edit Record">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="action-btn" onClick={() => handleDelete(b)} title="Delete Record" style={{ color: '#c5221f' }}>
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Booking Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-calendar-plus" style={{ color: '#0f9d58' }}></i> {editingBooking ? "Edit Booking Entry" : "New Booking Entry"}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleFormSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="customId">Booking ID / Ref # <small style={{ color: '#5f6368' }}>(Optional - Kept empty)</small></label>
                  <div className="input-icon-wrapper">
                    <i className="fa-solid fa-hashtag input-icon"></i>
                    <input id="customId" type="text" placeholder="Leave empty or enter custom ID..." value={customId} onChange={(e) => setCustomId(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number <span style={{ color: '#c5221f' }}>*</span></label>
                  <div className="input-icon-wrapper">
                    <i className="fa-solid fa-phone input-icon"></i>
                    <input id="phone" type="tel" required placeholder="e.g. +91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="bookingDate">Booking Date <span style={{ color: '#c5221f' }}>*</span></label>
                  <div className="input-icon-wrapper">
                    <i className="fa-solid fa-calendar-day input-icon"></i>
                    <input id="bookingDate" type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="bookingDetails">Booking Details / Description <span style={{ color: '#c5221f' }}>*</span></label>
                  <div className="input-icon-wrapper">
                    <i className="fa-solid fa-receipt input-icon"></i>
                    <input id="bookingDetails" type="text" required placeholder="e.g. Banquet Suite & Lawn Access" value={bookingDetails} onChange={(e) => setBookingDetails(e.target.value)} />
                  </div>
                </div>

                <div className="form-group full-width" style={{ background: '#e6f4ea', padding: '12px', borderRadius: '8px', border: '1px dashed #ceead6' }}>
                  <label htmlFor="discountMenuSelect" style={{ color: '#137333' }}>
                    <i className="fa-solid fa-percent"></i> Discount Amount / Offer Selection <span style={{ color: '#c5221f' }}>*</span>
                  </label>
                  <select id="discountMenuSelect" className="form-select" style={{ width: '100%', padding: '10px' }} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="None">No Discount (0)</option>
                    <optgroup label="Preset Discount Amounts">
                      <option value="50">₹50 Discount</option>
                      <option value="60">₹60 Discount</option>
                      <option value="75">₹75 Discount</option>
                      <option value="85">₹85 Discount</option>
                      <option value="100">₹100 Discount</option>
                      <option value="115">₹115 Discount</option>
                      <option value="125">₹125 Discount</option>
                      <option value="150">₹150 Discount</option>
                      <option value="175">₹175 Discount</option>
                      <option value="200">₹200 Discount</option>
                    </optgroup>
                    <optgroup label="Special Group Offers">
                      <option value="Group offer for 4">Group offer for 4</option>
                      <option value="Group offer for 6">Group offer for 6</option>
                      <option value="Group offer for 8">Group offer for 8</option>
                    </optgroup>
                  </select>
                </div>

                <div className="form-group">
                  <label>Token Paid Status</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className={`btn ${tokenStatus === "Token Paid" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }} onClick={() => setTokenStatus("Token Paid")}>
                      Token Paid
                    </button>
                    <button type="button" className={`btn ${tokenStatus === "Token Not Paid" ? "btn-secondary" : "btn-secondary"}`} style={{ flex: 1, borderColor: tokenStatus === "Token Not Paid" ? '#c5221f' : '#dadce0', color: tokenStatus === "Token Not Paid" ? '#c5221f' : '#202124' }} onClick={() => setTokenStatus("Token Not Paid")}>
                      Token Unpaid
                    </button>
                  </div>
                </div>

                {tokenStatus === "Token Paid" && (
                  <div className="form-group">
                    <label htmlFor="tokenAmount">Token Paid Amount (₹)</label>
                    <div className="input-icon-wrapper">
                      <i className="fa-solid fa-indian-rupee-sign input-icon"></i>
                      <input id="tokenAmount" type="number" placeholder="e.g. 1000" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Booking Status</label>
                  <select className="form-select" style={{ width: '100%', padding: '10px' }} value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Confirmed">Not Confirmed</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="notes">Notes / Remarks</label>
                  <textarea id="notes" rows={2} placeholder="Add any special requirements..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg">
                  <i className="fa-solid fa-floppy-disk"></i> Save Booking Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Profile Modal */}
      {showAccountModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-gear" style={{ color: '#0f9d58' }}></i> My Account Profile</h2>
              <button className="btn-close" onClick={() => setShowAccountModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: '60px', height: '60px', background: adminMode ? '#b06000' : '#0f9d58', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '700', margin: '0 auto 10px' }}>
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <h3>{user?.name}</h3>
                <p style={{ color: '#5f6368', fontSize: '0.85rem' }}>{user?.email}</p>
                <div style={{ marginTop: '6px' }}>
                  <span className="badge-tag" style={{ background: adminMode ? '#fef7e0' : '#e6f4ea', color: adminMode ? '#b06000' : '#137333' }}>
                    {adminMode ? "👑 Super Admin Access" : "Standard User"}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #dadce0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5f6368' }}>My Booking Entries:</span>
                  <strong>{bookings.length} Bookings</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5f6368' }}>Token Collected:</span>
                  <strong style={{ color: '#137333' }}>{formatINR(tokenPaidAmt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5f6368' }}>Cloud Storage Sync:</span>
                  <strong style={{ color: isCloudConnected ? '#0f9d58' : '#b06000' }}>
                    {isCloudConnected ? (
                      <span><i className="fa-solid fa-cloud-check"></i> Connected (Vercel KV Cloud)</span>
                    ) : (
                      <span><i className="fa-solid fa-triangle-exclamation"></i> Local Storage (Connect Vercel KV for Cloud)</span>
                    )}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket"></i> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <i className="fa-solid fa-circle-check"></i>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
