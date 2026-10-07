import { Anchor, Building2, Copy, Handshake, KeyRound, MapPin, Phone, RefreshCw, Shield, Ticket, UserRound } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, Button, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { copyText } from '../../lib/clipboard'
import { localizeDigits, toLatinDigits } from '../../lib/datetime'
import { geoName, IRAN_MAP_BOUNDS, IRAN_MAP_CENTER } from '../../lib/geo'
import { isPhoneReady } from '../../lib/identity'
import type { City, Port, PortKind, PortOperatorOption } from '../../types/app'
import { portKinds } from '../../types/app'

export type PortNewOperator = {
  firstName: string
  lastName: string
  phone: string
  password: string
}

export type PortPayload = {
  name: string
  cityId: string
  cooperativeName: string
  address: string | null
  kind: PortKind
  managerName: string
  phone: string
  latitude: number | null
  longitude: number | null
  securityToken: string
  operatorUserId: string | null
  newOperator?: PortNewOperator
}

const securityTokenPattern = /^[A-Za-z0-9_-]{16,128}$/

function generateSecurityToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function normalizeIranMobile(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
}

function toCoordString(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function PortForm({
  initial,
  onSubmit,
}: {
  initial?: Port
  onSubmit: (payload: PortPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [name, setName] = useState(initial?.name ?? '')
  const [cityId, setCityId] = useState(initial?.cityId ?? '')
  const [cooperativeName, setCooperativeName] = useState(initial?.cooperativeName ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [kind, setKind] = useState<PortKind>(initial?.kind ?? 'INDIVIDUAL')
  const [managerName, setManagerName] = useState(initial?.managerName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
  const [securityToken, setSecurityToken] = useState(initial?.securityToken || generateSecurityToken())
  const [createOperator, setCreateOperator] = useState(false)
  const [operatorUserId, setOperatorUserId] = useState(initial?.operatorUserId ?? '')
  const [operatorFirstName, setOperatorFirstName] = useState('')
  const [operatorLastName, setOperatorLastName] = useState('')
  const [operatorPhone, setOperatorPhone] = useState('')
  const [operatorPassword, setOperatorPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const cities = useQuery({
    queryKey: ['cities', 'lookup', 'ports'],
    queryFn: async () => {
      const { data } = await api.get<City[]>('/cities', { params: { activeOnly: true } })
      return data
    },
  })
  const cityOptions = useMemo(() => {
    const rows = cities.data ?? []
    const current = initial?.city
    const withCurrent =
      current && !rows.some((city) => city.id === current.id)
        ? [{ id: current.id, nameFa: current.nameFa, nameEn: current.nameEn }, ...rows]
        : rows
    return withCurrent.map((city) => ({
      value: city.id,
      label: geoName(city, locale),
    }))
  }, [cities.data, initial?.city, locale])
  const operators = useQuery({
    queryKey: ['ports', 'operators'],
    queryFn: async () => {
      const { data } = await api.get<PortOperatorOption[]>('/ports/operators')
      return data
    },
  })
  const operatorOptions = useMemo(() => {
    const rows = operators.data ?? []
    const current = initial?.operatorUser
    const withCurrent =
      current && !rows.some((user) => user.id === current.id)
        ? [
            {
              id: current.id,
              firstName: current.firstName,
              lastName: current.lastName,
              fullName: current.fullName,
              phone: current.phone,
              port: initial ? { id: initial.id, name: initial.name } : null,
            },
            ...rows,
          ]
        : rows
    return [
      { value: '', label: t('ports.noOperator') },
      ...withCurrent.map((user) => {
        const phone = user.phone ? localizeDigits(user.phone, locale) : ''
        const assignedElsewhere = Boolean(user.port && user.port.id !== initial?.id)
        const assigned = assignedElsewhere ? ` (${t('ports.operatorAssigned', { name: user.port?.name ?? '' })})` : ''
        return {
          value: user.id,
          label: `${user.fullName}${phone ? ` — ${phone}` : ''}${assigned}`,
          disabled: assignedElsewhere,
        }
      }),
    ]
  }, [initial, locale, operators.data, t])
  const kindOptions = portKinds.map((value) => ({
    value,
    label: t(`ports.kindLabel.${value}`),
  }))
  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null
  const focus = useMemo(() => {
    if (hasPin) return null
    return {
      lat: IRAN_MAP_CENTER.lat,
      lng: IRAN_MAP_CENTER.lng,
      zoom: 5,
      bounds: IRAN_MAP_BOUNDS,
    }
  }, [hasPin])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextLatitude = toOptionalNumber(latitude)
    const nextLongitude = toOptionalNumber(longitude)
    if ((nextLatitude == null) !== (nextLongitude == null)) {
      toast.error(t('ports.coordinatesPair'))
      return
    }
    const token = securityToken.trim()
    if (!securityTokenPattern.test(token)) {
      toast.error(t('ports.tokenInvalid'))
      return
    }
    let newOperator: PortNewOperator | undefined
    if (createOperator) {
      const mobile = normalizeIranMobile(operatorPhone)
      if (!isPhoneReady(mobile, true)) {
        toast.error(t('ports.phoneInvalid'))
        return
      }
      if (operatorPassword.length < 8) {
        toast.error(t('ports.passwordMin'))
        return
      }
      newOperator = {
        firstName: operatorFirstName.trim(),
        lastName: operatorLastName.trim(),
        phone: mobile,
        password: operatorPassword,
      }
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        cityId,
        cooperativeName: cooperativeName.trim(),
        address: address.trim() || null,
        kind,
        managerName: managerName.trim(),
        phone: phone.trim(),
        latitude: nextLatitude,
        longitude: nextLongitude,
        securityToken: token,
        operatorUserId: createOperator ? null : operatorUserId || null,
        ...(newOperator ? { newOperator } : {}),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Anchor}
      title={initial ? initial.name : t('ports.create')}
      subtitle={initial ? undefined : t('ports.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormSectionTitle icon={Anchor}>{t('ports.section')}</FormSectionTitle>
        <FormField icon={Anchor} label={t('ports.name')} htmlFor="port-name">
          <input
            id="port-name"
            className={fieldClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Building2} label={t('ports.city')}>
            <SearchSelect
              value={cityId}
              onChange={setCityId}
              options={cityOptions}
              placeholder={t('ports.selectCity')}
              required
            />
          </FormField>
          <FormField icon={Ticket} label={t('ports.kind')}>
            <SearchSelect
              value={kind}
              onChange={(next) => setKind(next as PortKind)}
              options={kindOptions}
              placeholder={t('ports.selectKind')}
              required
            />
          </FormField>
        </div>
        <FormField icon={Handshake} label={t('ports.cooperative')} htmlFor="port-cooperative">
          <input
            id="port-cooperative"
            className={fieldClassName}
            value={cooperativeName}
            onChange={(event) => setCooperativeName(event.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('ports.manager')} htmlFor="port-manager">
            <input
              id="port-manager"
              className={fieldClassName}
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              required
              minLength={2}
            />
          </FormField>
          <FormField icon={Phone} label={t('ports.phone')} htmlFor="port-phone">
            <input
              id="port-phone"
              className={`${fieldClassName} digit-field`}
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </FormField>
        </div>
        <FormSectionTitle icon={KeyRound}>{t('ports.operatorSection')}</FormSectionTitle>
        <FormField icon={Shield} label={t('ports.securityToken')} htmlFor="port-token">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="port-token"
              className={`${fieldClassName} digit-field min-w-0 flex-1`}
              value={securityToken}
              onChange={(event) => setSecurityToken(toLatinDigits(event.target.value).replace(/\s/g, ''))}
              required
              minLength={16}
              maxLength={128}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSecurityToken(generateSecurityToken())}
              >
                <RefreshCw className="size-4" aria-hidden />
                {t('ports.generateToken')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon
                aria-label={t('common.copy')}
                onClick={() => {
                  void copyText(securityToken).then(() => toast.success(t('common.copied')))
                }}
              >
                <Copy className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-xs leading-6 text-ink-500">{t('ports.securityTokenHint')}</p>
        </FormField>
        <FormField icon={UserRound} label={t('ports.operatorMode')}>
          <ToggleField
            checked={!createOperator}
            onChange={(pickExisting) => setCreateOperator(!pickExisting)}
            onLabel={t('ports.operatorPick')}
            offLabel={t('ports.operatorCreate')}
          />
        </FormField>
        {createOperator ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={UserRound} label={t('ports.firstName')} htmlFor="port-operator-first">
                <input
                  id="port-operator-first"
                  className={fieldClassName}
                  value={operatorFirstName}
                  onChange={(event) => setOperatorFirstName(event.target.value)}
                  required
                  minLength={2}
                />
              </FormField>
              <FormField icon={UserRound} label={t('ports.lastName')} htmlFor="port-operator-last">
                <input
                  id="port-operator-last"
                  className={fieldClassName}
                  value={operatorLastName}
                  onChange={(event) => setOperatorLastName(event.target.value)}
                  required
                  minLength={2}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={Phone} label={t('ports.mobile')} htmlFor="port-operator-phone">
                <input
                  id="port-operator-phone"
                  className={`${fieldClassName} digit-field`}
                  inputMode="tel"
                  value={operatorPhone}
                  onChange={(event) => setOperatorPhone(toLatinDigits(event.target.value))}
                  required
                  autoComplete="off"
                />
              </FormField>
              <FormField icon={KeyRound} label={t('ports.password')} htmlFor="port-operator-password">
                <input
                  id="port-operator-password"
                  type="password"
                  className={fieldClassName}
                  value={operatorPassword}
                  onChange={(event) => setOperatorPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </FormField>
            </div>
            <p className="text-xs leading-6 text-ink-500">{t('ports.usernameHint')}</p>
          </>
        ) : (
          <FormField icon={UserRound} label={t('ports.operator')}>
            <SearchSelect
              value={operatorUserId}
              onChange={setOperatorUserId}
              options={operatorOptions}
              placeholder={t('ports.selectOperator')}
            />
            <p className="text-xs leading-6 text-ink-500">{t('ports.operatorHint')}</p>
          </FormField>
        )}
        <FormField icon={MapPin} label={t('ports.address')} htmlFor="port-address">
          <textarea
            id="port-address"
            className={fieldClassName}
            rows={3}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </FormField>
        <FormSectionTitle icon={MapPin}>{t('ports.locationSection')}</FormSectionTitle>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('ports.mapHint')}</p>
          <OsmMapPicker
            variant="always"
            latitude={latitude}
            longitude={longitude}
            focus={focus}
            heightClass="h-72 sm:h-80"
            onChange={(nextLat, nextLng) => {
              setLatitude(nextLat)
              setLongitude(nextLng)
            }}
          />
        </div>
        <FormActions
          submitLabel={t('ports.save')}
          cancelLabel={t('ports.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
