import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import NotePage from './NotePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/note/:id" element={<NotePage />} />
      </Routes>
    </Router>
  );
}

export default App;
