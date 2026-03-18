import { useState, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

// 1. Configuración de AWS (Tus IDs reales)
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_by4SP5FBr',
      userPoolClientId: '5o6pcpfncai0376df1ndpohhkt',
    }
  }
});

const API_BASE = "https://8iu9v78txc.execute-api.us-east-1.amazonaws.com"

function App() {
  // --- LÓGICA DE AUTENTICACIÓN ---
  // Extraemos authStatus para saber en qué estado está la sesión
  const { user, signOut, authStatus } = useAuthenticator((context) => [context.authStatus, context.user]);
  const [showLoginSection, setShowLoginSection] = useState(false); 

  // --- ARREGLO PARA LA PANTALLA EN BLANCO ---
  // En cuanto el estado pase a 'authenticated', cerramos la sección de login a la fuerza
  useEffect(() => {
    if (authStatus === 'authenticated') {
      setShowLoginSection(false); 
    }
  }, [authStatus]);

  // --- LÓGICA DE TAREAS (Tus funciones originales 100% funcionales) ---
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  async function fetchTasks() {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks`)
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar tareas')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  async function addTask(e) {
    e.preventDefault()
    const title = newTaskTitle.trim()
    if (!title || adding) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error(res.statusText)
      setNewTaskTitle('')
      await fetchTasks()
    } catch (err) {
      setError(err.message || 'Error al crear la tarea')
    } finally {
      setAdding(false)
    }
  }

  async function toggleCompleted(task) {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      if (!res.ok) throw new Error(res.statusText)
      await fetchTasks()
    } catch (err) {
      setError(err.message || 'Error al actualizar')
    }
  }

  async function saveEdit(id) {
    const title = editingTitle.trim()
    if (title === '') return
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error(res.statusText)
      setEditingId(null)
      setEditingTitle('')
      await fetchTasks()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    }
  }

  async function deleteTask(id) {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(res.statusText)
      await fetchTasks()
    } catch (err) {
      setError(err.message || 'Error al eliminar')
    }
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  // --- RENDERIZADO ---
  return (
    <div className="app">
      {/* 1. HEADER DINÁMICO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Task Master Pro v2.0 🚀</h1>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {authStatus === 'authenticated' ? (
            <>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                👤 <strong>{user?.username}</strong>
              </span>
              <button onClick={signOut} className="btn-small danger">Cerrar Sesión</button>
            </>
          ) : (
            <button 
              onClick={() => setShowLoginSection(!showLoginSection)} 
              className="btn-small primary"
            >
              {showLoginSection ? 'Volver a la Lista' : 'Entrar / Registrarse'}
            </button>
          )}
        </div>
      </header>

      {/* 2. SECCIÓN DE LOGIN (Solo se muestra si el usuario la pide y NO está autenticado) */}
      {showLoginSection && authStatus !== 'authenticated' && (
        <div className="auth-overlay" style={{ marginBottom: '40px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
          <Authenticator />
        </div>
      )}

      {/* 3. LISTA DE TAREAS (Siempre visible, pero se atenúa si el login está abierto) */}
      <main style={{ 
        opacity: (showLoginSection && authStatus !== 'authenticated') ? 0.2 : 1,
        pointerEvents: (showLoginSection && authStatus !== 'authenticated') ? 'none' : 'auto',
        transition: 'all 0.4s ease'
      }}>
        <form className="add-form" onSubmit={addTask}>
          <input
            type="text"
            placeholder="Nueva tarea pública..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={adding}
          />
          <button type="submit" disabled={!newTaskTitle.trim() || adding}>
            {adding ? '...' : 'Añadir'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="loading">Cargando tareas...</p>
        ) : (
          <ul className="task-list">
            {tasks.length === 0 && !error && (
              <li className="empty">No hay tareas. ¡Agrega una!</li>
            )}
            {tasks.map((task) => (
              <li key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleCompleted(task)}
                />
                {editingId === task.id ? (
                  <>
                    <input
                      type="text"
                      className="edit-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(task.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(task.id)} className="btn-small primary">Listo</button>
                    <button onClick={cancelEdit} className="btn-small">X</button>
                  </>
                ) : (
                  <>
                    <span className="task-title">{task.title}</span>
                    <button onClick={() => startEdit(task)} className="btn-small">Ed</button>
                    <button onClick={() => deleteTask(task.id)} className="btn-small danger">Del</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default App