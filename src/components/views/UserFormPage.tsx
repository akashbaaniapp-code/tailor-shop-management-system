'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, CheckCircle2, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, { label: string; color: string; borderColor: string; bg: string; desc: string }> = {
  admin: {
    label: 'Admin',
    color: '#1db954',
    borderColor: '#1db954',
    bg: 'rgba(29, 185, 84, 0.1)',
    desc: 'Full access — can manage users, settings, all data',
  },
  manager: {
    label: 'Manager',
    color: '#3498db',
    borderColor: '#3498db',
    bg: 'rgba(52, 152, 219, 0.1)',
    desc: 'Can create/edit orders, deliveries, expenses; no user management',
  },
  staff: {
    label: 'Staff',
    color: '#d4df3a',
    borderColor: '#d4df3a',
    bg: 'rgba(212, 223, 58, 0.1)',
    desc: 'Custom access defined by permissions',
  },
}

export default function UserFormPage() {
  const setView = useAppStore((s) => s.setView)
  const selectedUserId = useAppStore((s) => s.selectedUserId)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!selectedUserId)
  const [saved, setSaved] = useState(false)
  const [savedUser, setSavedUser] = useState<any>(null)

  useEffect(() => {
    if (selectedUserId) {
      api.listUsers().then((res) => {
        const u = res.items.find((x: any) => x.id === selectedUserId)
        if (u) {
          setUsername(u.username)
          setName(u.name || '')
          setRole(u.role)
        }
        setLoading(false)
      }).catch((err) => {
        toast.error(err.message)
        setLoading(false)
      })
    }
  }, [selectedUserId])

  async function handleSave() {
    if (!username.trim()) { toast.error('Username required'); return }
    if (!selectedUserId && !password) { toast.error('Password required for new user'); return }

    setSaving(true)
    try {
      const data: any = { username: username.trim(), name, role }
      if (password) data.password = password

      let result: any
      if (selectedUserId) {
        result = await api.updateUser({ id: selectedUserId, ...data })
        toast.success('User updated')
      } else {
        result = await api.createUser(data)
        toast.success('User created')
      }
      setSavedUser(result.item || { username: data.username, name: data.name, role: data.role })
      setSaved(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCreateAnother() {
    setSaved(false)
    setSavedUser(null)
    setUsername(''); setPassword(''); setName(''); setRole('staff')
    useAppStore.setState({ selectedUserId: null })
    setView('setup-user-create')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 40, background: '#1f2227', borderRadius: 10 }} />
        <div style={{ height: 260, background: '#1f2227', borderRadius: 12 }} />
      </div>
    )
  }

  // Success state
  if (saved && savedUser) {
    const role = ROLE_LABELS[savedUser.role] || ROLE_LABELS.staff
    return (
      <div style={{ maxWidth: 700, margin: '32px auto' }}>
        <div
          style={{
            background: '#14161a',
            border: '1px solid rgba(29, 185, 84, 0.4)',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(29, 185, 84, 0.1)',
              border: '1px solid rgba(29, 185, 84, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={32} color="#1db954" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {selectedUserId ? 'User Updated Successfully!' : 'User Created Successfully!'}
          </h2>
          <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
            Username: <span style={{ color: '#3498db', fontFamily: 'monospace', fontWeight: 600 }}>{savedUser.username}</span>
          </p>
          {savedUser.name && (
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
              Name: <span style={{ color: '#fff', fontWeight: 500 }}>{savedUser.name}</span>
            </p>
          )}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                padding: '4px 14px',
                borderRadius: 50,
                border: `1px solid ${role.borderColor}`,
                color: role.color,
                background: role.bg,
              }}
            >
              <Shield size={12} />
              {role.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 24 }}>
            {!selectedUserId && savedUser.role === 'staff' && (
              <button
                onClick={() => {
                  useAppStore.getState().setSelectedUserId(savedUser.id || null)
                  setView('setup-users')
                }}
                style={{
                  background: '#1db954',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
              >
                Set Permissions
              </button>
            )}
            {!selectedUserId && (
              <button
                onClick={handleCreateAnother}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2d33',
                  color: '#e8eae9',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
              >
                Add Another User
              </button>
            )}
            <button
              onClick={() => setView('setup-users')}
              style={{
                background: 'transparent',
                border: '1px solid #2a2d33',
                color: '#e8eae9',
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: '0.3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
            >
              Back to Users List
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentRole = ROLE_LABELS[role] || ROLE_LABELS.staff

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setView('setup-users')}
            title="Back"
            style={{
              background: 'transparent',
              border: '1px solid #2a2d33',
              color: '#e8eae9',
              width: 36,
              height: 36,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>
              {selectedUserId ? 'Edit User' : 'Add New User'}
            </h2>
            <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Fill in the user details below</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setView('setup-users')}
            style={{
              background: 'transparent',
              border: '1px solid #2a2d33',
              color: '#e8eae9',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#1db954',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: '0.3s',
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#1aa34a' }}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
          >
            <Save size={14} />
            {saving ? 'Saving...' : selectedUserId ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>

      {/* Form card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          padding: 25,
          maxWidth: 640,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 20, marginTop: 0 }}>User Details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Username <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. karim.ahmed"
              autoFocus
              disabled={!!selectedUserId}
              style={{ ...inputStyle, opacity: selectedUserId ? 0.6 : 1 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            />
            {selectedUserId && <p style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Username cannot be changed</p>}
          </div>

          <div>
            <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Password {selectedUserId ? '(leave blank to keep current)' : <span style={{ color: '#ff6b6b' }}>*</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={selectedUserId ? '••••••••' : 'Enter password'}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            />
          </div>

          <div>
            <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karim Ahmed"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            />
          </div>

          <div>
            <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Role / Access Rights</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={selectStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            >
              <option value="admin" style={{ background: '#0b0d0f' }}>Admin — Full access</option>
              <option value="manager" style={{ background: '#0b0d0f' }}>Manager — Orders, deliveries, expenses</option>
              <option value="staff" style={{ background: '#0b0d0f' }}>Staff — Custom permissions</option>
            </select>
            <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{currentRole.desc}</p>
            {role === 'staff' && !selectedUserId && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  background: 'rgba(212, 223, 58, 0.05)',
                  border: '1px solid rgba(212, 223, 58, 0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#d4df3a',
                  lineHeight: 1.6,
                }}
              >
                After creating this user, click the "Permissions" button on the users list to define which menus and actions they can access.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, maxWidth: 640 }}>
        <button
          onClick={() => setView('setup-users')}
          style={{
            background: 'transparent',
            border: '1px solid #2a2d33',
            color: '#e8eae9',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: '0.3s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#1db954',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: '0.3s',
            opacity: saving ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#1aa34a' }}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
        >
          <Save size={14} />
          {saving ? 'Saving...' : selectedUserId ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  )
}
