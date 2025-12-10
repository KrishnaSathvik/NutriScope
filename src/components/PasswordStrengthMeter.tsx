import { useMemo } from 'react'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password: string
}

interface StrengthCriteria {
  label: string
  test: (password: string) => boolean
}

const criteria: StrengthCriteria[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /[0-9]/.test(pwd) },
  { label: 'Contains special character', test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
]

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' }
    
    const metCriteria = criteria.filter(c => c.test(password)).length
    const score = Math.min(metCriteria, 5)
    
    if (score <= 2) {
      return { score, label: 'Weak', color: 'text-error' }
    } else if (score === 3) {
      return { score, label: 'Fair', color: 'text-warning' }
    } else if (score === 4) {
      return { score, label: 'Good', color: 'text-acid' }
    } else {
      return { score, label: 'Strong', color: 'text-success' }
    }
  }, [password])

  if (!password) return null

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium font-mono text-dim">Password Strength</span>
          <span className={`text-xs font-bold font-mono ${strength.color}`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              strength.score <= 2 ? 'bg-error' :
              strength.score === 3 ? 'bg-warning' :
              strength.score === 4 ? 'bg-acid' :
              'bg-success'
            }`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="space-y-1.5">
        {criteria.map((criterion, index) => {
          const isMet = criterion.test(password)
          return (
            <div key={index} className="flex items-center gap-2 text-xs font-mono">
              {isMet ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-dim flex-shrink-0" />
              )}
              <span className={isMet ? 'text-success' : 'text-dim'}>
                {criterion.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Security Tip */}
      {strength.score < 5 && (
        <div className="mt-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-acid flex-shrink-0 mt-0.5" />
            <p className="text-xs font-mono text-text leading-relaxed">
              <strong className="text-acid">Security Tip:</strong> Use a strong password with a mix of letters, numbers, and special characters to protect your account.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

