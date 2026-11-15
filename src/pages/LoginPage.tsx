// Вход / регистрация через Supabase Auth (email + пароль).
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Disclaimer } from '../components/ui'
import { tr } from '../lib/i18n'

export default function LoginPage() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name || email.split('@')[0] } } })
    setBusy(false)
    if (error) return setMsg(error.message)
    if (mode === 'up' && !data.session) setMsg(tr('Проверьте почту и подтвердите регистрацию, затем войдите.', 'Check your email to confirm sign-up, then sign in.'))
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="text-4xl font-bold tracking-tight">
            StarTime<span className="text-accent">+</span>
          </div>
          <p className="mt-2 text-sm text-ink-dim">{tr('Мониторинг здоровья астронавтов в длительных миссиях · ORBIT AI', 'Astronaut health monitoring for long-duration missions · ORBIT AI')}</p>
        </div>
        <form onSubmit={submit} className="panel space-y-3 p-6">
          <div className="flex rounded-lg border border-space-600 p-0.5">
            {(['in', 'up'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded-md py-1.5 text-sm ${mode === m ? 'bg-accent text-space-950' : 'text-ink-dim'}`}>
                {m === 'in' ? tr('Вход', 'Sign in') : tr('Регистрация', 'Sign up')}
              </button>
            ))}
          </div>
          {mode === 'up' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Имя', 'Name')} className="w-full rounded-lg border border-space-600 bg-space-950 px-3 py-2 text-sm" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className="w-full rounded-lg border border-space-600 bg-space-950 px-3 py-2 text-sm" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr('Пароль', 'Password')} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="w-full rounded-lg border border-space-600 bg-space-950 px-3 py-2 text-sm" />
          {msg && <p className="text-sm text-medium">{msg}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '…' : mode === 'in' ? tr('Войти', 'Sign in') : tr('Создать аккаунт', 'Create account')}
          </Button>
        </form>
        <Disclaimer />
      </div>
    </div>
  )
}
