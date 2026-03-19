import { useState, useEffect } from 'react'
// 1. Importaciones de AWS Amplify
import { Amplify } from 'aws-amplify'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

// 2. Configuración (Tus IDs reales)
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_Z4EzZ84Qw',
      userPoolClientId: '7bjuvhqku7ckfvegru5l1l8ogd',
    }
  }
});

const API_BASE = "https://8iu9v78txc.execute-api.us-east-1.amazonaws.com/"

function App() {
  // --- LÓGICA DE AUTENTICACIÓN ---
  const { user, signOut, authStatus } = useAuthenticator((context) => [context.authStatus, context.user]);
  const [showLoginSection, setShowLoginSection] = useState(false); 

  // Efecto para cerrar el login automáticamente al entrar
  useEffect(() => {
    if (authStatus === 'authenticated') {
      setShowLoginSection(false); 
    }
  }, [authStatus]);

  // --- LÓGICA DE TAREAS (ESTADO ORIGINAL COMPLETO) ---
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  // --- FUNCIONES ORIGINALES (SIN RECORTES) ---
  async function fetchTasks() {
    if (!API_BASE) {
      setError('Configura la URL de la API.')
      setLoading(false)
      return
    }
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
    // PROTECCIÓN: Solo si está autenticado
    if (authStatus !== 'authenticated') return;

    const title = newTaskTitle.trim()
    if (!title || !API_BASE || adding) return
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
    // PROTECCIÓN: Solo si está autenticado
    if (authStatus !== 'authenticated') return;
    if (!API_BASE) return
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
    // PROTECCIÓN: Solo si está autenticado
    if (authStatus !== 'authenticated') return;
    const title = editingTitle.trim()
    if (title === '' || !API_BASE) return
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
    // PROTECCIÓN: Solo si está autenticado
    if (authStatus !== 'authenticated') return;
    if (!API_BASE || !window.confirm('¿Eliminar esta tarea?')) return
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
    if (authStatus !== 'authenticated') return;
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Organizador Pro v2.0 🚀</h1>
        
        <div className="user-controls">
          {authStatus === 'authenticated' ? (
            <>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>👤 {user?.username}</span>
              <button onClick={signOut} className="btn-small danger">Salir</button>
            </>
          ) : (
            <button onClick={() => setShowLoginSection(!showLoginSection)} className="btn-small primary">
              {showLoginSection ? 'Cancelar Registro' : 'Entrar / Registrarse'}
            </button>
          )}
        </div>
      </header>

      {/* SECCIÓN DE AUTENTICACIÓN - Centrada vía CSS */}
      {showLoginSection && authStatus !== 'authenticated' && (
        <div className="auth-card-container">
          <Authenticator />
        </div>
      )}

      <main style={{ 
        opacity: (showLoginSection && authStatus !== 'authenticated') ? 0.1 : 1,
        pointerEvents: (showLoginSection && authStatus !== 'authenticated') ? 'none' : 'auto',
        transition: 'all 0.4s ease'
      }}>
        
        <form className="add-form" onSubmit={addTask}>
          <input
            type="text"
            placeholder={authStatus === 'authenticated' ? "Escribe una nueva tarea..." : "Inicia sesión para editar"}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={adding || authStatus !== 'authenticated'}
          />
          <button type="submit" className="btn-small primary" disabled={!newTaskTitle.trim() || adding || authStatus !== 'authenticated'}>
            {adding ? '...' : 'Añadir'}
          </button>
        </form>

        {error && <p className="error" style={{color: 'var(--danger)', textAlign: 'center'}}>{error}</p>}

        {loading ? (
          <p className="loading" style={{textAlign: 'center', color: 'var(--text-dim)'}}>Cargando tus tareas...</p>
        ) : (
          <ul className="task-list" style={{listStyle: 'none', padding: 0}}>
            {tasks.length === 0 && !error && (
              <li style={{textAlign: 'center', color: 'var(--text-dim)', marginTop: '20px'}}>No hay tareas disponibles.</li>
            )}
            {tasks.map((task) => (
              <li key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleCompleted(task)}
                  disabled={authStatus !== 'authenticated'}
                />

                {editingId === task.id ? (
                  <div style={{display: 'flex', gap: '8px', flex: 1}}>
                    <input
                      type="text"
                      className="edit-input"
                      style={{background: '#000', border: '1px solid var(--primary-color)', color: '#fff', padding: '5px', borderRadius: '8px', flex: 1}}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(task.id)} className="btn-small primary">OK</button>
                  </div>
                ) : (
                  <>
                    <span className="task-title">{task.title}</span>
                    {authStatus === 'authenticated' && (
                      <div className="actions">
                        <button onClick={() => startEdit(task)} className="btn-small">✏️</button>
                        <button onClick={() => deleteTask(task.id)} className="btn-small danger">🗑️</button>
                      </div>
                    )}
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