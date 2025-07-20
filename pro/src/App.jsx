// import './App.css';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import AuthPage from './AuthPage';
// import Dashboard from './Dashboard';
// import NotePage from './NotePage';
// import Welcome from './Welcome';
// import EmailVerification from './EmailVerification';
// import NotesApp from './pages/NotesApp';

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Dashboard />} />
//         <Route path="/auth" element={<AuthPage />} />
//         <Route path="/welcome" element={<Welcome />} />
//         <Route path="/verify-email" element={<EmailVerification />} />
//         <Route path="/notes" element={<NotesApp />} />
//         <Route path="/note/:id" element={<NotePage />} />

//       </Routes>
//     </Router>
//   );
// }

// export default App;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import NotesApp from './pages/NotesApp';
import AuthPage from './AuthPage';
import EmailVerification from './EmailVerification';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/:id" element={<NotesApp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/notes" element={<NotesApp />} />
        <Route path="/notes/:id" element={<NotesApp />} />
      </Routes>
    </Router>
  );
}

export default App;
