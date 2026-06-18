import React from 'react';
import { createRoot } from 'react-dom/client';
import Wrapped from './Wrapped.jsx';
import './wrapped.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Wrapped />
  </React.StrictMode>
);
