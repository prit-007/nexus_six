import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Welcome from './pages/Welcome';
import NotesApp from './pages/NotesApp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/notes" element={<NotesApp />} />
      </Routes>
    </Router>
  );
}

export default App;