import { useState } from 'react'

// Barre de connexion par e-mail (lien magique) + état de la synchronisation.
export default function AuthBar({ configured, session, status, onSignIn, onSignOut }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSend() {
    const e = email.trim()
    if (!e) return
    setMessage('Envoi…')
    const res = await onSignIn(e)
    if (res.ok) {
      setSent(true)
      setMessage('Lien envoyé ! Ouvre ta boîte mail et clique sur le lien.')
    } else {
      setMessage(res.message || "Échec de l'envoi.")
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

  // Déconnecté : champ e-mail pour recevoir le lien magique.
  return (
    <div className="auth-bar">
      <input
        className="auth-email"
        type="email"
        placeholder="ton e-mail pour synchroniser"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSend()
        }}
      />
      <button className="ghost-btn small" onClick={handleSend}>
        Recevoir le lien
      </button>
      {message && (
        <span className={`sync-state ${sent ? 'ok' : 'muted'}`}>{message}</span>
      )}
    </div>
  )
}
