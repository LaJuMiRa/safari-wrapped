import React from 'react';
import { createRoot } from 'react-dom/client';
import Wrapped from './Wrapped.jsx';
import Details from './Details.jsx';
import './wrapped.css';
import './details.css';

const mode = new URLSearchParams(location.search).get('mode');
const isDetails = mode === 'allsites' || mode === 'keywords';
// The detail page must scroll; the story sets overflow:hidden globally. Set a marker.
if (isDetails) document.documentElement.classList.add('mode-details');
const Page = isDetails ? Details : Wrapped;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
