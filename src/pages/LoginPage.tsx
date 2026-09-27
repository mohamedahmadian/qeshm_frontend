import { Eye, EyeOff, KeyRound, Lock, User } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import { AuthGuestLayout } from '../components/auth/AuthGuestLayout'
import { AppForm, Button, FormField, fieldClassName } from '../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../components/ui/FormLayout'
import { isApiServerError } from '../lib/api'
import { afterAuthPath } from '../lib/auth-redirect'
import { toLatinDigits } from '../lib/datetime'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const afterAuth = afterAuthPath(next)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={afterAuth} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(toLatinDigits(username), toLatinDigits(password))
      navigate(afterAuth)
    } catch (error) {
      toast.error(
        isApiServerError(error) ? t('auth.serverUnavailable') : t('auth.loginFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthGuestLayout>
      <FormCard
        icon={KeyRound}
        title={t('auth.loginTitle')}
      >
        <AppForm className={formCardBodyClassName} onSubmit={onSubmit} autoFocusFirst>
          <FormField icon={User} label={t('auth.username')} htmlFor="username">
            <input
              id="username"
              className={fieldClassName}
              value={username}
              onChange={(e) => setUsername(toLatinDigits(e.target.value))}
              placeholder={t('auth.identifier')}
              autoComplete="username"
              required
            />
          </FormField>
          <FormField icon={Lock} label={t('auth.password')} htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${fieldClassName} pe-11 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden`}
                value={password}
                onChange={(e) => setPassword(toLatinDigits(e.target.value))}
                minLength={8}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute end-1.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-teal-600 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </FormField>
          <Button type="submit" className="w-full" disabled={submitting}>
            <KeyRound className="size-4" />
            {t('auth.login')}
          </Button>
          <Link
            to="/forgot-password"
            className="block text-center text-sm leading-7 text-teal-700 transition hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-xl"
          >
            {t('auth.forgotPasswordHint')}
          </Link>
        </AppForm>
      </FormCard>
    </AuthGuestLayout>
  )
}
