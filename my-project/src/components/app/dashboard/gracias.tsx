"use client"

import { useEffect, useState } from 'react'

export function UserGreeting() {
  const [username, setUsername] = useState('')

  useEffect(() => {
    // En una aplicación real, obtendrías el nombre de usuario de tu sistema de autenticación
    setUsername('Usuario')
  }, [])

  return (
    <h2 className="text-2xl font-bold mb-4">Bienvenido, {username}</h2>
  )
}