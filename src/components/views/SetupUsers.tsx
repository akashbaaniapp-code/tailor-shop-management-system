'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, UserCog, Lock, Save, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  name?: string | null
  role: string
  createdAt: string
}

const ROLE_BADGE: Record<string, { label: string; color: string; borderColor: string }> = {
  admin: { label: 'Admin', color: '#1db954', borderColor: '#1db954' },
  manager: { label: 'Manager', color: '#3498db', borderColor: '#3498db' },
  staff: { label: 'Staff', color: '#d4df3a', borderColor: '#d4df3a' },
}

const ROLE_ROWS: { key: string; label: string; color: string; borderColor: string; desc: string }[] = [
  { key: 'admin', label: 'Admin', color: '#1db954', borderColor: '#1db954', desc: 'Full access — can manage users, settings, all data' },
  { key: 'manager', label: 'Manager', color: '#3498db', borderColor: '#3498db', desc: 'Can create/edit orders, deliveries, expenses; no user management.' },
  { key: 'staff', label: 'Staff', color: '#d4df3a', borderColor: '#d4df3a', desc: 'Custom access defined by permissions below' },
]

// All menu items available for permission assignment
const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales-orders', label: 'Sales Orders' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'bill-collection', label: 'Bill Collection' },
  { key: 'expense-entry', label: 'Expense Entry' },
  { key: 'setup-uom', label: 'Setup - UoM' },
  { key: 'setup-item', label: 'Setup - Items' },
  { key: 'setup-tailor', label: 'Setup - Tailors' },
  { key: 'setup-customer', label: 'Setup - Customers' },
  { key: 'setup-delivery-info', label: 'Setup - Delivery Info' },
  { key: 'setup-expense-head', label: 'Setup - Expense Heads' },
  { key: 'setup-entity', label: 'Setup - Entities' },
  { key: 'report-pnl', label: 'P&L Report' },
  { key: 'report-receivable', label: 'Receivable Report' },
  { key: 'report-payable', label: 'Payable Report' },
  { key: 'report-orders', label: 'Order Report' },
  { key: 'report-expense', label: 'Expense Report' },
]

