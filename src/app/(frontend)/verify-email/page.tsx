import AuthPanel from '@/components/AuthPanel'
export default async function VerifyEmailPage({ searchParams }: PageProps<'/verify-email'>) {
  const params = await searchParams
  return (
    <AuthPanel mode="verify" token={typeof params.token === 'string' ? params.token : undefined} />
  )
}
