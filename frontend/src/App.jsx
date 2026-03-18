import { useState, useEffect } from 'react'
// 1. Importaciones de AWS Amplify
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

// 2. Configuración con tus IDs de Terraform
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_by4SP5FBr',
      userPoolClientId: '5o6pcpfncai0376df1ndpohhkt',
    }
  }
});

// Tu URL de API Gateway
const API_BASE = "https://8iu9v78txc.execute-api.us-east-1.amazonaws.com"

function App() {
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
      // Nota: agregamos /tasks si tu API lo requiere, o dejamos API_BASE solo
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

  // 3. Envolvemos el return con el Authenticator
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app">
          {/* Barra de usuario superior */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: '#888' }}>
              Sesión iniciada como: <strong>{user.username}</strong>
            </span>
            <button onClick={signOut} className="btn-small danger">Cerrar Sesión</button>
          </header>

          <h1>Organizador de Tareas Pro Remasterizado versión 2.0 🚀</h1>

          <form className="add-form" onSubmit={addTask}>
            <input
              type="text"
              placeholder="Nueva tarea..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={adding}
              aria-label="Título de la nueva tarea"
            />
            <button type="submit" disabled={!newTaskTitle.trim() || adding}>
              {adding ? 'Añadiendo…' : 'Añadir'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {loading ? (
            <p className="loading">Cargando tareas…</p>
          ) : (
            <ul className="task-list">
              {tasks.length === 0 && !error && (
                <li className="empty">No hay tareas. Añade una arriba.</li>
              )}
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={`task ${task.completed ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleCompleted(task)}
                    aria-label={`Marcar como ${task.completed ? 'pendiente' : 'completada'}`}
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
                      <button onClick={() => saveEdit(task.id)} className="btn-small primary">Guardar</button>
                      <button onClick={cancelEdit} className="btn-small">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span className="task-title">{task.title}</span>
                      <button onClick={() => startEdit(task)} className="btn-small">Editar</button>
                      <button onClick={() => deleteTask(task.id)} className="btn-small danger">Eliminar</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Authenticator>
  )
}

export default App