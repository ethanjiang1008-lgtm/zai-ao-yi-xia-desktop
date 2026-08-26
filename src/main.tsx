import './utils/migrateStorage' // 必须在 App 之前；完成 v0.1→v0.2 存储 key 迁移
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
