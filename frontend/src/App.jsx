import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import VoiceAssistant from './components/VoiceAssistant';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <VoiceAssistant />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </BrowserRouter>
  );
}

export default App;
