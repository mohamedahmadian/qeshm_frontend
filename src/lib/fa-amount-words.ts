const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'هزار تریلیون']

function groupWords(value: number) {
  const parts: string[] = []
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  if (hundred) parts.push(hundreds[hundred])
  if (rest >= 10 && rest < 20) {
    parts.push(teens[rest - 10])
  } else {
    const ten = Math.floor(rest / 10)
    const one = rest % 10
    if (ten) parts.push(tens[ten])
    if (one) parts.push(ones[one])
  }
  return parts.join(' و ')
}

/** مبلغ صحیح را به حروف فارسی می‌نویسد. */
export function faAmountWords(value: number) {
  const amount = Math.trunc(Math.abs(value))
  if (!Number.isFinite(amount)) return ''
  if (amount === 0) return 'صفر'
  const groups: number[] = []
  let rest = amount
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }
  const parts: string[] = []
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (!group) continue
    const words = groupWords(group)
    const scale = scales[index] ?? ''
    parts.push(scale ? `${words} ${scale}` : words)
  }
  return parts.join(' و ')
}
