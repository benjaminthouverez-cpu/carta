import { useState } from 'react'

// Barre de connexion par e-mail + mot de passe + état de la synchronisation.
export default function AuthBar({ configured, session, status, onSignIn, onSignOut }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSignIn() {
    const e = email.trim()
    if (!e || !password) return
    setMessage('Connexion…')
    const res = await onSignIn(e, password)
    if (res.ok) {
      setPassword('')
      setMessage('')
    } else {
      setMessage(res.message || 'Échec de la connexion.')
    }
  }

  // Synchronisation pas encore configurée (avant d'avoir branché Supabase).
  if (!configured) {
    return (
      <div className="auth-bar">
        <span className="sync-state muted">Synchronisation non configurée (mode local)</span>
      </div>
    )
  }

  // Connecté : on affiche l'e-mail et un bouton de déconnexion.
  if (session) {
    return (
      <div className="auth-bar">
        <span className="sync-dot" title="Synchronisé">●</span>
        <span className="sync-state">
          {session.user.email}
          {status ? ` · ${status}` : ''}
        </span>
        <button className="ghost-btn small" onClick={onSignOut}>
          Déconnexion
        </button>
      </div>
    )
  }

  // Déconnecté : e-mail + mot de passe pour se connecter.
  return (
    <div className="auth-bar">
      <input
        className="auth-email"
        type="email"
        placeholder="e-mail"
        autoComplete="username"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSignIn()
        }}
      />
      <input
        className="auth-email"
        type="password"
        placeholder="mot de passe"
        autoComplete="current-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSignIn()
        }}
      />
      <button className="ghost-btn small" onClick={handleSignIn}>
        Se connecter
      </button>
      {message && <span className="sync-state muted">{message}</span>}
    </div>
  )
}