interface Permission {
  id?: string
  entityId?: string | null
  subEntityId?: string | null
  entityIds: string[]
  subEntityIds: string[]
  menuAccess: string[]
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export default function SetupUsers() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedUserId = useAppStore((s) => s.setSelectedUserId)
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Permissions state
  const [showPermissions, setShowPermissions] = useState(false)
  const [permUser, setPermUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [subEntities, setSubEntities] = useState<any[]>([])
  const [savingPerms, setSavingPerms] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listUsers()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAddNew() {
    setSelectedUserId(null)
    setView('setup-user-create')
  }

  function handleEdit(u: User) {
    setSelectedUserId(u.id)
    setView('setup-user-edit')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user? They will no longer be able to log in.')) return
    try {
      await api.deleteUser(id)
      toast.success('User deleted')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ---- Permission handlers ----
  async function openPermissions(user: User) {
    setPermUser(user)
    setShowPermissions(true)
    try {
      const [permRes, entRes, subRes] = await Promise.all([
        api.getUserPermissions(user.id),
        api.listEntities(),
        api.listSubEntities(),
      ])
      setPermissions(
        permRes.permissions?.length
          ? permRes.permissions
          : [
              {
                menuAccess: [],
                entityIds: [],
                subEntityIds: [],
                canView: true,
                canCreate: false,
                canEdit: false,
                canDelete: false,
              },
            ]
      )
      setEntities(entRes.items)
      setSubEntities(subRes.items)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function addPermissionRow() {
    setPermissions([
      ...permissions,
      {
        menuAccess: [],
        entityIds: [],
        subEntityIds: [],
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      },
    ])
  }

  function removePermissionRow(idx: number) {
    setPermissions(permissions.filter((_, i) => i !== idx))
  }

  function updatePermission(idx: number, field: keyof Permission, value: any) {
    const next = [...permissions]
    ;(next[idx] as any)[field] = value
    setPermissions(next)
  }

  function toggleMenuInPermission(idx: number, menuKey: string) {
    const next = [...permissions]
    const current = next[idx].menuAccess
    if (current.includes(menuKey)) {
      next[idx].menuAccess = current.filter((m) => m !== menuKey)
    } else {
      next[idx].menuAccess = [...current, menuKey]
    }
    setPermissions(next)
  }

  function toggleEntityInPermission(idx: number, entityId: string) {
    const next = [...permissions]
    const current = next[idx].entityIds || []
    if (current.includes(entityId)) {
      next[idx].entityIds = current.filter((id) => id !== entityId)
      // Also remove any sub-entities that belong to this entity
      const subIdsToRemove = new Set(
        subEntities.filter((s) => s.entityId === entityId).map((s) => s.id)
      )
      next[idx].subEntityIds = (next[idx].subEntityIds || []).filter((id) => !subIdsToRemove.has(id))
    } else {
      next[idx].entityIds = [...current, entityId]
    }
    setPermissions(next)
  }

  function toggleSubEntityInPermission(idx: number, subEntityId: string) {
    const next = [...permissions]
    const current = next[idx].subEntityIds || []
    if (current.includes(subEntityId)) {
      next[idx].subEntityIds = current.filter((id) => id !== subEntityId)
    } else {
      next[idx].subEntityIds = [...current, subEntityId]
      // Auto-select parent entity if not already selected
      const sub = subEntities.find((s) => s.id === subEntityId)
      if (sub && !(next[idx].entityIds || []).includes(sub.entityId)) {
        next[idx].entityIds = [...(next[idx].entityIds || []), sub.entityId]
      }
    }
    setPermissions(next)
  }

  async function handleSavePermissions() {
    if (!permUser) return
    setSavingPerms(true)
    try {
      await api.saveUserPermissions(permUser.id, permissions)
      toast.success('Permissions saved')
      setShowPermissions(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPerms(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Control Card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          padding: 25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, color: '#e8eae9', lineHeight: 1.6, margin: 0 }}>
            Manage system users and their access rights
          </p>
          {ROLE_ROWS.map((role, i) => (
            <div
              key={role.key}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                marginTop: i === 0 ? 12 : 4,
              }}
            >
              <span
                style={{
                  border: `1px solid ${role.borderColor}`,
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: role.color,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: role.color,
                  }}
                />
                {role.label}
              </span>
              <span style={{ fontSize: 12, color: '#555', marginRight: 5 }}>{role.desc}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddNew}
          style={{
            background: '#1db954',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            transition: '0.3s',
            height: 'fit-content',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Data Table Card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 40, background: '#1f2227', borderRadius: 8 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                border: '2px solid #2a2d33',
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <UserCog size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No users yet</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Add your first system user to get started
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1f2227' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px 14px 25px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Username
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Created
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '14px 25px 14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const role = ROLE_BADGE[it.role] || ROLE_BADGE.staff
                  return (
                    <tr
                      key={it.id}
                      style={{ borderBottom: '1px solid #1f2227' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td
                        style={{
                          padding: '14px 10px 14px 25px',
                          color: '#3498db',
                          fontWeight: 500,
                        }}
                      >
                        {it.username}
                      </td>
                      <td style={{ padding: '14px 10px', color: '#fff', fontWeight: 500 }}>
                        {it.name || '-'}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 12,
                            fontWeight: 500,
                            padding: '4px 14px',
                            borderRadius: 50,
                            border: `1px solid ${role.borderColor}`,
                            color: role.color,
                          }}
                        >
                          {role.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px', color: '#888' }}>
                        {new Date(it.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            color: '#666',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {it.role !== 'admin' && (
                            <button
                              onClick={() => openPermissions(it)}
                              title="Set Permissions"
                              style={{
                                background: '#0b0d0f',
                                border: '1px solid #2a2d33',
                                color: '#e8eae9',
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                transition: '0.3s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#d4df3a'
                                e.currentTarget.style.color = '#d4df3a'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#2a2d33'
                                e.currentTarget.style.color = '#e8eae9'
                              }}
                            >
                              <CheckCircle2 size={12} /> Permissions
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(it)}
                            title="Edit"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                              padding: 0,
                              display: 'inline-flex',
                              transition: '0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#3498db')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(it.id)}
                            title="Delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                              padding: 0,
                              display: 'inline-flex',
                              transition: '0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions editor dialog */}
      {showPermissions && permUser && (
        <Dialog open onOpenChange={setShowPermissions}>
          <DialogContent
            style={{
              background: '#1a1c1e',
              border: '1px solid #2a2d33',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={18} color="#d4df3a" />
                Permissions for {permUser.username}
                {permUser.name && (
                  <span style={{ color: '#888', fontWeight: 400 }}>({permUser.name})</span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Help box */}
              <div
                style={{
                  background: 'rgba(29, 185, 84, 0.08)',
                  border: '1px solid rgba(29, 185, 84, 0.3)',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                }}
              >
                <p style={{ color: '#1db954', fontWeight: 600, marginBottom: 6 }}>How permissions work:</p>
                <ul
                  style={{
                    color: '#aaa',
                    fontSize: 12,
                    lineHeight: 1.6,
                    listStyle: 'disc',
                    paddingLeft: 16,
                    margin: 0,
                  }}
                >
                  <li>Each row defines a permission set with menu access + action rights</li>
                  <li>Multiple rows can be added — user gets access from all rows combined</li>
                  <li>Select which menus the user can see in the sidebar</li>
                  <li>Check View / Create / Edit / Delete actions per row</li>
                  <li>Optionally restrict to specific Entity or Sub-Entity</li>
                </ul>
              </div>

              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#0b0d0f',
                    border: '1px solid #2a2d33',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>
                      Permission Set #{idx + 1}
                    </p>
                    {permissions.length > 1 && (
                      <button
                        onClick={() => removePermissionRow(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#666',
                          padding: 4,
                          display: 'inline-flex',
                          transition: '0.3s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Menu access */}
                  <div>
                    <label
                      style={{
                        color: '#888',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Menu Access (what menus to show in sidebar)
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 6,
                        padding: 8,
                        border: '1px solid #2a2d33',
                        borderRadius: 8,
                        background: '#14161a',
                      }}
                    >
                      {MENU_ITEMS.map((m) => {
                        const checked = perm.menuAccess.includes(m.key)
                        return (
                          <label
                            key={m.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              color: '#ccc',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMenuInPermission(idx, m.key)}
                              style={{ accentColor: '#d4df3a', cursor: 'pointer' }}
                            />
                            <span>{m.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action rights */}
                  <div>
                    <label
                      style={{
                        color: '#888',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Action Rights
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                        padding: 8,
                        border: '1px solid #2a2d33',
                        borderRadius: 8,
                        background: '#14161a',
                      }}
                    >
                      {[
                        { key: 'canView', label: 'Can View' },
                        { key: 'canCreate', label: 'Can Create' },
                        { key: 'canEdit', label: 'Can Edit' },
                        { key: 'canDelete', label: 'Can Delete' },
                      ].map((a) => (
                        <label
                          key={a.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: '#ccc',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(perm as any)[a.key]}
                            onChange={(e) => updatePermission(idx, a.key as keyof Permission, e.target.checked)}
                            style={{ accentColor: '#d4df3a', cursor: 'pointer' }}
                          />
                          <span>{a.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Entity access */}
                  <div>
                    <label
                      style={{
                        color: '#888',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Entity Access (select one or more — user will choose which to work in)
                    </label>
                    {entities.length === 0 ? (
                      <p
                        style={{
                          color: '#666',
                          fontStyle: 'italic',
                          fontSize: 12,
                          padding: 8,
                          background: '#14161a',
                          borderRadius: 6,
                          margin: 0,
                        }}
                      >
                        No entities created yet. User will have access to all entities by default.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: 6,
                          padding: 8,
                          border: '1px solid #2a2d33',
                          borderRadius: 8,
                          background: '#14161a',
                        }}
                      >
                        {entities.map((e: any) => {
                          const checked = (perm.entityIds || []).includes(e.id)
                          return (
                            <label
                              key={e.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#ccc',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEntityInPermission(idx, e.id)}
                                style={{ accentColor: '#d4df3a', cursor: 'pointer' }}
                              />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {e.name}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sub-Entity access */}
                  {subEntities.length > 0 && (
                    <div>
                      <label
                        style={{
                          color: '#888',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Sub-Entity Access (optional — select specific sub-entities)
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: 6,
                          padding: 8,
                          border: '1px solid #2a2d33',
                          borderRadius: 8,
                          background: '#14161a',
                          maxHeight: 160,
                          overflowY: 'auto',
                        }}
                      >
                        {subEntities
                          .filter(
                            (s: any) =>
                              (perm.entityIds || []).length === 0 ||
                              (perm.entityIds || []).includes(s.entityId)
                          )
                          .map((s: any) => {
                            const checked = (perm.subEntityIds || []).includes(s.id)
                            const parentName =
                              s.entity?.name || entities.find((e) => e.id === s.entityId)?.name
                            return (
                              <label
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 12,
                                  color: '#ccc',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSubEntityInPermission(idx, s.id)}
                                  style={{ accentColor: '#d4df3a', cursor: 'pointer' }}
                                />
                                <span
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {s.name}
                                  <span style={{ color: '#555', fontSize: 10 }}> ({parentName})</span>
                                </span>
                              </label>
                            )
                          })}
                        {subEntities.filter(
                          (s: any) =>
                            (perm.entityIds || []).length === 0 ||
                            (perm.entityIds || []).includes(s.entityId)
                        ).length === 0 && (
                          <p
                            style={{
                              color: '#666',
                              fontStyle: 'italic',
                              fontSize: 12,
                              gridColumn: '1 / -1',
                              margin: 0,
                            }}
                          >
                            Select an entity above to see its sub-entities, or no sub-entities exist.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addPermissionRow}
                style={{
                  background: 'transparent',
                  border: '1px dashed #2a2d33',
                  color: '#e8eae9',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d4df3a'
                  e.currentTarget.style.color = '#d4df3a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a2d33'
                  e.currentTarget.style.color = '#e8eae9'
                }}
              >
                <Plus size={16} /> Add Another Permission Set
              </button>
            </div>

            <DialogFooter>
              <button
                onClick={() => setShowPermissions(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2d33',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={savingPerms}
                style={{
                  background: '#1db954',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: savingPerms ? 0.6 : 1,
                }}
              >
                <Save size={14} />
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
