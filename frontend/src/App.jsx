import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  async function fetchTasks() {
    if (!API_BASE) {
      setError('Configura VITE_API_URL (ej. en .env) con la URL de la API.')
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
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  return (
    <div className="app">
      <h1>Lista de tareas</h1>

      <form className="add-form" onSubmit={addTask}>
        <input
          type="text"
          placeholder="Nueva tarea..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          disabled={!API_BASE || adding}
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
                disabled={!API_BASE}
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
                    aria-label="Editar título"
                  />
                  <button
                    type="button"
                    className="btn-small primary"
                    onClick={() => saveEdit(task.id)}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={cancelEdit}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="task-title">{task.title}</span>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => startEdit(task)}
                    disabled={!API_BASE}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-small danger"
                    onClick={() => deleteTask(task.id)}
                    disabled={!API_BASE}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
