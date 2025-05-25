'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/')
  }, [session, status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Access Denied</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome {session.user?.name}!</p>
      <p>Email: {session.user?.email}</p>
      {session.user?.image && (
        <img 
          src={session.user.image} 
          alt="Profile" 
          style={{ width: '64px', height: '64px', borderRadius: '50%' }}
        />
      )}
    </div>
  )
}