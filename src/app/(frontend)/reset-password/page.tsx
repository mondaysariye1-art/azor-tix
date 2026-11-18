import AuthPanel from '@/components/AuthPanel'
export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const params = await searchParams
  return (
    <AuthPanel mode="reset" token={typeof params.token === 'string' ? params.token : undefined} />
  )
}
