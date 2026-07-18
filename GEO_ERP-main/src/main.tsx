import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Qapture } from 'qapture2'
import { router } from './App'
import { LangProvider } from './context/LangContext'
import { CompanyProvider } from './context/CompanyContext'
import { ToastProvider } from './components/ui/Toast'
import qaConfig from '../qa.config'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <CompanyProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </CompanyProvider>
    </LangProvider>
    <Qapture config={qaConfig} />
  </React.StrictMode>,
)
