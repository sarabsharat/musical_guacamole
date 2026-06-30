// app/page.tsx
'use client' // Tell Next.js this page handles user clicks

import {deleteUser, findRes, findUser, updateUser} from "./api/actions"
import { useState } from 'react'

export default function TestPage() {
  const [userData, setUserData] = useState<any>(null)
    const [resData, setResData] = useState<any>(null)
const [user, setUser] = useState<any>(null)
  const handleTest = async () => {
    // Call your server action just like a normal function!
    const data = await findUser()
    setUserData(data)
  }
  const udp = async () => {
      const data = await updateUser(1)
      setUserData(data)
  }

    const del = async () => {
      await deleteUser("JAJA")
        return "userdeleted"
    }

  const handleTest2 = async () => {
      const data = await findRes()
   setResData(data)}
  return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>Database Server Action Test</h1>
        <button
            onClick={handleTest}
            style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
        >
          Trigger findUser()
        </button>
          <button
              onClick={handleTest2}
              style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
          >
              Trigger findres()
          </button>

          <button
              onClick={udp}
              style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
          >
              Trigger updateUsers()
          </button>
          <button
              onClick={del}
              style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
          >
              Trigger deleteUser()
          </button>

        {userData && (
            <div style={{ marginTop: '20px', background: '#f5f5f5', color:"black", padding: '15px', borderRadius: '5px' }}>
              <h3>Data Returned From Docker Database:</h3>
              <pre>{JSON.stringify(userData, null, 2)}</pre>
            </div>
        )}

          {resData && (
              <div style={{ marginTop: '20px', background: '#f5f5f5', color:"black", padding: '15px', borderRadius: '5px' }}>
                  <h3>Data Returned From Docker Database:</h3>
                  <pre>{JSON.stringify(resData, null, 2)}</pre>
              </div>
          )}

          <div style={{ marginTop: '20px', background: '#f5f5f5', color:"black", padding: '15px', borderRadius: '5px' }}>
              <h3>Data Returned From Docker Database:</h3>
              <pre>{JSON.stringify(del, null, 2)}</pre>
          </div>
      </div>
  )
}